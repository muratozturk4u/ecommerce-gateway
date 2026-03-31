import { Request, Response, NextFunction } from 'express';
import { LogService } from '../services/log.service';
import { IRequestLog } from '../models/request-log.model';

export interface ILoggingMiddleware {
  log(): (req: Request, res: Response, next: NextFunction) => void;
}

export class LoggingMiddleware implements ILoggingMiddleware {
  private readonly logService: LogService;

  constructor(logService?: LogService) {
    this.logService = logService || new LogService();
  }

  public log(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      const startTime = Date.now();

      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        const logData: IRequestLog = {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          responseTime,
          userId: req.userId,
          timestamp: new Date()
        };

        void this.logService.saveLog(logData);
      });

      next();
    };
  }
}
