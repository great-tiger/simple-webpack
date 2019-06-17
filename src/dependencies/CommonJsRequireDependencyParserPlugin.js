const CommonJsRequireDependency = require("./CommonJsRequireDependency");
const RequireHeaderDependency = require("./RequireHeaderDependency");

class CommonJsRequireDependencyParserPlugin {
	constructor(options) {
		this.options = options;
    }

    apply(parser) {
        /**
         * require('./b'); 这种形式会增加两个依赖
         * CommonJsRequireDependency
         * RequireHeaderDependency
         */
        parser.plugin("call require", (expr) => {
            if (expr.arguments.length !== 1) return;
            const param = parser.evaluateExpression(expr.arguments[0]);
            const result = parser.applyPluginsBailResult("call require:commonjs:item", expr, param);
            if(result === undefined) {
                // 本实例中未执行到，不考虑
                parser.applyPluginsBailResult("call require:commonjs:context", expr, param);
            } else {
                const dep = new RequireHeaderDependency(expr.callee.range);
                dep.loc = expr.loc;
                parser.state.current.addDependency(dep);
            }
            return true;
        })

        /**
         * 添加 CommonJsRequireDependency 依赖
         */
        parser.plugin("call require:commonjs:item", (expr, param) => {
            if (param.isString()) {
                const dep = new CommonJsRequireDependency(param.string, param.range);
                dep.loc = expr.loc;
                dep.optional = !!parser.scope.inTry;
                /**
                 * parser.state.current 可能是 NormalModule
                 * 为模块添加依赖
                 */
				parser.state.current.addDependency(dep);
				return true;
            }
        })
    }
}
module.exports = CommonJsRequireDependencyParserPlugin;
