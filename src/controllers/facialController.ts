import { Request, Response } from 'express'
import { User, IUser } from '../models/User'
import CognitiveServices from 'cognitive-services'

export class FacialController {
    faceApi: any

    constructor() {
        const faceApi = new CognitiveServices.face({
            apiKey: 'config.face.apiKey',
            endpoint: 'config.face.endpoint'
        })
    }

    public async authenticateUser(req: Request, res: Response) {

        if (!req.body.image) {
            res.status(400).send('image is mandatory')
            return
        }

        const user = await this.getUser(req, res)

    }

    private async getUser(req: Request, res: Response) {
        try {
            return await User.findById(req.body.id)
        } catch {
            res.status(400).json({ message: 'user does not exist' })
        }
    }
}