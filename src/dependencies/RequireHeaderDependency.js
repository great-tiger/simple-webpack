const NullDependency = require("./NullDependency");

class RequireHeaderDependency extends NullDependency {
	constructor(range) {
		super();
		this.range = range;
	}
}

RequireHeaderDependency.Template = class RequireHeaderDependencyTemplate {
	apply(dep, source) {
		source.replace(dep.range[0], dep.range[1] - 1, "__webpack_require__");
	}
};

module.exports = RequireHeaderDependency;