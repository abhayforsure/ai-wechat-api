const Base = require('./base')

module.exports = class extends Base {
  /**
   * 获取任务列表
   */
  async indexAction() {
    const page = this.get('page') || 1
    const size = this.get('size') || 10
    const model = this.model('roles')
    let queryMap = {}

    const list = await model.page(page, size).countSelect()
    return this.success(list)
  }

  async listAllAction() {
    const model = this.model('roles')
    const list = await model.select()
    return this.success(list)
  }

  async deleteAction() {
    const id = this.get('id')
    if (!id) {
      return this.fail('id不能为空')
    }
    const role = await this.model('roles').where({ id: id }).find()
    if (!role) {
      return this.fail('角色不存在')
    }
    if (role.is_system) {
      return this.fail('系统角色不能删除')
    }
    // const friends = await this.model('friends').where({ role_id: id }).find()
    // if (friends) {
    //   return this.fail('角色下有好友，不能删除')
    // }
    await this.model('roles').where({ id }).delete()
    return this.success()
  }

  async editAction() {
    const id = this.post('id')
    if (!id) {
      return this.fail('id不能为空')
    }
    const role = await this.model('roles').where({ id }).find()
    if (!role) {
      return this.fail('角色不存在')
    }
    const name = this.post('name')
    if (!name) {
      return this.fail('name不能为空')
    }
    const prompt = this.post('prompt')
    if (!prompt) {
      return this.fail('prompt不能为空')
    }
    await this.model('roles').where({ id }).update({
      name,
      prompt,
    })
    return this.success()
  }
  async addAction() {
    const name = this.post('name')
    if (!name) {
      return this.fail('name不能为空')
    }
    const prompt = this.post('prompt')
    if (!prompt) {
      return this.fail('prompt不能为空')
    }
    await this.model('roles').add({
      name,
      prompt,
    })
    return this.success()
  }
}
