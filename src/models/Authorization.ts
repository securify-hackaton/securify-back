import { Types, Schema, Document, model, Model } from 'mongoose'
import { randomBytes, pbkdf2Sync } from 'crypto'
import { IUser, User } from './User'
import { ICompany, Company } from './Company'

export const AuthorizationSchema = new Schema({
  company: {
    type: Types.ObjectId,
    required: 'must be asked by a company'
  },
  user: {
      type: Types.ObjectId,
      required: 'must be asked to a user'
    },
    status: {
    type: String,
    required: 'status must be one of PENDING, DENIED, OK'
    },
  created_date: {
    type: Date,
    default: Date.now
  },
  modified_date: {
    type: Date,
    default: Date.now
  }
})

AuthorizationSchema.methods = {
  getUser: () => User.findById(this.user).exec(),
  getCompany: () => Company.findById(this.company).exec()
}

export interface IAuthorization extends Document {
  company: Types.ObjectId
  user: Types.ObjectId
  status: string
  created_date: Date
  modified_date: Date
  getUser: () => Promise<IUser>
  getCompany: () => Promise<ICompany>
}

export const Authorization: Model<IAuthorization> = model<IAuthorization>('Authorization', AuthorizationSchema, 'authorization')
