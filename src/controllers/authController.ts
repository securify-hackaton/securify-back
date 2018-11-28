import { Request, Response } from 'express'
import { ICompany, Company } from '../models/Company'
import { Authorization } from '../models/Authorization'
import { User, IUser } from '../models/User'

export class AuthController {
  public async authorize (req: Request, res: Response) {
    const { userEmail, privateKey, publicKey } = req.body
    if (!privateKey) {
      res.status(400).send({ message: 'privateKey is mandatory' })
      return
    }
    if (!publicKey) {
      res.status(400).send({ message: 'privateKey is mandatory' })
      return
    }
    if (!userEmail) {
      res.status(400).send({ message: 'userEmail is mandatory' })
      return
    }

    let company: ICompany

    try {
      company = await Company.findById(publicKey).exec()
    } catch (e) {
      console.log(e)
      const errorMsg = `didn't find company with public key ${publicKey}`
      res.status(401).json({ message: errorMsg })
      return
    }

    if (!company) {
      res.status(401).json({ message: 'company does not exist' })
      return
    }

    if (!company.validPassword(privateKey)) {
      res.status(401).json({ message: 'invalid private key' })
      return
    }

    let user: IUser

    try {
      const found = await User.find({ email: userEmail }).exec()

      if (found.length !== 1) {
        throw new Error('not found, found.length = ' + found.length)
      }
      user = found[0]
    } catch (e) {
      const errorMsg = `didn't find user with email ${userEmail}`
      console.log(errorMsg)
      res.status(401).json({ message: errorMsg })
      return
    }

    let newAuthorization = new Authorization({
      company: company._id,
      user: user._id,
      status: 'PENDING'
    })

    try {
      newAuthorization = await newAuthorization.save()
    } catch (e) {
      console.log('saving the authorization request failed:', e)
      res.status(500).json({ message: 'saving the authorization request failed' })
      return
    }

    // TODO: send a push notification

    res.status(200).json({
      requestId: newAuthorization._id
    })
  }
}
