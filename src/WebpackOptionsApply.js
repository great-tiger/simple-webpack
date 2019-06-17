const OptionsApply = require('./OptionsApply')
const EntryOptionPlugin = require('./EntryOptionPlugin')

const CommonJsPlugin = require("./dependencies/CommonJsPlugin");
const ResolverFactory = require("enhanced-resolve").ResolverFactory;
const FunctionModulePlugin = require("./FunctionModulePlugin");

class WebpackOptionsApply extends OptionsApply {
    constructor() {
        super()
    }

    process(options, compiler) {
        compiler.outputPath = options.output.path;
        compiler.apply(
            new FunctionModulePlugin(options.output)
        );
        compiler.apply(new EntryOptionPlugin());
        compiler.apply(new CommonJsPlugin(options.module));
        // 处理 entry-option
        compiler.applyPluginsBailResult("entry-option", options.context, options.entry);

        if(!compiler.inputFileSystem) throw new Error("No input filesystem provided");
        compiler.resolvers.normal = ResolverFactory.createResolver(Object.assign({
            fileSystem: compiler.inputFileSystem
        }, options.resolve));
        compiler.resolvers.context = ResolverFactory.createResolver(Object.assign({
            fileSystem: compiler.inputFileSystem,
            resolveToContext: true
        }, options.resolve));
        compiler.resolvers.loader = ResolverFactory.createResolver(Object.assign({
            fileSystem: compiler.inputFileSystem
        }, options.resolveLoader));
        compiler.applyPlugins("after-resolvers", compiler);
        return options
    }
}

module.exports = WebpackOptionsApply