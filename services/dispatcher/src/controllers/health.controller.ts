import { Request, Response } from 'express';
import { IHealthController, IHealthResponse } from '../interfaces/health.interface';
import { Config } from '../config';

export class HealthController implements IHealthController {
  private readonly serviceName: string;

  constructor(serviceName: string = Config.SERVICE_NAME) {
    this.serviceName = serviceName;
  }

  public getHealth(): IHealthResponse {
    return {
      success: true,
      data: {
        service: this.serviceName,
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
