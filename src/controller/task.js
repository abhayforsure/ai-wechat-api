const Base = require('./base')
const schedule = require('node-schedule')

// const cron = require('cron')
module.exports = class extends Base {
  /**
   * 获取任务列表
   */
  async listAction() {
    const model = this.model('friends_task')
    const tasks = await model
      .where({
        is_active: 1,
      })
      .select()
    let ser = think.service('base')

    for (let item of tasks) {
      try {
        item.cron_expression_chinese = ser.parseCronToChinese(
          item.cron_expression
        )
      } catch (e) {
        item.cron_expression_chinese = '中文解析失败'
      }
    }
    return this.success(tasks)
  }

  async testAction() {
    try {
      const cronExpression = '50 19 15 8 7 2' // 您的原始 cron 表达式

      // 创建临时调度任务
      const job = schedule.scheduleJob(cronExpression, () => {})

      // 获取下次执行时间
      const nextTime = job.nextInvocation()
      job.cancel() // 立即取消这个临时任务

      console.log(`The job would run at: ${nextTime}`)
      return this.success(nextTime)
    } catch (e) {
      console.error('解析cron表达式失败:', e)
      return this.fail('解析cron表达式失败')
    }
  }
  async closeAllTaskAction() {
    let friend_id = this.post('friend_id')
    if (!friend_id) {
      return this.fail('friend_id 不能为空')
    }
    const model = this.model('friends_task')
    let res = model
      .where({
        friend_id: friend_id,
      })
      .update({
        is_active: 0,
      })
    return this.success(res)
  }

  async listWithFriendIdAction() {
    let friend_id = this.post('friend_id')
    if (!friend_id) {
      return this.fail('friend_id 不能为空')
    }
    const model = this.model('friends_task')
    const tasks = await model
      .where({
        friend_id: Number(friend_id),
        is_active: 1,
      })
      .order('is_active desc, create_time desc')
      .select()
    for (let task of tasks) {
      task.is_active = task.is_active.toString()
    }
    return this.success(tasks)
  }
  async updateTaskAction() {
    let task = this.post()
    let map = {
      start_date: task.start_date,
      end_date: task.end_date,
      cron_expression: task.cron_expression,
      task_name: task.task_name,
      friend_id: task.friend_id,
    }
    if (task.id) {
      let res = await this.model('task').where({ id: task.id }).update(map)
      return res
    } else {
      let res = await this.model('task').add(map)
      return res
    }
  }
  async updateTaskStatusAction() {
    const model = this.model('friends_task')
    const id = this.get('id')
    const is_active = this.get('is_active')
    if (id > 0) {
      let res = await model
        .where({
          id: id,
        })
        .update({
          is_active: is_active,
        })
      // return this.success(res)
    } else {
      return this.fail(500, '错误，联系管理员')
    }
  }
  /**
   * 创建新任务
   */
  async createAction() {
    const params = this.post()
    const model = this.model('task')

    // 验证cron表达式
    if (!this.validateCron(params.cron_expression)) {
      return this.fail('无效的cron表达式')
    }

    const id = await model.add(params)

    // 如果任务激活，立即调度
    if (params.is_active === 1) {
      const task = await model.where({ id }).find()
      const scheduler = think.service('taskScheduler')
      scheduler.scheduleTask(task)
    }

    return this.success({ id })
  }

  /**
   * 更新任务
   */
  async updateAction() {
    const id = this.get('id')
    const params = this.post()
    const model = this.model('task')

    if (params.cron_expression && !this.validateCron(params.cron_expression)) {
      return this.fail('无效的cron表达式')
    }

    await model.where({ id }).update(params)

    // 重新加载任务
    const scheduler = think.service('taskScheduler')
    await scheduler.reloadTasks()

    return this.success('任务更新成功')
  }

  /**
   * 删除任务
   */
  async deleteAction() {
    const id = this.get('id')
    await this.model('task').where({ id }).delete()

    // 取消任务调度
    const scheduler = think.service('taskScheduler')
    scheduler.scheduledTasks.get(id)?.stop()
    scheduler.scheduledTasks.delete(id)

    return this.success('任务删除成功')
  }

  /**
   * 重新加载所有任务
   */
  async reloadAction() {
    const scheduler = think.service('taskScheduler')
    await scheduler.reloadTasks()
    return this.success('任务已重新加载')
  }

  /**
   * 验证cron表达式
   */
  validateCron(expression) {
    try {
      return true
      // const cron = require('node-cron')
      // return cron.validate(expression)
    } catch (e) {
      return false
    }
  }
}
