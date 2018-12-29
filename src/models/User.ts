import { Schema, Document, model, Model } from 'mongoose'
import { pbkdf2Sync, randomBytes } from 'crypto'

import { IImage } from './Image'

export const UserSchema = new Schema({
  email: {
    type: String,
    lowercase: true,
    unique: true,
    required: "email can't be blank",
    match: [/\S+@\S+\.\S+/, 'email is invalid']
  },
  firstName: {
    type: String
  },
  lastName: {
    type: String
  },
  images: {
    type: [{ type: Schema.Types.ObjectId, ref: 'Image' }],
    default: []
  },
  deviceId: {
    type: String,
    required: "deviceId can't be blank"
  },
  deviceType: {
    type: String,
    required: "deviceType can't be blank"
  },
  emailValidated: {
    type: Boolean,
    default: false
  },
  emailValidationKeyHash: {
    type: String,
  },
  emailValidationKeySalt: {
    type: String,
  },
  salt: {
    type: String
  },
  hash: {
    type: String
  },
  createdDate: {
    type: Date,
    default: Date.now
  }
})

UserSchema.methods = {
  validEmailConfirmation(key: string) {
    if (!this.emailValidationKeyHash) return false

    const hash = pbkdf2Sync(
      key,
      this.emailValidationKeySalt,
      10000,
      512,
      'sha512'
    )

    return hash.toString('hex') === this.emailValidationKeyHash
  },

  setEmailConfirmationKey(key: string) {
    this.emailValidationKeySalt = randomBytes(16).toString('hex')
    const hash = pbkdf2Sync(
      key,
      this.emailValidationKeySalt,
      10000,
      512,
      'sha512'
    )

    this.emailValidationKeyHash = hash.toString('hex')
  },
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

export interface IUser extends Document {
  email: string
  firstName: string
  lastName: string
  images: Array<IImage>
  deviceId: string
  deviceType: string
  emailValidated: boolean
  emailValidationKeyHash: string
  emailValidationKeySalt: string
  hash: string
  salt: string
  created_date: Date
  validEmailConfirmation: (key: string) => boolean
  setEmailConfirmationKey: (key: string) => void
  validPassword: (password: string) => boolean
  setPassword: (password: string) => void
}

export const User: Model<IUser> = model<IUser>('User', UserSchema, 'user')
