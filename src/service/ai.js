const rp = require('request-promise')
const Base = require('../service/base')
const { del } = require('request')
const { ai } = require('../config/config')
const { json } = require('../controller/base')

module.exports = class extends think.Service {
  constructor() {
    super()
    // 实例化所需Model
    this.friendsTaskModel = think.model('friends_task')
    this.friendsModel = think.model('friends')
    this.wechatAccountModel = think.model('wechat_account')
    this.systemModel = think.model('system')
  }

  async getTestAIReply(info) {
    console.log('获取AI回复参数==>', info)
    let host = info.host
    let apiKey = info.key
    let model = info.model
    let msg = [
      {
        role: 'user',
        content: info.prompt || '你好，AI！请帮我生成一段代码。',
      },
    ]
    const options = {
      method: 'POST',
      uri: host,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: {
        model: model,
        messages: msg,
      },
      json: true,
    }
    try {
      const result = await rp(options)
      console.log(
        '推理过程==>',
        result.choices[0].message.reasoning_content || ''
      )
      console.log('回复内容==>', result.choices[0].message.content)
      console.log('message==>', result.choices[0].message)

      const lastElement = msg.at(-1)
      await this.saveReason(
        msg || [],
        lastElement.content || '',
        result.choices[0].message.reasoning_content || '',
        result.choices[0].message.content || ''
      )

      return result
    } catch (error) {
      console.log('AI回复请求失败:', error)
    }
    return
  }

  async testAI(text, role_id) {
    if (!text) {
      return
    }
    let sysTip = await this.getPrompt(role_id)
    let msg = [
      {
        role: 'system',
        content: sysTip,
      },
      {
        role: 'user',
        content: text || '',
      },
    ]

    let result = await this.getAIReply(msg)
    let replyContent = result.choices[0].message.content
    return replyContent
  }

  async getAIReplyWithHumanSummary(text, wxid, MsgList) {
    if (!text) {
      return
    }

    let newsMesList = []
    for (let item of MsgList) {
      let newMap = {
        role: 'user',
        content: item.raw_data,
      }
      newsMesList.push(newMap)
    }
    let sysTip = (await this.getPrompt(1000)) + ' 我的账号是' + wxid
    newsMesList.push({
      role: 'system',
      content: sysTip,
    })

    newsMesList.push({
      role: 'user',
      content: text || '',
    })
    let result = await this.getAIReply(newsMesList)
    let replyContent = result.choices[0].message.content
    return result.choices[0].message
  }

  async getCopyModWithAI(text, ai_id, friendInfo) {
    if (!text) {
      return
    }
    let sysTip = await this.getPrompt(ai_id)

    let friend_id = friendInfo.id
    let name = friendInfo.my_remark || ''

    let accountInfo = await this.model('wechat_account')
      .where({ id: friendInfo.account_id })
      .find()

    let newTaskList = await this.getUserTaskList(friend_id)

    let newsMesList = await this.getHistMsg(friendInfo.wxid, accountInfo.wx_id)

    let newTip = sysTip
      .replaceAll('{{friend_id}}', friend_id)
      .replaceAll('{{name}}', name)
      .replaceAll('{{user_story}}', friendInfo.user_story || '无')
      .replaceAll('{{current_time}}', this.getCurrentTimeString())
      .replaceAll('{{task_list}}', JSON.stringify(newTaskList))

    newsMesList.push({
      role: 'system',
      content: newTip,
    })

    // newsMesList.push({
    //   role: 'assistant',
    //   content: '{',
    // })
    newsMesList.push({
      role: 'user',
      content: text || '',
    })

    let result = await this.getAIReply(newsMesList)
    let replyContent = result.choices[0].message.content
    return replyContent
  }

  async getUserSummary(text, friendInfo) {
    if (!text) {
      return
    }
    let friend_id = friendInfo.id
    let name = friendInfo.my_remark || ''

    let accountInfo = await this.model('wechat_account')
      .where({ id: friendInfo.account_id })
      .find()

    let newTaskList = await this.getUserTaskList(friend_id)

    let newsMesList = await this.getHistMsg(
      friendInfo.wxid,
      accountInfo.wx_id,
      1
    )

    let sysTip = await this.getPrompt(1010)

    let newTip = sysTip
      .replaceAll('{{friend_id}}', friend_id)
      .replaceAll('{{name}}', name)
      .replaceAll('{{user_story}}', friendInfo.user_story || '无')
      .replaceAll('{{current_time}}', this.getCurrentTimeString())
      .replaceAll('{{task_list}}', JSON.stringify(newTaskList))
      .replaceAll('{{chatHistory}}', JSON.stringify(newsMesList))
    let msg = []
    msg.push({
      role: 'system',
      content: newTip,
    })
    msg.push({
      role: 'user',
      content: text || '',
    })
    let result = await this.getAIReply(msg)
    let replyContent = result.choices[0].message.content

    replyContent = await this.safeJsonParse(replyContent)
    if (replyContent.error) {
      console.error('AI JSON 生成错误:', replyContent)
      return
    } else {
      let messageL = replyContent.message
      let summarize = replyContent.summarize

      console.log('summarize==>', summarize)

      if (summarize) {
        await this.recordSummary(summarize)
      }
      // await this.operateUserCron(cron, friendInfo.remark)

      return replyContent
    }
  }

  async recordSummary(summary) {
    try {
      await this.model('friends_task_record').addMany(summary)
    } catch (e) {
      console.error('记录总结失败:', e)
    }
  }

  async getAIReplyWithUserChat(text, friendInfo, isNeedHisMsg = true) {
    if (!text) {
      return
    }
    let friend_id = friendInfo.id
    let name = friendInfo.my_remark || ''

    let accountInfo = await this.model('wechat_account')
      .where({ id: friendInfo.account_id })
      .find()

    let newTaskList = await this.getUserTaskList(friend_id)

    let newsMesList = []

    if (isNeedHisMsg) {
      //需要历史消息
      newsMesList = await this.getHistMsg(friendInfo.wxid, accountInfo.wx_id)
    }

    let sysTip = await this.getPrompt(friendInfo.role_id || 999)
    console.log('消息发送时间==》', this.getCurrentTimeString())

    let newTip = sysTip
      .replaceAll('{{friend_id}}', friend_id)
      .replaceAll('{{name}}', name)
      .replaceAll('{{user_story}}', friendInfo.user_story || '无')
      .replaceAll('{{current_time}}', this.getCurrentTimeString())
      .replaceAll('{{task_list}}', JSON.stringify(newTaskList))

    newsMesList.push({
      role: 'system',
      content: newTip,
    })

    newsMesList.push({
      role: 'user',
      content: text || '',
    })
    let result = await this.getAIReply(newsMesList)
    let replyContent = result.choices[0].message.content

    replyContent = await this.safeJsonParse(replyContent)
    if (replyContent.error) {
      console.error('AI JSON 生成错误:', replyContent)
      return
    } else {
      let isContinue = replyContent.continue
      let cron = replyContent.cron
      let messageL = replyContent.message

      await this.operateUserCron(cron, friendInfo.remark)

      return messageL
    }
  }

  //  msg || [],
  //     lastElement.content || '',
  //     result.choices[0].message.reasoning_content || '',
  //     result.choices[0].message.content||''
  async saveReason(msg, text, reson, reply) {
    try {
      await this.model('logs').add({
        msg: JSON.stringify(msg),
        text: text,
        reson: reson,
        reply: reply,
      })
    } catch (e) {
      console.error('保存原因失败:', e)
    }
  }
  async safeJsonParse(str) {
    // 步骤1：基本清理
    let cleaned = str
      .trim()
      // 修复中文引号
      .replace(/[“”]/g, '"')
      // 修复中文单引号（如果有）
      .replace(/[‘’]/g, "'")
      // 修复多余逗号
      .replace(/,(\s*[}\]])/g, '$1')
      // 修复中文数字
      .replace(/十六/g, '16')
      .replace(/二十/g, '20')
      // 修复多余冒号
      .replace(/:{2,}/g, ':')
      // 修复日期格式错误（如 "23:00::00"）
      .replace(/(\d{2}:\d{2})::(\d{2})/g, '$1:$2')
      .replace(/^```json\s*/, '') // 移除开头的```json
      .replace(/\s*```$/, '') // 移除结尾的```
      .replace(/\n```$/, '')

    // 步骤2：尝试解析
    try {
      return JSON.parse(cleaned)
    } catch (primaryError) {
      console.warn('首次解析失败，尝试修复:', primaryError.message)

      try {
        // 尝试补充可能的缺失括号
        let fixed = cleaned
        const openBraces = (cleaned.match(/{/g) || []).length
        const closeBraces = (cleaned.match(/}/g) || []).length

        // 补充缺失的闭合括号
        if (openBraces > closeBraces) {
          fixed += '}'.repeat(openBraces - closeBraces)
        }
        // 补充缺失的开放括号
        else if (closeBraces > openBraces) {
          fixed = '{'.repeat(closeBraces - openBraces) + fixed
        }

        return JSON.parse(fixed)
      } catch (secondaryError) {
        // 最终错误处理和日志
        console.error('JSON 二次解析失败:', {
          originalString: str,
          cleanedString: cleaned,
          primaryError,
          secondaryError,
        })
        let aiJson = await this.aiGetJsonParse(str)
        return aiJson
        ///

        // 返回结构化错误而非 null
        return {
          error: 'JSON_PARSE_FAILED',
          message: '无法解析 JSON 字符串',
          details: {
            primaryError: primaryError.message,
            secondaryError: secondaryError.message,
          },
          originalString: str,
          cleanedString: cleaned,
        }
      }
    }
  }

  async aiGetJsonParse(str) {
    let msg = [
      {
        role: 'system',
        content:
          '你是一个json解析器，你的任务是将用户提供的字符串解析为有效的JSON格式。如果无法解析，请返回0。请确保返回的JSON格式正确且可解析。',
      },
      // {
      //   role: 'assistant',
      //   content: '{',
      // },
      {
        role: 'user',
        content: str,
      },
    ]
    let res = await this.getAIReply(msg)
    let replyContent = res.choices[0].message.content

    // 步骤1：基本清理
    let cleaned = replyContent
      .trim()
      // 修复中文引号
      .replace(/[“”]/g, '"')
      // 修复中文单引号（如果有）
      .replace(/[‘’]/g, "'")
      // 修复多余逗号
      .replace(/,(\s*[}\]])/g, '$1')
      // 修复中文数字
      .replace(/十六/g, '16')
      .replace(/二十/g, '20')
      // 修复多余冒号
      .replace(/:{2,}/g, ':')
      // 修复日期格式错误（如 "23:00::00"）
      .replace(/(\d{2}:\d{2})::(\d{2})/g, '$1:$2')
      .replace(/^```json\s*/, '') // 移除开头的```json
      .replace(/\s*```$/, '') // 移除结尾的```

    // 步骤2：尝试解析
    try {
      return JSON.parse(cleaned)
    } catch (primaryError) {
      console.error('JSON 二次解析失败:', {
        originalString: str,
        cleanedString: cleaned,
        primaryError,
      })
      return {
        error: 'JSON_PARSE_FAILED',
        message: '无法解析 JSON 字符串',
      }
    }
  }

  async getPrompt(id) {
    let res = await this.model('roles').where({ id: id }).find()
    return res.prompt
  }
  getCurrentTimeString() {
    const weeks = [
      '星期日',
      '星期一',
      '星期二',
      '星期三',
      '星期四',
      '星期五',
      '星期六',
    ]
    const now = new Date()
    let timeString = `${now.toLocaleDateString()} ${now.toLocaleTimeString()} ${
      weeks[now.getDay()]
    }`
    return timeString
  }
  async getUserTaskList(friend_id) {
    let taskList = await this.model('friends_task')
      .where({ friend_id: friend_id, is_active: 1 })
      .select()

    let newTaskList = []
    for (let item of taskList) {
      let map = {
        id: item.id,
        friend_id: item.friend_id,
        cron_expression: item.cron_expression,
        task_name: item.task_name,
        is_active: item.is_active,
        end_date: item.end_date,
        start_date: item.start_date,
      }
      newTaskList.push(map)
    }
    return newTaskList
  }

  async getHistMsg(from, to, day) {
    let newsMesList = []
    let hisMessagesList = await this.model('message').getHistoryChatRecord(
      from,
      to,
      day ? day : null
    )
    for (let item of hisMessagesList) {
      let newMap = {
        role: item.from_user == to ? 'assistant' : 'user',
        content: item.create_at + ':' + item.content,
      }
      console.log('聊天记录==>', newMap)
      newsMesList.push(newMap)
    }
    return newsMesList
  }
  async operateUserCron(cronList, remark) {
    let aiParamsList = await this.systemModel
      .where({
        key: ['IN', ['to_noti_wxid', 'from_noti_key']],
      })
      .select()
    let to_noti_wxid = aiParamsList.find(
      (item) => item.key == 'to_noti_wxid'
    ).value
    let from_noti_key = aiParamsList.find(
      (item) => item.key == 'from_noti_key'
    ).value

    if (!think.isEmpty(cronList)) {
      let param = {
        key: from_noti_key,
        wxid: to_noti_wxid,
        content:
          '当前' + remark + '的cron任务列表已更新：' + JSON.stringify(cronList),
      }
      try {
        await think.service('wechat').sendTextMessage(param)
      } catch (error) {
        console.error('发送通知失败:', error)
      }
    }

    for (let item of cronList) {
      item.cron_expression = item.cron_expression.replace(/\?/g, '*')

      if (item.cron_expression == '* * * * * *') {
        item.cron_expression = '* 1 * * * *' //
      }
      // if((item.start_date == item.end_date) && item.start_date && item.end_date) {
      //   item.end_date = item.start + ' 23:59:59'
      // }
      if (item.id == -1 && item.operate == 'add') {
        //新增
        delete item.id
        delete item.operate
        delete item.should_update
        await this.friendsTaskModel.add(item)
      }
      if (item.operate == 'update') {
        delete item.operate
        delete item.should_update
        await this.friendsTaskModel.where({ id: item.id }).update(item)
      }
      if (item.operate == 'delete') {
        delete item.operate
        delete item.should_update
        await this.friendsTaskModel.where({ id: item.id }).delete()
      }
    }
  }

  async getAIReply(msg) {
    console.log('开始请求AI回复：', msg)

    let aiParamsList = await this.model('system')
      .where({
        key: ['IN', ['aiHost', 'aiApiKey', 'aiChatModel']],
      })
      .select()
    let host = aiParamsList.find((item) => item.key == 'aiHost').value
    let apiKey = aiParamsList.find((item) => item.key == 'aiApiKey').value
    let model = aiParamsList.find((item) => item.key == 'aiChatModel').value
    const options = {
      method: 'POST',
      uri: host,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: {
        model: model,
        messages: msg,
      },
      json: true,
    }
    try {
      const result = await rp(options)
      console.log(
        '推理过程==>',
        result.choices[0].message.reasoning_content || ''
      )
      console.log('回复内容==>', result.choices[0].message.content)
      console.log('message==>', result.choices[0].message)

      const lastElement = msg.at(-1)
      await this.saveReason(
        msg || [],
        lastElement.content || '',
        result.choices[0].message.reasoning_content || '',
        result.choices[0].message.content || ''
      )

      return result
    } catch (error) {
      console.log('AI回复请求失败:', error)
    }
  }
}
