import mongoose, { Schema } from 'mongoose';
import { IUserDocument } from '../interfaces/user.interface';

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'customer'],
      default: 'customer'
    }
  },
  {
    timestamps: true
  }
);

export const UserModel = mongoose.model<IUserDocument>('User', userSchema);
