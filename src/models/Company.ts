import { Schema, Document, model, Model } from 'mongoose'
import { randomBytes, pbkdf2Sync } from 'crypto'

export const CompanySchema = new Schema({
  name: {
    type: String,
    required: "name can't be blank"
  },
  image: {
    type: String,
    required: 'image URL required'
  },
  callback: {
    type: String,
    required: 'callback URL required'
  },
  salt: {
    type: String
  },
  hash: {
    type: String
  },
  created_date: {
    type: Date,
    default: Date.now
  }
})

CompanySchema.methods = {
  validPassword(password: string) {
    if (!this.hash) return false

    const hash = pbkdf2Sync(
      password,
      this.salt,
      10000,
      512,
      'sha512'
    )

    return hash.toString('hex') === this.hash
  },

  setPassword(password: string) {
    this.salt = randomBytes(16).toString('hex')
    const hash = pbkdf2Sync(
      password,
      this.salt,
      10000,
      512,
      'sha512'
    )

    this.hash = hash.toString('hex')
  },
}

export interface ICompany extends Document {
  name: string
  image: string
  callback: string
  hash: string
  salt: string
  created_date: Date
  validPassword: (password: string) => boolean
  setPassword: (password: string) => void
}

export const Company: Model<ICompany> = model<ICompany>('Company', CompanySchema, 'company')
