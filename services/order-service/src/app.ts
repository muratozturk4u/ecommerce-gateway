import express, { Express } from 'express';
import cors from 'cors';
import { InternalAuthMiddleware } from './middleware/internal-auth.middleware';
import { healthRouter } from './routes/health.routes';
import { orderRouter } from './routes/order.routes';
import { Config } from './config';

export const createApp = (): Express => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const internalAuth = new InternalAuthMiddleware(Config.INTERNAL_KEY);
  app.use(internalAuth.middleware());
  app.use(healthRouter);
  app.use(orderRouter);

  return app;
};
