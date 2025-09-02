const Base = require('./base.js')
const moment = require('moment')

module.exports = class extends Base {
  async basicAction() {
    const FriendModel = this.model('friends')
    const AccountModel = this.model('wechat_account')
    const MessageModel = this.model('messages')
    const SentModel = this.model('messages')

    const [friendsTotal, onlineAccounts, receivedMessages, sentType1] =
      await Promise.all([
        FriendModel.count(),
        AccountModel.where({ onlineTime: ['!=', null] }).count(),
        MessageModel.count(),
        SentModel.where({ type: 1 }).count(),
      ])

    return this.success({
      friends: friendsTotal,
      online: onlineAccounts,
      received: receivedMessages,
      sent: sentType1,
    })
  }

  async chartsDataAction() {
    const MessageModel = this.model('messages')
    const TaskModel = this.model('friends_task')

    let msgSql =
      'WITH date_range AS(SELECT CURDATE()-INTERVAL n DAY AS stat_date FROM(SELECT 0 AS n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19)AS days),message_stats AS(SELECT DATE(create_at)AS msg_date,COUNT(CASE WHEN is_ai=1 THEN 1 END)AS ai_msg_count,COUNT(CASE WHEN TYPE=1 THEN 1 END)AS total_msg_count FROM ai_messages WHERE create_at>=CURDATE()-INTERVAL 19 DAY GROUP BY DATE(create_at))SELECT dr.stat_date,COALESCE(ms.ai_msg_count,0)AS ai_msg_count,COALESCE(ms.total_msg_count,0)AS total_msg_count FROM date_range dr LEFT JOIN message_stats ms ON dr.stat_date=ms.msg_date ORDER BY dr.stat_date DESC;'

    let taskSql =
      'WITH date_range AS(SELECT CURDATE()-INTERVAL n DAY AS stat_date FROM(SELECT 0 AS n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19)AS days),task_stats AS(SELECT DATE(create_time)AS task_date,COUNT(*)AS new_task_count FROM ai_friends_task WHERE create_time>=CURDATE()-INTERVAL 19 DAY GROUP BY DATE(create_time))SELECT dr.stat_date,COALESCE(ts.new_task_count,0)AS new_task_count FROM date_range dr LEFT JOIN task_stats ts ON dr.stat_date=ts.task_date ORDER BY dr.stat_date DESC;'

    let dailyMessages = await MessageModel.query(msgSql)
    console.log(dailyMessages)
    let dailyTasks = await TaskModel.query(taskSql)

    let data = {
      dailyMessages: dailyMessages,
      dailyTasks: dailyTasks,
    }
    return this.success(data)
  }

  async chartsAction() {
    const MessageModel = this.model('messages')
    const TaskModel = this.model('friends_task')

    const now = moment()
    const startTime24h = now
      .clone()
      .subtract(24, 'hours')
      .format('YYYY-MM-DD HH:mm:ss')

    // 1. 消息统计部分
    const messageLabels = Array.from({ length: 25 }, (_, i) => {
      return now
        .clone()
        .subtract(24 - i, 'hours')
        .format('MM-DD HH:00')
    })

    // 使用正确的参数绑定方式
    const getMessageStats = async (isAI = false) => {
      const whereCondition = {
        create_at: ['>=', startTime24h],
      }

      if (isAI) {
        whereCondition.is_ai = 1
      }

      const results = await MessageModel.field(
        `DATE_FORMAT(create_at, '%Y-%m-%d %H:00') AS hour_group, COUNT(*) AS count`
      )
        .where(whereCondition) // 直接使用对象语法，避免手动绑定
        .group('hour_group')
        .select()

      const countMap = new Map(
        results.map((item) => [item.hour_group, item.count])
      )

      const currentData = []
      for (let i = 0; i < 24; i++) {
        const hourPoint = now
          .clone()
          .subtract(24 - i, 'hours')
          .startOf('hour')
          .format('YYYY-MM-DD HH:mm')

        currentData.push(countMap.get(hourPoint) || 0)
      }
      return currentData
    }

    // 使用 Promise.all 并行查询
    const [totalResults, aiResults] = await Promise.all([
      getMessageStats(),
      getMessageStats(true),
    ])

    // 2. 任务统计部分 - 完全避免手动 SQL 绑定
    const taskStartTime = now
      .clone()
      .subtract(3, 'hours')
      .format('YYYY-MM-DD HH:mm:ss')

    const getTaskStats = async (field) => {
      // 使用 ThinkJS ORM 的对象语法代替手动绑定
      const whereCondition = {
        [field]: ['>=', taskStartTime],
      }

      const groupExpression =
        field === 'create_time' ? 'COUNT(*)' : 'SUM(execution_count)'

      const results = await TaskModel.field(
        `
        DATE_FORMAT(${field}, '%Y-%m-%d %H:00') AS hour_group,
        ${groupExpression} AS value
      `
      )
        .where(whereCondition) // 直接使用对象语法
        .group('hour_group')
        .select()

      const countMap = new Map(
        results.map((item) => [item.hour_group, Number(item.value)])
      )

      const hourLabels = []
      const counts = []

      for (let i = 0; i <= 3; i++) {
        const hourPoint = now
          .clone()
          .subtract(3 - i, 'hours')
          .startOf('hour')
          .format('YYYY-MM-DD HH:mm')

        hourLabels.push(
          now
            .clone()
            .subtract(3 - i, 'hours')
            .format('HH:00')
        )

        counts.push(countMap.get(hourPoint) || 0)
      }

      return { labels: hourLabels, data: counts }
    }

    // 并行查询任务统计数据
    const taskData = await Promise.all([
      getTaskStats('create_time'),
      getTaskStats('last_execution_time'),
    ])

    // 3. 额外统计
    const messageTypes = await MessageModel.field(
      `
      CASE 
        WHEN msg_type = 1 THEN '文本'
        WHEN msg_type = 3 THEN '图片'
        WHEN msg_type = 34 THEN '语音'
        ELSE '其他'
      END AS type,
      COUNT(*) AS count
    `
    )
      .where('create_at >= :startTime', { startTime: startTime24h }) // 使用命名参数语法
      .group('type')
      .select()

    // 4. 任务状态统计
    const taskStatusDistribution = await TaskModel.field(
      `
      CASE 
        WHEN is_active = 1 AND last_execution_time IS NOT NULL THEN '执行中'
        WHEN is_active = 1 AND last_execution_time IS NULL THEN '待启动'
        WHEN is_active = 0 AND execution_count > 0 THEN '已结束'
        ELSE '未激活'
      END AS status,
      COUNT(*) AS count
    `
    )
      .group('status')
      .select()

    // 5. 返回结果
    return this.success({
      messages: {
        labels: messageLabels,
        totalData: totalResults,
        aiData: aiResults,
        types: messageTypes,
      },
      tasks: {
        labels: taskData[0].labels,
        counts: taskData[0].data,
        executions: taskData[1].data,
        statusDistribution: taskStatusDistribution,
      },
      summary: {
        totalMessages: totalResults.reduce((a, b) => a + b, 0),
        aiMessages: aiResults.reduce((a, b) => a + b, 0),
        aiMessageRatio:
          aiResults.reduce((a, b) => a + b, 0) /
            totalResults.reduce((a, b) => a + b, 0) || 0,
      },
    })
  }
}
