import request from 'supertest';
import express from 'express';
import { AuthorizationMiddleware } from '../src/middleware/authorization.middleware';
import { IRouteAccessRule } from '../src/models/route-access-rule.model';

describe('Authorization Middleware', () => {
  const mockRules: IRouteAccessRule[] = [
    { path: '/api/auth/login', method: 'POST', authLevel: 'public' },
    { path: '/api/auth/register', method: 'POST', authLevel: 'public' },
    { path: '/api/products', method: 'GET', authLevel: 'protected' },
    { path: '/api/products/:id', method: 'GET', authLevel: 'protected' },
    { path: '/api/products', method: 'POST', authLevel: 'admin' },
    { path: '/api/orders', method: 'GET', authLevel: 'protected' },
    { path: '/api/orders/:id/status', method: 'PATCH', authLevel: 'protected' },
    { path: '/api/logs', method: 'GET', authLevel: 'admin' },
  ];

  const createTestApp = (user?: { userId: string; role: string }): express.Express => {
    const app = express();
    app.use(express.json());
    if (user) {
      app.use((req, _res, next) => {
        req.userId = user.userId;
        req.role = user.role;
        next();
      });
    }
    app.use(new AuthorizationMiddleware(mockRules).authorize());
    app.all('*', (_req, res) => res.json({ success: true }));
    return app;
  };

  describe('Public routes', () => {
    it('should allow POST /api/auth/login without auth', async () => {
      const app = createTestApp();

      const response = await request(app).post('/api/auth/login');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should allow POST /api/auth/register without auth', async () => {
      const app = createTestApp();

      const response = await request(app).post('/api/auth/register');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Protected routes', () => {
    it('should allow authenticated customer to access protected routes', async () => {
      const app = createTestApp({ userId: 'user-123', role: 'customer' });

      const response = await request(app).get('/api/products');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should allow authenticated admin to access protected routes', async () => {
      const app = createTestApp({ userId: 'admin-1', role: 'admin' });

      const response = await request(app).get('/api/orders');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 401 when unauthenticated user accesses protected route', async () => {
      const app = createTestApp();

      const response = await request(app).get('/api/products');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toBe('Authentication required');
    });
  });

  describe('Admin routes', () => {
    it('should allow admin access to admin routes', async () => {
      const app = createTestApp({ userId: 'admin-1', role: 'admin' });

      const response = await request(app).get('/api/logs');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 403 when non-admin accesses admin route', async () => {
      const app = createTestApp({ userId: 'user-123', role: 'customer' });

      const response = await request(app).get('/api/logs');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 403 with standard error format', async () => {
      const app = createTestApp({ userId: 'user-123', role: 'customer' });

      const response = await request(app).post('/api/products');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      });
    });
  });

  describe('Route pattern matching', () => {
    it('should match /api/products/123 to /api/products/:id', async () => {
      const app = createTestApp({ userId: 'user-123', role: 'customer' });

      const response = await request(app).get('/api/products/123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should match /api/orders/abc/status to /api/orders/:id/status', async () => {
      const app = createTestApp({ userId: 'user-123', role: 'customer' });

      const response = await request(app).patch('/api/orders/abc/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Default deny', () => {
    it('should return 403 for unknown routes', async () => {
      const app = createTestApp({ userId: 'user-123', role: 'customer' });

      const response = await request(app).get('/api/unknown/path');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 403 for matching path but wrong method', async () => {
      const app = createTestApp({ userId: 'user-123', role: 'customer' });

      const response = await request(app).delete('/api/products');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });
});
