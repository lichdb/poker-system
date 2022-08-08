/**
 * 需要判断token的请求都放在这里
 *
 */
const routes = [
    '/api/room/create',
    '/api/room/queryHistory',
    '/api/room/queryRoom',
    '/api/room/check',
    '/api/user/modify',
    '/api/user/defaultLogin',
    '/api/user/queryUserInfo'
]

module.exports = url => {
    //也可以自己实现验证方法
    if (routes.includes(url)) {
        return true
    } else {
        return false
    }
}
