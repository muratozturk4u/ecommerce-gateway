import request from 'supertest';
import express from 'express';
import axios from 'axios';
import { ProxyMiddleware } from '../src/middleware/proxy.middleware';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Proxy Middleware', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());

    const proxyMiddleware = new ProxyMiddleware();
    app.use(proxyMiddleware.forward());
  });

  describe('GET request forwarding', () => {
    it('should forward GET /api/auth/profile to auth-service', async () => {
      mockedAxios.request.mockResolvedValue({
        status: 200,
        data: { success: true, data: { id: '1', email: 'test@test.com' } },
        headers: { 'content-type': 'application/json' }
      });

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockedAxios.request).toHaveBeenCalledTimes(1);
    });

    it('should forward GET /api/products to product-service', async () => {
      mockedAxios.request.mockResolvedValue({
        status: 200,
        data: { success: true, data: [] },
        headers: { 'content-type': 'application/json' }
      });

      const response = await request(app).get('/api/products');

      expect(response.status).toBe(200);
      expect(mockedAxios.request).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST request forwarding', () => {
    it('should forward POST /api/auth/login with body', async () => {
      const loginBody = { email: 'test@test.com', password: '123456' };
      mockedAxios.request.mockResolvedValue({
        status: 200,
        data: { success: true, data: { token: 'jwt-token' } },
        headers: { 'content-type': 'application/json' }
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginBody);

      expect(response.status).toBe(200);
      expect(mockedAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          data: loginBody
        })
      );
    });
  });

  describe('X-Internal-Key header', () => {
    it('should add X-Internal-Key header to forwarded requests', async () => {
      mockedAxios.request.mockResolvedValue({
        status: 200,
        data: { success: true },
        headers: {}
      });

      await request(app).get('/api/orders');

      expect(mockedAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-internal-key': expect.any(String)
          })
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should return 502 when target service is unreachable', async () => {
      mockedAxios.request.mockRejectedValue({
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED'
      });

      const response = await request(app).get('/api/auth/profile');

      expect(response.status).toBe(502);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_GATEWAY');
    });

    it('should return 404 for unknown service routes', async () => {
      const response = await request(app).get('/api/unknown/path');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should forward error status codes from target service', async () => {
      mockedAxios.request.mockRejectedValue({
        response: {
          status: 400,
          data: { success: false, error: { message: 'Bad request' } },
          headers: {}
        }
      });

      const response = await request(app).get('/api/auth/profile');

      expect(response.status).toBe(400);
    });
  });
});
