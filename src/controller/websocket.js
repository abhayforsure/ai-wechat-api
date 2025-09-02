const Base = require('./base.js')
const rp = require('request-promise')
const moment = require('moment') // 添加moment处理时间

//Message
const SendTextMessage = '/message/SendTextMessage'

class MessageProcessor {
  constructor(model) {
    this.model = model
    this.messageQueue = new Map()
    this.processingTimers = new Map()
    this.delayTime = 10000 // 20秒延迟
  }

  addMessage(wxid, message) {
    // 初始化用户队列
    if (!this.messageQueue.has(wxid)) {
      this.messageQueue.set(wxid, {
        messages: [],
        lastReceived: Date.now(),
      })
    }

    const userQueue = this.messageQueue.get(wxid)

    // 添加新消息
    userQueue.messages.push({
      content: message.content?.str || '',
      create_time: message.create_time || Date.now(),
      raw: message, // 保存原始消息
    })

    userQueue.lastReceived = Date.now()

    // 重置处理定时器
    this.resetProcessingTimer(wxid, message)
  }

  resetProcessingTimer(wxid, message) {
    // 清除现有定时器
    if (this.processingTimers.has(wxid)) {
      clearTimeout(this.processingTimers.get(wxid))
    }

    // 设置新的定时器
    const timer = setTimeout(async () => {
      await this.processUserMessages(wxid, message)
    }, this.delayTime)

    this.processingTimers.set(wxid, timer)
  }

  async processUserMessages(wxid, msg) {
    if (!this.messageQueue.has(wxid)) return

    const userQueue = this.messageQueue.get(wxid)
    const messages = [...userQueue.messages] // 复制消息数组

    // 清理队列
    this.messageQueue.delete(wxid)
    this.processingTimers.delete(wxid)

    // 按时间排序消息
    messages.sort((a, b) => a.create_time - b.create_time)

    // 合并消息内容
    const combinedContent = messages.map((m) => m.content).join('\n')

    console.log(`处理 ${wxid} 的 ${messages.length} 条消息:`, combinedContent)

    try {
      // 检查好友激活状态
      const checkActive = await this.model('friends')
        .where({
          wxid: wxid,
          is_active: 1,
          ai_active: 1,
        })
        .find()
      console.log('combinedContent==》', combinedContent)
      if (checkActive.id > 0) {
        // 获取AI回复
        const aiResponse = await think
          .service('ai')
          .getAIReplyWithUserChat(combinedContent, checkActive)
        console.log('aiResponse==》', aiResponse)

        if (aiResponse && checkActive.ai_reply == 1) {
          const delay = (ms) =>
            new Promise((resolve) => setTimeout(resolve, ms))

          for (let item of aiResponse) {
            if (item) {
              // 发送消息
              let wechatAccount = await this.model('wechat_account')
                .where({
                  wx_id: msg.to_user_name.str,
                })
                .find()
              console.log('发送消息==》', {
                key: wechatAccount.auth_key,
                wxid: wxid,
                content: item,
              })
              await this.controllerRef.sendTextMessageAction({
                key: wechatAccount.auth_key,
                wxid: wxid,
                content: item,
                from: wechatAccount.wx_id,
              })

              if (aiResponse.indexOf(item) < aiResponse.length - 1) {
                await delay(2000)
              }
            }
          }
          // 更新消息状态为已处理
          await this.updateMessagesStatus(messages, 'processed')
        } else {
          console.log('AI回复为空或未启用AI回复')
          // 更新消息状态为未处理
          await this.updateMessagesStatus(messages, 'processed')
        }
      }
    } catch (error) {
      console.error(`处理用户 ${wxid} 消息失败:`, error)
      // 更新消息状态为失败
      await this.updateMessagesStatus(messages, 'failed')
    }
  }

  async updateMessagesStatus(messages, status) {
    const messageIds = messages.map((m) => m.raw.msg_id) // 假设原始消息有msg_id

    if (messageIds.length > 0) {
      try {
        await this.model('messages')
          .where({ msg_id: ['IN', messageIds] })
          .update({ status: status })
      } catch (e) {
        console.error('更新消息状态失败:', e)
      }
    }
  }
}
const WebSocketManager = require('../service/websocket')

