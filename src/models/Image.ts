import { Schema, Document, model, Model } from 'mongoose'

export const ImageSchema = new Schema({
  path: {
    type: String
  },
  faceId: {
    type: String
  },
  faceIdCreationDate: {
    type: Date,
    default: Date.now
  }
})

ImageSchema.methods = {
}

export interface IImage extends Document {
  path: string
  faceId: string
  faceIdCreationDate: Date
}

export const Image: Model<IImage> = model<IImage>('Image', ImageSchema, 'image')
