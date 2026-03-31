import request from 'supertest';
import express from 'express';
import { LogController } from '../src/controllers/log.controller';
import { LogRepository } from '../src/repositories/log.repository';

jest.mock('../src/repositories/log.repository');

describe('Log Endpoint (GET /api/logs)', () => {
  let app: express.Express;
  let mockLogRepository: jest.Mocked<LogRepository>;

  const sampleLogs = [
    {
      _id: 'log-1',
      method: 'GET',
      path: '/api/products',
      statusCode: 200,
      responseTime: 45,
      userId: 'user-1',
      targetService: 'product-service',
      timestamp: new Date('2026-03-31T10:00:00Z')
    },
    {
      _id: 'log-2',
      method: 'POST',
      path: '/api/orders',
      statusCode: 201,
      responseTime: 120,
      userId: 'user-2',
      targetService: 'order-service',
      timestamp: new Date('2026-03-31T11:00:00Z')
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogRepository = new LogRepository() as jest.Mocked<LogRepository>;
    mockLogRepository.findAll = jest.fn().mockResolvedValue(sampleLogs);
    mockLogRepository.count = jest.fn().mockResolvedValue(2);

    app = express();
    app.use(express.json());

    const logController = new LogController(mockLogRepository);

    // Admin route
    const adminApp = express();
    adminApp.use(express.json());
    adminApp.use((req, _res, next) => {
      req.userId = 'admin-1';
      req.role = 'admin';
      next();
    });
    adminApp.get('/api/logs', (req, res) => logController.getLogs(req, res));
    app = adminApp;
  });

  describe('Admin access', () => {
    it('should return 200 with paginated log list', async () => {
      const response = await request(app).get('/api/logs');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toHaveLength(2);
    });

    it('should include pagination metadata', async () => {
      const response = await request(app).get('/api/logs');

      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.total).toBe(2);
      expect(response.body.data.pagination.page).toBe(1);
    });

    it('should support page and limit query parameters', async () => {
      await request(app).get('/api/logs?page=2&limit=10');

      expect(mockLogRepository.findAll).toHaveBeenCalledWith(
        expect.any(Object),
        2,
        10
      );
    });

    it('should support targetService filter', async () => {
      await request(app).get('/api/logs?targetService=product-service');

      expect(mockLogRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ targetService: 'product-service' }),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should support statusCode filter', async () => {
      await request(app).get('/api/logs?statusCode=200');

      expect(mockLogRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 200 }),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  describe('Non-admin access', () => {
    it('should return 403 for non-admin users', async () => {
      const customerApp = express();
      customerApp.use(express.json());
      customerApp.use((req, _res, next) => {
        req.userId = 'user-1';
        req.role = 'customer';
        next();
      });
      const logController = new LogController(mockLogRepository);
      customerApp.get('/api/logs', (req, res) => logController.getLogs(req, res));

      const response = await request(customerApp).get('/api/logs');
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });
});
