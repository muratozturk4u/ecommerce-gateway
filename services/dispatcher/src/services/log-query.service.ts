import { ILogRepository } from '../repositories/log.repository';
import { IRequestLogDocument } from '../models/request-log.model';

export interface ILogQuery {
  page: number;
  limit: number;
  targetService?: string;
  statusCode?: number;
  startDate?: string;
  endDate?: string;
}

export interface IPaginatedLogs {
  logs: IRequestLogDocument[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ILogQueryService {
  queryLogs(query: ILogQuery): Promise<IPaginatedLogs>;
}

export class LogQueryService implements ILogQueryService {
  private readonly logRepository: ILogRepository;

  constructor(logRepository: ILogRepository) {
    this.logRepository = logRepository;
  }

  public async queryLogs(query: ILogQuery): Promise<IPaginatedLogs> {
    const filter = this.buildFilter(query);
    const [logs, total] = await Promise.all([
      this.logRepository.findAll(filter, query.page, query.limit),
      this.logRepository.count(filter)
    ]);
    return {
      logs,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1
      }
    };
  }

  private buildFilter(query: ILogQuery): Record<string, unknown> {
    const filter: Record<string, unknown> = {};
    if (query.targetService) filter.targetService = query.targetService;
    if (query.statusCode) filter.statusCode = query.statusCode;
    if (query.startDate || query.endDate) {
      const timestamp: Record<string, Date> = {};
      if (query.startDate) timestamp.$gte = new Date(query.startDate);
      if (query.endDate) timestamp.$lte = new Date(query.endDate);
      filter.timestamp = timestamp;
    }
    return filter;
  }
}
