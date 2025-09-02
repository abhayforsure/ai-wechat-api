const path = require('path')

module.exports = [
  {
    immediate: false,
    enable: true,
    interval: '10000',
    handle: 'websocket/checkWsActive',
    type: 'all',
  },
  {
    //每天凌晨12:30 检查是否有用户会员到期
    cron: '0 32 0 * * * ',
    enable: true,
    immediate: false,
    handle: 'friends/checkUserVipTime',
  },

  {
    //每24小时检查一次
    cron: '0 0 0/24 * * * ',
    enable: true,
    immediate: false,
    handle: 'friends/checkAboutExpir',
  },
]
