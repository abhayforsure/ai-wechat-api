module.exports = class extends think.Model {
  get tableName() {
    return 'ai_messages'
  }

  async getMasterHistoryChatRecord(masterWxid) {
    const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ')
    const messages = await this.model('messages').query(`
        SELECT * 
      FROM ai_messages 
      WHERE (
        from_user = '${masterWxid}' OR
        to_user = '${masterWxid}'
      )
      AND msg_type = 1
      AND create_at >= '${startTime}'
      ORDER BY create_time ASC
  `)
    return messages
  }

  async getHistoryChatRecord(sender, receiver, day) {
    if (day) {
      day = parseInt(day)
    } else {
      day = (await this.model('system').where({ key: 'hisMsgDay' }).find())
        .value
    }
    const startTime = new Date(Date.now() - day * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ')

    const messages = await this.model('messages').query(`
        SELECT * 
      FROM ai_messages 
      WHERE (
        (from_user = '${sender}' AND to_user = '${receiver}')
        OR (from_user = '${receiver}' AND to_user = '${sender}')
      )
      AND msg_type = 1
      AND create_at >= '${startTime}'
      ORDER BY create_time ASC
  `)
    return messages
  }
}
