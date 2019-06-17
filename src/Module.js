const DependenciesBlock = require("./DependenciesBlock");
const SortableSet = require("./util/SortableSet");

let debugId = 1000;

const sortById = (a, b) => {
    return a.id - b.id;
};

const sortByDebugId = (a, b) => {
    return a.debugId - b.debugId;
};

class Module extends DependenciesBlock {
    constructor() {
        super();
        this.id = null;
        this._chunks = new SortableSet(undefined, sortById);
    }
    addChunk(chunk) {
        this._chunks.add(chunk);
        this._chunksDebugIdent = undefined;
    }
}
Module.prototype.source = null;

module.exports = Module