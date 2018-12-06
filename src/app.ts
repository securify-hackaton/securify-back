import * as fileUpload from 'express-fileupload'
import * as bodyParser from 'body-parser'
import * as express from 'express'
import { Request, Response, NextFunction } from 'express'
import * as mongoose from 'mongoose'
import { createServer, Server } from 'http'
import * as cors from 'cors'
import * as morgan from 'morgan'
import * as jsonwebtoken from 'jsonwebtoken'

import { Routes } from './routes'
import { jwtOptions } from './config/jwt'
import { User } from './models/User'
import { Authorization, AuthStatus } from './models/Authorization'

class App {
  private server: Server
  private routePrv: Routes = new Routes()
  private mongoUrl: string = process.env.MONGODB_URI

  public app: express.Application

  constructor() {
    this.checkMandatoryEnv()
    this.app = express()
    this.config()
    this.authSetup()
    this.routePrv.routes(this.app)
    this.jwtSetup()
    this.mongoSetup()
    this.serverSetup()
    this.listen()
  }

  private checkMandatoryEnv(): void {
    [
      'MONGODB_URI',
      'JWT_KEY',
      'GMAIL_USERNAME',
      'GMAIL_PASSWORD',
      'DEPLOY_URL'
    ].forEach(v => {
      if (!process.env[v]) {
        throw new Error(`${v} is mandatory`)
      }
    })
  }

  private config(): void {
    this.app.use(cors())
    this.app.use(morgan('combined'))
    this.app.use(bodyParser.json())
    this.app.use(bodyParser.urlencoded({ extended: false }))
    this.app.use(fileUpload())
  }

  private jwtSetup(): void {
    if (!jwtOptions.secretOrKey) {
      throw new Error('JWT_KEY should be defined')
    }
  }

  private authSetup(): void {
    // Requires a valid JSON Web Token for any route except login and register
    this.app.use(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      const { authorization } = req.headers

      if (!authorization) {
        // register, login => ok
        if (req.method === 'POST' && (req.originalUrl === '/users' || req.originalUrl === '/login')) {
          return next()
        }
        // create a developper account => ok
        if (req.method === 'POST' && req.originalUrl === '/company') {
          return next()
        }
        // authorization demand => ok
        if (req.method === 'POST' && req.originalUrl === '/authorize') {
          return next()
        }
        // sdk website => ok
        if (req.method === 'GET' && /\/sdk(.*)/.test(req.originalUrl)) {
          return next()
        }
        // email confirmation => ok
        if (req.method === 'GET' && /\/confirm\?(.*)/.test(req.originalUrl)) {
          return next()
        }
        return res.status(401).send('the Authorization header is mandatory')
      }

      const tokenParts = authorization.split(' ')
      if (tokenParts.length !== 2) {
        return res.status(401).send('the Authorization header should be formed of token type, followed by the token value: "bearer [my_token]"')
      }

      const token = {
        type: tokenParts[0],
        value: tokenParts[1]
      }

      try {
        const {
          // will be either an user or a token
          userId,
          tokenId
        } = jsonwebtoken.verify(token.value, jwtOptions.secretOrKey)

        if (!userId && !tokenId) {
          return res.status(401).send({ message: 'invalid token' })
        }

        if (userId) {
          try {
            const usr = await User.findById(userId).exec()

            if (!usr) {
              return res.status(401).send({ message: 'user not found' })
            }

            // for all authenticated routes except 'new confirmation email',
            // email must be validated
            if (!usr.emailValidated && (req.method !== 'POST' || req.originalUrl === '/confirm')) {
              return res.status(401).send({ message: 'email must be confirmed' })
            }

            // make the verified user available when handling the request
            req.body.user = usr
          } catch (e) {
            return res.status(501).send({ message: 'database error: ' + e })
          }
        }

        if (tokenId) {
          try {
            const auth = await Authorization.findById(tokenId)

            if (!auth) {
              return res.status(401).send({ message: 'token not found' })
            }

            if (auth.status === AuthStatus.Revoked) {
              return res.status(401).send({ message: 'token revoked' })
            }

            if (auth.status === AuthStatus.Denied) {
              return res.status(401).send({ message: 'token denied by user' })
            }

            if (auth.status !== AuthStatus.Ok) {
              return res.status(401).send({ message: 'token not confirmed by user' })
            }

            if (new Date(auth.expirationDate) < new Date()) {
              return res.status(401).send({ message: 'token expired' })
            }

            await auth.populate('company').execPopulate()
            await auth.populate('user').execPopulate()

            // make the known information available when handling the request
            req.body.company = {
              name: auth.company.name,
              image: auth.company.image,
              callback: auth.company.callback,
              scopes: auth.company.scopes,
              createdDate: auth.company.createdDate
            }

            // make available only the scoped information
            const scopes = {
              email: ['email'],
              fullname: ['firstName', 'lastName'],
              age: []
            }
            req.body.user = { }
            auth.scopes.split(';').forEach(s => {
              scopes[s].forEach(prop => {
                req.body.user[prop] = auth.user[prop]
              })
            })
          } catch (e) {
            return res.status(501).send({ message: 'database error: ' + e })
          }
        }

        // everything went well and the JWT is valid
        return next()
      } catch (e) {
        console.log('error decoding the JWT:', e)
        return res.status(401).send({ message: 'error decoding the token' })
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

  private serverSetup(): void {
    this.server = createServer(this.app)
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
  }
}

export default new App().app
