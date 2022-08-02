const Message = require('../entity/Message')
const RoomService = require('../service/RoomService')
const roomUtil = require('./roomUtil')
const ServiceError = require('../error/ServiceError')
const lockQueue = require('./lock')
//底分，即每局都要扣除的分数
const BOTTOM_SCORE = 1
//跟牌分数
const FOLLOW_SCORE = 1
//吃喜分数
const HAPPY_SCORE = 5

//推送异常消息
const sendErrorMsg = (connection, message, needRefresh) => {
    const msg = new Message(
        -1,
        connection.room,
        connection.user,
        {
            needRefresh: needRefresh
        },
        message
    )
    connection.send(JSON.stringify(msg))
}

//计算分数
const doCountScore = (res, connection, server) => {
    //3s延迟
    setTimeout(() => {
        let roomInfo = roomUtil.getRoom(res.room)
        //获取该房间的所有连接
        const roomConnections = server.connections.filter(item => {
            return item.room == res.room
        })
        //获取用户数组
        const users = roomConnections.map(item => {
            return item.user
        })
        //获取records
        let records = roomInfo.getRoomRecords()
        let scores = records.scores
        //获取没有丢牌的用户
        let unDiscaderUsers = []
        for (let key in records.pokers) {
            if (records.operations[key] != 2) {
                unDiscaderUsers.push(key)
            }
        }
        console.log('unDiscaderUsers', unDiscaderUsers)
        //如果只有一个则直接给这个用户加上盘内分数
        if (unDiscaderUsers.length == 1) {
            scores[unDiscaderUsers[0]] += records.innerScores
        }
        //见面
        else {
            const winUser = roomUtil.compareTwoPokers(
                records.pokers[unDiscaderUsers[0]],
                records.pokers[unDiscaderUsers[1]]
            )
                ? unDiscaderUsers[0]
                : unDiscaderUsers[1]
            //赢者加分
            scores[winUser] += records.innerScores
            //判断吃喜，三个头和同花顺
            if (
                roomUtil.isBao(records.pokers[winUser]) ||
                (roomUtil.isSameFlower(records.pokers[winUser]) &&
                    roomUtil.isShun(records.pokers[winUser]))
            ) {
                //获取上牌次数大于0的其他用户
                const otherUsers = Object.keys(records.pokers).filter(item => {
                    return (
                        item != key &&
                        (records.opens[item] > 0 || records.stuffies[0] > 0)
                    )
                })
                //闷牌次数大于0才能吃喜
                if (records.stuffies[winUser] > 0) {
                    scores[winUser] += HAPPY_SCORE * otherUsers.length
                    //其余用户减分
                    otherUsers.forEach(item => {
                        scores[item] -= HAPPY_SCORE
                    })
                }
            }
        }
        //判断是否结束
        if (records.currentGame == roomInfo.room_mode) {
            //更新分数
            records.scores = scores
            roomInfo.setRoomRecords(records)
            roomUtil.updateRoom(res.room, roomInfo)
            //结束
            overGame(res, connection, server)
        } else {
            //记录当前局数
            records.currentGame = records.currentGame + 1
            console.log('即将进入第' + records.currentGame + '局')
            //初始化跟牌分数
            records.followScore = FOLLOW_SCORE
            //初始化发言人序列
            records.spokesman = 0
            //初始化该局盘内分数
            records.innerScores = records.userInfos.length * BOTTOM_SCORE
            //初始化每个用户的积分和牌组操作记录和上牌记录
            let operations = {}
            let stuffies = {}
            let opens = {}
            users.forEach(item => {
                scores[item.user_id] -= BOTTOM_SCORE
                operations[item.user_id] = 0
                stuffies[item.user_id] = 0
                opens[item.user_id] = 0
            })
            records.scores = scores
            records.operations = operations
            records.opens = opens
            records.stuffies = stuffies
            // 重新设置records
            roomInfo.setRoomRecords(records)
            //记录
            roomUtil.updateRoom(res.room, roomInfo)
            //发牌
            roomUtil.licensingZJ(res.room, Object.keys(scores))
            //重新获取
            roomInfo = roomUtil.getRoom(res.room)
            //推送
            roomConnections.forEach(conn => {
                const msg = new Message(
                    7,
                    conn.room,
                    conn.user,
                    {
                        users: users,
                        pokers: roomInfo.getRoomRecords().pokers,
                        currentGame: roomInfo.getRoomRecords().currentGame,
                        scores: roomInfo.getRoomRecords().scores,
                        userInfos: roomInfo.getRoomRecords().userInfos,
                        operations: roomInfo.getRoomRecords().operations,
                        followScore: roomInfo.getRoomRecords().followScore,
                        spokesman: roomInfo.getRoomRecords().spokesman,
                        innerScores: roomInfo.getRoomRecords().innerScores
                    },
                    `第${roomInfo.getRoomRecords().currentGame}局开始`
                )
                conn.send(JSON.stringify(msg))
            })
        }
    }, 3000)
}

