import express, { Express } from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.routes';
import { ProxyMiddleware } from './middleware/proxy.middleware';

export const createApp = (): Express => {
  const app = express();
  const proxyMiddleware = new ProxyMiddleware();

  app.use(cors());
  app.use(express.json());
  app.use(healthRouter);
  app.use(proxyMiddleware.forward());

  return app;
};
