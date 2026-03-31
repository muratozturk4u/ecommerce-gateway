import { RequestLogModel, IRequestLog, IRequestLogDocument } from '../models/request-log.model';

export interface ILogRepository {
  save(log: IRequestLog): Promise<IRequestLogDocument>;
  findAll(filter: Record<string, unknown>, page: number, limit: number): Promise<IRequestLogDocument[]>;
  count(filter: Record<string, unknown>): Promise<number>;
}

export class LogRepository implements ILogRepository {
  public async save(log: IRequestLog): Promise<IRequestLogDocument> {
    const logEntry = new RequestLogModel(log);
    return logEntry.save();
  }

  public async findAll(
    filter: Record<string, unknown>,
    page: number,
    limit: number
  ): Promise<IRequestLogDocument[]> {
    return RequestLogModel
      .find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
  }

  public async count(filter: Record<string, unknown>): Promise<number> {
    return RequestLogModel.countDocuments(filter).exec();
  }
}
