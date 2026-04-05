import { Request, Response, NextFunction } from 'express';
import { IProxyService } from '../interfaces/proxy-service.interface';
import { IServiceRegistry } from '../interfaces/service-config.interface';
import { ProxyService } from '../services/proxy.service';
import { ServiceRegistry } from '../services/service-registry';

export interface IProxyMiddleware {
  forward(): (req: Request, res: Response, next: NextFunction) => void;
}

export class ProxyMiddleware implements IProxyMiddleware {
  private readonly proxyService: IProxyService;
  private readonly serviceRegistry: IServiceRegistry;

  constructor(proxyService?: IProxyService, serviceRegistry?: IServiceRegistry) {
    this.proxyService = proxyService || new ProxyService();
    this.serviceRegistry = serviceRegistry || new ServiceRegistry();
  }

  public forward(): (req: Request, res: Response, _next: NextFunction) => void {
    return (req: Request, res: Response, _next: NextFunction): void => {
      const service = this.serviceRegistry.resolve(req.path);

      if (!service) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `No service found for path: ${req.path}`
          }
        });
        return;
      }

      void this.proxyService.forward(req, res, service);
    };
  }
}
