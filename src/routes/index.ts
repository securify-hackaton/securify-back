import { Request, Response, NextFunction } from "express"

import { UsersController } from "../controllers/usersController"

export class Routes { 
  public usersController: UsersController = new UsersController() 
  
  public routes(app): void {
    app.route('/')
      .get((_: Request, res: Response) => {
        res.status(200).send({
          message: 'Gilet Jaune API v0.0.2'
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
  }
}
