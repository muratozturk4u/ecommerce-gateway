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
    this.httpRequestsTotal = this.createRequestCounter();
    this.httpRequestDuration = this.createDurationHistogram();
    this.httpRequestsByService = this.createServiceCounter();
    this.httpErrorsTotal = this.createErrorCounter();
    this.activeConnections = this.createConnectionGauge();
  }

  public collect(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      const startTime = Date.now();
      this.activeConnections.inc();

      res.on('finish', () => {
        this.recordMetrics(req, res, startTime);
        this.activeConnections.dec();
      });

      next();
    };
  }

  public getRegister(): typeof register {
    return register;
  }

  private recordMetrics(req: Request, res: Response, startTime: number): void {
    const duration = (Date.now() - startTime) / 1000;
    const path = req.route?.path || req.path;

    this.httpRequestsTotal.inc({
      method: req.method,
      path,
      status_code: res.statusCode.toString()
    });

    this.httpRequestDuration.observe({ method: req.method, path }, duration);

    this.httpRequestsByService.inc({
      service: req.path.split('/')[2] || 'unknown',
      method: req.method
    });

    if (res.statusCode >= 400) {
      this.httpErrorsTotal.inc({
        method: req.method,
        path,
        status_code: res.statusCode.toString()
      });
    }
  }

  private createRequestCounter(): Counter {
    return new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status_code']
    });
  }

  private createDurationHistogram(): Histogram {
    return new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    });
  }

  private createServiceCounter(): Counter {
    return new Counter({
      name: 'http_requests_by_service',
      help: 'HTTP requests grouped by target service',
      labelNames: ['service', 'method']
    });
  }

  private createErrorCounter(): Counter {
    return new Counter({
      name: 'http_errors_total',
      help: 'Total number of HTTP errors',
      labelNames: ['method', 'path', 'status_code']
    });
  }

  private createConnectionGauge(): Gauge {
    return new Gauge({
      name: 'active_connections',
      help: 'Number of active connections'
    });
  }
}
