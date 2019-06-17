class ModuleDependencyTemplateAsId {
    /**
     * 替换成模块 id
     */
	apply(dep, source, outputOptions, requestShortener) {
		let comment = '';
		let content = '';
		if(dep.module)
			content = comment + JSON.stringify(dep.module.id);
		source.replace(dep.range[0], dep.range[1] - 1, content);
	}
}
module.exports = ModuleDependencyTemplateAsId;