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

  describe('/api prefix stripping', () => {
    it('should strip /api prefix from forwarded URL', async () => {
      mockedAxios.request.mockResolvedValue({
        status: 200,
        data: { success: true },
        headers: {}
      });

      await request(app).get('/api/products');

      expect(mockedAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('/products')
        })
      );
      const callUrl = (mockedAxios.request.mock.calls[0][0] as Record<string, unknown>).url as string;
      expect(callUrl).not.toContain('/api/products');
    });

    it('should strip /api prefix from nested paths', async () => {
      mockedAxios.request.mockResolvedValue({
        status: 200,
        data: { success: true },
        headers: {}
      });

      await request(app).get('/api/auth/profile');

      const callUrl = (mockedAxios.request.mock.calls[0][0] as Record<string, unknown>).url as string;
      expect(callUrl).toContain('/auth/profile');
      expect(callUrl).not.toMatch(/\/api\//);
    });
  });

  describe('X-User-Id and X-User-Role headers', () => {
    it('should inject x-user-id and x-user-role headers from req context', async () => {
      const authApp = express();
      authApp.use(express.json());
      authApp.use((req, _res, next) => {
        req.userId = 'user-789';
        req.role = 'customer';
        next();
      });
      const proxyMiddleware = new ProxyMiddleware();
      authApp.use(proxyMiddleware.forward());

      mockedAxios.request.mockResolvedValue({
        status: 200,
        data: { success: true },
        headers: {}
      });

      await request(authApp).get('/api/products');

      expect(mockedAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-user-id': 'user-789',
            'x-user-role': 'customer'
          })
        })
      );
    });

    it('should not include x-user-id header when userId is not set', async () => {
      mockedAxios.request.mockResolvedValue({
        status: 200,
        data: { success: true },
        headers: {}
      });

      await request(app).get('/api/products');

      const callHeaders = (mockedAxios.request.mock.calls[0][0] as Record<string, unknown>).headers as Record<string, string>;
      expect(callHeaders['x-user-id']).toBeUndefined();
      expect(callHeaders['x-user-role']).toBeUndefined();
    });
  });

  describe('Query parameter preservation', () => {
    it('should preserve query params after prefix strip', async () => {
      mockedAxios.request.mockResolvedValue({
        status: 200,
        data: { success: true },
        headers: {}
      });

      await request(app).get('/api/products?page=1&limit=10');

      const callUrl = (mockedAxios.request.mock.calls[0][0] as Record<string, unknown>).url as string;
      expect(callUrl).toContain('page=1');
      expect(callUrl).toContain('limit=10');
      expect(callUrl).not.toMatch(/^.*\/api\//);
    });

    it('should preserve query params on nested paths', async () => {
      mockedAxios.request.mockResolvedValue({
        status: 200,
        data: { success: true },
        headers: {}
      });

      await request(app).get('/api/auth/profile?fields=name,email');

      const callUrl = (mockedAxios.request.mock.calls[0][0] as Record<string, unknown>).url as string;
      expect(callUrl).toContain('/auth/profile');
      expect(callUrl).toContain('fields=name,email');
    });
  });

  describe('Client header security', () => {
    it('should not pass through client-sent x-internal-key', async () => {
      mockedAxios.request.mockResolvedValue({
        status: 200,
        data: { success: true },
        headers: {}
      });

      await request(app)
        .get('/api/products')
        .set('x-internal-key', 'malicious-key');

      const callHeaders = (mockedAxios.request.mock.calls[0][0] as Record<string, unknown>).headers as Record<string, string>;
      expect(callHeaders['x-internal-key']).not.toBe('malicious-key');
    });

    it('should not pass through client-sent x-user-id', async () => {
      mockedAxios.request.mockResolvedValue({
        status: 200,
        data: { success: true },
        headers: {}
      });

      await request(app)
        .get('/api/products')
        .set('x-user-id', 'spoofed-user');

      const callHeaders = (mockedAxios.request.mock.calls[0][0] as Record<string, unknown>).headers as Record<string, string>;
      expect(callHeaders['x-user-id']).not.toBe('spoofed-user');
    });

    it('should not pass through client-sent x-user-role', async () => {
      mockedAxios.request.mockResolvedValue({
        status: 200,
        data: { success: true },
        headers: {}
      });

      await request(app)
        .get('/api/products')
        .set('x-user-role', 'admin');

      const callHeaders = (mockedAxios.request.mock.calls[0][0] as Record<string, unknown>).headers as Record<string, string>;
      expect(callHeaders['x-user-role']).not.toBe('admin');
    });
  });
});
