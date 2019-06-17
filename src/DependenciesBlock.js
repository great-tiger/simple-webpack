class DependenciesBlock {
    constructor() {
        this.dependencies = [];
		this.blocks = [];
		this.variables = [];
    }

    addDependency(dependency) {
		this.dependencies.push(dependency);
	}
}
module.exports = DependenciesBlock