const Tapable = require('../src/Tapable')

class Test extends Tapable {
    constructor() {
        super();
    }
}

let myTester = new Test()
myTester.plugin('testWaterFall', (a, b, c, d, e) => {
    console.log('1->', a, b, c, d, e)
    return 1
})
myTester.plugin('testWaterFall', (a, b, c, d, e) => {
    console.log('2->', a, b, c, d, e)
    return 2
})
myTester.plugin('testWaterFall', (a, b, c, d, e) => {
    console.log('3->', a, b, c, d, e)
    return 3
})

myTester.applyPluginsWaterfall('testWaterFall', 0, 'b', 'c', 'd', 'e')