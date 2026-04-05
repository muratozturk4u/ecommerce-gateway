import mongoose from 'mongoose';
import { IOrderService } from '../interfaces/order-service.interface';
import { IOrderRepository } from '../interfaces/order-repository.interface';
import { IOrder, IOrderItem, IOrderDocument, CreateOrderDto, OrderQuery, OrderStatus, PaginatedResult } from '../interfaces/order.interface';

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['shipped'],
  shipped:   ['delivered'],
  delivered: [],
  cancelled: []
};

export class OrderService implements IOrderService {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async create(data: CreateOrderDto): Promise<IOrder> {
    this.validateItemPrices(data.items);
    this.validateTotalAmount(data.items, data.totalAmount);

    const order = await this.orderRepository.create(data);
    return this.toOrder(order);
  }

  async getById(orderId: string, userId: string, userRole: string): Promise<IOrder> {
    this.validateObjectId(orderId);

    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Order not found' };
    }

    if (userRole !== 'admin' && order.userId !== userId) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Order not found' };
    }

    return this.toOrder(order);
  }

  async getByUser(userId: string, userRole: string, query: OrderQuery): Promise<PaginatedResult<IOrder>> {
    let result;

    if (userRole === 'admin') {
      result = await this.orderRepository.findAll(query.page, query.limit, query.status);
    } else {
      result = await this.orderRepository.findByUserId(userId, query.page, query.limit, query.status);
    }

    return {
      data: result.docs.map(doc => this.toOrder(doc)),
      meta: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / query.limit) || 0
      }
    };
  }

  async updateStatus(orderId: string, newStatus: string, userId: string, userRole: string): Promise<IOrder> {
    this.validateObjectId(orderId);

    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Order not found' };
    }

    if (userRole !== 'admin') {
      if (order.userId !== userId) {
        throw { status: 403, code: 'FORBIDDEN', message: 'Access denied' };
      }
      if (order.status !== 'pending' || newStatus !== 'cancelled') {
        throw { status: 403, code: 'FORBIDDEN', message: 'Customers can only cancel pending orders' };
      }
    }

    const validTargets = VALID_TRANSITIONS[order.status] || [];
    if (!validTargets.includes(newStatus)) {
      throw {
        status: 400,
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot transition from ${order.status} to ${newStatus}`
      };
    }

    const updated = await this.orderRepository.updateStatus(orderId, order.status as OrderStatus, newStatus as OrderStatus);
    if (!updated) {
      throw {
        status: 400,
        code: 'INVALID_STATUS_TRANSITION',
        message: 'Status update failed — order status may have changed concurrently'
      };
    }

    return this.toOrder(updated);
  }

  private validateItemPrices(items: IOrderItem[]): void {
    for (const item of items) {
      const expected = item.quantity * item.unitPrice;
      if (Math.abs(item.totalPrice - expected) > 0.01) {
        throw {
          status: 400,
          code: 'ITEM_PRICE_MISMATCH',
          message: `Item ${item.productName}: totalPrice (${item.totalPrice}) does not match quantity (${item.quantity}) * unitPrice (${item.unitPrice})`
        };
      }
    }
  }

  private validateTotalAmount(items: IOrderItem[], totalAmount: number): void {
    const calculated = items.reduce((sum, item) => sum + item.totalPrice, 0);
    if (Math.abs(totalAmount - calculated) > 0.01) {
      throw {
        status: 400,
        code: 'TOTAL_AMOUNT_MISMATCH',
        message: `totalAmount (${totalAmount}) does not match sum of item prices (${calculated})`
      };
    }
  }

  private validateObjectId(id: string): void {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid order ID format' };
    }
  }

  private toOrder(doc: IOrderDocument): IOrder {
    return {
      id: doc.id,
      userId: doc.userId,
      items: doc.items,
      totalAmount: doc.totalAmount,
      status: doc.status,
      shippingAddress: doc.shippingAddress,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
}
