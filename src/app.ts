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
    if (!this.mongoUrl) {
      throw new Error('MONGODB_URI is mandatory')
    }
    this.app = express()
    this.config()
    this.authSetup()
    this.routePrv.routes(this.app)
    this.jwtSetup()
    this.mongoSetup()
    this.serverSetup()
    this.listen()
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
    this.app.use(async (req: Request, res: Response, next: NextFunction) => {
      const { authorization } = req.headers

      if (!authorization) {
        // register, login => ok
        if (req.method === 'POST' && (req.originalUrl === '/users' || req.originalUrl === '/login')) {
          next()
          return
        }
        // create a developper account => ok
        if (req.method === 'POST' && req.originalUrl === '/company') {
          next()
          return
        }
        // authorization demand => ok
        if (req.method === 'POST' && req.originalUrl === '/authorize') {
          next()
          return
        }
        // sdk website => ok
        if (req.method === 'GET' && /\/sdk(.*)/.test(req.originalUrl)) {
          next()
          return
        }
        res.status(401).send('the Authorization header is mandatory')
        return
      }

      const tokenParts = authorization.split(' ')
      if (tokenParts.length !== 2) {
        res.status(401).send('the Authorization header should be formed of token type, followed by the token value: "bearer [my_token]"')
        return
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
          res.status(401).send({ message: 'invalid token' })
          return
        }

        if (userId) {
          try {
            // TODO (when email validation is done): check in the database that
            // the user email is confirmed
            const usr = await User.findById(userId).exec()

            if (!usr) {
              res.status(401).send({ message: 'user not found' })
              return
            }

            // make the verified user available when handling the request
            req.body.user = usr
          } catch (e) {
            res.status(501).send({ message: 'database error: ' + e })
            return
          }
        }

        if (tokenId) {
          try {
            const auth = await Authorization.findById(tokenId)

            if (!auth) {
              res.status(401).send({ message: 'token not found' })
              return
            }

            if (auth.status === AuthStatus.Revoked) {
              res.status(401).send({ message: 'token revoked' })
              return
            }

            if (new Date(auth.expirationDate) < new Date()) {
              res.status(401).send({ message: 'token expired' })
              return
            }

            await auth.populate('company').execPopulate()
            await auth.populate('user').execPopulate()

            // make the known information available when handling the request
            req.body.user = auth.user
            req.body.company = auth.company
            req.body.token = auth
          } catch (e) {
            res.status(501).send({ message: 'database error: ' + e })
          }
        }

        // everything went well and the JWT is valid
        next()

        // log after the next() for more organized logs
        console.log('Authenticated user id:', userId)
        return
      } catch (e) {
        console.log('error decoding the JWT:', e)
        res.status(401).send({ message: 'error decoding the token' })
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
