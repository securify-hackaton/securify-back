import { Request, Response, NextFunction } from 'express'

import { UsersController } from '../controllers/usersController'
import cors = require('cors')
import { CompanyController } from '../controllers/companyController'
import { AuthController } from '../controllers/authController'
import express = require('express')

export class Routes {
  public usersController: UsersController = new UsersController()
  public companyController: CompanyController = new CompanyController()
  public authController: AuthController = new AuthController()

  public routes(app): void {
    app.options('*', cors())
    app.route('/')
      .get((req: Request, res: Response) => {
        res.status(200).send({
          message: 'Gilet Jaune API v0.0.1',
          user: {
            // mongoose document info is stored under _doc
            ...req.body.user._doc,
            // we do not want to include user images in the response
            images: undefined
          }
        })
      })

    app.use('/sdk', express.static('sdk'))

    app.route('/login')
      .post(this.usersController.login)

    app.route('/users')
      .get((req: Request, _: Response, next: NextFunction) => {
        // middleware
        console.log(`Request from: ${req.originalUrl}`)
        console.log(`Request type: ${req.method}`)
          next()
      }, this.usersController.getUsers)
      .post(this.usersController.addNewUser)

    app.route('/users/:userId')
      .get(this.usersController.getUserByID)
      .put(this.usersController.updateUser)
      .delete(this.usersController.deleteUser)

    app.route('/company')
      .post(this.companyController.addNewCompany)
    app.route('/authorize')
      .post(this.authController.authorize)
  }
}
