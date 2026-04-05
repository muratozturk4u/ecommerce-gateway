import { Request, Response, NextFunction } from 'express';
import { ILogService, LogService } from '../services/log.service';
import { IRequestLog } from '../models/request-log.model';
import { IServiceRegistry } from '../interfaces/service-config.interface';
import { ServiceRegistry } from '../services/service-registry';

const SENSITIVE_FIELDS: string[] = [
  'password',
  'newPassword',
  'currentPassword',
  'token',
  'secret',
  'creditCard',
  'cardNumber',
  'cvv'
];

export interface ILoggingMiddleware {
  log(): (req: Request, res: Response, next: NextFunction) => void;
}

export class LoggingMiddleware implements ILoggingMiddleware {
  private readonly logService: ILogService;
  private readonly serviceRegistry: IServiceRegistry;

  constructor(logService?: ILogService, serviceRegistry?: IServiceRegistry) {
    this.logService = logService || new LogService();
    this.serviceRegistry = serviceRegistry || new ServiceRegistry();
  }

  public log(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      const startTime = Date.now();

      const originalJson = res.json.bind(res);
      let responseBody: Record<string, unknown> | undefined;
      res.json = (body: unknown): Response => {
        responseBody = body as Record<string, unknown>;
        return originalJson(body);
      };

      res.on('finish', () => {
        const logData = this.buildLogData(req, res, startTime, responseBody);
        this.logService.saveLog(logData);
      });

      next();
    };
  }

  private buildLogData(
    req: Request,
    res: Response,
    startTime: number,
    responseBody?: Record<string, unknown>
  ): IRequestLog {
    const service = this.serviceRegistry.resolve(req.path);
    const logData: IRequestLog = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: Date.now() - startTime,
      userId: req.userId,
      targetService: service?.name,
      timestamp: new Date(),
      ip: req.ip
    };

    if (req.body && Object.keys(req.body as Record<string, unknown>).length > 0) {
      logData.requestBody = this.filterSensitiveData(
        req.body as Record<string, unknown>
      );
    }

    if (res.statusCode >= 400 && responseBody) {
      const errorInfo = responseBody.error;
      if (typeof errorInfo === 'string') {
        logData.error = errorInfo;
      } else if (errorInfo && typeof errorInfo === 'object') {
        const errorObj = errorInfo as Record<string, unknown>;
        logData.error = (errorObj.message as string) || JSON.stringify(errorInfo);
      }
    }

    return logData;
  }

  private filterSensitiveData(
    data: Record<string, unknown>
  ): Record<string, unknown> {
    const filtered: Record<string, unknown> = {};
    for (const key of Object.keys(data)) {
      if (SENSITIVE_FIELDS.includes(key)) {
        filtered[key] = '[REDACTED]';
      } else if (
        data[key] !== null &&
        typeof data[key] === 'object' &&
        !Array.isArray(data[key])
      ) {
        filtered[key] = this.filterSensitiveData(
          data[key] as Record<string, unknown>
        );
      } else {
        filtered[key] = data[key];
      }
    }
    return filtered;
  }
}
