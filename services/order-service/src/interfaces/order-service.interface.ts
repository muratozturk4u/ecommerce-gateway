import { IOrder, CreateOrderDto, OrderQuery, PaginatedResult } from './order.interface';

export interface IOrderService {
  create(data: CreateOrderDto): Promise<IOrder>;
  getById(orderId: string, userId: string, userRole: string): Promise<IOrder>;
  getByUser(userId: string, userRole: string, query: OrderQuery): Promise<PaginatedResult<IOrder>>;
  updateStatus(orderId: string, newStatus: string, userId: string, userRole: string): Promise<IOrder>;
}
