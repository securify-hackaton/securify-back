import { Request, Response, NextFunction } from 'express'

import { UsersController } from '../controllers/usersController'
import { ImagesController } from '../controllers/imagesController'

export class Routes {
  public usersController: UsersController = new UsersController()
  public imageController: ImagesController = new ImagesController()

  public routes(app): void {
    app.route('/')
      .get((req: Request, res: Response) => {
        res.status(200).send({
          message: 'Gilet Jaune API v0.0.1',
          user: req.body.user
        })
      })

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

    app.route('/image')
      .post(this.imageController.AddImage.bind(this.imageController))
      .delete(this.imageController.RemoveImage.bind(this.imageController))


    app.route('/authenticate')
      .post(this.imageController.VerifyFace.bind(this.imageController))

  }
}
