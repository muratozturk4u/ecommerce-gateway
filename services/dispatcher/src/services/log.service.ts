import winston from 'winston';
import { IRequestLog } from '../models/request-log.model';
import { Config } from '../config';

export interface ILogService {
  saveLog(logData: IRequestLog): Promise<void>;
}

export class LogService implements ILogService {
  private readonly logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: Config.LOG_LEVEL,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          silent: Config.NODE_ENV === 'test'
        })
      ]
    });
  }

  public async saveLog(logData: IRequestLog): Promise<void> {
    this.logger.info('Request logged', {
      method: logData.method,
      path: logData.path,
      statusCode: logData.statusCode,
      responseTime: logData.responseTime,
      userId: logData.userId,
      targetService: logData.targetService
    });
  }
}
