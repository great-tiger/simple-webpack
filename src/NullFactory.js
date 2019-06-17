class NullFactory {
	create(data, callback) {
		return callback();
	}
}
module.exports = NullFactory;