import { Document } from 'mongoose';

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface IOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface IOrder {
  id: string;
  userId: string;
  items: IOrderItem[];
  totalAmount: number;
  status: OrderStatus;
  shippingAddress?: {
    street: string;
    city: string;
    zip: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderDocument extends Document {
  userId: string;
  items: IOrderItem[];
  totalAmount: number;
  status: OrderStatus;
  shippingAddress?: {
    street: string;
    city: string;
    zip: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderDto {
  userId: string;
  items: IOrderItem[];
  totalAmount: number;
  shippingAddress?: {
    street: string;
    city: string;
    zip: string;
  };
}

export interface OrderQuery {
  page: number;
  limit: number;
  status?: OrderStatus;
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
