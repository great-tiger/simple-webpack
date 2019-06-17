const ModuleDependency = require('./ModuleDependency');
const ModuleDependencyTemplateAsId = require("./ModuleDependencyTemplateAsId");

class CommonJsRequireDependency extends ModuleDependency{
	constructor(request, range) {
		super(request);
		this.range = range;
	}

	get type() {
		return "cjs require";
	}
}

CommonJsRequireDependency.Template = ModuleDependencyTemplateAsId;

module.exports = CommonJsRequireDependency;