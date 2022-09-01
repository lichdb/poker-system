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

let data = [
    {
        user_id: 1,
        user_name: '1012208985',
        user_register: 1657512375120,
        user_login: 1661956733906,
        user_nickname: 'O(∩_∩)O',
        user_ban: 1
    },
    {
        user_id: 13,
        user_name: '123456789',
        user_register: 1658415429863,
        user_login: 1661957383483,
        user_nickname: '瑶瑶',
        user_ban: 1
    },
    {
        user_id: 7,
        user_name: '1271020690',
        user_register: 1657719247754,
        user_login: 1661957386789,
        user_nickname: '帅气的小胡',
        user_ban: 1
    },
    {
        user_id: 7,
        user_name: '1271020690',
        user_register: 1657719247754,
        user_login: 1661957393776,
        user_nickname: '帅气的小胡',
        user_ban: 1
    }
]

console.log(roomUtil.updateUserInfos(data))
