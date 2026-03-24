import { Router, Request, Response } from 'express';
import { Config } from '../config';

const router = Router();

router.get('/health', (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    data: {
      service: Config.SERVICE_NAME,
      status: 'ok',
      timestamp: new Date().toISOString()
    }
  });
});

export { router as healthRouter };
