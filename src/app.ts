import * as bodyParser from 'body-parser'
import * as express from 'express'
import * as mongoose from 'mongoose'
import * as socketIo from 'socket.io'
import { createServer, Server } from 'http'
import * as cors from 'cors'
import * as morgan from 'morgan'
import * as jsonwebtoken from 'jsonwebtoken'

import { Routes } from './routes'
import { jwtOptions } from './config/jwt'

class App {
  private server: Server
  private routePrv: Routes = new Routes()
  private mongoUrl: string = process.env.MONGODB_URI
  private io: SocketIO.Server

  public app: express.Application

  constructor() {
    if (!this.mongoUrl) {
      throw new Error('MONGODB_URI is mandatory')
    }
    this.app = express()
    this.config()
    this.authSetup()
    this.routePrv.routes(this.app)
    this.jwtSetup()
    this.mongoSetup()
    this.socketSetup()
    this.listen()
  }

  private config(): void {
    this.app.use(cors())
    this.app.use(morgan('combined'))
    this.app.use(bodyParser.json())
    this.app.use(bodyParser.urlencoded({ extended: false }))
  }

  private jwtSetup(): void {
    if (!jwtOptions.secretOrKey) {
      throw new Error('JWT_KEY should be defined')
    }
  }

  private authSetup(): void {
    // Requires a valid JSON Web Token for any route except login and register
    this.app.use((req, res, next) => {
      const { authorization } = req.headers

      if (!authorization) {
        if (req.method === 'POST' && (req.originalUrl === '/users' || req.originalUrl === '/login')) {
          next()
          return
        }
        res.status(401).send('AUTHORIZATION header is mandatory')
        return
      }

      const tokenParts = authorization.split(' ')
      if (tokenParts.length !== 2) {
        res.status(401).send('the AUTHORIZATION header should be formed of token type, followed by the token value: "bearer [my_token]"')
        return
      }

      const token = {
        type: tokenParts[0],
        value: tokenParts[1]
      }

      try {
        const { id } = jsonwebtoken.verify(token.value, jwtOptions.secretOrKey)
        if (!id) {
          res.status(401).send('invalid token')
          return
        }

        // TODO (when email validation is done): check in the database that
        // the user exists and his email is confirmed

        // make the verified user id available when handling the request
        req.body.id = id

        // everything went well and the JWT is valid
        next()

        // log after the next() for more organized logs
        console.log('Authenticated user id:', id)
      } catch (e) {
        console.log('error decoding the JWT:', e)
        res.status(401).send('error decoding the token')
        return
      }
    })
  }

  private mongoSetup(): void {
    const option = {
      useNewUrlParser: true,
      useCreateIndex: true
    }
    mongoose.connect(this.mongoUrl, option)
  }

  private socketSetup(): void {
    this.server = createServer(this.app)
    this.io = socketIo(this.server)
  }

  private listen(): void {
    let port: number
    try {
      // Setting the default PORT to 3000
      if (!process.env.PORT) {
        throw new Error('PORT is mandatory')
      }
      port = parseInt(process.env.PORT, 10)
    } catch (e) {
      port = 3000
    }

    this.server.listen(port, () => {
      console.log('Running server on port %s', port)
    })

    this.io.on('connect', (socket: any) => {
      console.log('Connected client on port %s.', port)
      // socket.on('message', this.handleNewMessage)
      socket.on('message', (msg) => console.log(msg))

      socket.on('disconnect', () => {
        console.log('Client disconnected')
      })
    })
  }

  // private handleNewMessage = (m: IMessage | string) => {
  //   let newMessage: IMessage
  //   try {
  //     newMessage = new Message(m)
  //   } catch (e) {
  //     console.log('error parsing the message')
  //     this.io.emit('error', e)
  //     return
  //   }

  //   const tokenParts = newMessage.token.split(' ')
  //   if (tokenParts.length !== 2) {
  //     this.io.emit('error', 'malformed token, should be like "bearer __token_value__"')
  //     return
  //   }
  //   const token = {
  //     type: tokenParts[0],
  //     value: tokenParts[1]
  //   }

  //   let decoded
  //   try {
  //     decoded = jsonwebtoken.verify(token.value, jwtOptions.secretOrKey)
  //   } catch (e) {
  //     this.io.emit('error', e)
  //     return
  //   }

  //   if (!decoded.id) {
  //     console.log('error getting the id from the token')
  //     this.io.emit('error', 'invalid JWT')
  //     return
  //   }

  //   newMessage.from = mongoose.Types.ObjectId(decoded.id)

  //   console.log('[server](message): %s', newMessage.content)

  //   newMessage.save((err, msg) => {
  //     if (err) {
  //       console.log('error saving the message:', err)
  //       this.io.emit('error', err)
  //     } else {
  //       console.log('message created', msg._id)
  //       this.io.emit('message', msg)
  //     }
  //   })
    // this.io.emit('message', m)
  // }
}

export default new App().app
