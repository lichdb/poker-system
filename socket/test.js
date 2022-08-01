const roomUtil = require('./roomUtil')
const util = require('../util/util')
const SqlUtil = require('mysql-op')
const pool = require('../pool.js')
const sqlUtil = new SqlUtil(pool, 'room')
const lockJS = require('./lock')
const RoomService = require('../service/RoomService')

const hand = async () => {
    let roomInfo = await RoomService.queryRoom({
        body: {
            room_id: 298
        }
    })
    roomInfo = roomUtil.initRoomObject(roomInfo)

    const fn1 = () => {
        return new Promise(resolve => {
            let records = roomInfo.getRoomRecords()
            setTimeout(() => {
                records.scores[7] = 19
                //重新设置records
                roomInfo.setRoomRecords(records)
                console.log('fn1', roomInfo.getRoomRecords().scores)
                resolve()
            }, 1000)
        })
    }

    const fn2 = () => {
        return new Promise(resolve => {
            let records = roomInfo.getRoomRecords()
            setTimeout(() => {
                records.scores['13'] = 19
                //重新设置records
                roomInfo.setRoomRecords(records)
                console.log('fn2', roomInfo.getRoomRecords().scores)
                resolve()
            }, 500)
        })
    }
    lockJS(298, fn1)
    lockJS(298, fn2)
}

hand()
