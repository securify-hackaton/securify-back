import { Document, model, Model, Schema, Types } from 'mongoose'

const MessageSchema = new Schema({
  content: {
    type: String,
    required: 'messages cannot be empty'
  },
  from: {
    type: Types.ObjectId
  },
  token: {
    type: String,
    required: 'messages must be signed'
  },
  created_date: {
    type: Date,
    default: Date.now
  }
});

export interface IMessage extends Document {
  content: string
  from: Types.ObjectId
  token: string
  created_date: Date
}

export const Message: Model<IMessage> = model<IMessage>('Message', MessageSchema, 'message')
