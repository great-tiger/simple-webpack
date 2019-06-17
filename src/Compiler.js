const Tapable = require('./Tapable')
const NormalModuleFactory = require('./NormalModuleFactory')
const Compilation = require('./Compilation')

class Compiler extends Tapable {
    constructor() {
		super();
		this.outputPath = "";
        this.resolvers = {
			normal: null,
			loader: null,
			context: null
		};
    }

    run(callback) {

        const onCompiled = (err, compilation) => {
            if(err) return callback(err);
            // 保存文件到目录
            this.emitAssets(compilation, err => { 
                callback()
            })
        }
        this.applyPluginsAsync("before-run", this, err => {
			if(err) return callback(err);
			this.applyPluginsAsync("run", this, err => {
				if(err) return callback(err);
				this.compile(onCompiled);
			});
		});
    }


	createCompilation() {
		return new Compilation(this);
	}

	newCompilation(params) {
        const compilation = this.createCompilation();
        this.applyPlugins("this-compilation", compilation, params);
		this.applyPlugins("compilation", compilation, params);
		return compilation;
    }
    
    createNormalModuleFactory() {
        const normalModuleFactory = new NormalModuleFactory(this.options.context, this.resolvers, this.options.module || {});
        // 我的测试用例中，没有注册该事件
		this.applyPlugins("normal-module-factory", normalModuleFactory);
		return normalModuleFactory;
	}

	createContextModuleFactory() {

	}

    newCompilationParams() {
		const params = {
			normalModuleFactory: this.createNormalModuleFactory()
		};
		return params;
	}

    compile(callback) {
        const params = this.newCompilationParams();
		this.applyPluginsAsync("before-compile", params, err => {
			if(err) return callback(err);

			this.applyPlugins("compile", params);

			const compilation = this.newCompilation(params);

			this.applyPluginsParallel("make", compilation, err => {
				if(err) return callback(err);
				compilation.finish();
				compilation.seal(err => {
					if(err) return callback(err);
					this.applyPluginsAsync("after-compile", compilation, err => {
						if(err) return callback(err);

						return callback(null, compilation);
					});
				});
			});
		});
    }
    
    emitAssets(compilation, callback) { 
        let outputPath;

        const emitFiles = (err) => {
			// 保存文件
			require("async").forEach(Object.keys(compilation.assets), (file, callback) => {
				let targetFile = file;

				const writeOut = (err) => {
					if(err) return callback(err);
					const targetPath = this.outputFileSystem.join(outputPath, targetFile);
					const source = compilation.assets[file];
					let content = source.source();

					if(!Buffer.isBuffer(content)) {
						content = new Buffer(content, "utf8"); // eslint-disable-line
					}

					this.outputFileSystem.writeFile(targetPath, content, callback);
				};

				writeOut();
			})
		};

		this.applyPluginsAsync("emit", compilation, err => {
			if(err) return callback(err);
			// outputPath = compilation.getPath(this.outputPath);
			outputPath = this.outputPath;
			this.outputFileSystem.mkdirp(outputPath, emitFiles);
		});
    }
}

module.exports = Compiler