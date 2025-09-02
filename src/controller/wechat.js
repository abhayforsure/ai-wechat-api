const Base = require('./base.js')
const rp = require('request-promise')

const adminKey = think.config('wechatpadpro.adminKey')
const hostUrl = think.config('wechatpadpro.hostUrl')

const genAuthKey1 = think.config('wechatpadpro.genAuthKey1')
const GetLoginQrCodeNew = think.config('wechatpadpro.GetLoginQrCodeNew')
const CheckLoginStatus = think.config('wechatpadpro.CheckLoginStatus')
const GetFriendList = think.config('wechatpadpro.GetFriendList')
//Message
const SendTextMessage = think.config('wechatpadpro.SendTextMessage')

module.exports = class extends Base {
  async deleteAuthKeyAction() {
    let key = this.get('key')
    if (!key) {
      return this.fail(500, 'key不能为空')
    }
    var options = {
      method: 'POST',
      uri:
        hostUrl +
        think.config('wechatpadpro.DeleteAuthKey') +
        '?key=' +
        adminKey,
      body: {
        Key: key,
        Opt: 0,
      },
      headers: {
        'Content-Type': 'application/json',
      },
      json: true,
    }
    let data = await rp(options)
    console.log('设备删除结果==》', data)
    if (data.Code == '200') {
      await this.model('wechat_account').where({ auth_key: key }).delete()
      return this.success()
    } else {
      return this.fail(500, '请联系管理员')
    }
  }
  async delayAuthKeyAction() {
    let key = this.get('key')
    if (!key) {
      return this.fail(500, 'key不能为空')
    }
    var options = {
      method: 'POST',
      uri:
        hostUrl +
        think.config('wechatpadpro.DelayAuthKey') +
        '?key=' +
        adminKey,
      body: {
        Days: 30,
        ExpiryDate: '',
        AuthKey: key,
      },
      headers: {
        'Content-Type': 'application/json',
      },
      json: true,
    }
    try {
      let data = await rp(options)
      console.log('设备延期=》', data)
      if (data.Code == '200') {
        return this.success()
      } else {
        return this.fail(500, '请联系管理员')
      }
    } catch (error) {
      console.error('延长授权码失败:', error)
      return this.fail(500, '延长授权码失败，请稍后再试')
    }
  }
  async logOutAction() {
    let key = this.get('key')
    if (!key) {
      return this.fail(500, 'key不能为空')
    }
    let url = hostUrl + think.config('wechatpadpro.LogOut') + '?key=' + key
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
      await this.model('wechat').loginOutUpdate(key)
      return this.success('退出成功')
    } else {
      return this.fail(500, '退出失败')
    }
  }
  //生成授权码
  async genNewAuthKey1Action() {
    // http://192.168.110.85:8059/admin/GenAuthKey2 生成授权码(新设备)
    var options = {
      method: 'POST',
      uri: hostUrl + genAuthKey1 + '?key=' + adminKey,
      body: {
        Count: 1,
        Days: 90,
      },
      headers: {
        'Content-Type': 'application/json',
      },
      json: true,
    }
    let data = await rp(options)
    console.log(data)
    if (data.Code == '200') {
      let key = data.Data.authKeys[0]
      let res = await this.model('wechat_account').add({
        auth_key: key,
      })
      return this.success(data.Data[0])
    } else {
      return this.fail(500, '请联系管理员')
    }
  }

  async genAuthKey1Action() {
    // http://192.168.110.85:8059/admin/GenAuthKey2 生成授权码(新设备)
    var options = {
      method: 'POST',
      uri: hostUrl + genAuthKey1 + '?key=' + adminKey,
      body: {
        Count: 1,
        Days: 90,
      },
      headers: {
        'Content-Type': 'application/json',
      },
      json: true,
    }
    let data = await rp(options)
    if (data.Code == '200') {
      let key = data.Data[0]
      let res = await this.model('wechat_account').add({
        auth_key: key,
      })
      return this.success(data.Data[0])
    } else {
      return this.fail(500, '请联系管理员')
    }
  }

  async getProfileInfoAction() {
    ///user/GetProfile 获取个人资料信息
    let key = this.get('key')
    if (!key) {
      return this.fail(500, 'key不能为空')
    }
    let url = hostUrl + think.config('wechatpadpro.GetProfile') + '?key=' + key
    const options = {
      method: 'GET',
      url: url,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    }
    let data = await rp(options)
    data = JSON.parse(data)
    // console.log(data)
    if (data.Code == '200') {
      let map = {
        wx_id: data.Data.userInfo.userName.str,
        nickname: data.Data.userInfo.nickName.str,
        avatar: data.Data.userInfoExt.smallHeadImgUrl,
        alias: data.Data.userInfo.alias,
      }
      let res = await this.model('wechat_account')
        .where({ auth_key: key })
        .update(map)
      return this.success(res)
    } else {
      return this.fail(500, '同步失败')
    }
  }

  //http://192.168.110.85:8059/login/GetLoginQrCodeNew 获取登录二维码(异地IP用代理)
  async getLoginCodeAction() {
    let key = this.get('key')
    if (!key) {
      return this.fail(500, 'key不能为空')
    }
    var options = {
      method: 'POST',
      uri: hostUrl + GetLoginQrCodeNew + '?key=' + key,
      body: {
        Check: false,
        Proxy: '',
      },
      headers: {
        'Content-Type': 'application/json',
      },
      json: true,
    }
    let data = await rp(options)
    console.log(data)

    if (data.Code == '200') {
      let QrCodeUrl = data.Data.QrCodeUrl
      return this.success(QrCodeUrl)
    } else {
      return this.fail(500, '请联系管理员')
    }
  }
  //http://192.168.110.85:8059/login/CheckLoginStatus 检测扫码状态
  async checkLoginStatusAction() {
    let key = this.get('key')
    if (!key) {
      return this.fail(500, 'key不能为空')
    }
    let url = hostUrl + CheckLoginStatus + '?key=' + key
    const options = {
      method: 'GET',
      url: url,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    }
    let data = await rp(options)
    console.log('检测扫码状态', data)
    data = JSON.parse(data)

    if (data.Code == '200') {
      //       {
      //   "Code": 200,
      //   "Data": {
      //     "uuid": "Y8zbtWCwg3I1GCH34y7G",
      //     "state": 2,
      //     "wxid": "ai374949369",
      //     "wxnewpass": "extdevnewpwd_CiNBYmMycTRhN2VlY2x4VWdDR29IMkRpV0RAcXJ0aWNrZXRfMBJAUUZvdkJvYmxMUVVOcVRaTnh6OXRlQnQwcWxMaTVjWkdiNnVrQjY2RW1YQk9VSnVjM3NoTGtQM2Q1M3RKN3FJRxoYZ1NlVlZVbVJoMkZiM1FUb1RobUc4ajV5",
      //     "head_img_url": "http://wx.qlogo.cn/mmhead/ver_1/LeSMEExy6b445TfBsn1uHXywc1zIzhstq7PialEa8pHLERHeZo8SOBRPt2BDHjKVz5vMxdxFGz6ZOe646ghzKlw/0",
      //     "push_login_url_expired_time": 604200,
      //     "nick_name": "Lofter 杨",
      //     "effective_time": 198,
      //     "unknow": 671104083,
      //     "device": "android",
      //     "ret": 0,
      //     "othersInServerLogin": false,
      //     "tarGetServerIp": "",
      //     "uuId": "",
      //     "msg": ""
      //   },
      //   "Text": ""
      // }
      let map = {
        auth_key: key,
        wx_id: data.Data.wxid,
        nickname: data.Data.nick_name,
        avatar: data.Data.head_img_url,
        auth_key_remaining_time: data.Data.effective_time,
      }
      let where = await this.model('wechat_account')
        .where({
          wx_id: data.Data.wxid,
        })
        .find()
      let res = 0
      if (where.id > 0) {
        res = await this.model('wechat_account')
          .where({
            wx_id: data.Data.wxid,
          })
          .update(map)
      } else {
        res = await this.model('wechat_account').add(map)
      }
      return this.success(res)
    } else {
      return this.fail(500, data)
    }
  }

  async getContactListAction() {
    let key = this.get('key')
    if (!key) {
      return this.fail(500, 'key不能为空')
    }
    let url =
      hostUrl + think.config('wechatpadpro.GetContactList') + '?key=' + key
    const options = {
      method: 'GET',
      url: url,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    }
    let data = await rp(options)
    data = JSON.parse(data)
    console.log('获取联系人列表', data)
    if (data.Code == '200') {
      return this.success()
    } else {
      return this.fail(500, data)
    }
  }
  async getFriendListAction() {
    let key = this.get('key')
    if (!key) {
      return this.fail(500, 'key不能为空')
    }
    let url = hostUrl + GetFriendList + '?key=' + key
    const options = {
      method: 'GET',
      url: url,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    }
    let data = await rp(options)
    data = JSON.parse(data)
    console.log('获取好友列表', data)
    if (data.Code == '200') {
      let count = data.Data.count
      let IsInitFinished = data.Data.IsInitFinished
      let friendList = data.Data.friendList

      await this.model('wechat_account')
        .where({
          auth_key: key,
        })
        .update({
          friend_count: count,
        })
      let wechatInfo = await this.model('wechat_account')
        .where({
          auth_key: key,
        })
        .find()
      if (wechatInfo.id > 0) {
        let newList = []
        for (let item of friendList) {
          let map = {
            account_id: wechatInfo.id,
            wxid: item.userName.str || '',
            nickname: item.nickName.str || '',
            avatar: item.smallHeadImgUrl || '',
            remark: item.remark.str || '',
            signature: item.signature || '',
            province: item.province || '',
            city: item.city || '',
            country: item.country || '',
          }
          let isHave = await this.model('friends')
            .where({
              account_id: wechatInfo.id,
              wxid: item.userName.str,
            })
            .find()
          if (isHave.id > 0) {
            await this.model('friends')
              .where({
                id: isHave.id,
              })
              .update(map)
          } else {
            // await this.model('friends').add(map)
            newList.push(map)
          }
        }
        if (newList.length > 0) {
          let res = await this.model('friends').addMany(newList)
        }
      }
      return this.success(count)
    } else {
      return this.fail(500, data)
    }
  }

  async sendTextMessageAction(params) {
    let key, wxid, content

    if (params) {
      // 内部直接调用
      key = params.key
      wxid = params.wxid
      content = params.content
    } else {
      // HTTP 请求调用
      key = this.get('key')
      wxid = this.get('wxid')
      content = this.get('content')
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
    return this.success(result)
  }
}
