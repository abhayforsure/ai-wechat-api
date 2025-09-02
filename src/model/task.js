const moment = require('moment')

module.exports = class extends think.Model {
  get tableName() {
    return 'ai_friends_task'
  }

  async getActiveTasks() {
    let data = await this.where({ is_active: 1 }).select()

    for (let item of data) {
      let res = this.isNowInRange(item.start_time, item.end_time)
      if (res == 2) {
        // 使用实例更新确保触发钩子
        const task = await this.where({ id: item.id }).find()
        if (!think.isEmpty(task)) {
          task.is_active = 0
          await this.update(task)
        }
      }
    }
    return await this.where({ is_active: 1 }).select()
  }

  isNowInRange(start, end) {
    const now = moment()
    const startDate = start ? moment(start) : null
    const endDate = end ? moment(end) : null

    if (endDate && end.length === 10) {
      endDate.endOf('day')
    }

    if (endDate && now.isAfter(endDate)) {
      return 2
    }

    if (
      (!startDate || now.isSameOrAfter(startDate)) &&
      (!endDate || now.isSameOrBefore(endDate))
    ) {
      return 1
    }
    return 0
  }

  async getTaskById(taskId) {
    return this.where({ id: taskId }).find()
  }

  async updateNextExecution(taskId, nextTime) {
    const task = await this.where({ id: taskId }).find()
    if (!think.isEmpty(task)) {
      task.next_execution_time = nextTime
      return this.update(task)
    }
    return false
  }

  async updateExecutionInfo(id, lastExec) {
    const task = await this.where({ id }).find()
    if (!think.isEmpty(task)) {
      task.last_execution_time = lastExec
      task.execution_count = (task.execution_count || 0) + 1
      return this.update(task)
    }
    return false
  }

  async recordExecutionError(taskId, message) {
    const task = await this.where({ id: taskId }).find()
    if (!think.isEmpty(task)) {
      task.last_execution_time = think.datetime(new Date())
      task.error_message = message
      return this.update(task)
    }
    return false
  }

  // 模型钩子
  async afterAdd(data) {
    if (this.schedulerEventEmitter) {
      this.schedulerEventEmitter.emit('task:create', data.id)
    }
    return data
  }

  async afterUpdate(data) {
    if (this.schedulerEventEmitter) {
      this.schedulerEventEmitter.emit('task:update', data.id)
    }
    return data
  }

  async afterDelete(data) {
    if (this.schedulerEventEmitter) {
      this.schedulerEventEmitter.emit('task:delete', data.id)
    }
    return data
  }

  // 事件发射器设置
  set schedulerEventEmitter(emitter) {
    this._schedulerEventEmitter = emitter
  }

  get schedulerEventEmitter() {
    return this._schedulerEventEmitter
  }
}
