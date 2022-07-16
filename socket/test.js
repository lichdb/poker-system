const roomUtil = require('./roomUtil')

const arr = {
    1:[
        { type: 1, value: '2', belong: [ -1, -1 ], points: 7 },
        { type: 1, value: '3', belong: [ -1, -1 ], points: 11 },
        { type: 0, value: '7', belong: [ -1, -1 ], points: 28 },
        { type: 3, value: '8', belong: [ -1, -1 ], points: 29 },
        { type: 1, value: '8', belong: [ -1, -1 ], points: 31 },
        { type: 2, value: '9', belong: [ -1, -1 ], points: 34 },
        { type: 0, value: '9', belong: [ -1, -1 ], points: 36 },
        { type: 0, value: 'J', belong: [ -1, -1 ], points: 44 },
        { type: 2, value: 'Q', belong: [ -1, -1 ], points: 46 }
      ]
}

console.log(JSON.stringify(arr))
