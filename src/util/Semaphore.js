/**
 * 控制并发数
 */
class Semaphore {
	constructor(available) {
		this.available = available;
		this.waiters = [];
	}

	acquire(callback) {
		if(this.available > 0) {
			this.available--;
			callback();
		} else {
			this.waiters.push(callback);
		}
	}

	release() {
		if(this.waiters.length > 0) {
			const callback = this.waiters.pop();
			process.nextTick(callback);
		} else {
			this.available++;
		}
	}
}

module.exports = Semaphore;
