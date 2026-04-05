import { Document } from 'mongoose';

export interface IUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'admin' | 'customer';
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: 'admin' | 'customer';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  passwordHash: string;
  name: string;
  role: 'admin' | 'customer';
}
