const ParserHelpers = require('../ParserHelpers')
const CommonJsRequireDependencyParserPlugin = require("./CommonJsRequireDependencyParserPlugin");
const NullFactory = require("../NullFactory");
const CommonJsRequireDependency = require("./CommonJsRequireDependency");
const RequireHeaderDependency = require("./RequireHeaderDependency");

class CommonJsPlugin {
    constructor(options) {
        this.options = options
    }

    apply(compiler) {
        const options = this.options
        /**
         * 这里的params是创建compilation时的参数
         newCompilationParams() {
            const params = {
                normalModuleFactory: this.createNormalModuleFactory(),
                contextModuleFactory: this.createContextModuleFactory(),
                compilationDependencies: []
            };
            return params;
         }
         */
        // compilation 创建 compilation 完成后调用
        compiler.plugin('compilation', (compilation, params) => {
            const normalModuleFactory = params.normalModuleFactory;
            const contextModuleFactory = params.contextModuleFactory;

            compilation.dependencyFactories.set(CommonJsRequireDependency, normalModuleFactory);
            compilation.dependencyTemplates.set(CommonJsRequireDependency, new CommonJsRequireDependency.Template());

            compilation.dependencyFactories.set(RequireHeaderDependency, new NullFactory());
            compilation.dependencyTemplates.set(RequireHeaderDependency, new RequireHeaderDependency.Template());

            // parser 创建完成后触发 
            params.normalModuleFactory.plugin("parser", (parser, parserOptions) => {
                const requireExpressions = ["require", "require.resolve", "require.resolveWeak"];
                for (let expression of requireExpressions) {
                    parser.plugin(`evaluate Identifier ${expression}`, ParserHelpers.evaluateToIdentifier(expression, true));
                }
                parser.apply(
                    new CommonJsRequireDependencyParserPlugin(options)
                );
            })
        })
    }
}

module.exports = CommonJsPlugin;