import request from 'supertest';
import express from 'express';
import { register } from 'prom-client';
import { MetricsMiddleware } from '../src/middleware/metrics.middleware';
import { metricsRouter } from '../src/routes/metrics.routes';

describe('Prometheus Metrics', () => {
  let app: express.Express;

  beforeEach(() => {
    register.clear();
    app = express();
    app.use(express.json());

    const metricsMiddleware = new MetricsMiddleware();
    app.use(metricsMiddleware.collect());
    app.use(metricsRouter);

    app.get('/test', (_req, res) => {
      res.json({ success: true });
    });
  });

  describe('GET /api/metrics', () => {
    it('should return 200 status code', async () => {
      const response = await request(app).get('/api/metrics');
      expect(response.status).toBe(200);
    });

    it('should return text/plain content type', async () => {
      const response = await request(app).get('/api/metrics');
      expect(response.headers['content-type']).toContain('text/plain');
    });

    it('should contain http_requests_total metric', async () => {
      await request(app).get('/test');
      const response = await request(app).get('/api/metrics');
      expect(response.text).toContain('http_requests_total');
    });

    it('should contain http_request_duration_seconds metric', async () => {
      await request(app).get('/test');
      const response = await request(app).get('/api/metrics');
      expect(response.text).toContain('http_request_duration_seconds');
    });

    it('should contain http_errors_total metric', async () => {
      const response = await request(app).get('/api/metrics');
      expect(response.text).toContain('http_errors_total');
    });
  });

  describe('Metric collection', () => {
    it('should increment request counter on each request', async () => {
      await request(app).get('/test');
      await request(app).get('/test');

      const response = await request(app).get('/api/metrics');
      expect(response.text).toContain('http_requests_total');
    });

    it('should track request duration', async () => {
      await request(app).get('/test');

      const response = await request(app).get('/api/metrics');
      expect(response.text).toContain('http_request_duration_seconds');
    });
  });
});
