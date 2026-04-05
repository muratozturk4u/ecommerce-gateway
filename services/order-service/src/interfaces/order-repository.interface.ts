import { IOrderDocument, CreateOrderDto, OrderStatus } from './order.interface';

export interface IOrderRepository {
  create(data: CreateOrderDto): Promise<IOrderDocument>;
  findById(id: string): Promise<IOrderDocument | null>;
  findByUserId(userId: string, page: number, limit: number, status?: OrderStatus): Promise<{ docs: IOrderDocument[]; total: number }>;
  findAll(page: number, limit: number, status?: OrderStatus): Promise<{ docs: IOrderDocument[]; total: number }>;
  updateStatus(id: string, currentStatus: OrderStatus, newStatus: OrderStatus): Promise<IOrderDocument | null>;
}
