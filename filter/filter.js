/**
 * 需要判断token的请求都放在这里
 *
 */
const routes = [
    '/poker/api/room/create',
    '/poker/api/user/modify',
    '/poker/api/room/checkRoom'
]

module.exports = url => {
    //也可以自己实现验证方法
    if (routes.includes(url)) {
        return true
    } else {
        return false
    }
}
