const asyncLib = require("async");
const Tapable = require('./Tapable')
const Semaphore = require("./util/Semaphore");
const Chunk = require("./Chunk");
const Entrypoint = require("./Entrypoint");

const MainTemplate = require("./MainTemplate");
const ModuleTemplate = require("./ModuleTemplate");


function iterationOfArrayCallback(arr, fn) {
    for (let index = 0; index < arr.length; index++) {
        fn(arr[index]);
    }
}

class Compilation extends Tapable {
    constructor(compiler) {
        super()
        this.compiler = compiler;
        this.resolvers = compiler.resolvers;
        this.inputFileSystem = compiler.inputFileSystem;

        const options = this.options = compiler.options;
        this.outputOptions = options && options.output;

        this.chunks = []; // 所有 chunk
        this.namedChunks = {}; // 所有命名 chunk
        this.entrypoints = {};
        this.modules = []; // 所有模块数据
        this._modules = {}; // 所有模块，但是用的是 identifier: module 方式
        this.entries = []; // 所有的入口模块
        this.preparedChunks = []; // chunk集合

        this.dependencyFactories = new Map(); // dependency  ModuleFactory 映射
        this.assets = {}; // 保存所有的 asset, key 为文件名， value 为文件内容。 chunk.files 保存的是文件名数组，要想需要内容，需要从该对象中取。做到了内容集中管理。

        this.semaphore = new Semaphore(100); // 控制并发运行的函数数量

        // 下面两个用来生成 chunk assets 的内容
        this.mainTemplate = new MainTemplate(this.outputOptions);
        this.moduleTemplate = new ModuleTemplate(this.outputOptions);
        /**
         * 插件中设置
         * 比如：CommonJsPlugin 中
         */
        this.dependencyTemplates = new Map();
    }

    _addModuleChain(context, dependency, onModule, callback) {
        const moduleFactory = this.dependencyFactories.get(dependency.constructor);
        // 创建Module, 我的测试用例中生成的是 NormalModule
        moduleFactory.create({
            contextInfo: {
                issuer: "",
                compiler: this.compiler.name
            },
            context: context,
            dependencies: [dependency]
        }, (err, module) => {
            // 把该模块添加到 this._modules this.modules
            const result = this.addModule(module)
            onModule(module)
            // 调用 module.build 开发 build 单个模块
            this.buildModule(module, false, null, null, (err) => {
                moduleReady.call(this)
            })
            // 单个模块构建完成后
            function moduleReady() {
                // 递归处理该模块的依赖，最终形成该该模块的依赖链
                this.processModuleDependencies(module, err => {
                    if (err) {
                        return callback(err);
                    }

                    return callback(null, module);
                });
            }
        })
    }

    processModuleDependencies(module, callback) {
        const dependencies = [];

        /**
         * dependencies 会是一个二维数组
         * 满足isEqualResource这个条件的，会放到一个子数组里面
         */
        function addDependency(dep) {
            for (let i = 0; i < dependencies.length; i++) {
                if (dep.isEqualResource(dependencies[i][0])) {
                    return dependencies[i].push(dep);
                }
            }
            dependencies.push([dep]);
        }

        function addDependenciesBlock(block) {
            if (block.dependencies) {
                iterationOfArrayCallback(block.dependencies, addDependency);
            }
        }

        addDependenciesBlock(module);
        this.addModuleDependencies(module, dependencies, this.bail, null, true, callback);
    }
    /**
     * 一个模块可以还会依赖其它的模块，增加模块依赖的模块
     */
    addModuleDependencies(module, dependencies, bail, cacheGroup, recursive, callback) {
        let _this = this;
        const factories = [];
        // 构造factories  factories[0] 为一个Factory， factories[1] 为一个依赖数组
        // 比如： [NormalModuleFactory实例，[CommonJsRequireDependency实例,CommonJsRequireDependency实例]]
        for (let i = 0; i < dependencies.length; i++) {
            // 比如说是 NormalModuleFactory
            const factory = _this.dependencyFactories.get(dependencies[i][0].constructor);
            factories[i] = [factory, dependencies[i]];
        }
        // 并行执行 factories
        asyncLib.forEach(factories, function iteratorFactory(item, callback) {
            const dependencies = item[1];
            _this.semaphore.acquire(() => {
                const factory = item[0];
                factory.create({
                    contextInfo: {
                        issuer: "",
                        compiler: _this.compiler.name
                    },
                    context: module.context,
                    dependencies: dependencies
                }, function factoryCallback(err, dependentModule) {

                    function iterationDependencies(depend) {
                        for (let index = 0; index < depend.length; index++) {
                            const dep = depend[index];
                            dep.module = dependentModule;
                        }
                    }

                    // dependentModule 为创建出的新 module
                    if (!dependentModule) {
                        _this.semaphore.release();
                        return process.nextTick(callback);
                    }
                    // newModule 是否添加了新module
                    const newModule = _this.addModule(dependentModule);
                    iterationDependencies(dependencies);

                    _this.buildModule(dependentModule, false, module, dependencies, err => {
                        _this.semaphore.release();
                        if (recursive) {
                            // 继续递归处理模块依赖
                            _this.processModuleDependencies(dependentModule, callback);
                        } else {
                            return callback();
                        }
                    })
                })
            })
        }, function finalCallbackAddModuleDependencies(err) {
            // In V8, the Error objects keep a reference to the functions on the stack. These warnings &
            // errors are created inside closures that keep a reference to the Compilation, so errors are
            // leaking the Compilation object. Setting _this to null workarounds the following issue in V8.
            // https://bugs.chromium.org/p/chromium/issues/detail?id=612191
            _this = null;

            if (err) {
                return callback(err);
            }

            return process.nextTick(callback);
        })
    }

