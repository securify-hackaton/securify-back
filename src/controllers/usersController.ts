import { Request, Response } from 'express'
import jsonwebtoken = require('jsonwebtoken')
import nodemailer = require('nodemailer')
import { randomBytes } from 'crypto'
import * as Bluebird from 'bluebird'

import { User, IUser } from '../models/User'
import { jwtOptions } from '../config/jwt'
import { json } from 'body-parser';

export class UsersController {
  public addNewUser (req: Request, res: Response): Response {
    if (!req.body.password) {
      return res.status(400).send({  })
    }

    const newUser = new User(req.body)

    newUser.email = newUser.email.trim().toLowerCase()
    newUser.setPassword(req.body.password)

    newUser.save((err, user) => {
      if (err) {
        console.log('saving user failed:', err.message)
        if (err.name === 'ValidationError') {
          return res.status(400).send(err.message)
        }
        return res.status(500).send(err)
      }

      // todo: save token in database and get inserted _id
      const payload = { userId: user._id }
      const token = jsonwebtoken.sign(payload, jwtOptions.secretOrKey)

      try {
        this.sendVerificationMail(user)
      } catch (e) {
        console.log(`confirmation mail error: ${e}`)
      }

      return res.status(201).json({
        user,
        token: `bearer ${token}`
      })
    })
  }

  public async getUsers (_: Request, res: Response): Promise<Response> {
    try {
      const users = await User.find({})
      return res.json(users)
    } catch (e) {
      console.log(`error fetching all users: ${e}`)
      return res.status(500).send({ message: 'error fetching users' })
    }
  }

  public async login (req: Request, res: Response): Promise<Response> {
    if (!req.body.email) {
      return res.status(400).send({ message: 'email is mandatory' })
    }

    req.body.email = req.body.email.trim().toLowerCase()

    if (!req.body.password) {
      return res.status(400).send({ message: 'password is mandatory' })
    }

    const { password, email } = req.body

    let user: IUser

    try {
      user = await User.findOne({ email })
    } catch (e) {
      return res.status(401).json({ message: e})
    }

    if (!user) {
      return res.status(401).json({ message: 'user does not exist' })
    }

    if (!user.validPassword(password)) {
      return res.status(401).json({ message: 'invalid password' })
    }

    const payload = { userId: user._id }
    const token = jsonwebtoken.sign(payload, jwtOptions.secretOrKey)
    // TODO: save token hash in the database to prevent forgery
    return res.json({ user, token: `bearer ${token}` })
  }

  public async getUserByID (req: Request, res: Response): Promise<Response> {
    try {
      const user = User.findById(req.params.userId).exec()

      if (!user) {
        return res.status(404).send({ message: `user not found: ${req.params.userId}` })
      }

      return res.json(user)
    } catch (e) {
      return res.send({ message: e })
    }
  }

  public async updateUser (req: Request, res: Response): Promise<Response> {
    if (req.body.user._id !== req.params.userId) {
      return res.status(401).send({ message: 'hop hop hop !' })
    }

    try {
      const user = User.findOneAndUpdate({ _id: req.params.userId }, req.body, { new: true })
      return res.json(user)
    } catch (e) {
      return res.status(500).send({ message: e })
    }
  }

  public deleteUser (req: Request, res: Response) {
    if (req.body.user._id !== req.params.userId) {
      res.status(401).send({ message: 'hop hop hop !' })
    }

    User.deleteOne({ _id: req.params.userId }, (err) => {
      if (err) {
        res.send({ message: err })
      }
      res.json({ message: 'Successfully deleted user!'})
    })
  }

  private async sendVerificationMail(user: IUser): Promise<void> {
    const username = process.env.GMAIL_USERNAME
    const password = process.env.GMAIL_PASSWORD
    const securify = process.env.DEPLOY_URL

    if (!username) {
      throw new Error('GMAIL_USERNAME is mandatory')
    }
    if (!password) {
      throw new Error('GMAIL_PASSWORD is mandatory')
    }

    const key = randomBytes(16).toString('hex')

    user.emailValidationKey = key

    try {
      await user.save()
    } catch (e) {
      console.log('sendVerificationMail: saving user failed')
      throw e
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: username,
        pass: password
      }
    })

    const mailOptions = {
      from: username,
      to: user.email,
      subject: 'Confirm your email address on Securify',
      html: `<p>Hello ${user.firstName}, welcome to Securify.<br><br>Please confirm your email: ${securify}/confirm?email=${user.email}&key=${key}.</p>`
    }

    const sendMail = Bluebird.promisify(transporter.sendMail)

    let info
    try {
      info = await sendMail(mailOptions)
    } catch (e) {
      console.log(`error sending mail: ${e}`)
      throw e
    }

    console.log(`mail ok: ${info}`)
  }
}
