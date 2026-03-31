import express, { Express, Router, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.routes';
import { metricsRouter } from './routes/metrics.routes';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';
import { MetricsMiddleware } from './middleware/metrics.middleware';
import { AuthMiddleware } from './middleware/auth.middleware';
import { AuthorizationMiddleware } from './middleware/authorization.middleware';
import { LoggingMiddleware } from './middleware/logging.middleware';
import { ErrorHandler } from './middleware/error-handler.middleware';
import { ProxyMiddleware } from './middleware/proxy.middleware';
import { ProxyService } from './services/proxy.service';
import { ServiceRegistry } from './services/service-registry';
import { LogService } from './services/log.service';
import { LogRepository } from './repositories/log.repository';
import { LogQueryService } from './services/log-query.service';
import { LogController } from './controllers/log.controller';
import { OrderOrchestrationService } from './services/order-orchestration.service';
import { OrderOrchestrationController } from './controllers/order-orchestration.controller';

export const createApp = (): Express => {
  const app = express();

  // --- Composition Root ---
  const serviceRegistry = new ServiceRegistry();
  const proxyService = new ProxyService();
  const logRepository = new LogRepository();
  const logService = new LogService(logRepository);
  const logQueryService = new LogQueryService(logRepository);

  // Middleware instances
  const rateLimiter = new RateLimitMiddleware();
  const metricsMiddleware = new MetricsMiddleware();
  const authMiddleware = new AuthMiddleware();
  const authzMiddleware = new AuthorizationMiddleware();
  const loggingMiddleware = new LoggingMiddleware(logService, serviceRegistry);
  const proxyMiddleware = new ProxyMiddleware(proxyService, serviceRegistry);
  const errorHandler = new ErrorHandler();

  // Controllers
  const logController = new LogController(logQueryService);
  const orchestrationService = new OrderOrchestrationService();
  const orderController = new OrderOrchestrationController(orchestrationService);

  // Routes
  const logRouter = Router();
  logRouter.get('/api/logs', (req: Request, res: Response, next: NextFunction) =>
    void logController.getLogs(req, res).catch(next)
  );

  const orderOrchestrationRouter = Router();
  orderOrchestrationRouter.post('/api/orders', (req: Request, res: Response, next: NextFunction) =>
    void orderController.createOrder(req, res, next)
  );

  // --- Middleware Pipeline ---

  // 1. CORS
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }));

  // 2. Body parser with size limit
  app.use(express.json({ limit: '10kb' }));

  // 3. Security: strip internal headers from client requests
  app.use((req: Request, _res: Response, next: NextFunction) => {
    delete req.headers['x-internal-key'];
    delete req.headers['x-user-id'];
    delete req.headers['x-user-role'];
    next();
  });

  // 4. Rate limiter
  app.use(rateLimiter.create());

  // 5. Metrics collection
  app.use(metricsMiddleware.collect());

  // 6. Health route (public, before auth)
  app.use(healthRouter);

  // 7. Metrics route (public, before auth)
  app.use(metricsRouter);

  // 8. Logging (before auth so 401/403 are also logged)
  app.use(loggingMiddleware.log());

  // 9. Authentication
  app.use(authMiddleware.authenticate());

  // 10. Authorization
  app.use(authzMiddleware.authorize());

  // 11. Order orchestration (POST /api/orders)
  app.use(orderOrchestrationRouter);

  // 12. Log endpoint (GET /api/logs)
  app.use(logRouter);

  // 13. Proxy (catch-all)
  app.use(proxyMiddleware.forward());

  // 14. Error handler (must be last)
  app.use(errorHandler.handle());

  return app;
};
