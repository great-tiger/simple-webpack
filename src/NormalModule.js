const Module = require('./Module')
const runLoaders = require("loader-runner").runLoaders;
const getContext = require("loader-runner").getContext;
const OriginalSource = require("webpack-sources").OriginalSource;
const ReplaceSource = require("webpack-sources").ReplaceSource;
const CachedSource = require("webpack-sources").CachedSource;
function asString(buf) {
	if(Buffer.isBuffer(buf)) {
		return buf.toString("utf-8");
	}
	return buf;
}

class NormalModule extends Module {
    constructor(request, userRequest, rawRequest, loaders, resource, parser) {
		super();
		this.request = request;
		this.userRequest = userRequest;
		this.rawRequest = rawRequest;
		this.parser = parser;
		this.resource = resource;
		this.context = getContext(resource);
		this.loaders = loaders;
		this.fileDependencies = []; //runloaders 返回的
		this.contextDependencies = [];
		this.warnings = [];
		this.errors = [];
		this.error = null;
		this._source = null;
		this.assets = {};
		this.built = false;
		this._cachedSource = null;
	}

    identifier() {
		return this.request;
	}

    build(options, compilation, resolver, fs, callback) {
        // doBuild 运行 loader， 获取文件内容, 保存到 this._source
        return this.doBuild(options, compilation, resolver, fs, (err) => {
            try {
                // 因为没有让传入回调函数，所以parse过程是同步进行的
                // parse的结果会直接体现在当前module上
				this.parser.parse(this._source.source(), {
					current: this,
					module: this,
					compilation: compilation,
					options: options
				});
			} catch(e) {
                console.log('e', e)
				return callback();
			}
            return callback()
        })
    }

    doBuild(options, compilation, resolver, fs, callback) {
        let resourceBuffer = null
		let sourceMap = null
		// 运行 loader， 获取文件内容
        runLoaders({
            resource: this.resource,
			loaders: this.loaders,
			context: {
                options: options
            },
        }, (err, result) => {
            // 运行 loader， 获取文件内容
            const source = result.result[0]
            this._source = this.createSource(asString(source), resourceBuffer, sourceMap);
			return callback();
        })
    }

    createSource(source, resourceBuffer, sourceMap) {
        const identifier = this.identifier();

		return new OriginalSource(source, identifier)
	}
	/**
	 * dependencyTemplates
	 * dependency 到 templates 之间的 map
	 * 比如:
	 * RequireHeaderDependency  RequireHeaderDependencyTemplate 处理 require 到  __webpack_require__
	 * 
	 */
	source(dependencyTemplates, outputOptions, requestShortener) {
		const source = new ReplaceSource(this._source);
		/**
		 * 变更直接体现在 source 上
		 * 处理：
		 *  require('./a.js')
		 * 到：
		 *  __webpack_require__(1)
		 */
		this.sourceBlock(this, [], dependencyTemplates, source, outputOptions, requestShortener);
		return new CachedSource(source);
	}

	sourceBlock(block, availableVars, dependencyTemplates, source, outputOptions, requestShortener) {
		block.dependencies.forEach((dependency) => this.sourceDependency(
			dependency, dependencyTemplates, source, outputOptions, requestShortener));
	}

	sourceDependency(dependency, dependencyTemplates, source, outputOptions, requestShortener) {
		const template = dependencyTemplates.get(dependency.constructor);
		if(!template) throw new Error("No template for dependency: " + dependency.constructor.name);
		template.apply(dependency, source, outputOptions, requestShortener, dependencyTemplates);
	}
}
module.exports = NormalModule