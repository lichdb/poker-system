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

//删除今日0点之前未完成的房间
const deleteIntervalFn = async () => {
    try {
        //今日时间
        let today = new Date()
        let year = today.getFullYear()
        let month = today.getMonth()
        let date = today.getDate()
        today = new Date(year, month, date, 0, 0, 0, 0).getTime()
        let params = {
            room_status: 0,
            room_begin: [null, today]
        }
        const counts = await sqlUtil.queryCounts(params)
        if (counts > 0) {
            const rooms = await sqlUtil.querys(
                {
                    room_status: 0,
                    room_begin: [null, today]
                },
                'and',
                'room_begin',
                'asc',
                0,
                counts,
                []
            )
            for (let room of rooms) {
                await sqlUtil.delete('room_id', room.room_id)
            }
        }
    } catch (error) {
        console.log('定时删除任务', error)
    }
}
deleteIntervalFn()
//设置定时任务删除之前未完成的房间
setInterval(async () => {
    deleteIntervalFn()
}, 7 * 24 * 60 * 60 * 1000)

//查询对局
service.queryRoom = async req => {
    const room_id = req.body.room_id
    if (!room_id) {
        throw new ServiceError('未获取到房间号')
    }
    const rooms = await sqlUtil.query('room_id', room_id)
    if (rooms.length == 0) {
        throw new ServiceError('查无此房间信息')
    }
    return rooms[0]
}

//查询用户近20局记录
service.queryHistory = async req => {
    const user = await UserService.getUserByToken(req)
    let params = {
        'room.room_players': {
            value: '/' + user.user_id + '/',
            fuzzy: true
        },
        'room.room_status': 2
    }
    const counts = await sqlUtil.queryCounts(params, 'and')
    if (counts == 0) {
        throw new ServiceError('暂无对局')
    }
    let size = counts > 20 ? 20 : counts
    let tables = [
        {
            table: 'user',
            columns: ['user.user_id', 'room.room_creator']
        }
    ]
    const rooms = await sqlUtil.querys(
        params,
        'and',
        'room.room_end',
        'desc',
        0,
        size,
        [
            'room.room_id',
            'room.room_creator',
            'room.room_mode',
            'room.room_begin',
            'room.room_end',
            'room.room_status',
            'room.room_players',
            'room.room_type',
            'user.user_nickname'
        ],
        tables
    )
    return rooms
}

//创建房间
service.create = async req => {
    let room_mode = req.body.room_mode
    let room_type = req.body.room_type

    if (util.hasUndefinedParam([room_mode, room_type])) {
        throw new ServiceError('参数异常')
    }
    room_mode = Number(room_mode)
    room_type = Number(room_type)
    if (isNaN(room_mode) || isNaN(room_type)) {
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
        0,
        null,
        room_type
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

//查询对局中的房间信息
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