    /**
     * @param {*} module NormalModule
     * @param {*} optional  null
     * @param {*} origin null
     * @param {*} dependencies 
     * @param {*} thisCallback 
     */
    buildModule(module, optional, origin, dependencies, thisCallback) {
        function callback() {
            thisCallback()
        }
        module.build(this.options, this, this.resolvers.normal, this.inputFileSystem, (error) => {
            // module.dependencies.sort(Dependency.compare)
            return callback()
        })
    }

    /**
     *  本例中 entry SingleEntryDependency
     */
    addEntry(context, entry, name, callback) {
        const slot = {
            name: name,
            module: null
        };
        // 准备好的chunk
        this.preparedChunks.push(slot);
        this._addModuleChain(context, entry, (module) => {
            // SingleEntryDependency 是可以创建一个 module的
            // 这里就是模块创建成功后的回调
            // 这个模块就是入口模块
            entry.module = module
            this.entries.push(module)
        }, (err, module) => {
            // A 模块可能依赖 B, B 可能依赖 C , D
            // 此时 module 之间的依赖关系已经建立完成
            if (err) {
                return callback(err);
            }
            if (module) {
                slot.module = module;
            } else {
                // 没有生成module，则从 preparedChunks 移除 chunk。这里的slot，起名叫chunk觉得更好理解。
                const idx = this.preparedChunks.indexOf(slot);
                this.preparedChunks.splice(idx, 1);
            }
            return callback(null, module);
        })
    }

    addModule(module) {
        // /Users/liqingliu/Program/Study/sourceAnalysis/webpack分析/mytest/simple/index.js
        // 模块标识，用的是模块的文件地址
        const identifier = module.identifier()
        if (this._modules[identifier]) {
            return false;
        }
        // module.unbuild(); 重置了很多变量
        this._modules[identifier] = module;
        this.modules.push(module);
        return true;
    }

    finish() {

    }

    seal(callback) {
        const self = this;
        // 准备工作
        self.preparedChunks.forEach(preparedChunk => {
            const module = preparedChunk.module;
            // 保存 chunk 到 compilation.chunks
            const chunk = self.addChunk(preparedChunk.name, module);
            /**
             * preparedChunks 是在 addEntry 方法中添加的
             * 所以这里生成的 chunk 都是入口点 即： Entrypoint
             */
            const entrypoint = self.entrypoints[chunk.name] = new Entrypoint(chunk.name);
            entrypoint.unshiftChunk(chunk);

            // chunk 和 module 之间关联
            chunk.addModule(module);
            module.addChunk(chunk);
            chunk.entryModule = module;
            /**
             * module.addChunk(chunk) 这样module就和chunk建立起了联系。
             * 但是 module 下还有依赖的 sub module 等等 很显然 sub module 也是属于当前chunk的
             * 我们也需要维护 sub module 与 chunk 之间的关系
             * 下面的方法应该就是干这件事的
             */
            self.processDependenciesBlockForChunk(module, chunk);
        });

        // 为模块增加ID
        self.applyModuleIds();

        // 此例子中什么也没干
        self.createModuleAssets();
        // 本例子中直接执行 createChunkAssets
        if (self.applyPluginsBailResult("should-generate-chunk-assets") !== false) {
            self.applyPlugins0("before-chunk-assets");
            self.createChunkAssets();
        }
        callback()
    }

    addChunk(name, module, loc) {
        const chunk = new Chunk(name, module, loc);
        this.chunks.push(chunk);
        if (name) {
            this.namedChunks[name] = chunk;
        }
        return chunk;
    }

    createModuleAssets() {

    }

    createChunkAssets() {
        const outputOptions = this.outputOptions;
        const filename = outputOptions.filename;
        for (let i = 0; i < this.chunks.length; i++) {
            const chunk = this.chunks[i];
            chunk.files = [];
            let source;
            let file;
            const filenameTemplate = filename;
            if (chunk.hasRuntime()) {
                source = this.mainTemplate.render(this.hash, chunk, this.moduleTemplate, this.dependencyTemplates);
            }
            // TODO 根据 filenameTemplate 生成文件名称，这里省略
            file = filenameTemplate;
            this.assets[file] = source;
            // 注意 chunk.files 保存的只是文件名称
            chunk.files.push(file);
        }
    }
    /**
     * 为模块增加id，这里还是有些逻辑的。
     */
    applyModuleIds() {
        let unusedIds = [];
		let nextFreeModuleId = 0;
		const modules2 = this.modules;
		for(let indexModule2 = 0; indexModule2 < modules2.length; indexModule2++) {
			const module2 = modules2[indexModule2];
			if(module2.id === null) {
				if(unusedIds.length > 0)
					module2.id = unusedIds.pop();
				else
					module2.id = nextFreeModuleId++;
			}
		}
    }
    
    processDependenciesBlockForChunk(module, chunk) {
        let block = module;
        const queue = [{
            block,
			module,
			chunk
        }];
        const iteratorDependency = d => {
			if(!d.module) {
				return;
			}
			if(chunk.addModule(d.module)) {
				d.module.addChunk(chunk);
				queue.push({
					block: d.module,
					module: d.module,
					chunk
				});
			}
        };
        while(queue.length) {
			const queueItem = queue.pop();
			block = queueItem.block;
			module = queueItem.module;
			chunk = queueItem.chunk;

			if(block.dependencies) {
				iterationOfArrayCallback(block.dependencies, iteratorDependency);
			}
		}
    }
}

module.exports = Compilation