function Tapable() {
    this._plugins = {}
}
module.exports = Tapable

function copyProperties(from, to) {
	for(var key in from)
		to[key] = from[key];
	return to;
}

/**
 * 定义webpack插件格式
 * class myPlugin {
 *   apply(compiler) {
 *     compiler.plugin('name', function() {
 *     })
 *   }
 * }
 * 或者 
 * function myPlugin () { }
 * myPlugin.prototype.apply = function () { }
 * 
 * 外部注册插件时用到， 通过调用 new myPlugin().apply 方法把this传出
 */
Tapable.prototype.apply = function apply() {
	for(var i = 0; i < arguments.length; i++) {
		arguments[i].apply(this);
	}
};

/**
 * 注册插件
 */
Tapable.prototype.plugin = function plugin(name, fn) {
	if(Array.isArray(name)) {
		name.forEach(function(name) {
			this.plugin(name, fn);
		}, this);
		return;
	}
	if(!this._plugins[name]) this._plugins[name] = [fn];
	else this._plugins[name].push(fn);
};

/**
 * applyPlugins  运行插件，参数个数任意
 * applyPlugins0 运行插件，没有参数
 * applyPlugins1 运行插件，1个参数
 * applyPlugins2 运行插件，2个参数
 */
Tapable.prototype.applyPlugins = function applyPlugins(name) {
	if(!this._plugins[name]) return;
	var args = Array.prototype.slice.call(arguments, 1);
	var plugins = this._plugins[name];
	for(var i = 0; i < plugins.length; i++)
		plugins[i].apply(this, args);
};

Tapable.prototype.applyPlugins0 = function applyPlugins0(name) {
	var plugins = this._plugins[name];
	if(!plugins) return;
	for(var i = 0; i < plugins.length; i++)
		plugins[i].call(this);
};

Tapable.prototype.applyPlugins1 = function applyPlugins1(name, param) {
	var plugins = this._plugins[name];
	if(!plugins) return;
	for(var i = 0; i < plugins.length; i++)
		plugins[i].call(this, param);
};

Tapable.prototype.applyPlugins2 = function applyPlugins2(name, param1, param2) {
	var plugins = this._plugins[name];
	if(!plugins) return;
	for(var i = 0; i < plugins.length; i++)
		plugins[i].call(this, param1, param2);
};


/**
 * 运行插件
 * 插件的返回值不为undefined时，终止后面的插件运行
 */
Tapable.prototype.applyPluginsBailResult = function applyPluginsBailResult(name) {
	if(!this._plugins[name]) return;
	var args = Array.prototype.slice.call(arguments, 1);
	var plugins = this._plugins[name];
	for(var i = 0; i < plugins.length; i++) {
		var result = plugins[i].apply(this, args);
		if(typeof result !== "undefined") {
			return result;
		}
	}
};
/**
 * 其实上面的那个方法已经支持了，为什么还要写下面的5个方法呢？
 */
Tapable.prototype.applyPluginsBailResult1 = function applyPluginsBailResult1(name, param) {
	if(!this._plugins[name]) return;
	var plugins = this._plugins[name];
	for(var i = 0; i < plugins.length; i++) {
		var result = plugins[i].call(this, param);
		if(typeof result !== "undefined") {
			return result;
		}
	}
};

Tapable.prototype.applyPluginsBailResult2 = function applyPluginsBailResult2(name, param1, param2) {
	if(!this._plugins[name]) return;
	var plugins = this._plugins[name];
	for(var i = 0; i < plugins.length; i++) {
		var result = plugins[i].call(this, param1, param2);
		if(typeof result !== "undefined") {
			return result;
		}
	}
};

Tapable.prototype.applyPluginsBailResult3 = function applyPluginsBailResult3(name, param1, param2, param3) {
	if(!this._plugins[name]) return;
	var plugins = this._plugins[name];
	for(var i = 0; i < plugins.length; i++) {
		var result = plugins[i].call(this, param1, param2, param3);
		if(typeof result !== "undefined") {
			return result;
		}
	}
};

Tapable.prototype.applyPluginsBailResult4 = function applyPluginsBailResult4(name, param1, param2, param3, param4) {
	if(!this._plugins[name]) return;
	var plugins = this._plugins[name];
	for(var i = 0; i < plugins.length; i++) {
		var result = plugins[i].call(this, param1, param2, param3, param4);
		if(typeof result !== "undefined") {
			return result;
		}
	}
};

Tapable.prototype.applyPluginsBailResult5 = function applyPluginsBailResult5(name, param1, param2, param3, param4, param5) {
	if(!this._plugins[name]) return;
	var plugins = this._plugins[name];
	for(var i = 0; i < plugins.length; i++) {
		var result = plugins[i].call(this, param1, param2, param3, param4, param5);
		if(typeof result !== "undefined") {
			return result;
		}
	}
};

