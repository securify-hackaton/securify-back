import { Request, Response } from 'express'
import { ICompany, Company } from '../models/Company'
import { Authorization, AuthStatus, IAuthorization } from '../models/Authorization'
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
        throw new Error('user not found, found.length = ' + found.length)
      }
      user = found[0]
    } catch (e) {
      const errorMsg = `didn't find user with email ${userEmail}`
      console.log(errorMsg)
      res.status(401).json({ message: errorMsg })
      return
    }

    const expirationDate = new Date()
    expirationDate.setDate(expirationDate.getDate() + 1)

    let newAuthorization = new Authorization({
      company: company._id,
      user: user._id,
      status: AuthStatus.Pending,
      expirationDate
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

  public async getAllActiveTokensForUser(req: Request, res: Response) {
    const user: IUser = req.body.user

    try {
      const authorizations = await Authorization.find({
        user: user._id,
        status: AuthStatus.Ok,
        expirationDate: { $gt: new Date() }
      }).exec()

      // populate simultaneously all authorizations' companies
      await Promise.all(authorizations.map(async (auth) =>
        await auth.populate('company').execPopulate()))

      // keep only relevant fields
      for (let i = 0; i < authorizations.length; i++) {
        authorizations[i].company = {
          name: authorizations[i].company.name,
          image: authorizations[i].company.image
        }
      }

      res.status(200).json(authorizations)
    } catch (e) {
      console.log(`couldn't fetch active tokens for user ${user} ===>> ${e}`)
      res.status(500).send({ message: 'error fetching the active tokens' })
    }
  }

  public async getAllPendingTokensForUser(req: Request, res: Response) {
    const user: IUser = req.body.user

    try {
      const authorizations = await Authorization.find({
        user: user._id,
        status: AuthStatus.Pending,
        expirationDate: { $gt: new Date() }
      }).exec()

      // populate simultaneously all authorizations' companies
      await Promise.all(authorizations.map(async (auth) =>
        await auth.populate('company').execPopulate()))

      // keep only relevant fields
      for (let i = 0; i < authorizations.length; i++) {
        authorizations[i].company = {
          name: authorizations[i].company.name,
          image: authorizations[i].company.image
        }
      }

      res.status(200).json(authorizations)
    } catch (e) {
      console.log(`couldn't fetch pending tokens for user ${user} ===>> ${e}`)
      res.status(500).send({ message: 'error fetching the pending tokens' })
    }
  }

  public async revokeToken(req: Request, res: Response) {
    const user: IUser = req.body.user
    const { tokenId } = req.body

    if (!tokenId) {
      res.status(400).send({ message: 'tokenId is mandatory' })
      return
    }

    let auth: IAuthorization

    try {
      auth = await Authorization.findById(tokenId).exec()
    } catch (e) {
      const message = `couldn't fetch authorization ${tokenId}`
      res.status(500).send({ message })
      return
    }

    if (!auth) {
      const message = `authorization ${tokenId} does not exist`
      res.status(400).send({ message })
      return
    }

    if (auth.user.toString() !== user._id.toString()) {
      res.status(401).send({ message: 'this is not your token !!' })
      return
    }

    auth.status = AuthStatus.Revoked

    try {
      await auth.save()
      res.status(200).send({ message: 'revoked' })
      return
    } catch (e) {
      console.log('error saving the auth:', e)
      const message = 'could not revoke the token: database error'
      res.status(500).send({ message })
      return
    }
  }
}
