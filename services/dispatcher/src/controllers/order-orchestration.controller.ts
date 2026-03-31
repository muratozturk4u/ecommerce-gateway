import { Request, Response, NextFunction } from 'express';
import { IOrderOrchestrationService, IOrderItem, IShippingAddress } from '../interfaces/order-orchestration.interface';
import { OrderOrchestrationService } from '../services/order-orchestration.service';
import { AppError, ValidationError } from '../utils/errors';

export interface IOrderOrchestrationController {
  createOrder(req: Request, res: Response, next?: NextFunction): Promise<void>;
}

export class OrderOrchestrationController implements IOrderOrchestrationController {
  private readonly orchestrationService: IOrderOrchestrationService;

  constructor(orchestrationService?: IOrderOrchestrationService) {
    this.orchestrationService = orchestrationService || new OrderOrchestrationService();
  }

  public async createOrder(req: Request, res: Response, next?: NextFunction): Promise<void> {
    try {
      const items: IOrderItem[] | undefined = req.body.items;
      const shippingAddress: IShippingAddress | undefined = req.body.shippingAddress;

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new ValidationError('Items array is required and cannot be empty');
      }

      const result = await this.orchestrationService.processOrder(
        items,
        req.userId!,
        shippingAddress
      );

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      if (next) {
        next(error);
        return;
      }
      this.handleError(error, res);
    }
  }

  private handleError(error: unknown, res: Response): void {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
      return;
    }

    const err = error as { statusCode?: number; code?: string; message?: string };
    const statusCode = err.statusCode || 502;
    const code = err.code || 'ORCHESTRATION_FAILED';
    const message = err.message || 'Order orchestration failed';

    res.status(statusCode).json({
      success: false,
      error: { code, message }
    });
  }
}
