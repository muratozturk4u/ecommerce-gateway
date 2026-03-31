import request from 'supertest';
import express from 'express';
import { LoggingMiddleware } from '../src/middleware/logging.middleware';
import { LogService } from '../src/services/log.service';
import { IServiceRegistry, IServiceConfig } from '../src/interfaces/service-config.interface';

jest.mock('../src/services/log.service');

function createMockServiceRegistry(config?: IServiceConfig | null): IServiceRegistry {
  return {
    resolve: jest.fn().mockReturnValue(config || null),
    getAllServices: jest.fn().mockReturnValue(config ? [config] : [])
  };
}

describe('Logging Middleware', () => {
  let app: express.Express;
  let mockLogService: jest.Mocked<LogService>;
  let mockServiceRegistry: IServiceRegistry;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogService = new LogService() as jest.Mocked<LogService>;
    mockLogService.saveLog = jest.fn().mockResolvedValue(undefined);
    mockServiceRegistry = createMockServiceRegistry();

    app = express();
    app.use(express.json());

    const loggingMiddleware = new LoggingMiddleware(mockLogService, mockServiceRegistry);
    app.use(loggingMiddleware.log());

    app.get('/test', (_req, res) => {
      res.json({ success: true });
    });

    app.post('/api/auth/login', (_req, res) => {
      res.json({ success: true, data: { token: 'test' } });
    });
  });

  describe('Request logging', () => {
    it('should log the request method', async () => {
      await request(app).get('/test');

      expect(mockLogService.saveLog).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should log the request path', async () => {
      await request(app).get('/test');

      expect(mockLogService.saveLog).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/test'
        })
      );
    });

    it('should log the response status code', async () => {
      await request(app).get('/test');

      expect(mockLogService.saveLog).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 200
        })
      );
    });

    it('should log the response time in milliseconds', async () => {
      await request(app).get('/test');

      expect(mockLogService.saveLog).toHaveBeenCalledWith(
        expect.objectContaining({
          responseTime: expect.any(Number)
        })
      );
    });

    it('should log the userId when authenticated', async () => {
      const authApp = express();
      authApp.use(express.json());
      authApp.use((req, _res, next) => {
        req.userId = 'user-456';
        next();
      });
      const loggingMiddleware = new LoggingMiddleware(mockLogService, mockServiceRegistry);
      authApp.use(loggingMiddleware.log());
      authApp.get('/test', (_req, res) => {
        res.json({ success: true });
      });

      await request(authApp).get('/test');

      expect(mockLogService.saveLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-456'
        })
      );
    });

    it('should log POST requests', async () => {
      await request(app).post('/api/auth/login').send({ email: 'test@test.com' });

      expect(mockLogService.saveLog).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/api/auth/login'
        })
      );
    });

    it('should not block the response (async logging)', async () => {
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should log client IP address', async () => {
      await request(app).get('/test');

      expect(mockLogService.saveLog).toHaveBeenCalledWith(
        expect.objectContaining({
          ip: expect.any(String)
        })
      );
    });

    it('should log requestBody for POST requests', async () => {
      const body = { email: 'test@test.com', name: 'Test User' };
      await request(app).post('/api/auth/login').send(body);

      expect(mockLogService.saveLog).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            email: 'test@test.com',
            name: 'Test User'
          })
        })
      );
    });

    it('should filter sensitive fields from requestBody', async () => {
      const body = { email: 'test@test.com', password: 'secret123' };
      await request(app).post('/api/auth/login').send(body);

      expect(mockLogService.saveLog).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            email: 'test@test.com',
            password: '[REDACTED]'
          })
        })
      );
    });

    it('should log error message on failure responses', async () => {
      const errorApp = express();
      errorApp.use(express.json());
      const loggingMiddleware = new LoggingMiddleware(mockLogService, mockServiceRegistry);
      errorApp.use(loggingMiddleware.log());
      errorApp.get('/fail', (_req, res) => {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' }
        });
      });

      await request(errorApp).get('/fail');

      expect(mockLogService.saveLog).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });

    it('should include targetService name', async () => {
      const serviceConfig: IServiceConfig = {
        name: 'product-service',
        url: 'http://product-service:3002',
        pathPrefixes: ['/api/products']
      };
      const registry = createMockServiceRegistry(serviceConfig);
      const serviceApp = express();
      serviceApp.use(express.json());
      const loggingMiddleware = new LoggingMiddleware(mockLogService, registry);
      serviceApp.use(loggingMiddleware.log());
      serviceApp.get('/api/products', (_req, res) => {
        res.json({ success: true, data: [] });
      });

      await request(serviceApp).get('/api/products');

      expect(mockLogService.saveLog).toHaveBeenCalledWith(
        expect.objectContaining({
          targetService: 'product-service'
        })
      );
    });
  });
});
