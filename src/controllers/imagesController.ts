const CognitiveServices = require('cognitive-services')
const fs = require('fs')
const uuidv1 = require('uuid/v1')
const { promisify } = require('util')
const readFile = promisify(fs.readFile)
const { S3 } = require('aws-sdk')

import AzureOptions from '../config/azure'
import { Request, Response } from 'express'
import axios from 'axios'
import * as jsonwebtoken from 'jsonwebtoken'

import { Image } from '../models/Image'
import { IUser } from '../models/User'
import { IAuthorization, Authorization, AuthStatus } from '../models/Authorization'
import { jwtOptions } from '../config/jwt'

export class ImagesController {
    faceApi: any
    s3: any

    constructor() {
        if (!process.env.AZURE_KEY) {
            throw new Error(`AZURE_KEY is mandatory!`)
        }
        this.faceApi = new CognitiveServices.face(AzureOptions)
        if (!process.env.AWS_S3_IMG_BUCKET) {
            throw new Error(`AWS_S3_IMG_BUCKET is mandatory!`)
        }
        this.s3 = new S3()
    }

    private async storeImage(img, key) {
        const bucket = process.env.AWS_S3_IMG_BUCKET
        try {
            const response = await this.s3.createBucket({ Bucket: bucket }).promise()
            console.log(`creating bucket ok: ${JSON.stringify(response)}`)
        } catch (e) {
            // the bucket probably already exists
        }

        const payload = {
            Bucket: bucket,
            Key: key,
            Body: img
        }

        console.log(`key: ${key}`)

        try {
            const response = await this.s3.putObject(payload).promise()
            return response
        } catch (e) {
            console.log(`couldn't add image to s3: ${e}`)
        }
    }

    public async getImage(key) {
        const payload = {
            Bucket: process.env.AWS_S3_IMG_BUCKET,
            Key: key
        }
        try {
            // const result = this.s3.getObject(payload).createReadStream()
            const result = await this.s3.getObject(payload).promise()
            const data = result.Body
            const image = Buffer.from(data).toString('utf8')
            return image
        } catch (e) {
            console.log(`couldn't get img: ${e}`)
        }
    }

    // Add a image for the current user in azure cloud
    public async addImage(req: any, res: Response) {
        if (!req.files.image) {
            res.status(400).send({ message: 'image is mandatory' })
            return
        }

        const { user } = req.body

        try {
            const id = uuidv1()
            const fileName = './img/' + id

            try {
                const result = await this.storeImage(req.files.image.data, id)
                console.log(`stored image: ${JSON.stringify(result)}`)
                if (result) {
                    const imageFromS3 = await this.getImage(id)
                    console.log(`got image: ${imageFromS3}`)
                }
            } catch (e) {
                console.log(`image publishing to S3 failed: ${e}`)
            }

            fs.writeFile(fileName, req.files.image.data, async (err) => {
                if (err) throw err
                const image = new Image()
                image.path = fileName
                image.faceId = await this.getFaceId(req.files.image.data)
                console.log(`Azure face id: ${image.faceId}`)
                image.faceIdCreationDate = new Date()
                await image.save()
                user.images.push(image.id)
                await user.save()

                return res.status(200).send({ message: 'image saved' })
            })
        } catch {
            return res.status(500).send({ message: 'unable to upload file' })
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

        if (index === -1) {
            return res.status(404).send({ message: 'image not found' })
        }

        try {
            fs.unlink(user.images[req.body.imageIndex].path, async (_err) => {
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

        const { user } = req.body

        if (authorization.user.toString() !== user._id.toString()) {
            res.status(401).send({ message: 'this is not yours!' })
            return
        }

        try {
            await user.populate('images').execPopulate()
        } catch (e) {
            console.log(`error populating user ${user._id} images: ${e}`)
            return res.status(500).send({ message: 'error getting user images' })
        }

        if (authorization.status === AuthStatus.Ok) {
            return res.status(200).send({ message: 'authorization is already validated' })
        }

        if (authorization.status !== AuthStatus.Pending) {
            return res.status(400).send({ message: 'authorization has an invalid status' })
        }

        if (new Date(authorization.expirationDate) < new Date()) {
            return res.status(400).send({ message: 'authorization request expired' })
        }

        if (user.images.length === 0) {
            return res.status(400).send({ message: 'please add more images' })
        }

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
                // in hours
                const ttl = (Math.abs(imgModels[i].faceIdCreationDate.valueOf() - new Date().valueOf()) / 1000 / 60 / 60)
                let faceId

                /*
                 * Microsoft Azure Face API stores images up to 24 hours
                 * we keep a local copy of all images and reupload them
                 * when needed.
                 * If the image is missing both from Azure and our local
                 * storage, we delete it from the database
                **/
                if (imgModels[i].faceId && ttl < 23) {
                    faceId = imgModels[i].faceId
                } else {
                    try {
                        const file = await readFile(imgModels[i].path)
                        faceId = await this.getFaceId(file)
                        imgModels[i].faceId = faceId
                        imgModels[i].faceIdCreationDate = new Date()
                        await imgModels[i].save()
                    } catch {
                        user.images.filter(image => image.path !== imgModels[i].path)
                        await user.save() // We remove the image from the db if we didn't find it in the /img folder
                    }
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

            const payload = { tokenId: authorization._id }
            const token = jsonwebtoken.sign(payload, jwtOptions.secretOrKey)

            // POST callback
            res.status(200).send({ message: 'ok' })

            try {
                await authorization.populate('company').execPopulate()
            } catch (e) {
                console.log('could not populate auth company: ', e)
                return
            }

            try {
                await axios.post(authorization.company.callback, {
                  requestId: authorization._id,
                  validated: true,
                  token: `bearer ${token}`
                })
            } catch (e) {
            console.log('could not send callback to the company:', e)
            }
        } catch (err) {
            console.log('verifyFace error:', err)
            return res.status(500).send({ message: 'error while trying to verify face integrity' })
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