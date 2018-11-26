import { Request, Response } from 'express'
import jsonwebtoken = require('jsonwebtoken')

import { User, IUser } from '../models/User'
import { jwtOptions } from '../config/jwt'

export class UsersController {
  public addNewUser (req: Request, res: Response) {
    const newUser = new User(req.body)

    newUser.save((err, user) => {
      if (err) {
        console.log('saving user failed:', err.message)
        if (err.name === 'ValidationError') {
          res.status(400).send(err.message)
          return
        }
        res.status(500).send(err)
        return
      }
      res.status(201).json(user)
    })
  }

  public getUsers (_: Request, res: Response) {
    User.find({}, (err, user) => {
      if (err) {
        res.send(err)
      }
      res.json(user)
    })
  }

  public async login (req: Request, res: Response) {
    if (!req.body.email) {
      res.status(400).send('email is mandatory')
      return
    }

    if (!req.body.password) {
      res.status(400).send('password is mandatory')
      return
    }

    const { password, email } = req.body

    let user: IUser

    try {
      user = await User.findOne({ email })
    } catch (e) {
      res.status(401).json({ message: e})
      return
    }

    if (!user) {
      res.status(401).json({ message: 'user does not exist' })
      return
    }

    const payload = { id: user._id }
    const token = jsonwebtoken.sign(payload, jwtOptions.secretOrKey)
    // TODO: save token hash in the database to prevent forgery
    res.json({ message: 'ok', token: `bearer ${token}` })
  }

  public getUserByID (req: Request, res: Response) {
    User.findById(req.params.userId, (err, user) => {
      if (err) {
        res.send(err)
        return
      }

      if (!user) {
        res.status(404).send(`user not found: ${req.params.userId}`)
        return
      }

      res.json(user)
    })
  }

  public updateUser (req: Request, res: Response) {
    User.findOneAndUpdate({ _id: req.params.userId }, req.body, { new: true }, (err, user) => {
      if (err) {
        res.send(err)
      }
      res.json(user)
    })
  }

  public deleteUser (req: Request, res: Response) {
    User.deleteOne({ _id: req.params.userId }, (err) => {
      if (err) {
        res.send(err)
      }
      res.json({ message: 'Successfully deleted user!'})
    })
  }
}
