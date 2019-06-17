const asyncLib = require("async");
const Tapable = require("./Tapable");
const NormalModule = require('./NormalModule');
const Parser = require('./Parser')
/**
 {
     loader: 'abc',
     options: 'def'
 }
 转换成 abc?def
 */
function loaderToIdent(data) {
    if (typeof data.options === "string") {
        return data.loader + "?" + data.options
    }
}
// 与上面的转换互逆
function identToLoaderRequest(resultString) {
    const idx = resultString.indexOf("?");
    let options;

    if (idx >= 0) {
        options = resultString.substr(idx + 1);
        resultString = resultString.substr(0, idx);

        return {
            loader: resultString,
            options
        };
    } else {
        return {
            loader: resultString
        };
    }
}

class NormalModuleFactory extends Tapable {
    constructor(context, resolvers, options) {
        super()
        this.resolvers = resolvers;
        this.context = context || "";
        this.plugin("factory", () => (result, callback) => {
            // 注意该插件的返回值是一个函数
            // 该函数负责解析 resource 的绝对地址
            let resolver = this.applyPluginsWaterfall0("resolver", null);
            resolver(result, (err, data) => {
                if (err) return callback(err);
                // 不用考虑这个
                this.applyPluginsAsyncWaterfall("after-resolve", data, (err, result) => {
                    if (err) return callback(err);
                    // 不用考虑这个，使用自定义的创建模块插件
                    let createdModule = this.applyPluginsBailResult("create-module", result);
                    if (!createdModule) {
                        createdModule = new NormalModule(
                            result.request,
                            result.userRequest,
                            result.rawRequest,
                            result.loaders,
                            result.resource,
                            result.parser
                        );
                    }
                    // 不用考虑这个，模块创建完成
                    createdModule = this.applyPluginsWaterfall0("module", createdModule);

                    return callback(null, createdModule);
                })
            })
        })
        /**
         * 这个模块中最核心的部分
         */
        this.plugin("resolver", () => (data, callback) => {
            const contextInfo = data.contextInfo;
            const context = data.context;
            const request = data.request;

            let resource = request // TODO 和源码不一样
            asyncLib.parallel([ //TODO 和源码不一样
                callback => {
                    if (resource === "" || resource[0] === "?")
                        return callback(null, {
                            resource
                        });
                    // resolvers 的创建，是在 WebpackOptionsApply.js 中进行的。
                    this.resolvers.normal.resolve(contextInfo, context, resource, (err, resource, resourceResolveData) => {
                        if (err) return callback(err);
                        callback(null, {
                            resourceResolveData,
                            resource
                        });
                    });
                }
            ], (err, results) => {
                var resource = results[0].resource;

                callback(null, {
                    context: context,
                    request: request,
                    dependencies: data.dependencies,
                    rawRequest: request,
                    loaders: [],
                    resource: resource,
                    parser: this.getParser({})
                })
            })

        });
    }
    /** 
        data 参数范例
        {
            "contextInfo": {
                "issuer": ""
            },
            "context": "/Users/liqingliu/Program/Study/sourceAnalysis/webpack分析",
            "dependencies": [
                { 这是一个 SingleEntryDependency
                "module": null,
                "request": "/Users/liqingliu/Program/Study/sourceAnalysis/webpack分析/mytest/simple/index.js",
                "userRequest": "/Users/liqingliu/Program/Study/sourceAnalysis/webpack分析/mytest/simple/index.js",
                "loc": "main"
                }
            ]
        }
     */
    create(data, callback) {
        const dependencies = data.dependencies;
        // 上下文
        const context = data.context || this.context;
        // 入口文件
        const request = dependencies[0].request;
        const contextInfo = data.contextInfo || {};
        // 默认是没有的
        this.applyPluginsAsyncWaterfall("before-resolve", {
            contextInfo,
            context,
            request,
            dependencies
        }, (err, result) => { /* 这里的 result 其实就是调用 before-resolve 插件的处理结果 */
            if (err) return callback(err);
            const factory = this.applyPluginsWaterfall0("factory", null);
            factory(result, (err, module) => {
                if (err) return callback(err);
                callback(null, module);
            })
        })

    }

    resolveRequestArray(contextInfo, context, array, resolver, callback) {

    }

    getParser(parserOptions) {
        return this.createParser(parserOptions);
    }

    createParser(parserOptions) {
        const parser = new Parser();
        this.applyPlugins2("parser", parser, parserOptions || {});
        return parser;
    }
}
module.exports = NormalModuleFactory