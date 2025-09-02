const Base = require('./base.js')
const rp = require('request-promise')

module.exports = class extends Base {
  async getAIReplyAction() {
    const id = this.post('id')
    const prompt = this.post('prompt')
    if (id > 0) {
      let info = await this.model('wechat_account')
        .where({
          id: id,
        })
        .find()

      if (!info.wx_id) {
        return this.fail()
      }

      let hismsg = await this.model('message').getMasterHistoryChatRecord(
        info.wx_id
      )
      // console.log('历史消息==>', hismsg)
      let aiReply = await think
        .service('ai')
        .getAIReplyWithHumanSummary(prompt, info.wx_id, hismsg)
      return this.success(aiReply)
    } else {
      return this.fail(500, '错误，联系管理员')
    }
  }

  async allListAction() {
    let data = await this.model('wechat_account').order('id desc').select()
    return this.success(data)
  }

  async indexAction() {
    const page = this.get('page') || 1
    const size = this.get('size') || 10
    let data = await this.model('wechat_account')
      .order('id desc')
      .page(page, size)
      .countSelect()
    for (let item of data.data) {
      item.ws_status = item.ws_status.toString()
      let count = await this.model('friends')
        .where({
          account_id: item.id,
        })
        .count()

      item.friend_count = count

      this.model('wechat_account').update(
        { friend_count: count },
        { where: { id: item.id } }
      )
      try {
        let res = await this.refreshOnlineStatus(item.auth_key)
        if (res) {
          item.online = true
          item.onlineTime = res.onlineTime
          item.expiryTime = res.expiryTime
          item.loginErrMsg = res.loginErrMsg
          item.onlineDays = res.onlineDays
          item.loginTime = res.loginTime
          item.totalOnline = res.totalOnline
        } else {
          item.online = false
          item.onlineTime = null
          item.expiryTime = null
          item.loginErrMsg = null
          item.onlineDays = null
          item.loginTime = null
          item.totalOnline = null
        }
      } catch (error) {
        console.log('error==》', error)
      }
    }
    return this.success(data)
  }

  async refreshOnlineStatus(auth_key) {
    let url =
      this.config('wechatpadpro').hostUrl +
      this.config('wechatpadpro').GetLoginStatus +
      '?key=' +
      auth_key
    const options = {
      method: 'GET',
      url: url,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    }
    let data = await rp(options)
    data = JSON.parse(data)

    if (data.Code == '200') {
      let map = {
        onlineTime: data.Data.onlineTime,
        expiryTime: data.Data.expiryTime,
        loginErrMsg: data.Data.loginErrMsg,
        onlineDays: data.Data.onlineDays,
        loginTime: data.Data.loginTime,
        totalOnline: data.Data.totalOnline,
      }

      await this.model('wechat_account')
        .where({ auth_key: auth_key })
        .update(map)
      return map
    } else {
      await this.model('wechat_account').where({ auth_key: auth_key }).update({
        online: false,
        onlineTime: null,
        expiryTime: null,
        loginErrMsg: null,
        onlineDays: null,
        loginTime: null,
        totalOnline: null,
      })
      return false
    }
  }

  async insertAction() {
    const { auth_key } = this.post()
    if (!auth_key) {
      return this.fail('设备码不能为空')
    }
    let data = await this.model('wechat_account').add({
      auth_key,
    })
    return this.success(data)
  }

  async updateAction() {
    const { auth_key, wx_id, auth_key_remaining_time, avatar, nickname } =
      this.post()
    if (!auth_key) {
      return this.fail('auth_key不能为空')
    }
    let data = await this.model('wechat_account')
      .where({ auth_key: auth_key })
      .update({
        wx_id,
        wx_id,
        auth_key_remaining_time,
        avatar,
        nickname,
      })
    return this.success(data)
  }
  async deleteAction() {
    const { auth_key } = this.post()
    if (!auth_key) {
      return this.fail('auth_key不能为空')
    }
    let data = await this.model('wechat_account')
      .where({ auth_key: auth_key })
      .delete()
    return this.success(data)
  }
}
