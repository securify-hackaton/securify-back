const io = require('socket.io-client')

const httpServerAddr = {
  address: 'localhost',
  port: (process.env.PORT && parseInt(process.env.PORT, 10)) || 3000
}
const messageChannel = 'message'

const newConnection = () => io.connect(`ws://${httpServerAddr.address}:${httpServerAddr.port}`, {
  'reconnection delay': 0,
  'reopen delay': 0,
  'force new connection': true,
  transports: ['websocket'],
})

beforeEach((done) => {
  socket = newConnection()
  socket.on('connect', () => {
    done()
  })
})

afterEach(() => {
  // Cleanup
  if (socket.connected) {
    socket.disconnect()
  }
})

describe('basic socket.io functionalities', () => {
  const hello = {
    content: 'hello',
    // test token for user 'thomass@uvajon.eu'
    token: 'bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjViZWVmNjgxODExNGJkMzA0NDgzZDgwOSIsImlhdCI6MTU0MjM5ODUxN30.iIA02-qCwHfJvRFw0Nua6B3ux6_tu_-1VVpW-3elOv4'
  }

  it('connects', (done) => {
    socket.emit('example', 'some messages')
    setTimeout(() => {
      done()
    }, 50)
  })

  it('sends and receives messages', (done) => {
    socket.on(messageChannel, (m) => {
      expect(m.content).toBe(hello.content)
      done()
    })  
    socket.emit(messageChannel, hello)
    setTimeout(() => {
      throw new Error('timeout before receiving the message')
    }, 1000)
  })

  it('receives messages sent by others', (done) => {
    socket.on(messageChannel, (m) => {
      expect(m.content).toBe(hello.content)
      done()
    })

    socket2 = newConnection()
    socket2.on('connect', () => {
      socket2.emit(messageChannel, hello)
    })

    setTimeout(() => {
      throw new Error('timeout before receiving the message')
    }, 1000)
  })
})
