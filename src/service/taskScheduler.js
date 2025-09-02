const CronJob = require('cron').CronJob
const Base = require('../service/base')
const EventEmitter = require('events')
const moment = require('moment') // 添加moment处理时间

module.exports = class extends Base {
  constructor() {
    super()
    this.scheduledTasks = new Map()
    this.lastRefreshTime = null
    this.refreshInterval = 15000
    this.refreshTasks = this.refreshTasks.bind(this)
    this.modelEvents = new EventEmitter()
  }

  async init() {
    await this.refreshTasks()
    setInterval(this.refreshTasks, this.refreshInterval)
    this.setupModelListeners()

    // 关键修复：连接模型事件发射器
    this.model('task').schedulerEventEmitter = this.modelEvents

    think.logger.info(
      `定时任务系统已启动，刷新间隔 ${this.refreshInterval / 1000}秒`
    )
  }

  setupModelListeners() {
    const handleTaskUpdate = (taskId) => {
      this.model('task')
        .getTaskById(taskId)
        .then((task) => {
          if (task) {
            if (task.is_active === 1) {
              this.updateTaskSchedule(task)
            } else {
              this.removeTaskSchedule(taskId)
            }
          }
        })
        .catch((e) => {
          think.logger.error(`任务更新处理失败:`, e)
        })
    }

    this.modelEvents.on('task:create', handleTaskUpdate)
    this.modelEvents.on('task:update', handleTaskUpdate)

    this.modelEvents.on('task:delete', (taskId) => {
      this.removeTaskSchedule(taskId)
      think.logger.info(`任务 #${taskId} 已删除`)
    })
  }

  async refreshTasks() {
    try {
      think.logger.debug('刷新定时任务列表...')
      const tasks = await this.model('task').getActiveTasks()
      const activeTaskIds = new Set(tasks.map((t) => t.id))

      // 处理所有任务（包括更新）
      for (const task of tasks) {
        if (!this.scheduledTasks.has(task.id)) {
          // 新增任务
          this.scheduleTask(task)
          think.logger.debug(`新增任务 #${task.id}`)
        } else {
          // 检查现有任务是否需要更新
          const existingTask = this.scheduledTasks.get(task.id)

          // console.log('existingTask==>', existingTask)
          // console.log('task==>', task)
          // 检查关键配置是否变更
          const isConfigChanged = existingTask.cron !== task.cron_expression
          if (isConfigChanged) {
            think.logger.debug(`任务 #${task.id} 配置变更，重新调度`)
            this.scheduleTask(task) // 重新调度
          }
        }
      }

      // 检查并移除删除/禁用任务
      const existingTaskIds = Array.from(this.scheduledTasks.keys())
      for (const taskId of existingTaskIds) {
        if (!activeTaskIds.has(taskId)) {
          this.removeTaskSchedule(taskId)
        }
      }

      this.lastRefreshTime = new Date()
      think.logger.debug(
        `任务刷新完成: 活跃任务 ${this.scheduledTasks.size} 个`
      )
    } catch (e) {
      think.logger.error('刷新任务时出错:', e)
    }
  }
  scheduleTask(task) {
    // console.log('this.scheduledTasks==>', this.scheduledTasks)
    try {
      // 如果任务已存在，先取消
      if (this.scheduledTasks.has(task.id)) {
        const { job } = this.scheduledTasks.get(task.id)
        job.stop()
        think.logger.warn(`任务 #${task.id} 已存在，重新调度`)
      }

      // 创建新任务 - 修复cron 4.3.1语法
      const job = new CronJob(
        task.cron_expression,
        async () => {
          await this.executeTask(task)
        },
        null,
        true, // 立即启动
        'Asia/Shanghai'
      )

      // 存储任务信息
      this.scheduledTasks.set(task.id, {
        job,
        cron: task.cron_expression,
      })

      // 更新下次执行时间
      this.updateTaskNextExecTime(task.id)

      think.logger.info(`任务 #${task.id} 调度成功: ${task.cron_expression}`)
    } catch (e) {
      think.logger.error(`任务调度失败 #${task.id}:`, e)
    }
  }

  updateTaskSchedule(task) {
    if (task.is_active !== 1) {
      this.removeTaskSchedule(task.id)
      return
    }

    // 获取现有任务
    const existingTask = this.scheduledTasks.get(task.id)
    if (!existingTask) {
      this.scheduleTask(task)
      return
    }

    // 检查cron表达式是否变更
    if (existingTask.cron !== task.cron_expression) {
      this.scheduleTask(task)
      think.logger.info(`任务 #${task.id} cron表达式变更，已重新调度`)
    } else {
      this.updateTaskNextExecTime(task.id)
      think.logger.debug(`任务 #${task.id} 配置更新（无需重新调度）`)
    }
  }

  removeTaskSchedule(taskId) {
    if (!this.scheduledTasks.has(taskId)) return

    const { job } = this.scheduledTasks.get(taskId)
    job.stop()
    this.scheduledTasks.delete(taskId)
    // 清除数据库中的下次执行时间
    this.model('task').updateNextExecution(taskId, null)
    think.logger.info(`任务 #${taskId} 已取消调度`)
  }

  updateTaskNextExecTime(taskId) {
    const taskData = this.scheduledTasks.get(taskId)
    if (!taskData) return

    try {
      // 获取下次执行时间（cron 4.3.1返回的是Date数组）
      const nextDates = taskData.job.nextDates(1)

      if (nextDates.length > 0) {
        // 关键修复：cron 4.3.1返回的是Date对象，不是Moment
        const nextDate = nextDates[0]

        // 存储到数据库
        this.model('task').updateNextExecution(taskId, think.datetime(nextDate))
      } else {
        think.logger.warn(`任务 #${taskId} 无下次执行时间`)
      }
    } catch (e) {
      think.logger.error(`更新任务 #${taskId} 下次执行时间失败:`, e)
    }
  }

  isNowInRange(start, end) {
    const now = moment()
    const startDate = start ? moment(start) : null
    const endDate = end ? moment(end) : null

    // 如果是日期格式（没有时间部分），设置最大结束时间
    if (endDate && end.length === 10) {
      endDate.endOf('day')
    }

    return (
      (!startDate || now.isSameOrAfter(startDate)) &&
      (!endDate || now.isSameOrBefore(endDate))
    )
  }

  async executeTask(task) {
    const taskInfo = await this.model('task').where({ id: task.id }).find()

    try {
      // 获取任务详情 - 使用正确的模型

      if (!taskInfo) {
        think.logger.error(`任务 #${task.id} 不存在`)
        return this.removeTaskSchedule(task.id)
      }

      // 检查任务状态
      if (taskInfo.is_active !== 1) {
        think.logger.warn(`任务 #${task.id} 已禁用`)
        return this.removeTaskSchedule(task.id)
      }

      // 检查时间范围
      if (!this.isNowInRange(taskInfo.start_date, taskInfo.end_date)) {
        think.logger.warn(`任务 #${task.id} 不在有效期内`)
        return
      }

      // 获取好友信息
      const friend = await this.model('friends')
        .where({ id: taskInfo.friend_id })
        .find()

      if (think.isEmpty(friend)) {
        throw new Error(`关联好友不存在: ${taskInfo.friend_id}`)
      }
      if (friend.is_active != 1) {
        throw new Error(`关联好友已禁用，无法发送消息: ${taskInfo.friend_id}`)
      }
      if (friend.ai_active != 1) {
        throw new Error(
          `关联好友已关闭AI托管，无法发送消息: ${taskInfo.friend_id}`
        )
      }

      const randomDelay = Math.floor(Math.random() * 60000)

      think.logger.info(
        `任务 #${task.id} 进入发送队列，将在 ${randomDelay / 1000} 秒后执行`
      )

      await new Promise((resolve) => setTimeout(resolve, randomDelay))

      // 延迟后再次检查任务状态（防止延迟期间任务被禁用）
      const refreshedTask = await this.model('task')
        .where({ id: task.id })
        .find()
      if (!refreshedTask || refreshedTask.is_active !== 1) {
        think.logger.warn(`任务 #${task.id} 在延迟期间已被禁用，取消发送`)
        return
      }

      // 发送消息
      const sender = think.service('messageSender')
      // 使用更合理的消息格式

      const content =
        taskInfo.message ||
        `${friend.my_remark ? friend.my_remark + '，' : ''}${
          taskInfo.task_name
        }`

      await sender.sendMessage({
        wxid: friend.wxid,
        content: content,
        taskId: taskInfo.id,
        account_id: friend.account_id,
      })

      // 记录执行信息
      await this.model('task').updateExecutionInfo(
        taskInfo.id,
        think.datetime(new Date())
      )

      think.logger.info(`任务 #${task.id} 执行完成`)

      this.model('task_logs').add({
        task_id: taskInfo.id,
        task_name: taskInfo.task_name,
        status: '执行完成',
      })
    } catch (e) {
      think.logger.error(`任务执行失败 #${task.id}:`, e)
      this.model('task_logs').add({
        task_id: taskInfo.id,
        task_name: taskInfo.task_name,
        status: '执行失败',
        content: e.message,
      })

      await this.model('task').recordExecutionError(task.id, e.message)
    }
  }
}
