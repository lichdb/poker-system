/**
 * 消息实例
 */
class Message {
    constructor(type, room, user, data, content) {
        //-1表示异常，0表示心跳检测回执消息，1表示加入房间通知，2表示离开房间通知，3表示游戏开始，4表示配牌完成，5表示配牌不符合规矩，6表示比较牌组，7表示游戏下一局，8表示游戏结束
        this.type = type
        //房间ID
        this.room = room
        //所属用户
        this.user = user || {}
        //数据
        this.data = data || {}
        //文本
        this.content = content || ''
    }
}

module.exports = Message
