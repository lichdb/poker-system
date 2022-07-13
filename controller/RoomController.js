//引入express模块
const express = require('express')
//创建路由器对象
let router = express.Router()
//引入JsonResult类
const JsonResult = require('../object/JsonResult')
//引入异常
const ServiceError = require('../error/ServiceError')
//引入业务类
const RoomService = require('../service/RoomService')

//创建对局
router.post('/create', (req, res, next) => {
    RoomService.create(req)
        .then(result => {
            return res.json(JsonResult.success(result))
        })
        .catch(error => {
            next(error)
        })
})

//校验房间
router.post('/check', (req, res, next) => {
    RoomService.check(req)
        .then(result => {
            return res.json(JsonResult.success(result))
        })
        .catch(error => {
            next(error)
        })
})

module.exports = router
