const path = require('path')
const isDev = think.env === 'development'
const bootstrap = require('../bootstrap')
const kcors = require('kcors')

module.exports = [
  {
    handle: kcors,
    options: {
      origin: '*',
      allowMethods: '*',
      allowHeaders: '*',
      credentials: true,
      maxAge: 86400, // 24小时
    }, // 可根据需求自定义配置
  },

  {
    handle: 'meta',
    options: {
      logRequest: isDev,
      sendResponseTime: isDev,
    },
  },
  {
    handle: 'resource',
    enable: isDev,
    options: {
      root: path.join(think.ROOT_PATH, 'www'),
      publicPath: /^\/(static|favicon\.ico)/,
    },
  },
  {
    handle: 'trace',
    enable: !think.isCli,
    options: {
      debug: isDev,
    },
  },
  {
    handle: 'payload',
    options: {
      keepExtensions: true,
      limit: '5mb',
    },
  },
  {
    handle: 'router',
    options: {},
  },
  'logic',
  'controller',
]
