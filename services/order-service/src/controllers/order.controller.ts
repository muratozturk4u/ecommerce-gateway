import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { IOrderController } from '../interfaces/order-controller.interface';
import { IOrderService } from '../interfaces/order-service.interface';
import { createOrderSchema, updateStatusSchema, orderQuerySchema } from '../validators/order.validator';
import { handleError } from '../utils/error-handler';

export class OrderController implements IOrderController {
  constructor(private readonly orderService: IOrderService) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const data = createOrderSchema.parse(req.body);
      const order = await this.orderService.create(data);
      res.status(201).json({ success: true, data: order });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req, res);
      if (!userId) return;
      const userRole = (req.headers['x-user-role'] as string) || 'customer';

      const query = orderQuerySchema.parse(req.query);
      const result = await this.orderService.getByUser(userId, userRole, query);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req, res);
      if (!userId) return;
      const userRole = (req.headers['x-user-role'] as string) || 'customer';
      const orderId = req.params.id as string;

      const order = await this.orderService.getById(orderId, userId, userRole);
      res.status(200).json({ success: true, data: order });
    } catch (error) {
      handleError(res, error);
    }
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req, res);
      if (!userId) return;
      const userRole = (req.headers['x-user-role'] as string) || 'customer';
      const orderId = req.params.id as string;

      const { status } = updateStatusSchema.parse(req.body);
      const order = await this.orderService.updateStatus(orderId, status, userId, userRole);
      res.status(200).json({ success: true, data: order });
    } catch (error) {
      handleError(res, error);
    }
  }

  private extractUserId(req: Request, res: Response): string | null {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'X-User-Id header is required' }
      });
      return null;
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid user ID format' }
      });
      return null;
    }
    return userId;
  }
}
