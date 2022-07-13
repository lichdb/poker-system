const rooms = {}
const pokersConfig = require('./pokersConfig')
const Room = require('../entity/Room')

module.exports = {
    //获取缓存的房间
    getRoom(room_id) {
        return rooms[room_id]
    },
    //更新缓存的房间
    updateRoom(room_id, room) {
        rooms[room_id] = room
    },
    //移除缓存的房间
    removeRoom(room_id) {
        delete rooms[room_id]
    },
    //发牌
    licensing(room_id, users) {
        let pokers = JSON.parse(JSON.stringify(pokersConfig))
        const room = this.getRoom(room_id)
        let obj = {}
        users.forEach(user => {
            obj[user.user_id] = []
        })
        //给一个用户随机抽张牌
        const randomPoker = user_id => {
            //随机抽取一张牌
            const index = Math.floor(Math.random() * pokers.length)
            const poker = pokers[index]
            obj[user_id].push(poker)
            //删除这张牌，防止重复
            pokers.splice(index, 1)
        }
        users.forEach(user => {
            for (let i = 0; i < 9; i++) {
                randomPoker(user.user_id)
            }
        })
        const records = room.getRoomRecords()
        records.pokers = obj
        room.setRoomRecords(records)
        this.updateRoom(room_id, room)
    },
    //生成Room对象
    initRoomObject(roomInfo) {
        return new Room(
            roomInfo.room_id,
            roomInfo.room_creator,
            roomInfo.room_records,
            roomInfo.room_mode,
            roomInfo.room_begin,
            roomInfo.room_end,
            roomInfo.room_status
        )
    },
    //判断是否豹子
    isBao(pokers) {
        const one = pokers[0]
        const two = pokers[1]
        const three = pokers[2]
        if (one.value == two.value && one.value == three.value) {
            return true
        }
        return false
    },
    //是否同花
    isSameFlower(pokers) {
        const one = pokers[0]
        const two = pokers[1]
        const three = pokers[2]
        if (one.type == two.type && one.type == three.type) {
            return true
        }
        return false
    },
    //判断是否顺子
    isShun(pokers) {
        const one = pokers[0]
        const two = pokers[1]
        const three = pokers[2]
        const values = [one.value, two.value, three.value]
        if (values.includes('A')) {
            if (values.includes('2') && values.includes('3')) {
                return true
            }
            if (values.includes('Q') && values.includes('K')) {
                return true
            }
        }
        if (values.includes('2')) {
            if (values.includes('3') && values.includes('4')) {
                return true
            }
        }
        if (values.includes('3')) {
            if (values.includes('4') && values.includes('5')) {
                return true
            }
        }
        if (values.includes('4')) {
            if (values.includes('5') && values.includes('6')) {
                return true
            }
        }
        if (values.includes('5')) {
            if (values.includes('6') && values.includes('7')) {
                return true
            }
        }
        if (values.includes('6')) {
            if (values.includes('7') && values.includes('8')) {
                return true
            }
        }
        if (values.includes('7')) {
            if (values.includes('8') && values.includes('9')) {
                return true
            }
        }
        if (values.includes('8')) {
            if (values.includes('9') && values.includes('10')) {
                return true
            }
        }
        if (values.includes('9')) {
            if (values.includes('10') && values.includes('J')) {
                return true
            }
        }
        if (values.includes('10')) {
            if (values.includes('J') && values.includes('Q')) {
                return true
            }
        }
        if (values.includes('J')) {
            if (values.includes('Q') && values.includes('K')) {
                return true
            }
        }
        return false
    },
    //判断是否对子（包含3个头的情况）
    isPair(pokers) {
        const one = pokers[0]
        const two = pokers[1]
        const three = pokers[2]
        if (
            one.value == two.value ||
            one.value == three.value ||
            two.value == three.value
        ) {
            return true
        }
        return false
    },
    //是否123顺子
    isA23(pokers) {
        const one = pokers[0]
        const two = pokers[1]
        const three = pokers[2]
        const values = [one.value, two.value, three.value]
        if (
            values.includes('A') &&
            values.includes('2') &&
            values.includes('3')
        ) {
            return true
        }
        return false
    },
    //返回一组牌中的最大值、最小值和中等值的牌
    getComparePokers(pokers) {
        const one = pokers[0]
        const two = pokers[1]
        const three = pokers[2]
        const max = Math.max(one.points, two.points, three.points)
        const min = Math.min(one.points, two.points, three.points)
        const values = [one.points, two.points, three.points]
        return {
            maxPoker: pokers.filter(item => {
                return item.points == max
            })[0],
            minPoker: pokers.filter(item => {
                return item.points == min
            })[0],
            secondPoker: pokers.filter(item => {
                const num = values.filter(el => {
                    return el != max && el != min
                })[0]
                return item.points == num
            })[0]
        }
    },
    //A23特殊情况矫正，返回修正后的牌组
    A23Handler(pokers) {
        let poker = pokers.filter(item => {
            return item.value == 'A'
        })
        let index = pokers.findIndex(item => {
            return item.value == 'A'
        })
        if (poker.type == 3) {
            poker.points = 1
        } else if (poker.type == 2) {
            poker.points = 2
        } else if (poker.type == 1) {
            poker.points = 3
        } else if (poker.type == 0) {
            poker.points = 4
        }
        let newPokers = pokers.splice(index, 1, poker)
        return newPokers
    },
    //获取对子牌中对子最大的值的牌
    getPairPoker(pokers) {
        const one = pokers[0]
        const two = pokers[1]
        const three = pokers[2]
        if (one.value == two.value) {
            if (one.points > two.points) {
                return one
            }
            return two
        } else if (one.value == three.value) {
            if (one.points > three.points) {
                return one
            }
            return three
        } else if (two.value == three.value) {
            if (two.points > three.points) {
                return two
            }
            return three
        }
    },
    //获取对子牌中非对子的牌
    getNotPairePoker(pokers) {
        const one = pokers[0]
        const two = pokers[1]
        const three = pokers[2]
        if (one.value == two.value) {
            return three
        } else if (one.value == three.value) {
            return two
        } else if (two.value == three.value) {
            return one
        }
    },
    //判断A组牌是否大于B组牌
    compareTwoPokers(pokersA, pokersB) {
        let resA = this.getComparePokers(pokersA)
        let resB = this.getComparePokers(pokersB)
        //A组牌为豹子
        if (this.isBao(pokersA)) {
            //B组牌也是豹子
            if (this.isBao(pokersB)) {
                //只要比较点数即可
                return resA.maxPoker.points > resB.maxPoker.points
            }
        }
        //A组牌为同花
        else if (this.isSameFlower(pokersA)) {
            //A组牌为同花顺
            if (this.isShun(pokersA)) {
                //处理A组牌是A123的情况
                if (this.isA23(pokersA)) {
                    pokersA = this.A23Handler(pokersA)
                }
                //B组牌为豹子
                if (this.isBao(pokersB)) {
                    return false
                }
                //B组牌为同花顺
                if (this.isSameFlower(pokersB) && this.isShun(pokersB)) {
                    //处理B组牌是A123的情况
                    if (this.isA23(pokersB)) {
                        pokersB = this.A23Handler(pokersB)
                    }
                    //比较最大的点数
                    return resA.maxPoker.points > resB.maxPoker.points
                }
            }
            //A组牌为普通的同花
            else {
                //B组牌为豹子
                if (this.isBao(pokersB)) {
                    return false
                }
                //B组牌为同花顺
                if (this.isSameFlower(pokersB) && this.isShun(pokersB)) {
                    return false
                }
                //B组牌为普通的同花
                if (this.isSameFlower(pokersB) && !this.isShun(pokersB)) {
                    //如果两组牌最大数的牌一样
                    if (resA.maxPoker.value == resB.maxPoker.value) {
                        //第二张牌也一样
                        if (resA.secondPoker.value == resB.secondPoker.value) {
                            //第三张牌也一样
                            if (resA.minPoker.value == resB.minPoker.value) {
                                //三张牌都一样则比较最大牌的花色
                                return (
                                    resA.maxPoker.points > resB.maxPoker.points
                                )
                            }
                            return resA.minPoker.points > resB.minPoker.points
                        }
                        return resA.secondPoker.points > resB.secondPoker.points
                    }
                    return resA.maxPoker.points > resB.maxPoker.points
                }
            }
        }
        //A组牌为顺子
        else if (this.isShun(pokersA)) {
            //处理A组牌为A23的情况
            if (this.isA23(pokersA)) {
                pokersA = this.A23Handler(pokersA)
            }
            //B组牌为豹子
            if (this.isBao(pokersB)) {
                return false
            }
            //B组牌为同花
            if (this.isSameFlower(pokersB)) {
                return false
            }
            //B组牌为顺子
            if (this.isShun(pokersB)) {
                //处理B组牌为A23的情况
                if (this.isA23(pokersB)) {
                    pokersB = this.A23Handler(pokersB)
                }
                return resA.maxPoker.points > resB.maxPoker.points
            }
        }
        //A组牌为对子
        else if (this.isPair(pokersA)) {
            //B组牌为豹子
            if (this.isBao(pokersB)) {
                return false
            }
            //B组牌为同花
            if (this.isSameFlower(pokersB)) {
                return false
            }
            //B组牌为顺子
            if (this.isShun(pokersB)) {
                return false
            }
            //B组牌为对子
            if (this.isPair(pokersB)) {
                const pA = this.getPairPoker(pokersA)
                const pB = this.getPairPoker(pokersB)
                const pA2 = this.getNotPairePoker(pokersA)
                const pB2 = this.getNotPairePoker(pokersB)
                //同样的对子
                if (pA.value == pB.value) {
                    //比较非对子值
                    return pA2.points > pB2.points
                }
                return pA.points > pB.points
            }
        }
        //A组牌为单支
        else {
            //B组牌为豹子
            if (this.isBao(pokersB)) {
                return false
            }
            //B组牌为同花
            if (this.isSameFlower(pokersB)) {
                return false
            }
            //B组牌为顺子
            if (this.isShun(pokersB)) {
                return false
            }
            //B组牌为对子
            if (this.isPair(pokersB)) {
                return false
            }

            //AB牌都是单支
            //最大牌一样
            if (resA.maxPoker.value == resB.maxPoker.value) {
                //第二牌一样
                if (resA.secondPoker.value == resB.maxPoker.value) {
                    //三张牌都一样
                    if (resA.minPoker.points == resB.minPoker.points) {
                        //比较花色
                        return resA.maxPoker.points > resB.maxPoker.points
                    }
                    return resA.minPoker > resB.minPoker
                }
                return resA.secondPoker.points > resB.secondPoker.points
            }
            return resA.maxPoker.points > resB.maxPoker.points
        }
        return true
    },
    //多组牌排序
    pokersSort(pokers) {
        return pokers.sort((pokersA, pokersB) => {
            return this.compareTwoPokers(pokersA, pokersB) ? -1 : 1
        })
    },
    //判断三组牌是否按顺序排列
    judgePokers(pokers) {
        const pokersOne = pokers.filter(item => {
            return item.belong[0] == 0
        })
        const pokersTwo = pokers.filter(item => {
            return item.belong[0] == 1
        })
        const pokersThree = pokers.filter(item => {
            return item.belong[0] == 2
        })
        if (this.compareTwoPokers(pokersOne, pokersTwo)) {
            return false
        }
        if (this.compareTwoPokers(pokersOne, pokersThree)) {
            return false
        }
        if (this.compareTwoPokers(pokersTwo, pokersThree)) {
            return false
        }
        return true
    },
    //判断是否同一组牌
    isSame(pokersA, pokersB) {
        return JSON.stringify(pokersA) === JSON.stringify(pokersB)
    },
    //判断是否全红或者全黑
    judgeRedAll(pokers) {
        const red = pokers.every(item => {
            return item.type == 0 || item.type == 2
        })
        const black = pokers.every(item => {
            return item.type == 1 || item.type == 3
        })
        return red || black
    },
    //判断是否含有四个头
    judegeFour(pokers) {
        let obj = {}
        pokers.forEach(poker => {
            if (typeof obj[poker.value] == 'number') {
                obj[poker.value]++
            } else {
                obj[poker.value] = 1
            }
        })
        let num = 0
        for (let key in obj) {
            if (obj[key] == 4) {
                num++
            }
        }
        return num
    },
    //多个用户判断是否有全红全黑
    getRedAllUsers(pokers) {
        //这里pokers是包含用户id的完整多个pokers
        let users = []
        for (let key in pokers) {
            if (this.judgeRedAll(pokers[key])) {
                users.push(key)
            }
        }
        return users
    },
    //多个用户判断是否有4个头
    getFourAllUsers(pokers) {
        //这里pokers是包含用户id的完整多个pokers
        let unHasFourUsers = {}
        let hasFourUsers = {}
        for (let key in pokers) {
            const count = this.judegeFour(pokers[key])
            if (count > 0) {
                hasFourUsers[key] = count
            } else {
                unHasFourUsers[key] = 0
            }
        }
        return { hasFourUsers, unHasFourUsers }
    },
    //根据users更新pokers、status、scores和passData
    updateRecordsByUsers(users, records) {
        //获取原数据
        let pokers = records.pokers || {}
        let scores = records.scores || {}
        let status = records.status || {}
        let passData = records.passData || {}
        //定义新数据
        let newPokers = {}
        let newScores = {}
        let newStatus = {}
        let newPassData = {}
        //遍历users
        users.forEach(user => {
            //原来有该用户的pokers数据
            if (pokers.hasOwnProperty(user.user_id)) {
                newPokers[user.user_id] = pokers[user.user_id]
            }
            //原来有该用户的scores数据
            if (scores.hasOwnProperty(user.user_id)) {
                newScores[user.user_id] = scores[user.user_id]
            } else {
                //没有则初始化
                newScores[user.user_id] = 0
            }
            //原来有该用户的status数据
            if (status.hasOwnProperty(user.user_id)) {
                newStatus[user.user_id] = status[user.user_id]
            } else {
                newStatus[user.user_id] = 0
            }
            //原来有该用户的passData数据
            if (passData.hasOwnProperty(user.user_id)) {
                newPassData[user.user_id] = passData[user.user_id]
            } else {
                newPassData[user.user_id] = 0
            }
        })
        records.pokers = newPokers
        records.scores = newScores
        records.status = newStatus
        records.passData = newPassData
        return records
    }
}
