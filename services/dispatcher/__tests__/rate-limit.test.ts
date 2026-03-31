import request from 'supertest';
import express from 'express';
import { RateLimitMiddleware } from '../src/middleware/rate-limit.middleware';

describe('Rate Limiting Middleware', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    const rateLimiter = new RateLimitMiddleware({
      windowMs: 60000,
      maxRequests: 5
    });
    app.use(rateLimiter.create());

    app.get('/test', (_req, res) => {
      res.json({ success: true, data: { message: 'ok' } });
    });
  });

  describe('Within rate limit', () => {
    it('should allow requests within the limit', async () => {
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should include rate limit headers', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['ratelimit-limit']).toBeDefined();
    });
  });

  describe('Exceeding rate limit', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app).get('/test');
      }

      const response = await request(app).get('/test');
      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should include Retry-After header when rate limited', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app).get('/test');
      }

      const response = await request(app).get('/test');
      expect(response.headers['retry-after']).toBeDefined();
    });

    it('should return correct error message', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app).get('/test');
      }

      const response = await request(app).get('/test');
      expect(response.body.error.message).toContain('Too many requests');
    });
  });
});
