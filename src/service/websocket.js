const WebSocket = require('ws')
const EventEmitter = require('events')

class WebSocketManager {
  constructor() {
    if (WebSocketManager.instance) {
      return WebSocketManager.instance
    }

    this.connections = new Map()
    this.states = new Map() // 存储连接状态历史
    console.log('✅ WebSocketManager 单例已创建')

    // 确保只有一个实例
    WebSocketManager.instance = this
    return this
  }

  // 清空现有连接（用于重连等场景）
  clearConnections() {
    this.connections.clear()
  }
  /**
   * 创建或获取WebSocket连接
   * @param {string} url WebSocket地址
   * @param {Object} handlers 事件处理器
   * @returns {WebSocket} WebSocket实例
   */
  getConnection(url, handlers = {}) {
    // 如果已有连接且状态正常，则返回现有连接
    if (this.connections.has(url)) {
      const { conn, state } = this.connections.get(url)
      if (state === 'OPEN' || state === 'CONNECTING') {
        console.log(`使用现有连接: ${url}`)
        return conn
      }
      // 清理无效连接
      this.connections.delete(url)
    }

    console.log(`创建新连接: ${url}`)
    const ws = new WebSocket(url)

    // 创建带状态跟踪的连接对象
    const connData = {
      conn: ws,
      state: 'CONNECTING',
      url,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    }

    this.connections.set(url, connData)
    this._updateState(url, 'CONNECTING')

    // 设置事件处理器
    ws.on('open', () => {
      console.log(`✅ ${url} 连接已建立`)
      this._updateState(url, 'OPEN')
      if (handlers.onOpen) handlers.onOpen(ws)
    })

    ws.on('message', (data) => {
      if (handlers.onMessage) handlers.onMessage(data)
    })

    ws.on('error', (error) => {
      console.error(`‼️ ${url} 错误:`, error)
      this._updateState(url, 'ERROR')
      if (handlers.onError) handlers.onError(error)
    })

    ws.on('close', (code, reason) => {
      console.log(`⛔ ${url} 连接关闭: ${code} - ${reason}`)
      this._updateState(url, 'CLOSED')
      if (handlers.onClose) handlers.onClose(code, reason)

      // 自动重连
      if (code !== 1000 && handlers.autoReconnect !== false) {
        console.log(`尝试在3秒后重新连接: ${url}`)
        setTimeout(() => this.getConnection(url, handlers), 3000)
      }
    })

    // 心跳检测
    let heartbeatInterval
    ws.on('open', () => {
      heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping()
        }
      }, 30000)
    })

    ws.on('close', () => {
      clearInterval(heartbeatInterval)
    })

    return ws
  }

  /**
   * 更新连接状态
   * @private
   */
  _updateState(url, newState) {
    const connData = this.connections.get(url)
    if (connData) {
      connData.state = newState
      connData.lastUpdated = Date.now()
    }

    // 记录状态历史（可选）
    if (!this.states.has(url)) {
      this.states.set(url, [])
    }
    this.states.get(url).push({
      state: newState,
      timestamp: Date.now(),
    })
  }

  /**
   * 获取连接状态
   * @param {string} url
   * @returns {string} 状态字符串
   */
  getConnectionState(url) {
    if (!this.connections.has(url)) return 'NOT_FOUND'
    return this.connections.get(url).state
  }

  /**
   * 关闭指定连接
   * @param {string} url WebSocket地址
   * @param {number} code 关闭代码
   * @param {string} reason 关闭原因
   */
  closeConnection(url, code = 1000, reason = '主动关闭') {
    if (this.connections.has(url)) {
      const { conn } = this.connections.get(url)
      if (conn.readyState === WebSocket.OPEN) {
        conn.close(code, reason)
        this._updateState(url, 'CLOSING')
      }
      return true
    }
    return false
  }

  /**
   * 关闭所有连接
   */
  closeAll() {
    this.connections.forEach(({ conn }, url) => {
      if (conn.readyState === WebSocket.OPEN) {
        conn.close(1000, '系统关闭')
      }
      this._updateState(url, 'CLOSED')
    })
  }

  /**
   * 获取所有连接状态
   * @returns {Array} 连接状态列表
   */
  getConnectionsStatus() {
    return Array.from(this.connections.entries()).map(([url, connData]) => ({
      url,
      state: connData.state,
      stateCode: this.getStateCode(connData.state),
      since: new Date(connData.createdAt),
      lastUpdated: new Date(connData.lastUpdated),
    }))
  }

  /**
   * 获取状态数字码
   */
  getStateCode(stateName) {
    const states = {
      CONNECTING: 0,
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3,
      ERROR: 4,
    }
    return states[stateName] !== undefined ? states[stateName] : -1
  }
  // 在WebSocketManager类中添加以下方法
  getStateName(state) {
    // 如果传入的是数字状态码
    if (typeof state === 'number') {
      return this._mapStateNumberToName(state)
    }

    // 如果是我们的自定义状态字符串
    return state
  }

  // 私有方法：将WebSocket数字状态码转换为名称
  _mapStateNumberToName(state) {
    const states = {
      0: 'CONNECTING',
      1: 'OPEN',
      2: 'CLOSING',
      3: 'CLOSED',
    }
    return states[state] || 'UNKNOWN'
  }
}

module.exports = new WebSocketManager() // 直接导出单例实例
