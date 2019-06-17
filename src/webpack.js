const Compiler = require('./Compiler')
const WebpackOptionsApply = require("./WebpackOptionsApply");
const NodeEnvironmentPlugin = require("./node/NodeEnvironmentPlugin");

/**
 * context 命令执行目录
 */
module.exports = function webpack(options) {
    let compiler = new Compiler()
    /**
     * 为 compiler 增加文件读写的能力
     */
    new NodeEnvironmentPlugin().apply(compiler);

    /**
     * Environment 创建成功后触发 compiler 的 environment 事件
     * 该实例中没有用到下面两个事件
     */
    compiler.applyPlugins("environment");
    compiler.applyPlugins("after-environment");

    /**
     * 根据 options 注册一系列的插件
     */
    compiler.options = new WebpackOptionsApply().process(options, compiler);

    
    compiler.run(function() {
        console.log('run completed')
    })
}