const roomUtil = require('./roomUtil')

const arr = [
    { type: 1, value: '2', belong: [1, 0], points: 7 },
    { type: 0, value: '2', belong: [0, 1], points: 8 },
    { type: 3, value: '3', belong: [0, 2], points: 9 },
    { type: 0, value: '3', belong: [1, 1], points: 12 },
    { type: 3, value: '4', belong: [1, 2], points: 13 },
    { type: 0, value: '5', belong: [2, 0], points: 20 },
    { type: 0, value: '6', belong: [2, 1], points: 24 },
    { type: 2, value: '7', belong: [2, 2], points: 26 },
    { type: 2, value: 'A', belong: [0, 0], points: 54 }
]

console.log(roomUtil.judgePokers(arr))
