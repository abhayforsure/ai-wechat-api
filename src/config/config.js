// default config
module.exports = {
  port: 8375,
  isDebuger: true,
  workers: 1,

  wechatpadpro: {
    adminKey: 'wanboai',
    hostUrl: 'http://wechatpadpro.xunruijie.com:8059',
    // hostUrl: 'http://127.0.0.1:8059',
    wsUrl: 'ws://wechatpadpro.xunruijie.com:8059/ws/GetSyncMsg?key=',
    genAuthKey1: '/admin/GenAuthKey1',
    GetLoginQrCodeNew: '/login/GetLoginQrCodeNew',
    CheckLoginStatus: '/login/CheckLoginStatus',
    GetFriendList: '/friend/GetFriendList',
    GetContactList: '/friend/GetContactList', //获取全部联系人
    //Message
    SendTextMessage: '/message/SendTextMessage',
    GetLoginStatus: '/login/GetLoginStatus',
    LogOut: '/login/LogOut',
    GetProfile: '/user/GetProfile',
    GetMsgBigImg: '/message/GetMsgBigImg', //获取图片(高清图片下载)

    //admin
    DelayAuthKey: '/admin/DelayAuthKey',
    DeleteAuthKey: '/admin/DeleteAuthKey',
  },
}
