const CognitiveServices = require('cognitive-services')
const fs = require('fs')
const uuidv1 = require('uuid/v1')
const { promisify } = require('util')
const readFile = promisify(fs.readFile)
import AzureOptions from '../config/azure'
import { Request, Response } from 'express'
import { Image } from '../models/Image'

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

        const user = req.body.user
        if (!user) return

        try {
            const fileName = './img/' + uuidv1()
            fs.writeFile(fileName, req.files.image.data, async (err) => {
                if (err) throw err
                const image = new Image()
                image.path = fileName
                image.faceId = await this.getFaceId(req.files.image.data)
                console.log(image.faceId)
                image.faceIdCreationDate = new Date()
                await image.save()
                user.images.push(image.id)
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

        const user = req.body.user
        if (!user) return
        await user.populate('images').execPopulate()

        try {
            fs.unlink(user.images[req.body.imageIndex].path, async (err) => {
                await user.images[req.body.imageIndex].remove()
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

        const user = req.body.user
        if (!user) return
        await user.populate('images').execPopulate()

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
                const ttl = (Math.abs(imgModels[i].faceIdCreationDate.valueOf() - new Date().valueOf()) / 1000 / 60 / 60)
                let faceId
                if (imgModels[i].faceId && ttl < 23) {
                    faceId = imgModels[i].faceId
                } else {
                    const file = await readFile(imgModels[i].path)
                    faceId = await this.getFaceId(file)
                    imgModels[i].faceId = faceId
                    imgModels[i].faceIdCreationDate = new Date()
                    await imgModels[i].save()
                }

                const comparison = await this.compareFaces(toCheckFaceId, faceId)
                if (comparison.isIdentical) {
                    numberIdentical++
                }
                confidence += comparison.confidence
            }

            console.log('number identical : ' + numberIdentical)
            console.log('confidence : ' + confidence / imgModels.length)

            if (numberIdentical >= Math.ceil(imgModels.length / 2) ||  (confidence / imgModels.length) > 0.5 ) {
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
}