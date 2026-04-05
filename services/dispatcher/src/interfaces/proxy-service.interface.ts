import { Request, Response } from 'express';
import { IServiceConfig } from './service-config.interface';

export interface IProxyResponse {
  status: number;
  data: unknown;
  headers: Record<string, string>;
}

export interface IProxyService {
  forward(req: Request, res: Response, service: IServiceConfig): Promise<void>;
}
