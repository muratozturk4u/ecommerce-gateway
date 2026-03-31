import { Request, Response } from 'express';
import { OrderOrchestrationService } from '../services/order-orchestration.service';
import { IOrderItem } from '../interfaces/order-orchestration.interface';

export interface IOrderOrchestrationController {
  createOrder(req: Request, res: Response): Promise<void>;
}

export class OrderOrchestrationController implements IOrderOrchestrationController {
  private readonly orchestrationService: OrderOrchestrationService;

  constructor(orchestrationService?: OrderOrchestrationService) {
    this.orchestrationService = orchestrationService || new OrderOrchestrationService();
  }

  public async createOrder(req: Request, res: Response): Promise<void> {
    const items: IOrderItem[] = req.body.items;

    if (!items || items.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Items array is required and cannot be empty'
        }
      });
      return;
    }

    try {
      const result = await this.orchestrationService.processOrder(items, req.userId!);
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error: unknown) {
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
}
