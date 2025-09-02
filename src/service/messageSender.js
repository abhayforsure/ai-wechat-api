module.exports = class {
  constructor() {
    // 实例化所需Model
    this.friendsTaskModel = think.model('friends_task')
    this.friendsModel = think.model('friends')
    this.wechatAccountModel = think.model('wechat_account')
    this.messageModel = think.model('messages')
  }
  /**
   * 发送消息
   * @param {Object} params
   */
  async sendMessage(params) {
    const { wxid, content, taskId, account_id } = params

    let accountInfo = {}
    let friendInfo = {}
    let auth_key
    if (think.isEmpty(account_id)) {
      const taskInfo = await this.friendsTaskModel.where({ id: taskId }).find()
      friendInfo = await this.friendsModel
        .where({ id: taskInfo.friend_id })
        .find()

      accountInfo = await this.wechatAccountModel
        .where({ id: friendInfo.account_id })
        .find()
      auth_key = accountInfo.auth_key
    } else {
      accountInfo = await this.wechatAccountModel
        .where({ id: account_id })
        .find()
      auth_key = (
        await this.wechatAccountModel.where({ id: account_id }).find()
      ).auth_key
      friendInfo = await this.friendsModel
        .where({ account_id: account_id, wxid: wxid })
        .find()
    }

    think.logger.info(`发送任务消息 [任务ID: ${taskId}] 给 ${wxid}: ${content}`)

    //文案调整

    if (think.config('isDebuger')) {
      console.log('调试模式，不发送消息,看到此消息表示已发送')
      return {
        code: 0,
        msg: '调试模式，不发送消息',
      }
    }

    let txt = await think
      .service('ai')
      .getCopyModWithAI(content, 1001, friendInfo)
    console.log('文案调整后的内容==>', txt)
    if (think.isEmpty(txt)) {
      return
    } else {
      // 调用微信服务发送消息
      const wechatService = think.service('wechat')
      const result = await wechatService.sendTextMessage({
        key: auth_key,
        wxid: wxid,
        content: txt,
      })
      await this.messageModel.add({
        from_user: accountInfo.wx_id,
        to_user: wxid,
        content: txt,
        is_ai: 1,
      })
    }

    return result
  }
}
