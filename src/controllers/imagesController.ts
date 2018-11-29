const CognitiveServices = require('cognitive-services')
const fs = require('fs')
const uuidv1 = require('uuid/v1')
const { promisify } = require('util')
const readFile = promisify(fs.readFile)

import AzureOptions from '../config/azure'
import { Request, Response } from 'express'
import jsonwebtoken from 'jsonwebtoken'

import { Image } from '../models/Image'
import { IUser } from '../models/User'
import { IAuthorization, Authorization, AuthStatus } from '../models/Authorization'
import { jwtOptions } from '../config/jwt'

export class ImagesController {
    faceApi: any

    constructor() {
        this.faceApi = new CognitiveServices.face(AzureOptions)
    }

    // Add a image for the current user in azure cloud
    public async addImage(req: any, res: Response) {
        if (!req.files.image) {
            res.status(400).send({ message: 'image is mandatory' })
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
            res.status(400).send({ message: 'unable to upload file' })
        }
    }

    // Delete any information saved on azure microsoft.
    public async removeImage(req: Request, res: Response) {

        if (req.body.faceId) {
            res.status(400).send({ message: 'image faceId is mandatory' })
            return
        }

        const user: IUser = req.body.user
        if (!user) return
        await user.populate('images').execPopulate()

        let index = -1
        for (let i = 0; i < user.images.length; i++) {
            if (user.images[i].faceId === req.body.faceId) {
                index = 1
                break
            }
        }

        if (index == -1) return res.status(404).send({ message: 'image not found' })

        try {
            fs.unlink(user.images[req.body.imageIndex].path, async (err) => {
                await user.images[req.body.imageIndex].remove()
                user.images.splice(req.body.imageIndex, 1)
                await user.save()
                res.status(200).send({ message: 'successfully deleted images' })
            })
        } catch {
            res.status(500).send({ message: 'unable to delete images' })
        }
    }

    public async verifyFace(req: any, res: Response) {
        if (!req.body.requestId) {
            res.status(400).send({ message: 'requestId is mandatory' })
            return
        }
        if (!req.files.image) {
            res.status(400).send({ message: 'image is mandatory' })
            return
        }

        let authorization: IAuthorization
        try {
            authorization = await Authorization.findById(req.body.requestId).exec()
        } catch (e) {
            console.log(`verifyFace: did not find authorization ${req.body.requestId}`, e)
        }

        if (authorization.user.toString() !== req.body.user._id.toString()) {
            res.status(401).send({ message: 'this is not yours!' })
            return
        }

        const user = req.body.user

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

            if (!(numberIdentical >= Math.ceil(imgModels.length / 2) ||  (confidence / imgModels.length) > 0.5)) {
                res.status(400).send({ message: 'not the same person' })
                return
            }

            const expirationDate = new Date()
            expirationDate.setDate(expirationDate.getDate() + 7)

            authorization.status = AuthStatus.Ok
            authorization.expirationDate

            try {
                await authorization.save()
            } catch (e) {
                console.log(`could not save authorization ${authorization._id}:`, e)
                res.status(500).send({ message: 'database error updating the authorization' })
            }

            const payload = { tokenId: authorization    ._id }
            const token = jsonwebtoken.sign(payload, jwtOptions.secretOrKey)

            // POST callback
            res.status(200).send({
                requestId: req.body.requestId,
                validated: true,
                token: `bearer ${token}`
            })

        } catch (err) {
            console.log(err)
            res.status(500).send({ message: 'error while trying to verify face integrity' })
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