import { Request, Response, NextFunction } from 'express';
import { ProxyService } from '../services/proxy.service';
import { ServiceRegistry } from '../services/service-registry';

export class ProxyMiddleware {
  private readonly proxyService: ProxyService;
  private readonly serviceRegistry: ServiceRegistry;

  constructor(proxyService?: ProxyService, serviceRegistry?: ServiceRegistry) {
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
