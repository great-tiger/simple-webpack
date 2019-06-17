### webpack(options)
* 创建 compiler 实例
* 通过 NodeEnvironmentPlugin 插件，为 compiler 增加读写文件的能力等
* new WebpackOptionsApply().process(options, compiler); 这个就比较重要了，会在这里根据options注册一系列的插件。   
本实例中主要用到了三个：   
FunctionModulePlugin    
EntryOptionPlugin 处理Entry   
CommonJsPlugin 使 webpack 支持解析 commonJs    

### Compiler
1. 先从构造函数看起
```javascript
constructor() {
    super();
    // 下面参数的初始化都在 new WebpackOptionsApply().process(options, compiler)
    this.outputPath = "";
    this.resolvers = {
        normal: null,
        loader: null,
        context: null
    };
}
```
resolvers 到底是什么呢？ 代码不骗人，看代码吧 
```javascript
// WebpackOptionsApply.js
compiler.resolvers.normal = ResolverFactory.createResolver(Object.assign({
    fileSystem: compiler.inputFileSystem
}, options.resolve));
```
ResolverFactory 来源于这个库 [enhanced-resolve](https://github.com/webpack/enhanced-resolve)
这个库提供 require.resolve 类似的功能，返回引用模块的绝对路径。   
> 特点：可配置、支持异步、支持插件等等

2. run 方法
```javascript
// 保留了关键代码
run(callback) {
    const onCompiled = (err, compilation) => {
        if (err) return callback(err);
        // 保存文件到目录
        this.emitAssets(compilation, err => {
            callback()
        })
    }
    this.compile(onCompiled);
}
```
该方法只负责两件事情: 调用compile启动编译、编译完成后调用emitAssets保存assets
3. compile 方法
```javascript
compile(callback) {
    // 创建 normalModuleFactory，用来创建 Module 的
    const params = this.newCompilationParams();
    // 创建compilation对象
    const compilation = this.newCompilation(params);
    // 触发compilation的make阶段
    this.applyPluginsParallel("make", compilation, err => {
        compilation.finish();
        // 见 compilation 部分
        compilation.seal(err => {
            this.applyPluginsAsync("after-compile", compilation, err => {
                return callback(null, compilation);
            });
        });
    });
}
```
newCompilation 有一点需要注意一下，这时候会触发 compiler 的 compilation 事件。     
插件们通过注册该事件就可以拿到大名鼎鼎的 compilation 了。   

> 下面进入 make 阶段，开始真正干活了
EntryOptionPlugin 会注册 SingleEntryPlugin 插件，在该插件内部注册了 make 事件   
调用 compilation.addEntry 开始干活。  项目经理 compilation 该上场了

### Compilation

1. addEntry 开始工作的入口
```javascript
 addEntry(context, entry, name, callback) {
     const slot = {
         name: name,
         module: null
     };
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
         slot.module = module;
         return callback(null, module);
     })
 }
```

2. _addModuleChain 
```javascript
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
        // 第一步已经介绍过了
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
```

3. seal 方法，又是一个重头戏
```javascript
seal(callback) {
    const self = this;
    // 根据preparedChunks生成 chunk
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

    // 生成 assets, 这个方法比较重要。会根据各种模板生成 source。
    self.createChunkAssets();

    callback()
}
```
> seal 方法中还会调用一大堆插件，对chunk等进行优化  

### NormalModuleFacotry

总结下来，NormalModuleFacotory 主要做了三项工作：   

1. 解析 resource 成绝对路径

```javascript
this.resolvers.normal.resolve(contextInfo, context, resource, (err, resource, resourceResolveData) => {
    if (err) return callback(err);
    callback(null, {
        resourceResolveData,
        resource
    });
});
```

2. 创建 parser

```javascript
createParser(parserOptions) {
    const parser = new Parser();
    // 这一步parser已经生成，处理程序主要给 parser 注册事件，增强parser的功能
    this.applyPlugins2("parser", parser, parserOptions || {});
    return parser;
}
```

3. 创建 module

```javascript
createdModule = new NormalModule(
    result.request,
    result.userRequest,
    result.rawRequest,
    result.loaders,
    result.resource,
    result.parser
);
```


总体下来事件触发过程：  
1. before-resolve  
2. factory  
3. resolver  
4. parser  
5. after-resolve  
6. create-module  
7. module  

### NormalModule
1. build
```javascript
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
        } catch (e) {
            console.log('e', e)
            return callback();
        }
        return callback()
    })
}
```
doBuild 中运行loader使用的是 [loader-runner](https://github.com/webpack/loader-runner)。     
传入文件地址、要使用的loader（本例中为空）返回文件内容。   

parser.parse 解析模块的依赖，放入到 module.dependencies 数组中。数组中的每一项都是一个 Dependency 实例。  

### Parser

在 webpack 中模块间的依赖关系如何表达的呢？

每一个模块都会有一个 dependencies 数组来表示模块的所有依赖项。 

parser的主要作用就是解析出模块的 dependencies。

对于模块：

```javascript
let a = require('./a.js');
let b = require('./b.js');
a();
b();
```

它的dependencies会是什么呢？

```javascript
dependencies = [
  CommonJsRequireDependency,
  RequireHeaderDependency,
  CommonJsRequireDependency,
  RequireHeaderDependency
]
```

JSON 格式：

```json
[
  {
    "module": null,
    "request": "./a",
    "userRequest": "./a",
    "range": [
      16,
      21
    ],
    "loc": {
      "start": {
        "line": 1,
        "column": 8
      },
      "end": {
        "line": 1,
        "column": 22
      }
    },
    "optional": false
  },
  {
    "module": null,
    "range": [
      8,
      15
    ],
    "loc": {
      "start": {
        "line": 1,
        "column": 8
      },
      "end": {
        "line": 1,
        "column": 22
      }
    }
  },
  {
    "module": null,
    "request": "./b",
    "userRequest": "./b",
    "range": [
      40,
      45
    ],
    "loc": {
      "start": {
        "line": 2,
        "column": 8
      },
      "end": {
        "line": 2,
        "column": 22
      }
    },
    "optional": false
  },
  {
    "module": null,
    "range": [
      32,
      39
    ],
    "loc": {
      "start": {
        "line": 2,
        "column": 8
      },
      "end": {
        "line": 2,
        "column": 22
      }
    }
  }
]
```
我们注意到每一个 dependency 都有一个 module 字段， 代表本 dependency 对应的 module。   
>  并不是所有的 dependency 都会有对应的 module。 RequireHeaderDependency （ 继承 NullDependency ） 就没有。


上面的依赖是如何解析出来的呢？       

1. 把模块源码解析成 ast

```javascript
parse(source, initialState) {
    let ast;
    ast = acorn.parse(source, POSSIBLE_AST_OPTIONS[i]);
}
```
> 这里的 acron 是一个第三方的库, 负责把 js 源码解析成 ast。 [ast 效果查看](https://astexplorer.net/)

2. 遍历树的节点
像 require('./a') 这样的调用，会触发下面的方法

```javascript
  walkCallExpression(expression) {
      const callee = this.evaluateExpression(expression.callee);
      // 这里的 callee.identifier 是 require
      let result = this.applyPluginsBailResult1("call " + callee.identifier, expression);
      if (result === true) return;
  }
```
上面的代码会触发 call require 事件

3. call require 事件处理程序
本例相关的 call require， 在 CommonJsRequireDependencyParserPlugin 插件中注册的。 
 
 ```javascript
class CommonJsRequireDependencyParserPlugin {
	constructor(options) {
		this.options = options;
    }

    apply(parser) {
        /**
         * require('./b'); 这种形式会增加两个依赖
         * CommonJsRequireDependency
         * RequireHeaderDependency
         */
        parser.plugin("call require", (expr) => {
            if (expr.arguments.length !== 1) return;
            const param = parser.evaluateExpression(expr.arguments[0]);
            const result = parser.applyPluginsBailResult("call require:commonjs:item", expr, param);
            const dep = new RequireHeaderDependency(expr.callee.range);
            dep.loc = expr.loc;
            parser.state.current.addDependency(dep);
            return true;
        })

        /**
         * 添加 CommonJsRequireDependency 依赖
         */
        parser.plugin("call require:commonjs:item", (expr, param) => {
            if (param.isString()) {
                const dep = new CommonJsRequireDependency(param.string, param.range);
                dep.loc = expr.loc;
                dep.optional = !!parser.scope.inTry;
                /**
                 * parser.state.current 可能是 NormalModule
                 * 为模块添加依赖
                 */
				parser.state.current.addDependency(dep);
				return true;
            }
        })
    }
}
```
