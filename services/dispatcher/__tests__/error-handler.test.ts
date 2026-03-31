import request from 'supertest';
import express from 'express';
import { ErrorHandler } from '../src/middleware/error-handler.middleware';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ProxyError
} from '../src/utils/errors';

describe('Error Handler Middleware', () => {
  const createTestApp = (error: Error): express.Express => {
    const app = express();
    app.use(express.json());

    app.get('/test', () => {
      throw error;
    });

    const errorHandler = new ErrorHandler();
    app.use(errorHandler.handle());

    return app;
  };

  describe('ValidationError', () => {
    it('should return 400 for ValidationError', async () => {
      const app = createTestApp(new ValidationError('Invalid email format'));
      const response = await request(app).get('/test');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Invalid email format');
    });
  });

  describe('AuthenticationError', () => {
    it('should return 401 for AuthenticationError', async () => {
      const app = createTestApp(new AuthenticationError('Token expired'));
      const response = await request(app).get('/test');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toBe('Token expired');
    });
  });

  describe('AuthorizationError', () => {
    it('should return 403 for AuthorizationError', async () => {
      const app = createTestApp(new AuthorizationError('Admin access required'));
      const response = await request(app).get('/test');

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toBe('Admin access required');
    });
  });

  describe('NotFoundError', () => {
    it('should return 404 for NotFoundError', async () => {
      const app = createTestApp(new NotFoundError('Resource not found'));
      const response = await request(app).get('/test');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('ProxyError', () => {
    it('should return 502 for ProxyError', async () => {
      const app = createTestApp(new ProxyError('Service unavailable'));
      const response = await request(app).get('/test');

      expect(response.status).toBe(502);
      expect(response.body.error.code).toBe('BAD_GATEWAY');
    });
  });

  describe('Unknown errors', () => {
    it('should return 500 for unknown errors', async () => {
      const app = createTestApp(new Error('Something went wrong'));
      const response = await request(app).get('/test');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should not leak error details in production for unknown errors', async () => {
      const app = createTestApp(new Error('Database connection failed'));
      const response = await request(app).get('/test');

      expect(response.body.error.message).not.toContain('Database');
    });
  });
});
