const SortableSet = require("./util/SortableSet");

const sortByIdentifier = (a, b) => {
    if (a.identifier() > b.identifier()) return 1;
    if (a.identifier() < b.identifier()) return -1;
    return 0;
};

class Chunk {

    constructor(name, module, loc) {
        this.origins = [];
        this._modules = new SortableSet(undefined, sortByIdentifier);
        this.entrypoints = [];
        this.chunks = [];

        if (module) {
            this.origins.push({
                module,
                loc,
                name
            });
        }
    }

    addModule(module) {
        if (!this._modules.has(module)) {
            this._modules.add(module);
            return true;
        }
        return false;
    }

    hasRuntime() {
        if (this.entrypoints.length === 0) return false;
        return this.entrypoints[0].chunks[0] === this;
    }

    isInitial() {
        return this.entrypoints.length > 0;
    }

    getNumberOfModules() {
        return this._modules.size;
    }

    mapModules(fn) {
        return Array.from(this._modules, fn);
    }

    hasEntryModule() {
		return !!this.entryModule;
	}
}

module.exports = Chunk;