const acorn = require("acorn-dynamic-import").default
const Tapable = require('./Tapable')
const BasicEvaluatedExpression = require("./BasicEvaluatedExpression");

const ECMA_VERSION = 2017;

const POSSIBLE_AST_OPTIONS = [{
	ranges: true,
	locations: true,
	ecmaVersion: ECMA_VERSION,
	sourceType: "module",
	plugins: {
		dynamicImport: true
	}
}, {
	ranges: true,
	locations: true,
	ecmaVersion: ECMA_VERSION,
	sourceType: "script",
	plugins: {
		dynamicImport: true
	}
}];

class Parser extends Tapable {
	constructor(options) {
		super();
		this.options = options;
		this.scope = undefined;
		this.state = undefined;
        this.comments = undefined;
        // 内置的计算值 插件
        this.initializeEvaluating();
    }

    initializeEvaluating() {
        this.plugin("evaluate Literal", expr => {
			switch(typeof expr.value) {
				case "number":
					return new BasicEvaluatedExpression().setNumber(expr.value).setRange(expr.range);
				case "string":
					return new BasicEvaluatedExpression().setString(expr.value).setRange(expr.range);
				case "boolean":
					return new BasicEvaluatedExpression().setBoolean(expr.value).setRange(expr.range);
			}
			if(expr.value === null)
				return new BasicEvaluatedExpression().setNull().setRange(expr.range);
			if(expr.value instanceof RegExp)
				return new BasicEvaluatedExpression().setRegExp(expr.value).setRange(expr.range);
		});
        this.plugin("evaluate Identifier", function(expr) {
            // 如果名字被重新定义过，这用新名字
            const name = this.scope.renames["$" + expr.name] || expr.name;
            // 如果标识符没有定义过
			if(this.scope.definitions.indexOf(expr.name) === -1) {
                // 计算具体 Identifier 的值，比如 evaluate Identifier require
				const result = this.applyPluginsBailResult1("evaluate Identifier " + name, expr);
				if(result) return result;
				return new BasicEvaluatedExpression().setIdentifier(name).setRange(expr.range);
			} else {
                // 如果标识符定义过
				return this.applyPluginsBailResult1("evaluate defined Identifier " + name, expr);
			}
		});
    }
    
    /**
     * 
     * @param {*} sourde  
       let a = require('./a');
       let b = require('./b');
       a();
       b();
     * @param {*} initialState  
       this.parser.parse(this._source.source(), {
			current: this,
            module: this,
            compilation: compilation,
			options: options  webpack的总配置
		}); 
     */
    parse(source, initialState) {
        let ast;
        const comments = [];
        // 上面配置的第一种配置出错，则使用第二种方式解析ast
		for(let i = 0, len = POSSIBLE_AST_OPTIONS.length; i < len; i++) {
			if(!ast) {
				try {
					comments.length = 0;
					POSSIBLE_AST_OPTIONS[i].onComment = comments;
					ast = acorn.parse(source, POSSIBLE_AST_OPTIONS[i]);
				} catch(e) {
                    console.log('Parser.parse', e)
					// ignore the error
				}
			}
        }
        
        this.scope = {
			inTry: false,
			definitions: [], //prewalkVariableDeclarators 中，会把变量的定义放进去
			renames: {} //prewalkVariableDeclarators 中增加
		};
		const state = this.state = initialState || {};
        this.comments = comments;
        /**
         * HarmonyDetectionParserPlugin  UseStrictPlugin 这两个插件中会注册这个事件
         * 不影响本实例，不管program事件
         */
        if(this.applyPluginsBailResult("program", ast, comments) === undefined) {
            /**
             * 主要在处理变量的定义 保存到
             * this.scope.definations this.scope.renames 中
             */
			this.prewalkStatements(ast.body);
			this.walkStatements(ast.body);
		}
        return state;
    }

    walkStatements(statements) {
		for(let index = 0, len = statements.length; index < len; index++) {
			const statement = statements[index];
			this.walkStatement(statement);
		}
    }
    
    walkStatement(statement) {
        // 插件对特定statement拦截做处理，这里忽略
		if(this.applyPluginsBailResult1("statement", statement) !== undefined) return;
		const handler = this["walk" + statement.type];
		if(handler)
			handler.call(this, statement);
    }
    
    walkVariableDeclaration(statement) {
		if(statement.declarations)
			this.walkVariableDeclarators(statement.declarations);
    }
    
    walkVariableDeclarators(declarators) {
		declarators.forEach(declarator => {
			switch(declarator.type) {
				case "VariableDeclarator":
				{
                    this.walkPattern(declarator.id);
                    if(declarator.init)
					    this.walkExpression(declarator.init);
				}
			}
		});
    }

    walkExpression(expression) {
		if(this["walk" + expression.type])
			return this["walk" + expression.type](expression);
    }
    
    walkCallExpression(expression) {
        const callee = this.evaluateExpression(expression.callee);
        let result = this.applyPluginsBailResult1("call " + callee.identifier, expression);
        if(result === true) return;
    }

    evaluateExpression(expression) {
		try {
			const result = this.applyPluginsBailResult1("evaluate " + expression.type, expression);
			if(result !== undefined)
				return result;
		} catch(e) {
			console.warn(e);
		}
		return new BasicEvaluatedExpression().setRange(expression.range);
	}
    
    walkPattern(pattern) {
		if(pattern.type === "Identifier")
			return;
	}

    prewalkStatements(statements) {
        for(let index = 0, len = statements.length; index < len; index++ ) {
            const statement = statements[index];
            this.prewalkStatement(statement)
        }
    }

    prewalkStatement(statement) {
        /**
         * 本实例中只有两种statement
         * VariableDeclaration
         * ExpressionStatement
         */
        const handler = this["prewalk" + statement.type]
        if (handler) {
            handler.call(this, statement)
        }
    }

    prewalkVariableDeclaration(statement) {
        if(statement.declarations) {
            // 遍历变量说明符
			this.prewalkVariableDeclarators(statement.declarations);
        }
    }

    prewalkVariableDeclarators(declarators) {
        declarators.forEach(declarator => {
			switch(declarator.type) {
                // 难道还有其它的type
				case "VariableDeclarator":
					{
                        /**
                         * ArrayPattern let [a, c] = ...
                         * ObjectPattern let { a, b} = ...
                         * Identifier let a = ...
                         */
						this.enterPattern(declarator.id, (name, decl) => {
                            // 忽略，可以针对单个变量的定义使用插件
							if(!this.applyPluginsBailResult1("var-" + declarator.kind + " " + name, decl)) {
                                // 忽略，可以针对单个变量的定义使用插件
								if(!this.applyPluginsBailResult1("var " + name, decl)) {
                                    // 这里的name就是上注释中的变量标识符： a, b, c
									this.scope.renames["$" + name] = undefined;
									if(this.scope.definitions.indexOf(name) < 0)
										this.scope.definitions.push(name);
								}
							}
						});
						break;
					}
			}
		});
    }

    enterPattern(pattern, onIdent) {
		if(pattern && this["enter" + pattern.type])
			this["enter" + pattern.type](pattern, onIdent);
	}

	enterIdentifier(pattern, onIdent) {
		onIdent(pattern.name, pattern);
	}

}

module.exports = Parser