const AIService = require('../service/ai.js')
const Base = require('./base.js')

module.exports = class extends Base {
  async indexAction() {
    let test = await think.service('ai').test()

    return this.success(test)
  }
}
