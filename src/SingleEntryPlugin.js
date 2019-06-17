const SingleEntryDependency = require("./dependencies/SingleEntryDependency");

class SingleEntryPlugin {
	constructor(context, entry, name) {
		this.context = context;
		this.entry = entry;
		this.name = name;
	}

	apply(compiler) {
		compiler.plugin("compilation", (compilation, params) => {
			const normalModuleFactory = params.normalModuleFactory;
			/**
			 * ModuleFactory 负责通过 dependency 生成 module。 不同的 dependency 类型，可能使用不同的工厂对象。
			 * 
			 * compilation 中创建 module 的方式
			 * const moduleFactory = this.dependencyFactories.get(dependency.constructor);
			 * moduleFactory.create({
			 *		contextInfo: {
			 *			issuer: "",
			 *			compiler: this.compiler.name
			 *		},
			 *		context: context,
			 *		dependencies: [dependency]
			 * }）
			 *
			 * 下面这一行指定 SingleEntryDependency，需要使用 normalModuleFacotry 创建 module。
			 */
			compilation.dependencyFactories.set(SingleEntryDependency, normalModuleFactory);
		});

		compiler.plugin("make", (compilation, callback) => {
			const dep = SingleEntryPlugin.createDependency(this.entry, this.name);
			compilation.addEntry(this.context, dep, this.name, callback);
		});
	}

	static createDependency(entry, name) {
		const dep = new SingleEntryDependency(entry);
		dep.loc = name;
		return dep;
	}
}

module.exports = SingleEntryPlugin;
