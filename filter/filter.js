/**
 * 需要判断token的请求都放在这里
 *
 */
const routes = ['/api/room/create', '/api/user/modify', '/api/room/check']

module.exports = url => {
    //也可以自己实现验证方法
    if (routes.includes(url)) {
        return true
    } else {
        return false
    }
}
