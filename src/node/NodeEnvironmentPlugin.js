const NodeOutputFileSystem = require("./NodeOutputFileSystem");
const NodeJsInputFileSystem = require("enhanced-resolve/lib/NodeJsInputFileSystem");
const CachedInputFileSystem = require("enhanced-resolve/lib/CachedInputFileSystem");

class NodeEnvironmentPlugin {
	apply(compiler) {
		compiler.inputFileSystem = new CachedInputFileSystem(new NodeJsInputFileSystem(), 60000);
		const inputFileSystem = compiler.inputFileSystem;
		compiler.outputFileSystem = new NodeOutputFileSystem();
		compiler.plugin("before-run", (compiler, callback) => {
			if(compiler.inputFileSystem === inputFileSystem)
				inputFileSystem.purge();
			callback();
		});
	}
}
module.exports = NodeEnvironmentPlugin;
