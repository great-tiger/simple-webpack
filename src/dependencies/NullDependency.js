const Dependency = require("../Dependency");

class NullDependency extends Dependency {
	get type() {
		return "null";
	}

	isEqualResource() {
		return false;
	}

	updateHash() {}
}

module.exports = NullDependency;
