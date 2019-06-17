/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Template = require("./Template");

module.exports = class ModuleTemplate extends Template {
	constructor(outputOptions) {
		super(outputOptions);
	}
	render(module, dependencyTemplates, chunk) {
		/**
		 * 返回模块的源码，注意源码中的
		 * require('./a.js') 已经被替换成了 __webpack_require__(moduleId) 形式
		 */
		const moduleSource = module.source(dependencyTemplates, this.outputOptions, this.requestShortener);
		// 此实例什么也没干
		const moduleSourcePostModule = this.applyPluginsWaterfall("module", moduleSource, module, chunk, dependencyTemplates);
		const moduleSourcePostRender = this.applyPluginsWaterfall("render", moduleSourcePostModule, module, chunk, dependencyTemplates);
		// 此实例什么也没干
		return this.applyPluginsWaterfall("package", moduleSourcePostRender, module, chunk, dependencyTemplates);
	}
	updateHash(hash) {
		hash.update("1");
		this.applyPlugins("hash", hash);
	}
};