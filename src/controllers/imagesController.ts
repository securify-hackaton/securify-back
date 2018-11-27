const CognitiveServices = require('cognitive-services')
const fs = require('fs')
const uuidv1 = require('uuid/v1')
const { promisify } = require('util')
const readFile = promisify(fs.readFile)
import AzureOptions from '../config/azure'
import { Request, Response } from 'express'
import { User } from '../models/User'

export class ImagesController {
    faceApi: any

    constructor() {
        this.faceApi = new CognitiveServices.face(AzureOptions)
    }

    // Add a image for the current user in azure cloud
    public async AddImage(req: any, res: Response) {
        if (!req.files.image) {
            res.status(400).send({message: 'Image is mandatory'})
            return
        }

        const user = await this.getUser(req, res)
        if (!user) return

        try {
            const fileName = './img/' + uuidv1()
            fs.writeFile(fileName, req.files.image.data, async (err) => {
                if (err) throw err
                user.images.push(fileName)
                await user.save()
                res.status(200).send()
            })
        } catch {
            res.status(400).send({message: 'Unable to upload file'})
        }
    }

    // Delete any information saved on azure microsoft.
    public async RemoveImage(req: Request, res: Response) {

        if (req.body.imageIndex === null || req.body.imageIndex === undefined) {
            res.status(400).send({message: 'Image index is mandatory'})
            return
        }

        const user = await this.getUser(req, res)
        if (!user) return

        try {
            fs.unlink(user.images[req.body.imageIndex], async (err) => {
                user.images.splice(req.body.imageIndex, 1)
                await user.save()
                res.status(200).send({message: 'Successfully deleted images'})
            })
        } catch {
            res.status(500).send({message: 'Unable to delete images'})
        }
    }

    public async VerifyFace(req: any, res: Response) {
        if (!req.files.image) {
            res.status(400).send({message: 'Image is mandatory'})
            return
        }

        const user = await this.getUser(req, res)
        if (!user) return

        try {
            const toCheckFaceId = await this.getFaceId(req.files.image.data)
            const imgModels = user.images.slice(-3)
            if (user.images.length > 3) {
                for (let i = 0, length = 4; i  < length ; i++) {
                    const randomImage = user.images[Math.floor(Math.random() * user.images.length)]
                    if (imgModels.indexOf(randomImage) == -1) imgModels.push(randomImage)
                }
            }

            let numberIdentical = 0
            let confidence = 0

            for (let i = 0, length = imgModels.length; i < length; i++) {
                const file = await readFile(imgModels[i])
                const faceId = await this.getFaceId(file)
                const comparison = await this.compareFaces(toCheckFaceId, faceId)
                if (comparison.isIdentical) {
                    numberIdentical++
                }
                confidence += comparison.confidence
            }

            if (numberIdentical >= Math.floor(imgModels.length / 2) || confidence > 0.3 * imgModels.length) {
                res.status(200).send()
            } else {
                res.status(400).send({message: 'Not the same person'})
            }

        } catch (err) {
            console.log(err)
            res.status(500).send({message: 'Error while trying to verify face integrity'})
        }

    }

    private async compareFaces(firstFaceId: string, secondFaceId: string): Promise<{isIdentical: boolean, confidence: number}> {
        const body = {
            'faceId1': firstFaceId,
            'faceId2': secondFaceId
        }

        return await this.faceApi.verify({body})
     }

     private async getFaceId(image: string): Promise<string> {
        const payload = {
            headers: {
                'Content-type': 'application/octet-stream'
            },
            parameters: {
                returnFaceId: true,
                returnFaceLandmarks: false
            },
            body: image
        }
        const res = await this.faceApi.detect(payload)
        return res[0].faceId
     }

    private async getUser(req: Request, res: Response) {
        try {
            return await User.findById(req.body.id)
        } catch {
            res.status(400).json({ message: 'user do not exist' })
        }
    }
}