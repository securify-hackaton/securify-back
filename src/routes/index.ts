import { Request, Response, NextFunction } from 'express'
import cors = require('cors')
import express = require('express')

import { UsersController } from '../controllers/usersController'
import { ImagesController } from '../controllers/imagesController'
import { CompanyController } from '../controllers/companyController'
import { AuthController } from '../controllers/authController'

export class Routes {
  public usersController: UsersController = new UsersController()
  public companyController: CompanyController = new CompanyController()
  public authController: AuthController = new AuthController()
  public imageController: ImagesController = new ImagesController()

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
      .post(this.usersController.addNewUser.bind(this.usersController))

    app.route('/confirm')
      .get(this.usersController.confirmEmail)
      .post(this.usersController.newConfirmationEmail)

    app.route('/users/:userId')
      .get(this.usersController.getUserByID)
      .put(this.usersController.updateUser)
      .delete(this.usersController.deleteUser)

    app.route('/company')
      .post(this.companyController.addNewCompany)
    app.route('/authorize')
      .post(this.authController.authorize)

    app.route('/image')
      .post(this.imageController.addImage.bind(this.imageController))
      .delete(this.imageController.removeImage.bind(this.imageController))

    app.route('/authenticate')
      .post(this.imageController.verifyFace.bind(this.imageController))

    app.route('/tokens/pending')
      .get(this.authController.getAllPendingTokensForUser)

    app.route('/tokens/active')
      .get(this.authController.getAllActiveTokensForUser)

    app.route('/tokens/revoke')
      .post(this.authController.revokeToken)
  }
}
