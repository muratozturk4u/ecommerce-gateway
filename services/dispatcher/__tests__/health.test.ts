import request from 'supertest';
import { createApp } from '../src/app';

describe('Health Check Endpoint', () => {
  const app = createApp();

  describe('GET /health', () => {
    it('should return 200 status code', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
    });

    it('should return success true', async () => {
      const response = await request(app).get('/health');
      expect(response.body.success).toBe(true);
    });

    it('should return service name as dispatcher', async () => {
      const response = await request(app).get('/health');
      expect(response.body.data.service).toBe('dispatcher');
    });

    it('should return status ok', async () => {
      const response = await request(app).get('/health');
      expect(response.body.data.status).toBe('ok');
    });

    it('should return a valid ISO timestamp', async () => {
      const response = await request(app).get('/health');
      const timestamp = response.body.data.timestamp;
      expect(timestamp).toBeDefined();
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    it('should return correct response structure', async () => {
      const response = await request(app).get('/health');
      expect(response.body).toEqual({
        success: true,
        data: {
          service: 'dispatcher',
          status: 'ok',
          timestamp: expect.any(String)
        }
      });
    });
  });
});
