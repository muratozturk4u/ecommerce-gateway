import { Request, Response } from 'express';
import { LogRepository } from '../repositories/log.repository';

interface ILogQuery {
  page: number;
  limit: number;
  targetService?: string;
  statusCode?: number;
  startDate?: string;
  endDate?: string;
}

export interface ILogController {
  getLogs(req: Request, res: Response): Promise<void>;
}

export class LogController implements ILogController {
  private static readonly DEFAULT_PAGE = 1;
  private static readonly DEFAULT_LIMIT = 20;

  private readonly logRepository: LogRepository;

  constructor(logRepository?: LogRepository) {
    this.logRepository = logRepository || new LogRepository();
  }

  public async getLogs(req: Request, res: Response): Promise<void> {
    if (!this.isAdmin(req)) {
      this.sendForbidden(res);
      return;
    }

    const query = this.parseQuery(req);
    const filter = this.buildFilter(query);

    const [logs, total] = await Promise.all([
      this.logRepository.findAll(filter, query.page, query.limit),
      this.logRepository.count(filter)
    ]);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil(total / query.limit)
        }
      }
    });
  }

  private isAdmin(req: Request): boolean {
    return req.role === 'admin';
  }

  private sendForbidden(res: Response): void {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required'
      }
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

  private buildFilter(query: ILogQuery): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    if (query.targetService) {
      filter.targetService = query.targetService;
    }

    if (query.statusCode) {
      filter.statusCode = query.statusCode;
    }

    if (query.startDate && query.endDate) {
      filter.timestamp = {
        $gte: new Date(query.startDate),
        $lte: new Date(query.endDate)
      };
    }

    return filter;
  }
}
