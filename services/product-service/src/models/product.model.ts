import mongoose, { Schema } from 'mongoose';
import { IProductDocument } from '../interfaces/product.interface';

const productSchema = new Schema<IProductDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category'
    },
    imageUrl: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true
    }
  },
  {
    timestamps: true
  }
);

productSchema.index({ name: 'text' });
productSchema.index({ categoryId: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isActive: 1 });

export const ProductModel = mongoose.model<IProductDocument>('Product', productSchema);
