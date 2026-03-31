import axios, { AxiosError } from 'axios';
import { Request } from 'express';
import { IProxyResponse, IProxyService } from '../interfaces/proxy-service.interface';
import { IServiceConfig } from '../interfaces/service-config.interface';
import { Config } from '../config';
import { Response } from 'express';

export class ProxyService implements IProxyService {
  public async forward(req: Request, res: Response, service: IServiceConfig): Promise<void> {
    try {
      const targetUrl = `${service.url}${req.originalUrl}`;
      const headers: Record<string, string> = {
        'x-internal-key': Config.INTERNAL_KEY,
        'content-type': req.headers['content-type'] || 'application/json'
      };

      if (req.headers.authorization) {
        headers['authorization'] = req.headers.authorization;
      }

      const response: IProxyResponse = await axios.request({
        method: req.method as string,
        url: targetUrl,
        data: req.body,
        headers,
        timeout: 30000
      });

      res.status(response.status).json(response.data);
    } catch (error: unknown) {
      this.handleProxyError(error, res);
    }
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
