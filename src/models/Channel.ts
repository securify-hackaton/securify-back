import { Document, model, Model, Schema, Types } from 'mongoose'

const ChannelSchema = new Schema({
  name: {
    type: String,
    required: 'must be named'
  },
  owner: {
    type: Types.ObjectId,
    required: 'must be owned'
  },
  created_date: {
    type: Date,
    default: Date.now
  },
  messages: {
    type: Array
  }
});

export interface IChannel extends Document {
  name: string
  owner: Types.ObjectId
  created_date: Date
  messages: Array<Types.ObjectId>
}

export const Channel: Model<IChannel> = model<IChannel>('Channel', ChannelSchema, 'channel')
