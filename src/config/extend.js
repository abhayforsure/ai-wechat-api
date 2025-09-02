const view = require('think-view')
const model = require('think-model')
const cache = require('think-cache')
const session = require('think-session')
const moment = require('moment-timezone')
module.exports = {
  datetime(date) {
    return moment(date).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')
  },
}
module.exports = [
  view, // make application support view
  model(think.app),
  cache,
  session,
]
