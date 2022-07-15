//引入express模块
const express = require('express')
//引入中间件
const bodyParser = require('body-parser')
//引入JsonResult类
const JsonResult = require('./object/JsonResult')
//引入token工具
const jwt = require('./jwt/JwtToken')
//引入接口请求验证方法
const filter = require('./filter/filter.js')
//引入token异常
const UnauthorizedError = require('./error/UnauthorizedError')
//引入socket
const ws = require('nodejs-websocket')
const socket = require('./socket')
const UserService = require('./service/UserService')

//创建web服务器
let app = express()
app.all('*', (req, res, next) => {
    //设置允许跨域的域名，*代表允许任意域名跨域
    res.setHeader('Access-Control-Allow-Origin', '*')
    //允许的header类型
    res.setHeader('Access-Control-Allow-Headers', '*')
    //跨域允许的请求方式
    res.setHeader('Access-Control-Allow-Methods', 'DELETE,PUT,POST,GET,OPTIONS')
    if (req.method.toLowerCase() == 'options')
        res.sendStatus(200) //让options尝试请求快速结束
    else next()
})
//监听端口
app.listen(3040, '0.0.0.0')
//使用body-parser中间件
app.use(
    bodyParser.json({
        limit: '500mb'
    })
)
app.use(
    bodyParser.urlencoded({
        limit: '50mb',
        extended: true
    })
)
//请求访问拦截
app.use((req, res, next) => {
    let url = req.originalUrl //获取浏览器中当前访问的nodejs路由地址
    if (filter(url)) {
        //该地址需要token验证
        let token = req.headers['authorization']
        if (token) {
            //解析token
            jwt.parseToken(token)
                .then(async jwtResult => {
                    const user = await UserService.getUserById(
                        jwtResult.user_id
                    )
                    if (user) {
                        next()
                    } else {
                        next(new UnauthorizedError('此用户已不存在'))
                    }
                })
                .catch(error => {
                    next(error)
                })
        } else {
            //token不存在，直接不给通过
            next(new UnauthorizedError('请求头未携带token信息，校验不通过'))
        }
    } else {
        next()
    }
})
//引入controller目录下的js接口文件
const UserController = require('./controller/UserController')
const RoomController = require('./controller/RoomController')
//挂载路由器
app.use('/api/user', UserController)
app.use('/api/room', RoomController)
//异常捕获
app.use((error, req, res, next) => {
    if (error) {
        console.log(error)
        if (error.name == 'ServiceError') {
            res.json(
                new JsonResult(JsonResult.STATUS_SERVICE_ERROR, error.message)
            )
        } else if (error.name == 'UnauthorizedError') {
            res.json(
                new JsonResult(JsonResult.STATUS_TOKEN_ERROR, error.message)
            )
        } else {
            res.json(
                new JsonResult(JsonResult.STATUS_SYSTEM_ERROR, error.message)
            )
        }
    }
})

//创建连接
const createServer = () => {
    let server = ws
        .createServer(connection => {
            //接收消息
            connection.on('text', result => {
                socket.receiveMessage(result, connection, server)
            })
            //连接出错
            connection.on('error', code => {
                socket.error(code, connection, server)
            })
            //连接关闭
            connection.on('close', code => {
                socket.close(code, connection, server)
            })
        })
        .listen(3041)

    return server
}

const server = createServer()
