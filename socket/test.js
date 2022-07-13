const roomUtil = require('./roomUtil')

const pokersA = [
    { type: 1, value: 'K', belong: [], points: 50 },
    { type: 1, value: '10', belong: [], points: 38 },
    { type: 1, value: 'A', belong: [], points: 54 },
    { type: 1, value: '5', belong: [], points: 19 },
    { type: 1, value: '6', belong: [], points: 23 },
    { type: 3, value: '4', belong: [], points: 15 },
    { type: 1, value: '2', belong: [], points: 8 },
    { type: 1, value: '7', belong: [], points: 28 },
    { type: 1, value: '3', belong: [], points: 40 }
]
const flag = roomUtil.judgeRedAll(pokersA)
console.log(flag)
