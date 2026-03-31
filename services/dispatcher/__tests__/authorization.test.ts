import request from 'supertest';
import express from 'express';
import { AuthorizationMiddleware } from '../src/middleware/authorization.middleware';
import { IRouteAccessRule } from '../src/models/route-access-rule.model';

describe('Authorization Middleware', () => {
  let app: express.Express;

  const mockRules: IRouteAccessRule[] = [
    { path: '/api/auth/login', method: 'POST', roles: [], isPublic: true },
    { path: '/api/auth/register', method: 'POST', roles: [], isPublic: true },
    { path: '/api/products', method: 'GET', roles: [], isPublic: true },
    { path: '/api/products', method: 'POST', roles: ['admin'], isPublic: false },
    { path: '/api/orders', method: 'GET', roles: ['customer', 'admin'], isPublic: false },
    { path: '/api/orders', method: 'POST', roles: ['customer', 'admin'], isPublic: false },
    { path: '/api/logs', method: 'GET', roles: ['admin'], isPublic: false },
  ];

  beforeEach(() => {
    app = express();
    app.use(express.json());

    const authzMiddleware = new AuthorizationMiddleware(mockRules);
    app.use(authzMiddleware.authorize());

    app.all('*', (_req, res) => {
      res.json({ success: true, data: { message: 'passed' } });
    });
  });

  describe('Public routes', () => {
    it('should allow access to public routes without authentication', async () => {
      const response = await request(app).post('/api/auth/login');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should allow GET /api/products without authentication', async () => {
      const response = await request(app).get('/api/products');
      expect(response.status).toBe(200);
    });
  });

  describe('Protected routes', () => {
    it('should allow access when user has required role', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('x-user-role', 'customer')
        .set('x-user-id', 'user-123');

      // Middleware reads req.role from previous auth middleware
      // We simulate by setting req.role before authorization
      expect(response.status).toBe(200);
    });

    it('should return 403 when user role is not authorized', async () => {
      // Create app with role set via middleware
      const testApp = express();
      testApp.use(express.json());
      testApp.use((req, _res, next) => {
        req.userId = 'user-123';
        req.role = 'customer';
        next();
      });
      const authzMiddleware = new AuthorizationMiddleware(mockRules);
      testApp.use(authzMiddleware.authorize());
      testApp.all('*', (_req, res) => {
        res.json({ success: true });
      });

      const response = await request(testApp).get('/api/logs');
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow admin to access admin-only routes', async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.use((req, _res, next) => {
        req.userId = 'admin-1';
        req.role = 'admin';
        next();
      });
      const authzMiddleware = new AuthorizationMiddleware(mockRules);
      testApp.use(authzMiddleware.authorize());
      testApp.all('*', (_req, res) => {
        res.json({ success: true });
      });

      const response = await request(testApp).get('/api/logs');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 401 when no user is authenticated on protected route', async () => {
      const testApp = express();
      testApp.use(express.json());
      const authzMiddleware = new AuthorizationMiddleware(mockRules);
      testApp.use(authzMiddleware.authorize());
      testApp.all('*', (_req, res) => {
        res.json({ success: true });
      });

      const response = await request(testApp).get('/api/orders');
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Unknown routes', () => {
    it('should pass through routes not in the rules (handled by proxy)', async () => {
      const response = await request(app).get('/api/something/else');
      expect(response.status).toBe(200);
    });
  });
});
