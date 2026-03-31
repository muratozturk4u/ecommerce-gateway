import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { AuthMiddleware } from '../src/middleware/auth.middleware';
import { IRouteAccessRule } from '../src/models/route-access-rule.model';

const TEST_SECRET = 'test-jwt-secret';

describe('Auth Middleware', () => {
  let app: express.Express;
  let authMiddleware: AuthMiddleware;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    authMiddleware = new AuthMiddleware(TEST_SECRET);
    app.use(authMiddleware.authenticate());
    app.get('/protected', (req, res) => {
      res.json({
        success: true,
        data: {
          userId: req.userId,
          role: req.role
        }
      });
    });
  });

  describe('Token validation', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app).get('/protected');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('Token required');
    });

    it('should return 401 when token is invalid', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid-token-here');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when token is expired', async () => {
      const expiredToken = jwt.sign(
        { userId: '123', role: 'customer' },
        TEST_SECRET,
        { expiresIn: '0s' } as jwt.SignOptions
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when Authorization header format is wrong', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'NotBearer some-token');

      expect(response.status).toBe(401);
    });
  });

  describe('Successful authentication', () => {
    it('should call next() and set req.userId and req.role for valid token', async () => {
      const token = jwt.sign(
        { userId: 'user-123', role: 'customer' },
        TEST_SECRET,
        { expiresIn: '1h' } as jwt.SignOptions
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe('user-123');
      expect(response.body.data.role).toBe('customer');
    });

    it('should handle admin role correctly', async () => {
      const token = jwt.sign(
        { userId: 'admin-1', role: 'admin' },
        TEST_SECRET,
        { expiresIn: '1h' } as jwt.SignOptions
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.role).toBe('admin');
    });
  });

  describe('Public route bypass', () => {
    const testRules: IRouteAccessRule[] = [
      { path: '/api/auth/register', method: 'POST', authLevel: 'public' },
      { path: '/api/auth/login', method: 'POST', authLevel: 'public' },
      { path: '/health', method: 'GET', authLevel: 'public' },
      { path: '/api/metrics', method: 'GET', authLevel: 'public' },
      { path: '/api/products', method: 'GET', authLevel: 'protected' },
    ];

    const createPublicTestApp = (): express.Express => {
      const testApp = express();
      testApp.use(express.json());
      const middleware = new AuthMiddleware(TEST_SECRET, testRules);
      testApp.use(middleware.authenticate());
      testApp.all('*', (req, res) => {
        res.json({
          success: true,
          data: {
            userId: req.userId || null,
            role: req.role || null
          }
        });
      });
      return testApp;
    };

    it('should skip auth for POST /api/auth/register', async () => {
      const testApp = createPublicTestApp();

      const response = await request(testApp).post('/api/auth/register');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should skip auth for POST /api/auth/login', async () => {
      const testApp = createPublicTestApp();

      const response = await request(testApp).post('/api/auth/login');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should skip auth for GET /health', async () => {
      const testApp = createPublicTestApp();

      const response = await request(testApp).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should skip auth for GET /api/metrics', async () => {
      const testApp = createPublicTestApp();

      const response = await request(testApp).get('/api/metrics');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should still require auth for protected routes', async () => {
      const testApp = createPublicTestApp();

      const response = await request(testApp).get('/api/products');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should decode token on public route if provided', async () => {
      const testApp = createPublicTestApp();
      const token = jwt.sign(
        { userId: 'user-456', role: 'customer' },
        TEST_SECRET,
        { expiresIn: '1h' } as jwt.SignOptions
      );

      const response = await request(testApp)
        .post('/api/auth/login')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe('user-456');
    });
  });
});
