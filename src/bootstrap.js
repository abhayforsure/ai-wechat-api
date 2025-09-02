module.exports = async () => {
  console.log('Bootstrap loaded successfully.')
  console.log('应用启动完成后初始化任务调度')
  app.on('appReady', async () => {
    try {
      const scheduler = think.service('taskScheduler')
      await scheduler.init()
      think.logger.info('定时任务初始化完成')
    } catch (e) {
      think.logger.error('定时任务初始化失败:', e)
    }
  })
}
