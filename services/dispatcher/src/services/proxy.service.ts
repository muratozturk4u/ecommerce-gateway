import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { Request, Response } from 'express';
import { IProxyService } from '../interfaces/proxy-service.interface';
import { IServiceConfig } from '../interfaces/service-config.interface';
import { Config } from '../config';

export class ProxyService implements IProxyService {
  private readonly internalKey: string;

  constructor(internalKey: string = Config.INTERNAL_KEY) {
    this.internalKey = internalKey;
  }

  public async forward(req: Request, res: Response, service: IServiceConfig): Promise<void> {
    try {
      const config = this.buildRequestConfig(req, service);
      const response = await axios.request(config);
      res.status(response.status).json(response.data);
    } catch (error: unknown) {
      this.handleProxyError(error, res);
    }
  }

  private buildRequestConfig(req: Request, service: IServiceConfig): AxiosRequestConfig {
    const headers: Record<string, string> = {
      'x-internal-key': this.internalKey,
      'content-type': req.headers['content-type'] || 'application/json'
    };

    if (req.headers.authorization) {
      headers['authorization'] = req.headers.authorization;
    }

    return {
      method: req.method as string,
      url: `${service.url}${req.originalUrl}`,
      data: req.body,
      headers,
      timeout: 30000
    };
  }

  private handleProxyError(error: unknown, res: Response): void {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      res.status(axiosError.response.status).json(axiosError.response.data);
    } else {
      res.status(502).json({
        success: false,
        error: {
          code: 'BAD_GATEWAY',
          message: 'Target service is unreachable'
        }
      });
    }
  }
}
