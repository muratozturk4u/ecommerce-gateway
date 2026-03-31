import { Router, Request, Response } from 'express';
import { register } from 'prom-client';

const router = Router();

router.get('/api/metrics', async (_req: Request, res: Response) => {
  try {
    const metrics = await register.metrics();
    res.set('Content-Type', register.contentType);
    res.end(metrics);
  } catch {
    res.status(500).json({
      success: false,
      error: { code: 'METRICS_ERROR', message: 'Failed to collect metrics' }
    });
  }
});

export { router as metricsRouter };
