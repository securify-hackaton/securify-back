import { Schema, Document, model, Model } from 'mongoose';
import { pbkdf2, randomBytes, pbkdf2Sync } from 'crypto';

export const UserSchema = new Schema({
  email: {
    type: String,
    lowercase: true,
    unique: true,
    required: "email can't be blank",
    match: [/\S+@\S+\.\S+/, 'email is invalid']
  },
  firstname: {
    type: String,
    required: "first name can't be blank"
  },
  lastname: {
    type: String,
    required: "last name can't be blank"
  },
  image: {
    type: String
  },
  hash: String,
  salt: String,
  emailValidated: {
    type: Boolean,
    default: false
  },
  created_date: {
      type: Date,
      default: Date.now
  }
});

UserSchema.methods = {
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
  firstname: string
  lastname: string
  image: string
  hash: string
  salt: string
  emailValidated: boolean
  created_date: Date
  validPassword: (password: string) => boolean
  setPassword: (password: string) => void
}

export const User: Model<IUser> = model<IUser>('User', UserSchema, 'user')
