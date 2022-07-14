//引入异常
const ServiceError = require('../error/ServiceError')
//引入实体
const Room = require('../entity/Room')
//引入sql
const pool = require('../pool.js')
//引入mysql-op
const SqlUtil = require('mysql-op')
const util = require('../util/util')
//创建mysql-op实例
const sqlUtil = new SqlUtil(pool, 'room')
//引入用户业务
const UserService = require('./UserService')
//创建业务类
const service = {}

//创建房间
service.create = async req => {
    let room_mode = req.body.room_mode

    if (util.hasUndefinedParam([room_mode])) {
        throw new ServiceError('参数异常')
    }
    room_mode = Number(room_mode)
    if (isNaN(room_mode)) {
        throw new ServiceError('参数异常')
    }
    const user = await UserService.getUserByToken(req)
    let room = new Room(
        null,
        user.user_id,
        '{}',
        room_mode,
        Date.now(),
        null,
        0
    )
    const result = await sqlUtil.insert(room)
    if (result.affectedRows == 0) {
        throw new ServiceError('创建失败')
    }
    room.room_id = result.insertId
    return room
}

//校验房间
service.check = async req => {
    const room_id = req.body.room_id
    if (!room_id) {
        throw new ServiceError('参数异常')
    }
    const rooms = await sqlUtil.query('room_id', room_id)
    if (rooms.length == 0) {
        throw new ServiceError('房间不存在')
    }
    const room = rooms[0]
    if (room.room_status == 2) {
        throw new ServiceError('该房间对局已经结束')
    }
    return room
}

//解散房间
service.dissolution = async room_id => {
    const rooms = await sqlUtil.query('room_id', room_id)
    if (rooms.length == 0) {
        throw new ServiceError('房间不存在')
    }
    const room = rooms[0]
    if (room.room_status == 2) {
        throw new ServiceError('已结束的房间无法解散')
    }
    const result = await sqlUtil.delete('room_id', room_id)
    if (result.affectedRows == 0) {
        throw new ServiceError('解散失败')
    }
}

//查询房间信息
service.query = async room_id => {
    const rooms = await sqlUtil.query('room_id', room_id)
    if (rooms.length == 0) {
        throw new ServiceError('房间不存在')
    }
    const room = rooms[0]
    if (room.room_status == 2) {
        throw new ServiceError('房间对局已结束')
    }
    return room
}

//更新房间状态
service.update = async roomInfo => {
    const rooms = await sqlUtil.query('room_id', roomInfo.room_id)
    if (rooms.length == 0) {
        throw new ServiceError('该房间已被解散')
    }
    const result = sqlUtil.update(roomInfo, 'room_id')
    if (result.affectedRows == 0) {
        throw new ServiceError('更新失败')
    }
}

module.exports = service
