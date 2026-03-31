import express, { Express, Router } from 'express';
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
import { LogController } from './controllers/log.controller';
import { OrderOrchestrationController } from './controllers/order-orchestration.controller';
import { OrderOrchestrationService } from './services/order-orchestration.service';

export const createApp = (): Express => {
  const app = express();

  // Core middleware
  const rateLimiter = new RateLimitMiddleware();
  const metricsMiddleware = new MetricsMiddleware();
  const authMiddleware = new AuthMiddleware();
  const authzMiddleware = new AuthorizationMiddleware();
  const loggingMiddleware = new LoggingMiddleware();
  const proxyMiddleware = new ProxyMiddleware();
  const errorHandler = new ErrorHandler();

  // Controllers
  const logController = new LogController();
  const orchestrationService = new OrderOrchestrationService();
  const orderController = new OrderOrchestrationController(orchestrationService);

  // Routes
  const logRouter = Router();
  logRouter.get('/api/logs', (req, res) => void logController.getLogs(req, res));

  const orderOrchestrationRouter = Router();
  orderOrchestrationRouter.post('/api/orders/orchestrated', (req, res) =>
    void orderController.createOrder(req, res)
  );

  // Middleware pipeline (order matters!)
  app.use(cors());
  app.use(express.json());
  app.use(rateLimiter.create());
  app.use(metricsMiddleware.collect());
  app.use(healthRouter);
  app.use(metricsRouter);
  app.use(authMiddleware.authenticate());
  app.use(authzMiddleware.authorize());
  app.use(loggingMiddleware.log());
  app.use(logRouter);
  app.use(orderOrchestrationRouter);
  app.use(proxyMiddleware.forward());
  app.use(errorHandler.handle());

  return app;
};
