//引入express模块
const express = require('express')
//创建路由器对象
let router = express.Router()
//引入JsonResult类
const JsonResult = require('../object/JsonResult')
//引入异常
const ServiceError = require('../error/ServiceError')
//引入业务类
const UserService = require('../service/UserService')

//登录
router.post('/login', (req, res, next) => {
    UserService.login(req)
        .then(result => {
            return res.json(JsonResult.success(result))
        })
        .catch(error => {
            next(error)
        })
})

//注册
router.post('/register', (req, res, next) => {
    UserService.register(req)
        .then(result => {
            return res.json(JsonResult.success(result))
        })
        .catch(error => {
            next(error)
        })
})

//修改
router.post('/modify', (req, res, next) => {
    UserService.modify(req)
        .then(result => {
            return res.json(JsonResult.success(result))
        })
        .catch(error => {
            next(error)
        })
})

module.exports = router
