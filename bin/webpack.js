#! /usr/local/bin/node
let path = require('path')
let webpack = require('../src/webpack')
let args = process.argv.slice(2)
// 没有指定入口文件，直接退出
if (!args.length) return

// webpack 源码中也是这么取的，把命令行的执行目录当成工作目录。
let context = process.cwd()
// 入口文件路径是相对于工作目录的
let entry = path.resolve(context, args[0])
let options = {
    context,
    entry,
    output: {
        path: path.join(context, 'examples'),
        filename: 'output.js'
    }
}

webpack(options)

// 测试命令  node ./bin/webpack.js ./examples/index.js   