const Base = require('./base.js')
module.exports = class extends Base {
  async loginWithPwAction() {
    const username = this.post('username')
    const password = this.post('password')
    if (!password || !username) {
      return this.fail(500, '非法请求')
    }
    const admin = await this.model('admin')
      .where({
        username: username,
        password: password,
      })
      .find()
    if (think.isEmpty(admin)) {
      return this.fail(401, '用户名或密码不正确!')
    }
    // 更新登录信息
    await this.model('admin')
      .where({
        id: admin.id,
      })
      .update({
        last_login_time: parseInt(Date.now() / 1000),
        last_login_ip: this.ctx.ip,
      })
    const TokenSerivce = this.service('token')
    const sessionKey = await TokenSerivce.create({
      id: admin.id,
    })
    if (think.isEmpty(sessionKey)) {
      return this.fail('登录失败')
    }
    const userInfo = {
      id: admin.id,
      username: admin.username,
      type: admin.type,
      password: admin.password,
    }
    return this.success({
      token: sessionKey,
      userInfo: userInfo,
    })
  }
  async loginAction() {
    const username = this.post('username')
    const password = this.post('password')
    const admin = await this.model('admin')
      .where({
        username: username,
      })
      .find()
    if (think.isEmpty(admin)) {
      return this.fail(401, '用户名或密码不正确!')
    }
    console.log(think.md5(password + '' + admin.password_salt))
    console.log(admin.password)
    if (think.md5(password + '' + admin.password_salt) !== admin.password) {
      return this.fail(400, '用户名或密码不正确!!')
    }
    // 更新登录信息
    await this.model('admin')
      .where({
        id: admin.id,
      })
      .update({
        last_login_time: parseInt(Date.now() / 1000),
        last_login_ip: this.ctx.ip,
      })
    const TokenSerivce = think.service('token')
    const sessionKey = await TokenSerivce.create({
      id: admin.id,
    })
    if (think.isEmpty(sessionKey)) {
      return this.fail('登录失败')
    }
    const userInfo = {
      id: admin.id,
      username: admin.username,
      type: admin.type,
      password: admin.password,
    }
    return this.success({
      token: sessionKey,
      userInfo: userInfo,
    })
  }
}
