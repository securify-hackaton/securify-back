import { Types, Schema, Document, model, Model } from 'mongoose'
import { IUser } from './User'
import { ICompany } from './Company'

export const AuthStatus = {
  Pending: 'PENDING',
  Denied: 'DENIED',
  Ok: 'OK',
  Revoked: 'REVOKED'
}

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
    required: 'status must be one of PENDING, DENIED, OK, REVOKED'
  },
  deviceName: {
    type: String
  },
  createdDate: {
    type: Date,
    default: Date.now
  },
  expirationDate: {
    type: Date,
    required: 'expiration date is required'
  }
})

AuthorizationSchema.methods = {
}

export interface IAuthorization extends Document {
  company: ICompany | Types.ObjectId | any
  user: IUser | Types.ObjectId
  status: string
  deviceName: string
  createdDate: Date
  expirationDate: Date
}

export const Authorization: Model<IAuthorization> = model<IAuthorization>('Authorization', AuthorizationSchema, 'authorization')
