const SingleEntryPlugin = require("./SingleEntryPlugin");

module.exports = class EntryOptionPlugin {
	apply(compiler) {
		compiler.plugin("entry-option", (context, entry) => {
			if(typeof entry === "string") {
				compiler.apply(new SingleEntryPlugin(context, entry, 'main'));
			}
			return true;
		});
	}
};
