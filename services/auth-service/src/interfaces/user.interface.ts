import { Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  role: 'admin' | 'customer';
  createdAt: Date;
}

export interface IUserPayload {
  userId: string;
  role: 'admin' | 'customer';
}
