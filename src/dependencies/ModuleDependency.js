const Dependency = require("../Dependency");

class ModuleDependency extends Dependency {
	constructor(request) {
        super();
        // 文件地址
		this.request = request;
		this.userRequest = request;
	}

    /**
     * 1. 都是 ModuleDependency 实例
     * 2. 并且 request 文件地址相同
     */
	isEqualResource(other) {
		if(!(other instanceof ModuleDependency))
			return false;

		return this.request === other.request;
	}
}

module.exports = ModuleDependency;
