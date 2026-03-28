import mongoose, { Schema } from 'mongoose';
import { ICategoryDocument } from '../interfaces/category.interface';

const categorySchema = new Schema<ICategoryDocument>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

export const CategoryModel = mongoose.model<ICategoryDocument>('Category', categorySchema);
