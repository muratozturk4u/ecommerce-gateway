import { Request, Response } from 'express';
import { ILogQueryService, ILogQuery, LogQueryService } from '../services/log-query.service';
import { ILogRepository, LogRepository } from '../repositories/log.repository';

export interface ILogController {
  getLogs(req: Request, res: Response): Promise<void>;
}

export class LogController implements ILogController {
  private static readonly DEFAULT_PAGE = 1;
  private static readonly DEFAULT_LIMIT = 20;

  private readonly logQueryService: ILogQueryService;

  constructor(logRepositoryOrService?: ILogRepository | ILogQueryService) {
    if (logRepositoryOrService && 'queryLogs' in logRepositoryOrService) {
      this.logQueryService = logRepositoryOrService;
    } else {
      const repository = (logRepositoryOrService as ILogRepository) || new LogRepository();
      this.logQueryService = new LogQueryService(repository);
    }
  }

  public async getLogs(req: Request, res: Response): Promise<void> {
    if (req.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required'
        }
      });
      return;
    }

    const query = this.parseQuery(req);
    const result = await this.logQueryService.queryLogs(query);

    res.status(200).json({
      success: true,
      data: {
        logs: result.logs,
        pagination: result.pagination
      },
      meta: result.pagination
    });
  }

  private parseQuery(req: Request): ILogQuery {
    return {
      page: parseInt(req.query.page as string) || LogController.DEFAULT_PAGE,
      limit: parseInt(req.query.limit as string) || LogController.DEFAULT_LIMIT,
      targetService: req.query.targetService as string | undefined,
      statusCode: req.query.statusCode ? parseInt(req.query.statusCode as string) : undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined
    };
  }
}
