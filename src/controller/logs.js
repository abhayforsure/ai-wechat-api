const Base = require('./base')

module.exports = class extends Base {
  /**
   * 获取任务列表
   */
  async indexAction() {
    const page = this.get('page') || 1
    const size = this.get('size') || 10
    const msg = this.get('msg') || ''
    const text = this.get('text') || ''
    const reson = this.get('reson') || ''
    const reply = this.get('reply') || ''

    let queryMap = {}
    if (msg) {
      queryMap.msg = ['like', `%${msg}%`]
    }
    if (text) {
      queryMap.text = ['like', `%${text}%`]
    }
    if (reson) {
      queryMap.reson = ['like', `%${reson}%`]
    }
    if (reply) {
      queryMap.reply = ['like', `%${reply}%`]
    }

    const model = this.model('logs')
    const list = await model
      .order('id desc')
      .where(queryMap)
      .page(page, size)
      .countSelect()
    return this.success(list)
  }
}
