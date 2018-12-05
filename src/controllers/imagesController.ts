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

    writeFile: (filename: string, data: any) => Promise<any> = promisify(fs.writeFile)

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

        try {
            const response = await this.s3.putObject(payload).promise()
            return response
        } catch (e) {
            console.log(`couldn't add image to s3: ${e}`)
        }
    }

    public async getImage(key): Promise<string> {
        const exists: (path: string) => Promise<boolean> = promisify(fs.exists)

        const relativePath = `./${key}`

        console.log(`trying to get image ${relativePath}`)

        const fileExists = await exists(relativePath)

        // if it exists on the local server, we can use it directly
        if (fileExists) {
            console.log(`found image locally`)
            return await readFile(relativePath)
        }

        // otherwise, get it from S3 and cache it locally
        console.log(`didn't find image locally: fetching from s3`)
        const image = await this.getImageFromS3(key)
        console.log(`ok, writing to disk`)
        await this.writeFile(relativePath, image)
        console.log(`ok`)

        return image
    }

    public async getImageFromS3(key) {
        const payload = {
            Bucket: process.env.AWS_S3_IMG_BUCKET,
            Key: key
        }

        // can throw
        const result = await this.s3.getObject(payload).promise()
        return result.Body
    }

    // Add a image for the current user in Azure cloud
    public async addImage(req: any, res: Response) {
        if (!req.files.image) {
            res.status(400).send({ message: 'image is mandatory' })
            return
        }

        const user: IUser = req.body.user

        const fileName = `images/${uuidv1()}`
        try {
            await this.storeImage(req.files.image.data, fileName)
        } catch (e) {
            console.log(`publishing image in S3 failed: ${e}`)
            return res.status(500).send({ message: 'unable to upload image to S3' })
        }

        try {
            await this.writeFile(`./${fileName}`, req.files.image.data)
        } catch (e) {
            console.log(`writing image to disk failed: ${e}`)
            return res.status(500).send({ message: 'unable to write file to disk' })
        }

        let faceId: string
        try {
            faceId = await this.getFaceId(req.files.image.data)
        } catch (e) {
            console.log(`getting face id failed: ${e}`)
            return res.status(500).send({ message: 'unable to get faceId' })
        }

        const image = new Image()
        image.path = fileName
        image.faceId = faceId
        image.faceIdCreationDate = new Date()

        try {
            await image.save()
        } catch (e) {
            console.log(`saving image failed: ${e}`)
            return res.status(500).send({ message: 'unable to save image' })
        }

        user.images.push(image.id)

        try {
            await user.save()
        } catch (e) {
            console.log(`adding image to user failed: ${e}`)
            return res.status(500).send({ message: 'unable to add image to user' })
        }

        return res.status(200).send({ message: 'image saved' })
    }

    // Delete any information saved on Microsoft Azure
    public async removeImage(req: Request, res: Response) {
        if (!req.body.faceId) {
            res.status(400).send({ message: 'image faceId is mandatory' })
            return
        }

        const user: IUser = req.body.user

        await user.populate('images').execPopulate()

        if (!user.images.find(i => i.faceId === req.body.faceId)) {
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

        const user: IUser = req.body.user

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
                        const file = await this.getImage(imgModels[i].path)
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

            res.status(200).send({ message: 'ok' })

            // Now we have to send the POST callback
            const payload = { tokenId: authorization._id }
            const token = jsonwebtoken.sign(payload, jwtOptions.secretOrKey)

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
                return
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

        if (res.length < 1) {
            throw new Error('no face found')
        }

        return res[0].faceId
     }
}