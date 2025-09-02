const Base = require('./base')

module.exports = class extends Base {
  /**
   * 获取任务列表
   */
  async indexAction() {
    const page = this.get('page') || 1
    const size = this.get('size') || 10
    const model = this.model('system')
    let queryMap = {}

    const list = await model.page(page, size).countSelect()
    return this.success(list)
  }

  async userTAction() {
    let userId = this.get('userId')
    let serve = think.service('ai')
    let friendInfo = await this.model('friends').where({ id: userId }).find()

    let res = await serve.getUserSummary('1', friendInfo)
    // let res = await serve.safeJsonParse('{"name":"张"三"","age":18}')

    return this.success(res)
    // return this.success(res.choices[0].message.content)
  }

  async testAction() {
    const host = this.post('host')
    if (!host) {
      return this.fail('host不能为空')
    }
    const key = this.post('key')
    if (!key) {
      return this.fail('key不能为空')
    }
    const model = this.post('model')
    if (!model) {
      return this.fail('model不能为空')
    }
    const prompt = this.post('prompt')
    if (!prompt) {
      return this.fail('prompt不能为空')
    }
    let info = {
      host,
      key,
      model,
      prompt,
    }
    let serve = think.service('ai')
    let res = await serve.getTestAIReply(info)

    return this.success(res.choices[0].message.content)
  }

  async deleteAction() {
    const id = this.get('id')
    if (!id) {
      return this.fail('id不能为空')
    }
    const role = await this.model('system').where({ id: id }).find()
    if (!role) {
      return this.fail('参数不存在')
    }

    await this.model('system').where({ id }).delete()
    return this.success()
  }

  async editAction() {
    const id = this.post('id')
    if (!id) {
      return this.fail('id不能为空')
    }
    const role = await this.model('system').where({ id }).find()
    if (!role) {
      return this.fail('参数不存在')
    }
    const key = this.post('key')
    if (!key) {
      return this.fail('key')
    }
    const value = this.post('value')
    if (!value) {
      return this.fail('value不能为空')
    }

    const desc = this.post('desc')
    if (!desc) {
      return this.fail('desc不能为空')
    }
    await this.model('system').where({ id }).update({
      key,
      value,
      desc,
    })
    return this.success()
  }
  async addAction() {
    const key = this.post('key')
    if (!key) {
      return this.fail('key不能为空')
    }
    const value = this.post('value')
    if (!value) {
      return this.fail('value不能为空')
    }
    const desc = this.post('desc')
    if (!desc) {
      return this.fail('desc不能为空')
    }
    await this.model('system').add({
      key,
      value,
      desc,
    })
    return this.success()
  }
}
