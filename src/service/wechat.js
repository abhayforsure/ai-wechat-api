const rp = require('request-promise')
const { json } = require('../controller')

module.exports = class extends think.Service {
  async getMsgBigImg(auth_key, msgid) {
    let url =
      think.config('wechatpadpro.hostUrl') +
      think.config('wechatpadpro.GetMsgBigImg') +
      '?key=' +
      auth_key
    let body = {
      CompressType: 0,
      FromUserName: 'wxid_hebkbciz5spt22',
      MsgId: msgid,
      Section: {
        DataLen: 61440,
        StartPos: 0,
      },
      ToUserName: 'ai374949369',
      TotalLen: 0,
    }
    console.log(body)
    const options = {
      method: 'POST',
      uri: url,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: body,
      json: true,
    }
    let data = await rp(options)
    console.log('data==》', data)
    // if (data.Code == '200') {
    //   let buf = data.Data.Data.Buffer
    //   console.log(buf)

    //   if (buf) {
    //     const filename = msgid + '.png'
    //     const savePath = path.join(think.ROOT_PATH, 'runtime/test', filename)
    //     var base64Data = buf.replace(/^data:image\/\w+;base64,/, '')
    //     const dataBuffer = Buffer.from(base64Data, 'base64')
    //     fs.writeFile(savePath, dataBuffer, function (err) {
    //       if (err) {
    //         console.log(err)
    //         return false
    //       } else {
    //         console.log('写入成功')
    //         return savePath
    //       }
    //     })
    //   }
    //   return false
    // } else {
    //   return false
    // }
  }

  async sendTextMessage(params) {
    let key, wxid, content

    if (params) {
      // 内部直接调用
      key = params.key
      wxid = params.wxid
      content = params.content
    }
    if (!key) {
      console.log('没有key')

      return 'key不能为空'
    }
    if (!wxid) {
      return 'wxid不能为空'
    }
    if (!content) {
      return 'content不能为空'
    }

    if (think.config('isDebuger')) {
      return {
        code: 0,
        msg: '调试模式，不发送消息',
      }
    }

    let url =
      think.config('wechatpadpro.hostUrl') +
      think.config('wechatpadpro.SendTextMessage') +
      '?key=' +
      key
    const options = {
      method: 'POST',
      url: url,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        MsgItem: [
          {
            AtWxIDList: [],
            ImageContent: '',
            MsgType: 1,
            TextContent: content,
            ToUserName: wxid,
          },
        ],
      }),
    }
    let data = await rp(options)
    console.log('消息发送结果===》', data)
    data = JSON.parse(data)
    if (data.Code == '200') {
      return data
    } else {
      return false
    }
  }
}
