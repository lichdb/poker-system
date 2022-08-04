const roomUtil = require('./roomUtil')
const util = require('../util/util')
const SqlUtil = require('mysql-op')
const pool = require('../pool.js')
const sqlUtil = new SqlUtil(pool, 'room')
const lockJS = require('./lock')
const RoomService = require('../service/RoomService')

const pokers = [
    {
        type: 0,
        value: '4',
        points: 16
    },
    {
        type: 0,
        value: 'K',
        points: 52
    },
    { type: 1, value: 'Q', points: 47 }
]

const pokers2 = [
    {
        type: 3,
        value: '6',
        points: 21
    },
    {
        type: 1,
        value: 'K',
        points: 51
    },
    { type: 2, value: 'Q', points: 46 }
]

const flag = roomUtil.compareTwoPokers(pokers, pokers2)

console.log(flag)
