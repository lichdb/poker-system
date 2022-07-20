//引入异常
const ServiceError = require('../error/ServiceError')
//引入md5
const md5 = require('md5-node')
//引入token工具
const jwt = require('../jwt/JwtToken')
//引入工具类
const util = require('../util/util')
//引入实体
const User = require('../entity/User')
//引入sql
const pool = require('../pool.js')
//引入mysql-op
const SqlUtil = require('mysql-op')
//创建mysql-op实例
const sqlUtil = new SqlUtil(pool, 'user')
//创建业务类
const service = {}

//登录
service.login = async req => {
    const user_name = req.body.user_name
    const user_password = req.body.user_password
    if (!user_name || !user_password) {
        throw new ServiceError('参数异常')
    }
    const users = await sqlUtil.query('user_name', user_name)
    if (users.length == 0) {
        throw new ServiceError('该账号尚未注册')
    }
    const user = users[0]
    if (user.user_password != md5(user_password)) {
        throw new ServiceError('密码错误，请重新输入')
    }
    //更新登录时间
    user.user_login = Date.now()
    await sqlUtil.update(user, 'user_id')
    //生成token
    const token = jwt.getToken({
        user_id: user.user_id,
        user_name: user_name
    })
    //删除密码
    delete user.user_password
    return {
        user: user,
        token: token
    }
}

//注册
service.register = async req => {
    const user_name = req.body.user_name
    const user_password = req.body.user_password
    const user_nickname = req.body.user_nickname
    if (!user_name || !user_password || !user_nickname) {
        throw new ServiceError('参数异常')
    }
    if (user_nickname.length > 8) {
        throw new ServiceError('昵称参数异常')
    }
    if (!util.isUserName(user_name)) {
        throw new ServiceError('账号参数异常')
    }
    if (user_password.length < 8) {
        throw new ServiceError('密码参数异常')
    }
    const users = await sqlUtil.query('user_name', user_name)
    if (users.length) {
        throw new ServiceError('该账号已被注册')
    }
    const users2 = await sqlUtil.query('user_nickname', user_nickname)
    if (users2.length) {
        throw new ServiceError('该昵称已被别人使用了')
    }
    const user = new User(
        null,
        user_name,
        md5(user_password),
        Date.now(),
        Date.now(),
        user_nickname
    )
    const result = await sqlUtil.insert(user)
    if (result.affectedRows == 0) {
        throw new ServiceError('注册失败')
    }
}

//修改
service.modify = async req => {
    const user_name = req.body.user_name
    const user_password = req.body.user_password
    const user_nickname = req.body.user_nickname
    const user_id = req.body.user_id

    if (!user_id) {
        throw new ServiceError('参数异常')
    }

    const users = await sqlUtil.query('user_id', user_id)
    if (users.length == 0) {
        throw new ServiceError('未查询到用户信息')
    }

    let user = users[0]

    if (user_nickname) {
        if (user_nickname.length > 8) {
            throw new ServiceError('昵称参数异常')
        }
        const users2 = await sqlUtil.query('user_nickname', user_nickname)
        if (users2.length) {
            throw new ServiceError('该昵称已被别人使用了')
        }
        user.user_nickname = user_nickname
    }

    if (user_name) {
        if (!util.isUserName(user_name)) {
            throw new ServiceError('账号参数异常')
        }
        const users3 = await sqlUtil.query('user_name', user_name)
        if (users3.length) {
            throw new ServiceError('该账号已被注册')
        }
        user.user_name = user_name
    }

    if (user_password) {
        if (user_password.length < 8) {
            throw new ServiceError('密码参数异常')
        }
        user.user_password = md5(user_password)
    }

    const result = await sqlUtil.update(user, 'user_id')
    if (result.affectedRows == 0) {
        throw new ServiceError('修改失败')
    }
    delete user.user_password
    return user
}

//根据token获取用户信息
service.getUserByToken = async req => {
    let token = req.headers['authorization']
    if (!token) {
        throw new ServiceError('未获取到token信息')
    }
    const user = await jwt.parseToken(token)
    return user
}

//根据ID查询用户信息
service.getUserById = async user_id => {
    const users = await sqlUtil.query('user_id', user_id)
    if (users.length == 0) {
        return null
    }
    let user = users[0]
    if (user) {
        delete user.user_password
    }
    return user
}

module.exports = service
