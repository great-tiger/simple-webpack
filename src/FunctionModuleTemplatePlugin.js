const ConcatSource = require("webpack-sources").ConcatSource;

class FunctionModuleTemplatePlugin {
	apply(moduleTemplate) {
		moduleTemplate.plugin("render", function(moduleSource, module) {
			const source = new ConcatSource();
            const defaultArguments = ["module", "exports"];
            
			// if((module.arguments && module.arguments.length !== 0) || module.hasDependencies(d => d.requireWebpackRequire !== false)) {
			defaultArguments.push("__webpack_require__");
            // }
            
			source.add("/***/ (function(" + defaultArguments.concat(module.arguments || []).join(", ") + ") {\n\n");
			source.add(moduleSource);
			source.add("\n\n/***/ })");
			return source;
		});
	}
}
module.exports = FunctionModuleTemplatePlugin;
