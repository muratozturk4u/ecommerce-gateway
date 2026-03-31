import { Request, Response, NextFunction } from 'express';
import { Counter, Histogram, Gauge, register } from 'prom-client';

export interface IMetricsMiddleware {
  collect(): (req: Request, res: Response, next: NextFunction) => void;
}

export class MetricsMiddleware implements IMetricsMiddleware {
  private readonly httpRequestsTotal: Counter;
  private readonly httpRequestDuration: Histogram;
  private readonly httpRequestsByService: Counter;
  private readonly httpErrorsTotal: Counter;
  private readonly activeConnections: Gauge;

  constructor() {
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status_code']
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    });

    this.httpRequestsByService = new Counter({
      name: 'http_requests_by_service',
      help: 'HTTP requests grouped by target service',
      labelNames: ['service', 'method']
    });

    this.httpErrorsTotal = new Counter({
      name: 'http_errors_total',
      help: 'Total number of HTTP errors',
      labelNames: ['method', 'path', 'status_code']
    });

    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections'
    });
  }

  public collect(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      const startTime = Date.now();
      this.activeConnections.inc();

      res.on('finish', () => {
        const duration = (Date.now() - startTime) / 1000;
        const labels = {
          method: req.method,
          path: req.route?.path || req.path
        };

        this.httpRequestsTotal.inc({
          ...labels,
          status_code: res.statusCode.toString()
        });

        this.httpRequestDuration.observe(labels, duration);

        this.httpRequestsByService.inc({
          service: req.path.split('/')[2] || 'unknown',
          method: req.method
        });

        if (res.statusCode >= 400) {
          this.httpErrorsTotal.inc({
            ...labels,
            status_code: res.statusCode.toString()
          });
        }

        this.activeConnections.dec();
      });

      next();
    };
  }

  public getRegister(): typeof register {
    return register;
  }
}
