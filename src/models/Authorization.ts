import { Types, Schema, Document, model, Model } from 'mongoose'
import { IUser, User } from './User'
import { ICompany, Company } from './Company'

export const AuthorizationSchema = new Schema({
  company: {
    type: Types.ObjectId,
    ref: 'Company',
    required: 'must be asked by a company'
  },
  user: {
    type: Types.ObjectId,
    ref: 'User',
    required: 'must be asked to a user'
  },
  status: {
    type: String,
    required: 'status must be one of PENDING, DENIED, OK'
  },
  createdDate: {
    type: Date,
    default: Date.now
  },
  modifiedDate: {
    type: Date,
    default: Date.now
  }
})

AuthorizationSchema.methods = {
}

export interface IAuthorization extends Document {
  company: Types.ObjectId | ICompany
  user: Types.ObjectId | IUser
  status: string
  createdDate: Date
  modifiedDate: Date
}

export const Authorization: Model<IAuthorization> = model<IAuthorization>('Authorization', AuthorizationSchema, 'authorization')
