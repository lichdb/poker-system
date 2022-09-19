const roomUtil = require('./roomUtil')
const util = require('../util/util')
const SqlUtil = require('mysql-op')
const pool = require('../pool.js')
const sqlUtil = new SqlUtil(pool, 'room')
const lockJS = require('./lock')
const RoomService = require('../service/RoomService')

const pokerA = [
    { type: 2, value: '10', belong: Array(2), points: 38 },
    { type: 2, value: 'A', belong: Array(2), points: 54 },
    { type: 1, value: 'A', belong: Array(2), points: 55 }
]

const pokerB = [
    { type: 3, value: '10', belong: Array(2), points: 37 },
    { type: 3, value: 'A', belong: Array(2), points: 53 },
    { type: 0, value: 'A', belong: Array(2), points: 56 }
]

console.log(roomUtil.compareTwoPokers(pokerA, pokerB))