const overGame = async (res, connection, server) => {
    let roomInfo = roomUtil.getRoom(res.room)
    let scores = roomInfo.getRoomRecords().scores
    console.log('游戏结束', scores)
    //记录结束时间
    roomInfo.room_end = Date.now()
    //更新房间状态为已完成
    roomInfo.room_status = 2
    //更新房间玩家数据
    roomInfo.room_players = '/' + Object.keys(scores).join('/') + '/'
    //更新房间到数据库
    await RoomService.update(roomInfo)
    //获取该房间的所有连接
    const roomConnections = server.connections.filter(item => {
        return item.room == res.room
    })
    //获取用户数组
    const users = roomConnections.map(item => {
        return item.user
    })
    //推送
    roomConnections.forEach(conn => {
        const msg = new Message(
            9,
            conn.room,
            conn.user,
            {
                users: users,
                scores: roomInfo.getRoomRecords().scores
            },
            '本房间游戏结束'
        )
        conn.send(JSON.stringify(msg))
    })
    //推送完成后删除缓存的房间
    roomUtil.removeRoom(res.room)
}

module.exports = {
    //接收消息
    async receiveMessage(result, connection, server) {
        try {
            let res = JSON.parse(result)
            if (typeof res != 'object' || !res) {
                throw new ServiceError('参数异常')
            }
            //心跳检测消息
            if (res.type == 0) {
                const msg = new Message(
                    0,
                    res.room,
                    res.user,
                    {},
                    '心跳检测回执'
                )
                connection.send(JSON.stringify(msg))
            }
            //有人加入房间
            else if (res.type == 1) {
                connection.room = res.room
                connection.user = res.user
                //获取该房间的所有连接
                const roomConnections = server.connections.filter(item => {
                    return item.room == res.room
                })
                //获取该房间的已连接的用户数组
                const users = roomConnections.map(item => {
                    return item.user
                })
                if (roomConnections.length > 4) {
                    throw new ServiceError('房间内已经有4个人了')
                }
                const isExist = roomConnections.some(conn => {
                    return (
                        conn.user.user_id === connection.user.user_id &&
                        conn != connection
                    )
                })
                if (isExist) {
                    throw new ServiceError('你已经在房间里了，无法重复加入')
                }
                const fn = async () => {
                    let roomInfo = roomUtil.getRoom(res.room)
                    //如果该房间在对局中，则需要初始化此用户的一些信息
                    if (roomInfo && roomInfo.room_status == 1) {
                        //获取records
                        let records = roomInfo.getRoomRecords()
                        let scores = records.scores
                        let operations = records.operations
                        let userInfos = records.userInfos
                        console.log(
                            '用户加入房间',
                            res.user.user_id,
                            records.pokers
                                ? records.pokers[res.user.user_id]
                                : null
                        )
                        //分数不存在重置分数
                        if (!scores[res.user.user_id]) {
                            scores[res.user.user_id] = 0
                        }
                        //没有牌操作记录则重置操作记录
                        if (!operations[res.user.user_id]) {
                            operations[res.user.user_id] = 0
                        }
                        //判断是否已经缓存过此用户信息
                        const hasUser = userInfos.some(item => {
                            return item.user_id == res.user.user_id
                        })
                        console.log('是否缓存过用户信息了', hasUser)
                        //如果没有缓存过则加入
                        if (!hasUser) {
                            userInfos = [...userInfos, res.user]
                        }
                        //更新到records
                        records.scores = scores
                        records.userInfos = userInfos
                        //重新设置records
                        roomInfo.setRoomRecords(records)
                        //更新room
                        roomUtil.updateRoom(res.room, roomInfo)
                    }
                    roomConnections.forEach(conn => {
                        if (conn === connection) {
                            const msg = new Message(
                                1,
                                conn.room,
                                conn.user,
                                {
                                    users: users,
                                    pokers: roomInfo?.getRoomRecords()?.pokers,
                                    currentGame:
                                        roomInfo?.getRoomRecords()?.currentGame,
                                    scores: roomInfo?.getRoomRecords()?.scores,
                                    isSelf: true,
                                    userInfos:
                                        roomInfo?.getRoomRecords()?.userInfos,
                                    operations:
                                        roomInfo?.getRoomRecords()?.operations,
                                    followScore:
                                        roomInfo?.getRoomRecords().followScore,
                                    spokesman:
                                        roomInfo?.getRoomRecords().spokesman,
                                    innerScores:
                                        roomInfo?.getRoomRecords().innerScores
                                },
                                `你已加入房间`
                            )
                            conn.send(JSON.stringify(msg))
                        } else {
                            const msg = new Message(
                                1,
                                conn.room,
                                conn.user,
                                {
                                    users: users,
                                    pokers: roomInfo?.getRoomRecords()?.pokers,
                                    currentGame:
                                        roomInfo?.getRoomRecords()?.currentGame,
                                    scores: roomInfo?.getRoomRecords()?.scores,
                                    isSelf: false,
                                    userInfos:
                                        roomInfo?.getRoomRecords()?.userInfos,
                                    operations:
                                        roomInfo?.getRoomRecords()?.operations,
                                    followScore:
                                        roomInfo?.getRoomRecords().followScore,
                                    spokesman:
                                        roomInfo?.getRoomRecords().spokesman,
                                    innerScores:
                                        roomInfo?.getRoomRecords().innerScores
                                },
                                `${res.user.user_nickname}加入房间`
                            )
                            conn.send(JSON.stringify(msg))
                        }
                    })
                }
                await lockQueue(res.room, fn)
            }
            //游戏开始
            else if (res.type == 3) {
                const fn = async () => {
                    //获取该房间的所有连接
                    const roomConnections = server.connections.filter(item => {
                        return item.room == res.room
                    })
                    if (roomConnections.length <= 1) {
                        throw new Error('开始游戏必须不少于两个人')
                    }
                    //从数据库中查询到房间信息
                    let roomInfo = await RoomService.query(res.room)
                    //转为Room对象
                    roomInfo = roomUtil.initRoomObject(roomInfo)
                    if (roomInfo.room_creator != res.user.user_id) {
                        throw new Error('非房主不能开始游戏')
                    }
                    //获取用户数组
                    const users = roomConnections.map(item => {
                        return item.user
                    })
                    //更改房间状态
                    roomInfo.room_status = 1
                    //获取records
                    let records = roomInfo.getRoomRecords()
                    //记录当前局数
                    records.currentGame = 1
                    //初始化跟牌分数
                    records.followScore = FOLLOW_SCORE
                    //初始化发言人序列
                    records.spokesman = 0
                    //初始化该局分数
                    records.innerScores = users.length * BOTTOM_SCORE
                    //初始化每个用户的积分、牌组操作记录和闷牌次数、明牌上分次数
                    let scores = {}
                    let operations = {}
                    let stuffies = {}
                    let opens = {}
                    users.forEach(item => {
                        scores[item.user_id] = -BOTTOM_SCORE
                        //0表示没看牌，1表示看牌了，2表示弃牌
                        operations[item.user_id] = 0
                        stuffies[item.user_id] = 0
                        opens[item.user_id] = 0
                    })
                    records.scores = scores
                    records.operations = operations
                    records.stuffies = stuffies
                    records.opens = opens
                    //记录当前的用户信息
                    records.userInfos = users
                    //重新设置records
                    roomInfo.setRoomRecords(records)
                    //记录
                    roomUtil.updateRoom(res.room, roomInfo)
                    //发牌
                    roomUtil.licensingZJ(res.room, Object.keys(scores))
                    //重新获取
                    roomInfo = roomUtil.getRoom(res.room)
                    //推送
                    roomConnections.forEach(conn => {
                        const msg = new Message(
                            3,
                            conn.room,
                            conn.user,
                            {
                                users: users,
                                pokers: roomInfo.getRoomRecords().pokers,
                                currentGame:
                                    roomInfo.getRoomRecords().currentGame,
                                scores: roomInfo.getRoomRecords().scores,
                                userInfos: roomInfo.getRoomRecords().userInfos,
                                operations:
                                    roomInfo.getRoomRecords().operations,
                                followScore:
                                    roomInfo.getRoomRecords().followScore,
                                spokesman: roomInfo.getRoomRecords().spokesman,
                                innerScores:
                                    roomInfo.getRoomRecords().innerScores
                            },
                            '游戏开始，推送数据'
                        )
                        conn.send(JSON.stringify(msg))
                    })
                }
                await lockQueue(res.room, fn)
            }
            //上分
            else if (res.type == 4) {
                const fn = async () => {
                    console.log('用户ID:' + res.user.user_id + ',上分', res.num)
                    const num = res.num || 1
                    //获取该房间的所有连接
                    const roomConnections = server.connections.filter(item => {
                        return item.room == res.room
                    })
                    //获取用户数组
                    const users = roomConnections.map(item => {
                        return item.user
                    })
                    let roomInfo = roomUtil.getRoom(res.room)
                    //获取records
                    let records = roomInfo.getRoomRecords()
                    //如果已经弃牌
                    if (records.operations[res.user.user_id] == 2) {
                        throw new Error('你已经丢牌，无法上分')
                    }
                    let score = records.followScore * num
                    //已经看过牌了
                    if (records.operations[res.user.user_id] == 1) {
                        //更新followScore
                        records.followScore = score
                        //看过牌双倍
                        score = score * 2
                        //增加明牌次数
                        records.opens[res.user.user_id] += 1
                    }
                    //扣除用户分数
                    records.scores[res.user.user_id] =
                        records.scores[res.user.user_id] - score
                    //增加盘内分数
                    records.innerScores += score
                    //如果还没看牌
                    if (records.operations[res.user.user_id] == 0) {
                        //更新followScore
                        records.followScore = score
                        //增加闷牌次数
                        records.stuffies[res.user.user_id] += 1
                    }
                    //更换发言人
                    let length = records.userInfos.length
                    let spokesman = records.spokesman
                    records.spokesman =
                        spokesman == length - 1 ? 0 : spokesman + 1
                    //重新设置records
                    roomInfo.setRoomRecords(records)
                    //记录
                    roomUtil.updateRoom(res.room, roomInfo)
                    //推送
                    roomConnections.forEach(conn => {
                        const msg = new Message(
                            4,
                            conn.room,
                            conn.user,
                            {
                                users: users,
                                pokers: roomInfo.getRoomRecords().pokers,
                                currentGame:
                                    roomInfo.getRoomRecords().currentGame,
                                scores: roomInfo.getRoomRecords().scores,
                                userInfos: roomInfo.getRoomRecords().userInfos,
                                operations:
                                    roomInfo.getRoomRecords().operations,
                                followScore:
                                    roomInfo.getRoomRecords().followScore,
                                spokesman: roomInfo.getRoomRecords().spokesman,
                                innerScores:
                                    roomInfo.getRoomRecords().innerScores
                            },
                            conn === connection
                                ? `你上了${score}分`
                                : `${res.user.user_nickname}上了${score}分`
                        )
                        conn.send(JSON.stringify(msg))
                    })
                }
                await lockQueue(res.room, fn)
            }
            //看牌
            else if (res.type == 5) {
                const fn = async () => {
                    //获取该房间的所有连接
                    const roomConnections = server.connections.filter(item => {
                        return item.room == res.room
                    })
                    //获取用户数组
                    const users = roomConnections.map(item => {
                        return item.user
                    })
                    let roomInfo = roomUtil.getRoom(res.room)
                    //获取records
                    let records = roomInfo.getRoomRecords()
                    //不是没看牌的状态
                    if (records.operations[res.user.user_id] != 0) {
                        throw new Error('你已经看过牌或者丢牌了')
                    }
                    //更新牌操作状态为看牌
                    records.operations[res.user.user_id] = 1
                    //重新设置records
                    roomInfo.setRoomRecords(records)
                    //记录
                    roomUtil.updateRoom(res.room, roomInfo)
                    //推送
                    roomConnections.forEach(conn => {
                        const msg = new Message(
                            5,
                            conn.room,
                            conn.user,
                            {
                                users: users,
                                pokers: roomInfo.getRoomRecords().pokers,
                                currentGame:
                                    roomInfo.getRoomRecords().currentGame,
                                scores: roomInfo.getRoomRecords().scores,
                                userInfos: roomInfo.getRoomRecords().userInfos,
                                operations:
                                    roomInfo.getRoomRecords().operations,
                                followScore:
                                    roomInfo.getRoomRecords().followScore,
                                spokesman: roomInfo.getRoomRecords().spokesman,
                                innerScores:
                                    roomInfo.getRoomRecords().innerScores
                            },
                            conn === connection
                                ? ''
                                : `${res.user.user_nickname}已经看牌了`
                        )
                        conn.send(JSON.stringify(msg))
                    })
                }
                lockQueue(res.room, fn)
            }
            //丢牌
            else if (res.type == 6) {
                const fn = async () => {
                    //获取该房间的所有连接
                    const roomConnections = server.connections.filter(item => {
                        return item.room == res.room
                    })
                    //获取用户数组
                    const users = roomConnections.map(item => {
                        return item.user
                    })
                    let roomInfo = roomUtil.getRoom(res.room)
                    //获取records
                    let records = roomInfo.getRoomRecords()
                    //已丢牌状态
                    if (records.operations[res.user.user_id] == 2) {
                        throw new Error('你已丢牌')
                    }
                    //更新牌操作状态为丢牌
                    records.operations[res.user.user_id] = 2
                    //更换发言人
                    let length = records.userInfos.length
                    let spokesman = records.spokesman
                    records.spokesman =
                        spokesman == length - 1 ? 0 : spokesman + 1
                    //重新设置records
                    roomInfo.setRoomRecords(records)
                    //记录
                    roomUtil.updateRoom(res.room, roomInfo)
                    //推送
                    roomConnections.forEach(conn => {
                        const msg = new Message(
                            6,
                            conn.room,
                            conn.user,
                            {
                                users: users,
                                pokers: roomInfo.getRoomRecords().pokers,
                                currentGame:
                                    roomInfo.getRoomRecords().currentGame,
                                scores: roomInfo.getRoomRecords().scores,
                                userInfos: roomInfo.getRoomRecords().userInfos,
                                operations:
                                    roomInfo.getRoomRecords().operations,
                                followScore:
                                    roomInfo.getRoomRecords().followScore,
                                spokesman: roomInfo.getRoomRecords().spokesman,
                                innerScores:
                                    roomInfo.getRoomRecords().innerScores
                            },
                            conn === connection
                                ? '你已丢牌'
                                : `${res.user.user_nickname}已经丢牌`
                        )
                        conn.send(JSON.stringify(msg))
                    })
                    //如果只有一个用户没有丢牌则执行计算分数
                    doCountScore(res, connection, server)
                }
                lockQueue(res.room, fn)
            }
            //见面
            else if (res.type == 8) {
                const fn = async () => {
                    //获取该房间的所有连接
                    const roomConnections = server.connections.filter(item => {
                        return item.room == res.room
                    })
                    //获取用户数组
                    const users = roomConnections.map(item => {
                        return item.user
                    })
                    let roomInfo = roomUtil.getRoom(res.room)
                    //获取records
                    let records = roomInfo.getRoomRecords()
                    //丢牌处理
                    if (records.operations[res.user.user_id] == 2) {
                        throw new Error('已丢牌无法见面')
                    }
                    //获取没有丢牌的用户
                    let unDiscaderUsers = []
                    for (let key in records.operations) {
                        if (records.operations[key] != 2) {
                            unDiscaderUsers.push(key)
                        }
                    }
                    if (unDiscaderUsers.length != 2) {
                        throw new Error('场上剩余2人时才能见面')
                    }
                    let score = records.followScore
                    //已经看过牌了，则双倍
                    if (records.operations[res.user.user_id] == 1) {
                        score = score * 2
                        //增加明牌次数
                        records.opens[res.user.user_id] += 1
                    } else {
                        //增加闷牌次数
                        records.stuffies[res.user.user_id] += 1
                    }
                    //扣除用户分数
                    records.scores[res.user.user_id] =
                        records.scores[res.user.user_id] - score
                    //增加盘内分数
                    records.innerScores += score
                    //重新设置records
                    roomInfo.setRoomRecords(records)
                    //记录
                    roomUtil.updateRoom(res.room, roomInfo)
                    //推送
                    roomConnections.forEach(conn => {
                        const msg = new Message(
                            8,
                            conn.room,
                            conn.user,
                            {
                                users: users,
                                pokers: roomInfo.getRoomRecords().pokers,
                                currentGame:
                                    roomInfo.getRoomRecords().currentGame,
                                scores: roomInfo.getRoomRecords().scores,
                                userInfos: roomInfo.getRoomRecords().userInfos,
                                operations:
                                    roomInfo.getRoomRecords().operations,
                                followScore:
                                    roomInfo.getRoomRecords().followScore,
                                spokesman: roomInfo.getRoomRecords().spokesman,
                                innerScores:
                                    roomInfo.getRoomRecords().innerScores
                            },
                            conn === connection
                                ? '你已请求见面'
                                : `${res.user.user_nickname}上分并请求见面`
                        )
                        conn.send(JSON.stringify(msg))
                    })
                    //执行计算
                    doCountScore(res, connection, server)
                }
                lockQueue(res.room, fn)
            }
        } catch (error) {
            console.log(error)
            //如果是ServiceError则需要告知前端刷新页面
            if (error.name == 'ServiceError') {
                sendErrorMsg(connection, error.message, true)
            } else {
                sendErrorMsg(connection, error.message, false)
            }
        }
    },
    //出现异常
    error(code, connection, server) {
        connection.close()
    },
    //连接关闭
    async close(code, connection, server) {
        try {
            //获取该房间的所有连接
            const roomConnections = server.connections.filter(item => {
                return item.room == connection.room
            })
            const users = roomConnections.map(item => {
                return item.user
            })
            const roomInfo = roomUtil.getRoom(connection.room)
        } catch (error) {
            console.log(error)
            //如果是ServiceError则需要告知前端刷新页面
            if (error.name == 'ServiceError') {
                sendErrorMsg(connection, error.message, true)
            } else {
                sendErrorMsg(connection, error.message, false)
            }
        }
    }
}
