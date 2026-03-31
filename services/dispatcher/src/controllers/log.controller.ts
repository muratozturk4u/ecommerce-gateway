import { Request, Response } from 'express';
import { LogRepository } from '../repositories/log.repository';

export interface ILogController {
  getLogs(req: Request, res: Response): Promise<void>;
}

export class LogController implements ILogController {
  private readonly logRepository: LogRepository;

  constructor(logRepository?: LogRepository) {
    this.logRepository = logRepository || new LogRepository();
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

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const filter = this.buildFilter(req);

    const [logs, total] = await Promise.all([
      this.logRepository.findAll(filter, page, limit),
      this.logRepository.count(filter)
    ]);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  }

  private buildFilter(req: Request): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    if (req.query.targetService) {
      filter.targetService = req.query.targetService;
    }

    if (req.query.statusCode) {
      filter.statusCode = parseInt(req.query.statusCode as string);
    }

    if (req.query.startDate && req.query.endDate) {
      filter.timestamp = {
        $gte: new Date(req.query.startDate as string),
        $lte: new Date(req.query.endDate as string)
      };
    }

    return filter;
  }
}