/**
 * 按照注册的顺序执行插件
 * 使用范例：
 * 使用方式：
 * this.applyPluginsAsync("before-run", this, function(err) {
 *	// before-run的插件都执行完成，或者有一个报错时，执行该回调函数
 *	if(err) return callback(err);
 * }.bind(this));
 */
Tapable.prototype.applyPluginsAsyncSeries = Tapable.prototype.applyPluginsAsync = function applyPluginsAsyncSeries(name) {
    // 第一个参数为插件名称，这里获取第二个及后面的参数
    var args = Array.prototype.slice.call(arguments, 1);
    // 最后一个参数为回调函数
    var callback = args.pop();
    // 插件数组
    var plugins = this._plugins[name];
    // 没有name插件
	if(!plugins || plugins.length === 0) return callback();
	var i = 0;
    var _this = this;
    // 为args增加新的回调函数，该函数负责执行第二个开始的插件
	args.push(copyProperties(callback, function next(err) {
		if(err) return callback(err);
		i++;
		if(i >= plugins.length) {
            // 正常执行结束
			return callback();
        }
        // 执行第i个插件，执行完成后继续执行 next 函数
		plugins[i].apply(_this, args);
    }));
    // 执行第一个插件，执行完成后会执行上面的 next 函数
	plugins[0].apply(this, args);
}
/**
 * 并行执行所有的插件
 */
Tapable.prototype.applyPluginsParallel = function applyPluginsParallel(name) {
	var args = Array.prototype.slice.call(arguments, 1);
	var callback = args.pop();
	if(!this._plugins[name] || this._plugins[name].length === 0) return callback();
	var plugins = this._plugins[name];
	var remaining = plugins.length;
	args.push(copyProperties(callback, function(err) {
		// 小于0说明已经有错误了，并且已经执行过callback了，所以直接忽略就可以了
		if(remaining < 0) return; // ignore
		if(err) {
			remaining = -1;
			return callback(err);
		}
		remaining--;
		if(remaining === 0) {
			return callback();
		}
	}));
	for(var i = 0; i < plugins.length; i++) {
		plugins[i].apply(this, args);
		// 小于0说明已经有错误了，并且已经执行过callback了，所以直接忽略就可以了
		if(remaining < 0) return;
	}
};

/**
 * Waterfall 方式，上一个插件的返回值，会传送到下一个插件。
 * applyPluginsWaterfall0
 * applyPluginsWaterfall1
 * applyPluginsWaterfall2
 * 是 applyPluginsWaterfall 的三个特例
 */
Tapable.prototype.applyPluginsWaterfall = function applyPluginsWaterfall(name, init) {
	if(!this._plugins[name]) return init;
	var args = Array.prototype.slice.call(arguments, 1);
	var plugins = this._plugins[name];
	var current = init;
	for(var i = 0; i < plugins.length; i++) {
		args[0] = current;
		current = plugins[i].apply(this, args);
	}
	return current;
};

Tapable.prototype.applyPluginsWaterfall0 = function applyPluginsWaterfall0(name, init) {
	var plugins = this._plugins[name];
	if(!plugins) return init;
	var current = init;
	for(var i = 0; i < plugins.length; i++)
		current = plugins[i].call(this, current);
	return current;
};

Tapable.prototype.applyPluginsWaterfall1 = function applyPluginsWaterfall1(name, init, param) {
	var plugins = this._plugins[name];
	if(!plugins) return init;
	var current = init;
	for(var i = 0; i < plugins.length; i++)
		current = plugins[i].call(this, current, param);
	return current;
};

Tapable.prototype.applyPluginsWaterfall2 = function applyPluginsWaterfall2(name, init, param1, param2) {
	var plugins = this._plugins[name];
	if(!plugins) return init;
	var current = init;
	for(var i = 0; i < plugins.length; i++)
		current = plugins[i].call(this, current, param1, param2);
	return current;
};

Tapable.prototype.applyPluginsAsyncWaterfall = function applyPluginsAsyncWaterfall(name, init, callback) {
	if(!this._plugins[name] || this._plugins[name].length === 0) return callback(null, init);
	var plugins = this._plugins[name];
	var i = 0;
	var _this = this;
	var next = copyProperties(callback, function(err, value) {
		if(err) return callback(err);
		i++;
		if(i >= plugins.length) {
			return callback(null, value);
		}
		plugins[i].call(_this, value, next);
	});
	plugins[0].call(this, init, next);
};