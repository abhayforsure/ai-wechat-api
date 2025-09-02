const Base = require('./base')

module.exports = class extends Base {
  /**
   * 获取任务列表
   */
  async listAction() {
    const page = this.get('page') || 1
    const size = this.get('size') || 10
    let nickname = this.get('nickname') || ''
    let remark = this.get('remark') || ''
    let wxid = this.get('wxid') || ''
    let id = this.get('id') || ''

    let account_id = this.get('account_id') || ''
    const is_active = this.get('is_active')

    const model = this.model('friends')

    let queryMap = {}
    if (!think.isEmpty(nickname)) {
      queryMap['u.nickname'] = ['like', `%${nickname}%`]
    }
    if (!think.isEmpty(remark)) {
      queryMap['u.remark'] = ['like', `%${remark}%`]
    }
    if (!think.isEmpty(wxid)) {
      queryMap['u.wxid'] = wxid
    }
    if (!think.isEmpty(id)) {
      queryMap['u.id'] = id
    }
    if (!think.isEmpty(account_id)) {
      queryMap['u.account_id'] = account_id
    }
    if (is_active) {
      queryMap['u.is_active'] = is_active
    }

    const list = await model
      .alias('u')
      .join({
        table: 'wechat_account',
        join: 'left',
        as: 'a',
        on: ['u.account_id', 'a.id'],
      })
      .where(queryMap)
      .field('u.*,a.nickname as ow_nickname,a.avatar as ow_avatar')
      .order('u.is_active desc,u.account_id desc,u.nickname desc')
      .page(page, size)
      .countSelect()
    for (let item of list.data) {
      item.is_active = item.is_active.toString()
      item.ai_active = item.ai_active.toString()
      item.ai_reply = item.ai_reply.toString()
      let tasks = await this.model('friends_task')
        .where({
          friend_id: item.id,
          is_active: 1,
        })
        .order('id asc')
        .select()
      let ser = think.service('base')
      for (let task of tasks) {
        try {
          task.cron_expression_chinese = ser.parseCronToChinese(
            task.cron_expression
          )
        } catch (e) {
          task.cron_expression_chinese = '中文解析失败'
        }
      }
      item.tasks = tasks
    }
    return this.success(list)
  }

  async updateMemberStatusAction() {
    const model = this.model('friends')
    const id = this.get('id')
    const is_active = this.get('is_active')
    if (id > 0) {
      let res = await model
        .where({
          id: id,
        })
        .update({
          is_active: is_active,
        })
      return this.success(res)
    } else {
      return this.fail(500, '错误，联系管理员')
    }
  }

  async updateMemberAIReplyStatusAction() {
    const model = this.model('friends')
    const id = this.get('id')
    const ai_reply = this.get('ai_reply')
    if (id > 0) {
      let res = await model
        .where({
          id: id,
        })
        .update({
          ai_reply: ai_reply,
        })
      return this.success(res)
    } else {
      return this.fail(500, '错误，联系管理员')
    }
  }
  async updateMemberAIStatusAction() {
    const model = this.model('friends')
    const id = this.get('id')
    const ai_active = this.get('ai_active')
    if (id > 0) {
      let res = await model
        .where({
          id: id,
        })
        .update({
          ai_active: ai_active,
        })
      return this.success(res)
    } else {
      return this.fail(500, '错误，联系管理员')
    }
  }

  async updateMarkAction() {
    const id = this.post('id')
    const mark = this.post('mark')

    if (id > 0) {
      let res = await this.model('friends')
        .where({
          id: id,
        })
        .update({
          mark: mark,
        })

      return this.success(res)
    } else {
      return this.fail(500, '错误，联系管理员')
    }
  }
  async updateMyRemarkAction() {
    const id = this.post('id')
    const my_remark = this.post('my_remark')

    if (id > 0) {
      let res = await this.model('friends')
        .where({
          id: id,
        })
        .update({
          my_remark: my_remark,
        })

      return this.success(res)
    } else {
      return this.fail(500, '错误，联系管理员')
    }
  }

  async checkUserVipTimeAction() {
    try {
      // 获取当前时间（格式: YYYY-MM-DD HH:mm:ss）
      const now = think.datetime(new Date(), 'YYYY-MM-DD HH:mm:ss')

      // 查询所有活跃会员中已过期的记录
      const expiredUsers = await this.model('friends')
        .where({
          is_active: 1, // 只查询当前活跃的会员
          end_time: ['<', now], // 结束时间小于当前时间
        })
        .select()

      // 如果没有过期会员，直接返回
      if (think.isEmpty(expiredUsers)) {
        think.logger.info(`[${now}] 没有需要处理的过期会员`)
        return
      }

      // 收集所有过期会员ID
      const userIds = expiredUsers.map((user) => user.id)
      // 批量更新会员状态为过期
      const updateCount = await this.model('friends')
        .where({ id: ['IN', userIds] })
        .update({ is_active: 0, ai_active: 0 })

      // 记录日志
      think.logger.info(`[${now}] 已处理 ${updateCount} 个过期会员:`, userIds)

      const userNames = expiredUsers.map((user) => user.remark || user.nickname)
      //发送提醒：
      if (updateCount > 0) {
        await this.sendRemindMessage(`注意：${userNames.join(',')} 会员已到期`)
      }
    } catch (e) {
      think.logger.error('检查会员到期时出错:', e)
    }
  }

  async sendRemindMessage(text) {
    let aiParamsList = await this.model('system')
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

    let param = {
      key: from_noti_key,
      wxid: to_noti_wxid,
      content: text,
    }
    console.log(param)
    await think.service('wechat').sendTextMessage(param)
  }

  async checkAboutExpirAction() {
    let friends = await this.getUsersExpiringIn24Hours()
    if (think.isEmpty(friends)) {
      think.logger.info('没有用户会员将在24小时内到期')
      return this.success()
    }
    const userNames = friends.map((user) => user.remark || user.nickname)
    await this.sendRemindMessage(
      `注意：${userNames.join(',')} 会员将在24小时内到期`
    )
    return this.success(friends)
  }

  async getUsersExpiringIn24Hours() {
    try {
      // 获取当前时间
      const now = new Date()

      // 计算24小时后的时间点
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      // 获取SQL时间格式
      const nowStr = think.datetime(now, 'YYYY-MM-DD HH:mm:ss')
      const in24HoursStr = think.datetime(in24Hours, 'YYYY-MM-DD HH:mm:ss')
      console.log(nowStr, in24HoursStr)
      // 查询条件：活跃用户 & 结束时间在 (当前时间, 当前时间+24小时] 范围内
      return await this.model('friends')
        .where({
          is_active: 1,
        })
        .where({
          end_time: ['BETWEEN', nowStr, in24HoursStr],
        })
        .select()
    } catch (e) {
      think.logger.error('查询24小时内即将过期会员时出错:', e)
      return []
    }
  }

  async updateStoryAction() {
    const id = this.post('id')
    const user_story = this.post('user_story')
    const role_id = this.post('role_id')
    const start_time = this.post('start_time')
    const end_time = this.post('end_time')

    const timeFormat = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/

    if (start_time && !timeFormat.test(start_time)) {
      return this.fail(500, '无效的开始时间格式')
    }

    if (id > 0) {
      let res = await this.model('friends')
        .where({
          id: id,
        })
        .update({
          user_story: user_story,
          role_id: role_id,
          start_time: start_time || null,
          end_time: end_time || null,
        })
      return this.success(res)
    } else {
      return this.fail(500, 'id不能为空')
    }
  }

  async updateMarkAction() {
    const id = this.post('id')
    const mark = this.post('mark')
    if (id > 0) {
      let res = await this.model('friends')
        .where({
          id: id,
        })
        .update({
          mark: mark,
        })
      return this.success(res)
    } else {
      return this.fail(500, '错误，联系管理员')
    }
  }
  async updatePromptAndGetAIReplyAction() {
    const id = this.post('id')
    const prompt = this.post('prompt')
    if (id > 0) {
      let res = await this.model('friends')
        .where({
          id: id,
        })
        .update({
          prompt: prompt,
        })
      //现在获取AI回复getAIReplyWithNoHisMsg
      let friendInfo = await this.model('friends')
        .where({
          id: id,
        })
        .find()
      let aiReply = await think
        .service('ai')
        .getAIReplyWithUserChat(prompt, friendInfo, false)
      return this.success(aiReply)
    } else {
      return this.fail(500, '错误，联系管理员')
    }
  }
}
