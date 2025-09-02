const Base = require('./base')
const schedule = require('node-schedule')
const moment = require('moment') // 添加moment处理时间

// const cron = require('cron')
module.exports = class extends Base {
  async testAction() {
    let start = '2025-07-24 09:00:00'
    let end = ''
    return this.success(this.isNowInRange(start, end))
  }

  isNowInRange(start, end) {
    const now = moment()
    const startDate = start ? moment(start) : null
    const endDate = end ? moment(end) : null

    // 处理纯日期格式（无时间部分）
    if (endDate && end.length === 10) {
      endDate.endOf('day') // 设置为当天的最后一毫秒
    }

    // 已超过结束时间 → 返回2（已失效）
    if (endDate && now.isAfter(endDate)) {
      return 2
    }

    // 在有效范围内 → 返回1
    if (
      (!startDate || now.isSameOrAfter(startDate)) &&
      (!endDate || now.isSameOrBefore(endDate))
    ) {
      return 1
    }

    // 早于开始时间 → 返回0（尚未生效）
    return 0
  }
}
