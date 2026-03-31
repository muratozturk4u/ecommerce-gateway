import winston from 'winston';
import { IRequestLog } from '../models/request-log.model';
import { ILogRepository } from '../repositories/log.repository';
import { Config } from '../config';

export interface ILogService {
  saveLog(logData: IRequestLog): void;
}

export class LogService implements ILogService {
  private readonly logger: winston.Logger;
  private readonly logRepository: ILogRepository | null;

  constructor(logRepository?: ILogRepository) {
    this.logRepository = logRepository || null;
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

  public saveLog(logData: IRequestLog): void {
    this.logger.info('Request logged', {
      method: logData.method,
      path: logData.path,
      statusCode: logData.statusCode,
      responseTime: logData.responseTime,
      userId: logData.userId,
      targetService: logData.targetService
    });

    if (this.logRepository) {
      this.logRepository.save(logData).catch((err: unknown) => {
        this.logger.error('Failed to persist log', {
          error: err instanceof Error ? err.message : String(err)
        });
      });
    }
  }
}
