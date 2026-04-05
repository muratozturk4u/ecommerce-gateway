import { IOrderRepository } from '../interfaces/order-repository.interface';
import { IOrderDocument, CreateOrderDto, OrderStatus } from '../interfaces/order.interface';
import { Model } from 'mongoose';

export class OrderRepository implements IOrderRepository {
  constructor(private readonly orderModel: Model<IOrderDocument>) {}

  async create(data: CreateOrderDto): Promise<IOrderDocument> {
    return this.orderModel.create({ ...data, status: 'pending' });
  }

  async findById(id: string): Promise<IOrderDocument | null> {
    return this.orderModel.findById(id);
  }

  async findByUserId(userId: string, page: number, limit: number, status?: OrderStatus): Promise<{ docs: IOrderDocument[]; total: number }> {
    const filter: Record<string, unknown> = { userId };
    if (status) filter.status = status;

    const total = await this.orderModel.countDocuments(filter);
    const docs = await this.orderModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return { docs, total };
  }

  async findAll(page: number, limit: number, status?: OrderStatus): Promise<{ docs: IOrderDocument[]; total: number }> {
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const total = await this.orderModel.countDocuments(filter);
    const docs = await this.orderModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return { docs, total };
  }

  async updateStatus(id: string, currentStatus: OrderStatus, newStatus: OrderStatus): Promise<IOrderDocument | null> {
    return this.orderModel.findOneAndUpdate(
      { _id: id, status: currentStatus },
      { $set: { status: newStatus } },
      { new: true }
    );
  }
}
