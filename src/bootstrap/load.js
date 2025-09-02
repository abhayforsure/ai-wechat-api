const path = require('path')
// const { app } = require('thinkjs')
console.log('LOAD.JS 已加载')
// 初始化应用

// 添加 appReady 事件监听器
think.app.on('appReady', async () => {
  try {
    if (think.config('isDebuger')) {
      think.logger.info('当前环境为开发环境，跳过定时任务初始化')
      return
    }
    const scheduler = think.service('taskScheduler')
    await scheduler.init()
    const taskModel = think.model('task')
    taskModel.schedulerEventEmitter = scheduler.eventEmitter

    think.logger.info('定时任务初始化完成')
  } catch (e) {
    think.logger.error('定时任务初始化失败:', e)
  }
})
