import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Express } from 'express';
import { createApp } from '../src/app';
import { OrderModel } from '../src/models/order.model';

const INTERNAL_KEY = 'test-internal-key';
const USER_ID = new mongoose.Types.ObjectId().toString();
const OTHER_USER_ID = new mongoose.Types.ObjectId().toString();
const ADMIN_ID = new mongoose.Types.ObjectId().toString();

const validOrderData = {
  userId: USER_ID,
  items: [
    { productId: 'prod1', productName: 'Laptop', quantity: 1, unitPrice: 1000, totalPrice: 1000 },
    { productId: 'prod2', productName: 'Mouse', quantity: 2, unitPrice: 50, totalPrice: 100 }
  ],
  totalAmount: 1100,
  shippingAddress: { street: '123 Main St', city: 'Istanbul', zip: '34000' }
};

let app: Express;
let mongoServer: MongoMemoryServer;

const createOrder = (data?: Record<string, unknown>) =>
  request(app)
    .post('/orders')
    .set('X-Internal-Key', INTERNAL_KEY)
    .send(data || validOrderData);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await OrderModel.deleteMany({});
});

describe('POST /orders', () => {
  describe('successful scenarios', () => {
    it('should return 201 with created order', async () => {
      const res = await createOrder();

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.userId).toBe(USER_ID);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.totalAmount).toBe(1100);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.createdAt).toBeDefined();
      expect(res.body.data.updatedAt).toBeDefined();
    });

    it('should set initial status to pending', async () => {
      const res = await createOrder();

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('pending');
    });

    it('should create order without shippingAddress', async () => {
      const { shippingAddress, ...dataWithoutAddress } = validOrderData;
      const res = await createOrder(dataWithoutAddress);

      expect(res.status).toBe(201);
      expect(res.body.data.shippingAddress?.street).toBeUndefined();
    });

    it('should create order with shippingAddress', async () => {
      const res = await createOrder();

      expect(res.status).toBe(201);
      expect(res.body.data.shippingAddress).toEqual({
        street: '123 Main St',
        city: 'Istanbul',
        zip: '34000'
      });
    });

    it('should ignore status field in body and always set pending', async () => {
      const res = await createOrder({ ...validOrderData, status: 'confirmed' });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('pending');
    });

    it('should accept duplicate productId items', async () => {
      const data = {
        userId: USER_ID,
        items: [
          { productId: 'prod1', productName: 'Laptop Black', quantity: 1, unitPrice: 1000, totalPrice: 1000 },
          { productId: 'prod1', productName: 'Laptop White', quantity: 1, unitPrice: 1000, totalPrice: 1000 }
        ],
        totalAmount: 2000
      };
      const res = await createOrder(data);

      expect(res.status).toBe(201);
      expect(res.body.data.items).toHaveLength(2);
    });
  });

  describe('error scenarios', () => {
    it('should return 400 when items is empty array', async () => {
      const res = await createOrder({ ...validOrderData, items: [] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when userId is missing', async () => {
      const { userId, ...data } = validOrderData;
      const res = await createOrder(data);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when totalAmount is missing', async () => {
      const { totalAmount, ...data } = validOrderData;
      const res = await createOrder(data);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when totalAmount does not match sum of item prices', async () => {
      const res = await createOrder({ ...validOrderData, totalAmount: 9999 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TOTAL_AMOUNT_MISMATCH');
    });

    it('should return 400 when item totalPrice does not match quantity * unitPrice', async () => {
      const data = {
        ...validOrderData,
        items: [
          { productId: 'prod1', productName: 'Laptop', quantity: 2, unitPrice: 100, totalPrice: 999 }
        ],
        totalAmount: 999
      };
      const res = await createOrder(data);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ITEM_PRICE_MISMATCH');
    });

    it('should return 400 when quantity is not a positive integer (zero)', async () => {
      const data = {
        ...validOrderData,
        items: [
          { productId: 'prod1', productName: 'Laptop', quantity: 0, unitPrice: 1000, totalPrice: 0 }
        ],
        totalAmount: 0
      };
      const res = await createOrder(data);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when quantity is negative', async () => {
      const data = {
        ...validOrderData,
        items: [
          { productId: 'prod1', productName: 'Laptop', quantity: -1, unitPrice: 1000, totalPrice: -1000 }
        ],
        totalAmount: -1000
      };
      const res = await createOrder(data);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when shippingAddress is partial (missing city and zip)', async () => {
      const data = {
        ...validOrderData,
        shippingAddress: { street: '123 Main St' }
      };
      const res = await createOrder(data);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when totalAmount exceeds max', async () => {
      const data = {
        ...validOrderData,
        items: [
          { productId: 'prod1', productName: 'Expensive', quantity: 1, unitPrice: 1000000000, totalPrice: 1000000000 }
        ],
        totalAmount: 1000000000
      };
      const res = await createOrder(data);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 without X-Internal-Key', async () => {
      const res = await request(app)
        .post('/orders')
        .send(validOrderData);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});

describe('GET /orders', () => {
  describe('successful scenarios', () => {
    it('should return 200 with paginated orders for user', async () => {
      await createOrder();

      const res = await request(app)
        .get('/orders')
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', USER_ID)
        .set('X-User-Role', 'customer');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(10);
      expect(res.body.meta.total).toBe(1);
      expect(res.body.meta.totalPages).toBe(1);
    });

    it('should return only orders belonging to X-User-Id', async () => {
      await createOrder();
      await createOrder({
        userId: OTHER_USER_ID,
        items: [{ productId: 'prod3', productName: 'Keyboard', quantity: 1, unitPrice: 200, totalPrice: 200 }],
        totalAmount: 200
      });

      const res = await request(app)
        .get('/orders')
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', USER_ID)
        .set('X-User-Role', 'customer');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].userId).toBe(USER_ID);
    });

    it('should return all orders for admin', async () => {
      await createOrder();
      await createOrder({
        userId: OTHER_USER_ID,
        items: [{ productId: 'prod3', productName: 'Keyboard', quantity: 1, unitPrice: 200, totalPrice: 200 }],
        totalAmount: 200
      });

      const res = await request(app)
        .get('/orders')
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', ADMIN_ID)
        .set('X-User-Role', 'admin');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.total).toBe(2);
    });

    it('should filter by status query param', async () => {
      await createOrder();
      await createOrder();

      const created = await createOrder();
      const orderId = created.body.data.id;

      await request(app)
        .patch(`/orders/${orderId}/status`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', ADMIN_ID)
        .set('X-User-Role', 'admin')
        .send({ status: 'confirmed' });

      const res = await request(app)
        .get('/orders?status=confirmed')
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', USER_ID)
        .set('X-User-Role', 'customer');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe('confirmed');
    });

    it('should return correct pagination meta', async () => {
      for (let i = 0; i < 15; i++) {
        await createOrder();
      }

      const res = await request(app)
        .get('/orders?page=2&limit=10')
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', USER_ID)
        .set('X-User-Role', 'customer');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(5);
      expect(res.body.meta.page).toBe(2);
      expect(res.body.meta.limit).toBe(10);
      expect(res.body.meta.total).toBe(15);
      expect(res.body.meta.totalPages).toBe(2);
    });

    it('should return empty data when no orders', async () => {
      const res = await request(app)
        .get('/orders')
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', USER_ID)
        .set('X-User-Role', 'customer');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.meta.total).toBe(0);
    });
  });

  describe('error scenarios', () => {
    it('should return 400 without X-User-Id header', async () => {
      const res = await request(app)
        .get('/orders')
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 without X-Internal-Key', async () => {
      const res = await request(app)
        .get('/orders')
        .set('X-User-Id', USER_ID)
        .set('X-User-Role', 'customer');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});

describe('GET /orders/:id', () => {
  describe('successful scenarios', () => {
    it('should return 200 with order for owner', async () => {
      const created = await createOrder();
      const orderId = created.body.data.id;

      const res = await request(app)
        .get(`/orders/${orderId}`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', USER_ID)
        .set('X-User-Role', 'customer');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(orderId);
      expect(res.body.data.userId).toBe(USER_ID);
      expect(res.body.data.totalAmount).toBe(1100);
    });

    it('should return 200 with order for admin (different userId)', async () => {
      const created = await createOrder();
      const orderId = created.body.data.id;

      const res = await request(app)
        .get(`/orders/${orderId}`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', ADMIN_ID)
        .set('X-User-Role', 'admin');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(orderId);
    });
  });

  describe('error scenarios', () => {
    it('should return 404 when order not found', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .get(`/orders/${fakeId}`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', USER_ID)
        .set('X-User-Role', 'customer');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 when non-owner tries to access (no info leak)', async () => {
      const created = await createOrder();
      const orderId = created.body.data.id;

      const res = await request(app)
        .get(`/orders/${orderId}`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', OTHER_USER_ID)
        .set('X-User-Role', 'customer');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid ObjectId', async () => {
      const res = await request(app)
        .get('/orders/invalid-id')
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', USER_ID)
        .set('X-User-Role', 'customer');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 without X-User-Id header', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .get(`/orders/${fakeId}`)
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 without X-Internal-Key', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .get(`/orders/${fakeId}`)
        .set('X-User-Id', USER_ID)
        .set('X-User-Role', 'customer');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});

describe('PATCH /orders/:id/status', () => {
  describe('successful scenarios', () => {
    it('should return 200 for admin: pending -> confirmed', async () => {
      const created = await createOrder();
      const orderId = created.body.data.id;

      const res = await request(app)
        .patch(`/orders/${orderId}/status`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', ADMIN_ID)
        .set('X-User-Role', 'admin')
        .send({ status: 'confirmed' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('confirmed');
    });

    it('should return 200 for admin: confirmed -> shipped', async () => {
      const created = await createOrder();
      const orderId = created.body.data.id;

      await request(app)
        .patch(`/orders/${orderId}/status`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', ADMIN_ID)
        .set('X-User-Role', 'admin')
        .send({ status: 'confirmed' });

      const res = await request(app)
        .patch(`/orders/${orderId}/status`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', ADMIN_ID)
        .set('X-User-Role', 'admin')
        .send({ status: 'shipped' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('shipped');
    });

    it('should return 200 for admin: shipped -> delivered', async () => {
      const created = await createOrder();
      const orderId = created.body.data.id;

      await request(app)
        .patch(`/orders/${orderId}/status`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', ADMIN_ID)
        .set('X-User-Role', 'admin')
        .send({ status: 'confirmed' });

      await request(app)
        .patch(`/orders/${orderId}/status`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', ADMIN_ID)
        .set('X-User-Role', 'admin')
        .send({ status: 'shipped' });

      const res = await request(app)
        .patch(`/orders/${orderId}/status`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', ADMIN_ID)
        .set('X-User-Role', 'admin')
        .send({ status: 'delivered' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('delivered');
    });

    it('should return 200 for admin: pending -> cancelled', async () => {
      const created = await createOrder();
      const orderId = created.body.data.id;

      const res = await request(app)
        .patch(`/orders/${orderId}/status`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', ADMIN_ID)
        .set('X-User-Role', 'admin')
        .send({ status: 'cancelled' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('cancelled');
    });

    it('should return 200 for owner: pending -> cancelled', async () => {
      const created = await createOrder();
      const orderId = created.body.data.id;

      const res = await request(app)
        .patch(`/orders/${orderId}/status`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', USER_ID)
        .set('X-User-Role', 'customer')
        .send({ status: 'cancelled' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('cancelled');
    });

    it('should verify status change persists after PATCH', async () => {
      const created = await createOrder();
      const orderId = created.body.data.id;

      await request(app)
        .patch(`/orders/${orderId}/status`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', ADMIN_ID)
        .set('X-User-Role', 'admin')
        .send({ status: 'confirmed' });

      const res = await request(app)
        .get(`/orders/${orderId}`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', USER_ID)
        .set('X-User-Role', 'customer');

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('confirmed');
      expect(new Date(res.body.data.updatedAt).getTime())
        .toBeGreaterThanOrEqual(new Date(res.body.data.createdAt).getTime());
    });
  });

  describe('error scenarios', () => {
    it('should return 400 for invalid transition: delivered -> confirmed (terminal)', async () => {
      const created = await createOrder();
      const orderId = created.body.data.id;

      await request(app)
        .patch(`/orders/${orderId}/status`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', ADMIN_ID)
        .set('X-User-Role', 'admin')
        .send({ status: 'confirmed' });

      await request(app)
        .patch(`/orders/${orderId}/status`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', ADMIN_ID)
        .set('X-User-Role', 'admin')
        .send({ status: 'shipped' });

      await request(app)
        .patch(`/orders/${orderId}/status`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', ADMIN_ID)
        .set('X-User-Role', 'admin')
        .send({ status: 'delivered' });

      const res = await request(app)
        .patch(`/orders/${orderId}/status`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', ADMIN_ID)
        .set('X-User-Role', 'admin')
        .send({ status: 'confirmed' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('should return 400 for invalid transition: cancelled -> confirmed (terminal)', async () => {
      const created = await createOrder();
      const orderId = created.body.data.id;

      await request(app)
        .patch(`/orders/${orderId}/status`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', ADMIN_ID)
        .set('X-User-Role', 'admin')
        .send({ status: 'cancelled' });

      const res = await request(app)
        .patch(`/orders/${orderId}/status`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', ADMIN_ID)
        .set('X-User-Role', 'admin')
        .send({ status: 'confirmed' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('should return 400 for invalid status string', async () => {
      const created = await createOrder();
      const orderId = created.body.data.id;

      const res = await request(app)
        .patch(`/orders/${orderId}/status`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', ADMIN_ID)
        .set('X-User-Role', 'admin')
        .send({ status: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for status "pending" (not in updateStatusSchema enum)', async () => {
      const created = await createOrder();
      const orderId = created.body.data.id;

      const res = await request(app)
        .patch(`/orders/${orderId}/status`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', ADMIN_ID)
        .set('X-User-Role', 'admin')
        .send({ status: 'pending' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 for customer trying admin-only transition (pending -> confirmed)', async () => {
      const created = await createOrder();
      const orderId = created.body.data.id;

      const res = await request(app)
        .patch(`/orders/${orderId}/status`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', USER_ID)
        .set('X-User-Role', 'customer')
        .send({ status: 'confirmed' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 403 for non-owner customer trying to cancel', async () => {
      const created = await createOrder();
      const orderId = created.body.data.id;

      const res = await request(app)
        .patch(`/orders/${orderId}/status`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', OTHER_USER_ID)
        .set('X-User-Role', 'customer')
        .send({ status: 'cancelled' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 404 when order not found', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .patch(`/orders/${fakeId}/status`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', ADMIN_ID)
        .set('X-User-Role', 'admin')
        .send({ status: 'confirmed' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid ObjectId', async () => {
      const res = await request(app)
        .patch('/orders/invalid-id/status')
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', ADMIN_ID)
        .set('X-User-Role', 'admin')
        .send({ status: 'confirmed' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 without X-User-Id header', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .patch(`/orders/${fakeId}/status`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ status: 'confirmed' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 without X-Internal-Key', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .patch(`/orders/${fakeId}/status`)
        .set('X-User-Id', ADMIN_ID)
        .set('X-User-Role', 'admin')
        .send({ status: 'confirmed' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
