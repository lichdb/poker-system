const roomUtil = require('./roomUtil')
const util = require('../util/util')
const SqlUtil = require('mysql-op')
const pool = require('../pool.js')
const sqlUtil = new SqlUtil(pool, 'room')

const scores = { 1: 2, 2: -2, 3: 10, 4: -10 }
console.log('/' + Object.keys(scores).join('/') + '/')
