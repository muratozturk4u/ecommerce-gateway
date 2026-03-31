import { Request, Response } from 'express';
import { IHealthController, IHealthResponse } from '../interfaces/health.interface';
import { Config } from '../config';

export class HealthController implements IHealthController {
  public getHealth(): IHealthResponse {
    return {
      success: true,
      data: {
        service: Config.SERVICE_NAME,
        status: 'ok',
        timestamp: new Date().toISOString()
      }
    };
  }

  public handle(_req: Request, res: Response): void {
    const health = this.getHealth();
    res.status(200).json(health);
  }
}