module.exports = class extends Base {
  async __before() {
    // 初始化WebSocket管理器
    if (!this.wsManager) {
      this.wsManager = think.service('websocket') || WebSocketManager
      // console.log('使用的 WebSocketManager 实例:', this.wsManager)
    }
    // this.wsManager = this.service('websocket')
    // 初始化消息处理器
    if (!this.messageProcessor) {
      this.messageProcessor = new MessageProcessor(this.model.bind(this))
      this.messageProcessor.controllerRef = this // 设置控制器引用
    }
  }

  async _updateWsStatus() {
    try {
      // 获取所有微信账号
      const accounts = await this.model('wechat_account')
        .field('auth_key, id, wx_id, ws_status')
        .select()

      // 调试：打印当前所有连接
      // console.log('所有连接:', this.wsManager.connections.keys())

      const statusUpdates = []
      const results = []

      // 检查每个账号的状态
      for (const account of accounts) {
        const url = think.config('wechatpadpro.wsUrl') + account.auth_key

        // 检查连接是否存在
        const stateName = this.wsManager.getConnectionState(url)
        const stateCode = this.mapStateToCode(stateName)

        // 记录结果
        results.push({
          account_id: account.id,
          auth_key: account.auth_key,
          url,
          state: stateName,
          stateCode,
          currentDBStatus: account.ws_status,
        })

        // 如果状态变化则更新数据库
        if (account.ws_status !== stateCode) {
          if (think.config('isDebuger')) {
            console.log('调试状态，不修改ws连接状态值')
          } else {
            await this.model('wechat_account')
              .where({ id: account.id })
              .update({ ws_status: stateCode })
            console.log(
              `更新账号 ${account.wx_id} 状态: ${account.ws_status} -> ${stateCode}`
            )
          }
        }
      }

      return results
    } catch (error) {
      console.error('检查WebSocket状态时出错:', error)
      return []
    }
  }

  // 状态映射到数据库存储的数值
  mapStateToCode(stateName) {
    const statesMap = {
      CONNECTING: 0,
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3,
      NOT_FOUND: 3,
      ERROR: 4,
    }
    return statesMap[stateName] !== undefined ? statesMap[stateName] : 3
  }

  async checkWsActiveAction() {
    const results = await this._updateWsStatus()
    return this.success(results)
    //
  }

  async connectTestAction() {
    await this.connectAction('838071e7-5bf4-4767-81df-16d87bc69907')
  }

  /**
   * 创建WebSocket连接
   */
  async connectAction(para) {
    let auth_key = this.get('key')
    if (para) {
      auth_key = para
    }
    if (!auth_key) {
      return this.fail('key不能为空')
    }
    const url = think.config('wechatpadpro.wsUrl') + auth_key

    // 创建消息处理器
    const handlers = {
      onMessage: (data) => {
        try {
          const message = JSON.parse(data)

          // 处理消息逻辑
          this.handleWsMessage(message, auth_key)
        } catch (e) {
          console.error('消息解析失败:', e)
        }
      },

      onError: (error) => {
        console.error('连接错误:', error)
      },

      onClose: (code, reason) => {
        console.log(`连接关闭: ${code} - ${reason}`)
      },
    }

    // 获取或创建连接
    const ws = this.wsManager.getConnection(url, handlers)

    await this.model('wechat_account')
      .where({ auth_key: auth_key })
      .update({ ws_status: 1 })

    return this.success({
      message: 'WebSocket连接已启动',
      url,
      state: this.wsManager.getStateName('OPEN'),
    })
  }

  /**
   * 处理WebSocket消息
   * @param {Object} message 消息对象
   */
  async handleWsMessage(message, auth_key) {
    const from_user_name = message.from_user_name?.str
    const to_user_name = message.to_user_name?.str
    console.log('处理消息==》', message)
    if (!from_user_name) return
    try {
      let isSave = await this.model('messages')
        .where({
          msg_id: message.msg_id,
        })
        .find()
      if (isSave.id > 0) {
        return
      }

      let checkMsgNeed = await this.checkMsgNeedHandle(
        from_user_name,
        to_user_name,
        auth_key
      )

      if (checkMsgNeed == 0) {
        return
      } else {
        if (message.msg_type != 51) {
          await this.saveMessageToDB(message, checkMsgNeed == 1 ? 1 : 0)
        }
        if (checkMsgNeed == 3) {
          console.log('收到会员消息==》', message.content?.str || '')

          this.messageProcessor.addMessage(from_user_name, message)
        }
      }
    } catch (error) {
      console.error('消息处理失败:', error)
    }
  }
  async checkMsgNeedHandle(from_user_name, to_user_name, auth_key) {
    let checkSendAccount = await this.model('wechat_account')
      .where({
        wx_id: from_user_name,
        auth_key: auth_key,
      })
      .find()
    //自己发的 无需AI处理，保存记录即可
    if (checkSendAccount.id) {
      return 1
    }
    let checkGetAccount = await this.model('friends')
      .where({
        wxid: from_user_name,
        is_active: 1,
      })
      .find()

    //收到会员消息  但是没有AI托管
    if (checkGetAccount.id > 0 && checkGetAccount.ai_active == 0) {
      return 2
    }

    //收到会员消息  但是AI托管
    if (checkGetAccount.id > 0 && checkGetAccount.ai_active == 1) {
      return 3
    }
    return 0
  }

  async saveMessageToDB(message, type) {
    const from_user_name = message.from_user_name?.str
    const content = message.content?.str || ''
    const create_time = message.create_time || Date.now()
    const to_user_name = message.to_user_name?.str || ''
    const msg_id = message.msg_id
    try {
      let map = {
        type: type,
        msg_type: message.msg_type,
        msg_id: msg_id,
        from_user: from_user_name,
        content: content,
        create_time: create_time,
        status: type == 1 ? 'done' : 'queued', // 标记为排队中
        to_user: to_user_name,
        raw_data: JSON.stringify(message), // 保存原始数据
        is_ai: 0, //1是AI回复的，0是人工回复的
      }
      let check = await this.model('messages').where({ msg_id: msg_id }).find()
      if (check.id > 0) {
        return 0
      } else {
        if (think.isEmpty(map.content)) {
          return 0
        }
        const insertId = await this.model('messages').add(map)
        return insertId
      }
    } catch (dbError) {
      console.error('保存消息到数据库失败:', dbError)
      throw dbError
    }
  }
  async testTimeAction() {
    let res = this.isNowInRange('2025-07-09 10:50:00', '2025-07-09 01:45:00')
    return this.success(res)
  }
  isNowInRange(start, end) {
    const now = moment()
    const startDate = start ? moment(start) : null
    const endDate = end ? moment(end) : null

    // 如果是日期格式（没有时间部分），设置最大结束时间
    if (endDate && end.length === 10) {
      endDate.endOf('day')
    }

    return (
      (!startDate || now.isSameOrAfter(startDate)) &&
      (!endDate || now.isSameOrBefore(endDate))
    )
  }
  /**
   * 发送文本消息
   */
  async sendTextMessageAction(params) {
    // 实际发送消息的实现...
    let key, wxid, content, from

    if (params) {
      // 内部直接调用
      key = params.key
      wxid = params.wxid
      content = params.content
      from = params.from
    } else {
      // HTTP 请求调用
      key = this.get('key')
      wxid = this.get('wxid')
      content = this.get('content')
      from = (
        await this.model('wechat_account').where({ auth_key: key }).find()
      ).wx_id
    }

    if (!key) {
      console.log('没有key')

      return this.fail(500, 'key不能为空')
    }
    if (!wxid) {
      return this.fail(500, 'wxid不能为空')
    }
    if (!content) {
      return this.fail(500, 'content不能为空')
    }

    const wechatService = think.service('wechat')
    const result = await wechatService.sendTextMessage({
      key: key,
      wxid: wxid,
      content: content,
    })

    await this.model('messages').add({
      from_user: from,
      to_user: wxid,
      content: content,
      is_ai: 1,
    })

    return
  }

  /**
   * 关闭指定连接
   */
  async closeAction(para) {
    let auth_key = this.get('key')
    if (para) {
      auth_key = para
    }
    if (!auth_key) {
      return this.fail('key不能为空')
    }
    const url = think.config('wechatpadpro.wsUrl') + auth_key

    const result = this.wsManager.closeConnection(url)
    await this.model('wechat_account')
      .where({ auth_key: auth_key })
      .update({ ws_status: 0 })
    return result
      ? this.success('连接关闭指令已发送')
      : this.fail('连接不存在或已关闭')
  }

  /**
   * 获取所有连接状态
   */
  async statusAction() {
    const connections = this.wsManager.getConnectionsStatus()
    return this.success(connections)
  }

  /**
   * 关闭所有连接
   */
  async closeAllAction() {
    this.wsManager.closeAll()
    await this.model('wechat_account').where({ 1: 1 }).update({ ws_status: 0 })

    return this.success('所有连接关闭指令已发送')
  }
}
