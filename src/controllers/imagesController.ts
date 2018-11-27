import { Request, Response } from 'express'
const fs = require('fs')
import { User, IUser } from '../models/User'
const uuidv1 = require('uuid/v1')

export class ImagesController {

    public async addImage(req: Request, res: Response) {

        if (!req.body.image) {
            res.status(400).send('image is mandatory')
            return
        }

        const user = await this.getUser(req, res)
        if (!user) return
        const imageName = '/img/' + uuidv1()
        fs.writeFile(imageName, req.body.image, (err) => {
            if (err) {
                res.status(500).send('Unable to save image')
            } else {
                user.images.push(imageName)
                res.status(200)
            }
        })

    }

    public async removeImage(req: Request, res: Response) {

        if (req.body.imageIndex === undefined || req.body.imageIndex === null) {
            res.status(400).send('image index')
            return
        }

        const user = await this.getUser(req, res)
        if (!user) return
        fs.unlink(user.images[req.body.imageIndex], (err) => {
            if (err) {
                res.status(500).send('Unable to delete image')
            } else {
                res.status(200).send('ok')
            }
        })
    }

    private async getUser(req: Request, res: Response) {
        try {
            return await User.findById(req.body.id)
        } catch {
            res.status(400).json({ message: 'user do not exist' })
        }
    }
}