import { Document, Types } from 'mongoose';

export interface IProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  categoryId?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProductDocument extends Document {
  name: string;
  description?: string;
  price: number;
  stock: number;
  categoryId?: Types.ObjectId;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductDto {
  name: string;
  description?: string;
  price: number;
  stock: number;
  categoryId?: string;
  imageUrl?: string;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  categoryId?: string;
  imageUrl?: string;
  isActive?: boolean;
}

export interface ProductQuery {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy: 'name' | 'price' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
