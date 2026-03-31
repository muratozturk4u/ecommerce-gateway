import { Request, Response, NextFunction } from 'express';
import { LogService } from '../services/log.service';
import { IRequestLog } from '../models/request-log.model';
import { ServiceRegistry } from '../services/service-registry';

export interface ILoggingMiddleware {
  log(): (req: Request, res: Response, next: NextFunction) => void;
}

export class LoggingMiddleware implements ILoggingMiddleware {
  private readonly logService: LogService;
  private readonly serviceRegistry: ServiceRegistry;

  constructor(logService?: LogService, serviceRegistry?: ServiceRegistry) {
    this.logService = logService || new LogService();
    this.serviceRegistry = serviceRegistry || new ServiceRegistry();
  }

  public log(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      const startTime = Date.now();

      res.on('finish', () => {
        const logData = this.buildLogData(req, res, startTime);
        void this.logService.saveLog(logData);
      });

      next();
    };
  }

  private buildLogData(req: Request, res: Response, startTime: number): IRequestLog {
    const service = this.serviceRegistry.resolve(req.path);
    return {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: Date.now() - startTime,
      userId: req.userId,
      targetService: service?.name,
      timestamp: new Date()
    };
  }
}
