import express, { Express } from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.routes';

export const createApp = (): Express => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(healthRouter);

  return app;
};
