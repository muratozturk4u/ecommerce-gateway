import request from 'supertest';
import express from 'express';
import axios, { AxiosRequestConfig } from 'axios';
import { OrderOrchestrationController } from '../src/controllers/order-orchestration.controller';
import { OrderOrchestrationService } from '../src/services/order-orchestration.service';
import { ErrorHandler } from '../src/middleware/error-handler.middleware';

interface OrderRequestData {
  userId: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalAmount: number;
  shippingAddress?: { street: string; city: string; zip: string };
}

type OrderAxiosConfig = AxiosRequestConfig & { data: OrderRequestData };

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

    const service = new OrderOrchestrationService('http://product-svc', 'http://order-svc', 'test-key');
    const controller = new OrderOrchestrationController(service);
    const errorHandler = new ErrorHandler();

    app.post('/api/orders', (req, res, next) => void controller.createOrder(req, res, next));
    app.use(errorHandler.handle());
  });

  const mockProductResponse = (id: string, name: string, price: number, stock: number) => ({
    status: 200,
    data: { success: true, data: { _id: id, name, price, stock, isActive: true } }
  });

  const mockStockResponse = () => ({
    status: 200,
    data: { success: true, data: {} }
  });

  const mockOrderResponse = (orderId: string) => ({
    status: 201,
    data: { success: true, data: { orderId, status: 'pending' } }
  });

  describe('Successful order flow', () => {
    it('should return 201 for successful order', async () => {
      mockedAxios.request
        .mockResolvedValueOnce(mockProductResponse('p1', 'Widget', 100, 10))
        .mockResolvedValueOnce(mockProductResponse('p2', 'Gadget', 50, 5))
        .mockResolvedValueOnce(mockStockResponse())
        .mockResolvedValueOnce(mockStockResponse())
        .mockResolvedValueOnce(mockOrderResponse('order-1'));

      const response = await request(app)
        .post('/api/orders')
        .send({ items: [{ productId: 'p1', quantity: 2 }, { productId: 'p2', quantity: 1 }] });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.orderId).toBe('order-1');
    });

    it('should call GET /products/:id for stock check', async () => {
      mockedAxios.request
        .mockResolvedValueOnce(mockProductResponse('p1', 'Widget', 100, 10))
        .mockResolvedValueOnce(mockStockResponse())
        .mockResolvedValueOnce(mockOrderResponse('order-1'));

      await request(app)
        .post('/api/orders')
        .send({ items: [{ productId: 'p1', quantity: 1 }] });

      const firstCall = mockedAxios.request.mock.calls[0][0];
      expect(firstCall).toMatchObject({
        method: 'GET',
        url: 'http://product-svc/products/p1'
      });
    });

    it('should call PATCH /products/:id/stock with negative quantity', async () => {
      mockedAxios.request
        .mockResolvedValueOnce(mockProductResponse('p1', 'Widget', 100, 10))
        .mockResolvedValueOnce(mockStockResponse())
        .mockResolvedValueOnce(mockOrderResponse('order-1'));

      await request(app)
        .post('/api/orders')
        .send({ items: [{ productId: 'p1', quantity: 3 }] });

      const stockCall = mockedAxios.request.mock.calls[1][0];
      expect(stockCall).toMatchObject({
        method: 'PATCH',
        url: 'http://product-svc/products/p1/stock',
        data: { quantity: -3 }
      });
    });

    it('should create order with enriched data', async () => {
      mockedAxios.request
        .mockResolvedValueOnce(mockProductResponse('p1', 'Widget', 100, 10))
        .mockResolvedValueOnce(mockProductResponse('p2', 'Gadget', 50, 5))
        .mockResolvedValueOnce(mockStockResponse())
        .mockResolvedValueOnce(mockStockResponse())
        .mockResolvedValueOnce(mockOrderResponse('order-1'));

      await request(app)
        .post('/api/orders')
        .send({ items: [{ productId: 'p1', quantity: 2 }, { productId: 'p2', quantity: 1 }] });

      const orderCall = mockedAxios.request.mock.calls[4][0] as OrderAxiosConfig;
      expect(orderCall).toMatchObject({
        method: 'POST',
        url: 'http://order-svc/orders'
      });
      expect(orderCall.data.userId).toBe('user-123');
      expect(orderCall.data.items).toEqual(expect.arrayContaining([
        expect.objectContaining({ productId: 'p1', productName: 'Widget', quantity: 2, unitPrice: 100, totalPrice: 200 }),
        expect.objectContaining({ productId: 'p2', productName: 'Gadget', quantity: 1, unitPrice: 50, totalPrice: 50 })
      ]));
      expect(orderCall.data.totalAmount).toBeCloseTo(250);
    });

    it('should pass through shippingAddress', async () => {
      mockedAxios.request
        .mockResolvedValueOnce(mockProductResponse('p1', 'W', 10, 10))
        .mockResolvedValueOnce(mockStockResponse())
        .mockResolvedValueOnce(mockOrderResponse('o1'));

      await request(app)
        .post('/api/orders')
        .send({
          items: [{ productId: 'p1', quantity: 1 }],
          shippingAddress: { street: '123 Main', city: 'Istanbul', zip: '34000' }
        });

      const orderCall = mockedAxios.request.mock.calls[2][0] as OrderAxiosConfig;
      expect(orderCall.data.shippingAddress).toEqual({ street: '123 Main', city: 'Istanbul', zip: '34000' });
    });
  });

  describe('Error: insufficient stock', () => {
    it('should return 400 when stock is insufficient', async () => {
      mockedAxios.request.mockResolvedValueOnce(mockProductResponse('p1', 'W', 10, 2));

      const response = await request(app)
        .post('/api/orders')
        .send({ items: [{ productId: 'p1', quantity: 5 }] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_STOCK');
    });
  });

  describe('Error: product not found', () => {
    it('should return 404 when product does not exist', async () => {
      mockedAxios.request.mockRejectedValueOnce({ response: { status: 404 } });

      const response = await request(app)
        .post('/api/orders')
        .send({ items: [{ productId: 'nonexistent', quantity: 1 }] });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Error: service unreachable', () => {
    it('should return 502 when Product Service is unreachable', async () => {
      mockedAxios.request.mockRejectedValueOnce({ code: 'ECONNREFUSED' });

      const response = await request(app)
        .post('/api/orders')
        .send({ items: [{ productId: 'p1', quantity: 1 }] });

      expect(response.status).toBe(502);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_GATEWAY');
    });

    it('should return 502 when Order Service is unreachable', async () => {
      mockedAxios.request
        .mockResolvedValueOnce(mockProductResponse('p1', 'W', 10, 10))
        .mockResolvedValueOnce(mockStockResponse())
        .mockRejectedValueOnce({ code: 'ECONNREFUSED' })
        .mockResolvedValueOnce(mockStockResponse());

      const response = await request(app)
        .post('/api/orders')
        .send({ items: [{ productId: 'p1', quantity: 1 }] });

      expect(response.status).toBe(502);
      expect(response.body.error.code).toBe('BAD_GATEWAY');
    });
  });

  describe('Rollback', () => {
    it('should rollback decreased stock when stock decrease fails partially', async () => {
      mockedAxios.request
        .mockResolvedValueOnce(mockProductResponse('p1', 'A', 10, 10))
        .mockResolvedValueOnce(mockProductResponse('p2', 'B', 20, 5))
        .mockResolvedValueOnce(mockStockResponse())
        .mockRejectedValueOnce(new Error('stock fail'))
        .mockResolvedValueOnce(mockStockResponse());

      const response = await request(app)
        .post('/api/orders')
        .send({ items: [{ productId: 'p1', quantity: 2 }, { productId: 'p2', quantity: 1 }] });

      expect(response.status).toBe(502);
      expect(response.body.error.code).toBe('ORCHESTRATION_FAILED');

      const rollbackCall = mockedAxios.request.mock.calls[4][0];
      expect(rollbackCall).toMatchObject({
        method: 'PATCH',
        url: 'http://product-svc/products/p1/stock',
        data: { quantity: 2 }
      });
    });

    it('should rollback ALL stock when order creation fails', async () => {
      mockedAxios.request
        .mockResolvedValueOnce(mockProductResponse('p1', 'A', 10, 10))
        .mockResolvedValueOnce(mockProductResponse('p2', 'B', 20, 5))
        .mockResolvedValueOnce(mockStockResponse())
        .mockResolvedValueOnce(mockStockResponse())
        .mockRejectedValueOnce(new Error('order fail'))
        .mockResolvedValueOnce(mockStockResponse())
        .mockResolvedValueOnce(mockStockResponse());

      const response = await request(app)
        .post('/api/orders')
        .send({ items: [{ productId: 'p1', quantity: 3 }, { productId: 'p2', quantity: 2 }] });

      expect(response.status).toBe(502);
      expect(response.body.error.code).toBe('BAD_GATEWAY');

      expect(mockedAxios.request).toHaveBeenCalledTimes(7);
      const rollback1 = mockedAxios.request.mock.calls[5][0];
      expect(rollback1).toMatchObject({
        method: 'PATCH',
        url: 'http://product-svc/products/p1/stock',
        data: { quantity: 3 }
      });
      const rollback2 = mockedAxios.request.mock.calls[6][0];
      expect(rollback2).toMatchObject({
        method: 'PATCH',
        url: 'http://product-svc/products/p2/stock',
        data: { quantity: 2 }
      });
    });
  });

  describe('Controller without error middleware (fallback handling)', () => {
    let fallbackApp: express.Express;

    beforeEach(() => {
      fallbackApp = express();
      fallbackApp.use(express.json());
      fallbackApp.use((req, _res, next) => {
        req.userId = 'user-123';
        req.role = 'customer';
        next();
      });
      const service = new OrderOrchestrationService('http://product-svc', 'http://order-svc', 'test-key');
      const controller = new OrderOrchestrationController(service);
      fallbackApp.post('/api/orders', (req, res) => void controller.createOrder(req, res));
    });

    it('should handle AppError without next()', async () => {
      mockedAxios.request.mockResolvedValueOnce(mockProductResponse('p1', 'W', 10, 2));

      const response = await request(fallbackApp)
        .post('/api/orders')
        .send({ items: [{ productId: 'p1', quantity: 5 }] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_STOCK');
    });

    it('should handle unknown error without next()', async () => {
      mockedAxios.request.mockRejectedValueOnce({ code: 'ECONNREFUSED' });

      const response = await request(fallbackApp)
        .post('/api/orders')
        .send({ items: [{ productId: 'p1', quantity: 1 }] });

      expect(response.status).toBe(502);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should return 400 when items array is empty', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({ items: [] });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when items is missing', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
