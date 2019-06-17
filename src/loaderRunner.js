const runner = {
    runLoaders: function(options, callback) {
        callback(null, {
            result: ["abc"]
        })
    },
    getContext: function() {

    }
}

module.exports = runner