const rp = require('request-promise')

module.exports = class extends think.Service {
  /**
   * 将Cron表达式解析为自然语言描述
   * @param {string} cronExpression - 6位Cron表达式（秒 分 时 日 月 周）
   * @returns {string} 自然语言描述
   */
  parseCronToChinese(cronExpression) {
    const parts = cronExpression.trim().split(/\s+/)
    if (parts.length !== 6) {
      return `无效的Cron表达式: ${cronExpression}`
    }

    const [second, minute, hour, day, month, weekday] = parts

    // 星期映射 (0=周日, 1=周一, ... 6=周六, 7=周日)
    const weekdays = {
      0: '周日',
      1: '周一',
      2: '周二',
      3: '周三',
      4: '周四',
      5: '周五',
      6: '周六',
      7: '周日',
    }

    // 月份映射
    const months = {
      1: '1月',
      2: '2月',
      3: '3月',
      4: '4月',
      5: '5月',
      6: '6月',
      7: '7月',
      8: '8月',
      9: '9月',
      10: '10月',
      11: '11月',
      12: '12月',
    }

    // 检查是否是特定时间点
    const isSpecificTime =
      !isWildcard(second) && !isWildcard(minute) && !isWildcard(hour)

    // 检查是否是特定日期
    const isSpecificDate =
      !isWildcard(day) && !isWildcard(month) && !isWildcard(weekday)

    // 辅助函数：判断是否为通配符
    function isWildcard(part) {
      return part === '*' || part === '?'
    }

    // 辅助函数：解析数字部分
    function parseNumber(part, mapping) {
      if (isWildcard(part)) return null

      // 处理逗号分隔的列表
      if (part.includes(',')) {
        const values = part.split(',').map((v) => mapping[v] || v)
        return values.join('、')
      }

      // 处理范围
      if (part.includes('-')) {
        const [start, end] = part.split('-')
        return `${mapping[start] || start}到${mapping[end] || end}`
      }

      return mapping[part] || part
    }

    // 1. 处理特定日期+时间的情况 (如 0 0 11 16 7 3)
    if (isSpecificDate && isSpecificTime) {
      const monthStr = parseNumber(month, months) || ''
      const dayStr = parseNumber(day, {}) || ''
      const weekdayStr = parseNumber(weekday, weekdays) || ''
      const timeStr = formatTime(hour, minute, second)

      // 组合日期部分
      let datePart = ''
      if (monthStr && dayStr) {
        datePart = `${monthStr}${dayStr}日`
        if (weekdayStr) datePart += weekdayStr
      } else if (weekdayStr) {
        datePart = `每周${weekdayStr}`
      }

      return `${datePart} ${timeStr}执行`
    }

    // 2. 处理特定时间的情况
    if (isSpecificTime) {
      const timeStr = formatTime(hour, minute, second)
      let description = `每天${timeStr}`

      // 添加日期条件
      const dateConditions = []

      if (!isWildcard(day)) {
        dateConditions.push(`每月${parseNumber(day, {})}日`)
      }

      if (!isWildcard(weekday)) {
        dateConditions.push(`每周${parseNumber(weekday, weekdays)}`)
      }

      if (!isWildcard(month)) {
        dateConditions.push(`每年${parseNumber(month, months)}`)
      }

      if (dateConditions.length > 0) {
        description += `，${dateConditions.join('且')}`
      }

      return description + '执行'
    }

    // 3. 通用解析 (其他情况)
    return parseGenericCron(parts)
  }

  /**
   * 格式化时间部分
   */
  formatTime(hour, minute, second) {
    const h = hour.padStart(2, '0')
    const m = minute.padStart(2, '0')

    if (second === '0' || second === '00') {
      return `${h}:${m}`
    }
    return `${h}:${m}:${second.padStart(2, '0')}`
  }

  /**
   * 通用Cron解析器 (用于非特定时间的情况)
   */
  parseGenericCron(parts) {
    const [second, minute, hour, day, month, weekday] = parts
    const descriptions = []

    // 解析时间部分
    if (second !== '0' && second !== '*') {
      descriptions.push(`${second}秒`)
    }

    if (minute !== '*') {
      descriptions.push(parsePart(minute, '分'))
    } else {
      descriptions.push('每分钟')
    }

    if (hour !== '*') {
      descriptions.push(parsePart(hour, '点'))
    } else {
      descriptions.push('每小时')
    }

    // 解析日期部分
    const dateDescriptions = []

    if (day !== '*') {
      dateDescriptions.push(parsePart(day, '日'))
    }

    if (month !== '*') {
      dateDescriptions.push(parsePart(month, '月'))
    }

    if (weekday !== '*') {
      dateDescriptions.push(
        parsePart(weekday, '周', {
          0: '日',
          1: '一',
          2: '二',
          3: '三',
          4: '四',
          5: '五',
          6: '六',
          7: '日',
        })
      )
    }

    if (dateDescriptions.length > 0) {
      descriptions.push(dateDescriptions.join('、'))
    }

    return descriptions.join('') + '执行'
  }

  /**
   * 解析Cron表达式部分
   */
  parsePart(part, unit, mapping = {}) {
    if (part === '*') return `每${unit}`
    if (/^\d+$/.test(part)) return `${mapping[part] || part}${unit}`

    if (part.includes(',')) {
      const values = part.split(',').map((v) => mapping[v] || v)
      return `${values.join('、')}${unit}`
    }

    if (part.includes('-')) {
      const [start, end] = part.split('-')
      return `${mapping[start] || start}到${mapping[end] || end}${unit}`
    }

    if (part.includes('/')) {
      const [, interval] = part.split('/')
      return `每${interval}${unit}`
    }

    return part
  }
}
