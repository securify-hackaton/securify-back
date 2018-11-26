import { Schema, Document, model, Model } from 'mongoose'
import { pbkdf2, randomBytes, pbkdf2Sync } from 'crypto'

export const UserSchema = new Schema({
  email: {
    type: String,
    lowercase: true,
    unique: true,
    required: "email can't be blank",
    match: [/\S+@\S+\.\S+/, 'email is invalid']
  },
  firstname: {
    type: String
  },
  lastname: {
    type: String
  },
  images: {
    type: Array,
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
  created_date: {
    type: Date,
    default: Date.now
  }
})

UserSchema.methods = {
}

export interface IUser extends Document {
  email: string
  firstname: string
  lastname: string
  images: Array<string>
  deviceId: string
  deviceType: string
  emailValidated: boolean
  created_date: Date
}

export const User: Model<IUser> = model<IUser>('User', UserSchema, 'user')
