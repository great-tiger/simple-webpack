class Entrypoint {
	constructor(name) {
		this.name = name;
		this.chunks = [];
	}

	unshiftChunk(chunk) {
		this.chunks.unshift(chunk);
		chunk.entrypoints.push(this);
	}

	insertChunk(chunk, before) {
		const idx = this.chunks.indexOf(before);
		if(idx >= 0) {
			this.chunks.splice(idx, 0, chunk);
		} else {
			throw new Error("before chunk not found");
		}
		chunk.entrypoints.push(this);
	}
	// 返回该 entrypoint 下的所有文件
	getFiles() {
		const files = [];

		for(let chunkIdx = 0; chunkIdx < this.chunks.length; chunkIdx++) {
			for(let fileIdx = 0; fileIdx < this.chunks[chunkIdx].files.length; fileIdx++) {
				if(files.indexOf(this.chunks[chunkIdx].files[fileIdx]) === -1) {
					files.push(this.chunks[chunkIdx].files[fileIdx]);
				}
			}
		}

		return files;
	}
}

module.exports = Entrypoint;
