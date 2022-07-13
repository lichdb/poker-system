/**
 * 对局详情
 */
class Room {
    constructor(
        room_id,
        room_creator,
        room_records,
        room_mode,
        room_begin,
        room_end,
        room_status
    ) {
        //对局ID
        this.room_id = room_id
        //对局创建者ID
        this.room_creator = room_creator
        //对局记录数据
        this.room_records = room_records
        //对局模式，表示局数
        this.room_mode = room_mode
        //对局开始时间
        this.room_begin = room_begin
        //对局结束时间
        this.room_end = room_end
        //对局状态，0表示未开始，1表示已开始，2表示已结束
        this.room_status = room_status
    }

    getRoomRecords() {
        let records = null
        try {
            records = JSON.parse(this.room_records)
        } catch (error) {
            records = {}
        }
        return records
    }

    setRoomRecords(records) {
        try {
            this.room_records = JSON.stringify(records)
        } catch (error) {
            this.room_records = '{}'
        }
    }
}

module.exports = Room
