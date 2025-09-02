module.exports = class extends think.Model {
  get tableName() {
    return 'ai_wechat_account'
  }
  async loginOutUpdate(key) {
    await this.where({ auth_key: key }).update({
      online: false,
      onlineTime: null,
      expiryTime: null,
      loginErrMsg: null,
      onlineDays: null,
      loginTime: null,
      totalOnline: null,
    })
  }
}
