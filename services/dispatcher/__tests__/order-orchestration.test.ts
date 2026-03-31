import request from 'supertest';
import express from 'express';
import axios from 'axios';
import { OrderOrchestrationController } from '../src/controllers/order-orchestration.controller';
import { OrderOrchestrationService } from '../src/services/order-orchestration.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Order Orchestration', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.userId = 'user-123';
      req.role = 'customer';
      next();
    });

    const orchestrationService = new OrderOrchestrationService();
    const controller = new OrderOrchestrationController(orchestrationService);
    app.post('/api/orders/orchestrated', (req, res) => controller.createOrder(req, res));
  });

  describe('Successful order flow', () => {
    it('should return 201 for successful order creation', async () => {
      // Step 1: Stock check - all items in stock
      mockedAxios.request.mockResolvedValueOnce({
        status: 200,
        data: { success: true, data: { inStock: true, available: 10 } }
      });
      mockedAxios.request.mockResolvedValueOnce({
        status: 200,
        data: { success: true, data: { inStock: true, available: 5 } }
      });

      // Step 2: Stock decrease
      mockedAxios.request.mockResolvedValueOnce({
        status: 200,
        data: { success: true }
      });
      mockedAxios.request.mockResolvedValueOnce({
        status: 200,
        data: { success: true }
      });

      // Step 3: Order creation
      mockedAxios.request.mockResolvedValueOnce({
        status: 201,
        data: { success: true, data: { orderId: 'order-1', status: 'created' } }
      });

      const orderData = {
        items: [
          { productId: 'prod-1', quantity: 2 },
          { productId: 'prod-2', quantity: 1 }
        ]
      };

      const response = await request(app)
        .post('/api/orders/orchestrated')
        .send(orderData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.orderId).toBeDefined();
    });
  });

  describe('Insufficient stock', () => {
    it('should return 400 when item is out of stock', async () => {
      // Stock check - item out of stock
      mockedAxios.request.mockResolvedValueOnce({
        status: 200,
        data: { success: true, data: { inStock: false, available: 0 } }
      });

      const orderData = {
        items: [
          { productId: 'prod-1', quantity: 5 }
        ]
      };

      const response = await request(app)
        .post('/api/orders/orchestrated')
        .send(orderData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_STOCK');
    });
  });

  describe('Partial stock failure with rollback', () => {
    it('should rollback stock and return 502 when stock decrease fails partially', async () => {
      // Stock check - all OK
      mockedAxios.request.mockResolvedValueOnce({
        status: 200,
        data: { success: true, data: { inStock: true, available: 10 } }
      });
      mockedAxios.request.mockResolvedValueOnce({
        status: 200,
        data: { success: true, data: { inStock: true, available: 5 } }
      });

      // Stock decrease - first succeeds, second fails
      mockedAxios.request.mockResolvedValueOnce({
        status: 200,
        data: { success: true }
      });
      mockedAxios.request.mockRejectedValueOnce({
        response: { status: 500, data: { success: false } }
      });

      // Rollback call for the first item
      mockedAxios.request.mockResolvedValueOnce({
        status: 200,
        data: { success: true }
      });

      const orderData = {
        items: [
          { productId: 'prod-1', quantity: 2 },
          { productId: 'prod-2', quantity: 1 }
        ]
      };

      const response = await request(app)
        .post('/api/orders/orchestrated')
        .send(orderData);

      expect(response.status).toBe(502);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ORCHESTRATION_FAILED');
    });
  });

  describe('Validation', () => {
    it('should return 400 when items array is empty', async () => {
      const response = await request(app)
        .post('/api/orders/orchestrated')
        .send({ items: [] });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when items is missing', async () => {
      const response = await request(app)
        .post('/api/orders/orchestrated')
        .send({});

      expect(response.status).toBe(400);
    });
  });
});
