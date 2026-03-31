import request from 'supertest';
import express from 'express';
import { LoggingMiddleware } from '../src/middleware/logging.middleware';
import { LogService } from '../src/services/log.service';

jest.mock('../src/services/log.service');

describe('Logging Middleware', () => {
  let app: express.Express;
  let mockLogService: jest.Mocked<LogService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogService = new LogService() as jest.Mocked<LogService>;
    mockLogService.saveLog = jest.fn().mockResolvedValue(undefined);

    app = express();
    app.use(express.json());

    const loggingMiddleware = new LoggingMiddleware(mockLogService);
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
      const loggingMiddleware = new LoggingMiddleware(mockLogService);
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
  });
});
