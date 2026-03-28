import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app';
import { CategoryModel } from '../src/models/category.model';
import { ProductModel } from '../src/models/product.model';
import { Express } from 'express';

const INTERNAL_KEY = 'test-internal-key';

describe('Product Routes', () => {
  let app: Express;
  let mongoServer: MongoMemoryServer;

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
    await CategoryModel.deleteMany({});
    await ProductModel.deleteMany({});
  });

  const createCategory = (name: string) =>
    request(app)
      .post('/categories')
      .set('X-Internal-Key', INTERNAL_KEY)
      .send({ name });

  const createProduct = (data: Record<string, unknown>) =>
    request(app)
      .post('/products')
      .set('X-Internal-Key', INTERNAL_KEY)
      .send(data);

  const defaultProduct = { name: 'Test Product', price: 100, stock: 50 };

  describe('POST /products', () => {
    it('should return 201 with created product', async () => {
      const res = await createProduct(defaultProduct);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Test Product');
      expect(res.body.data.price).toBe(100);
      expect(res.body.data.stock).toBe(50);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.isActive).toBe(true);
      expect(res.body.data.createdAt).toBeDefined();
      expect(res.body.data.updatedAt).toBeDefined();
    });

    it('should return 201 with only required fields (name, price, stock)', async () => {
      const res = await createProduct({ name: 'Minimal Product', price: 10, stock: 0 });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Minimal Product');
      expect(res.body.data.price).toBe(10);
      expect(res.body.data.stock).toBe(0);
    });

    it('should return 201 with valid categoryId', async () => {
      const catRes = await createCategory('Elektronik');
      const categoryId = catRes.body.data.id;

      const res = await createProduct({ ...defaultProduct, categoryId });

      expect(res.status).toBe(201);
      expect(res.body.data.categoryId).toBe(categoryId);
    });

    it('should return 400 when name is missing', async () => {
      const res = await createProduct({ price: 100, stock: 50 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when name is too short', async () => {
      const res = await createProduct({ name: 'A', price: 100, stock: 50 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when price is negative', async () => {
      const res = await createProduct({ name: 'Test Product', price: -10, stock: 50 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when price is zero', async () => {
      const res = await createProduct({ name: 'Test Product', price: 0, stock: 50 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when stock is negative', async () => {
      const res = await createProduct({ name: 'Test Product', price: 100, stock: -5 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when imageUrl is invalid', async () => {
      const res = await createProduct({ ...defaultProduct, imageUrl: 'not-a-url' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when categoryId does not exist', async () => {
      const fakeCategoryId = new mongoose.Types.ObjectId().toString();
      const res = await createProduct({ ...defaultProduct, categoryId: fakeCategoryId });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 with empty body', async () => {
      const res = await createProduct({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 without X-Internal-Key', async () => {
      const res = await request(app)
        .post('/products')
        .send(defaultProduct);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /products', () => {
    it('should return 200 with paginated products', async () => {
      await createProduct(defaultProduct);

      const res = await request(app)
        .get('/products')
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(10);
      expect(res.body.meta.total).toBe(1);
      expect(res.body.meta.totalPages).toBe(1);
    });

    it('should return 200 with correct meta for multiple products', async () => {
      await createProduct({ name: 'Product A', price: 10, stock: 5 });
      await createProduct({ name: 'Product B', price: 20, stock: 10 });
      await createProduct({ name: 'Product C', price: 30, stock: 15 });

      const res = await request(app)
        .get('/products?limit=2')
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.total).toBe(3);
      expect(res.body.meta.totalPages).toBe(2);
    });

    it('should return 200 with page=2 and correct offset', async () => {
      await createProduct({ name: 'Product A', price: 10, stock: 5 });
      await createProduct({ name: 'Product B', price: 20, stock: 10 });
      await createProduct({ name: 'Product C', price: 30, stock: 15 });

      const res = await request(app)
        .get('/products?page=2&limit=2')
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.page).toBe(2);
    });

    it('should return 200 with text search results', async () => {
      await createProduct({ name: 'Wireless Keyboard', price: 50, stock: 10 });
      await createProduct({ name: 'Gaming Mouse', price: 30, stock: 20 });
      await createProduct({ name: 'USB Cable', price: 5, stock: 100 });

      const res = await request(app)
        .get('/products?search=Keyboard')
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].name).toContain('Keyboard');
    });

    it('should return 200 filtered by categoryId', async () => {
      const catRes = await createCategory('Elektronik');
      const categoryId = catRes.body.data.id;

      await createProduct({ name: 'Product A', price: 10, stock: 5, categoryId });
      await createProduct({ name: 'Product B', price: 20, stock: 10 });

      const res = await request(app)
        .get(`/products?categoryId=${categoryId}`)
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Product A');
    });

    it('should return 200 filtered by price range', async () => {
      await createProduct({ name: 'Cheap Item', price: 10, stock: 5 });
      await createProduct({ name: 'Mid Item', price: 100, stock: 10 });
      await createProduct({ name: 'Expensive Item', price: 500, stock: 2 });

      const res = await request(app)
        .get('/products?minPrice=50&maxPrice=150')
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Mid Item');
    });

    it('should return 200 sorted by name ascending', async () => {
      await createProduct({ name: 'Zebra', price: 10, stock: 5 });
      await createProduct({ name: 'Apple', price: 20, stock: 10 });

      const res = await request(app)
        .get('/products?sortBy=name&sortOrder=asc')
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(200);
      expect(res.body.data[0].name).toBe('Apple');
      expect(res.body.data[1].name).toBe('Zebra');
    });

    it('should return 200 sorted by price descending', async () => {
      await createProduct({ name: 'Cheap', price: 10, stock: 5 });
      await createProduct({ name: 'Expensive', price: 500, stock: 2 });

      const res = await request(app)
        .get('/products?sortBy=price&sortOrder=desc')
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(200);
      expect(res.body.data[0].name).toBe('Expensive');
      expect(res.body.data[1].name).toBe('Cheap');
    });

    it('should return 200 with empty array when no products', async () => {
      const res = await request(app)
        .get('/products')
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });

    it('should return 200 with empty array when page exceeds totalPages', async () => {
      await createProduct(defaultProduct);

      const res = await request(app)
        .get('/products?page=999')
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should return 200 only with isActive=true products', async () => {
      await createProduct({ name: 'Active Product', price: 50, stock: 10 });
      const inactiveRes = await createProduct({ name: 'Inactive Product', price: 30, stock: 5 });
      const inactiveId = inactiveRes.body.data.id;

      await request(app)
        .put(`/products/${inactiveId}`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ isActive: false });

      const res = await request(app)
        .get('/products')
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Active Product');
    });

    it('should return 400 when minPrice > maxPrice', async () => {
      const res = await request(app)
        .get('/products?minPrice=200&maxPrice=100')
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 without X-Internal-Key', async () => {
      const res = await request(app).get('/products');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /products/:id', () => {
    it('should return 200 with product', async () => {
      const created = await createProduct(defaultProduct);
      const id = created.body.data.id;

      const res = await request(app)
        .get(`/products/${id}`)
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Test Product');
      expect(res.body.data.price).toBe(100);
      expect(res.body.data.stock).toBe(50);
    });

    it('should return 200 with inactive product (accessible by direct id)', async () => {
      const created = await createProduct(defaultProduct);
      const id = created.body.data.id;

      await request(app)
        .put(`/products/${id}`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ isActive: false });

      const res = await request(app)
        .get(`/products/${id}`)
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });

    it('should return 404 when product not found', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/products/${fakeId}`)
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 when id is invalid ObjectId', async () => {
      const res = await request(app)
        .get('/products/invalid-id')
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 without X-Internal-Key', async () => {
      const res = await request(app).get('/products/someid');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('PUT /products/:id', () => {
    let productId: string;

    beforeEach(async () => {
      const res = await createProduct(defaultProduct);
      productId = res.body.data.id;
    });

    it('should return 200 with updated product', async () => {
      const res = await request(app)
        .put(`/products/${productId}`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ name: 'Updated Product', price: 200, stock: 100 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Product');
      expect(res.body.data.price).toBe(200);
      expect(res.body.data.stock).toBe(100);
    });

    it('should return 200 with partial update (name only)', async () => {
      const res = await request(app)
        .put(`/products/${productId}`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ name: 'New Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('New Name');
      expect(res.body.data.price).toBe(100);
      expect(res.body.data.stock).toBe(50);
    });

    it('should return 404 when product not found', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .put(`/products/${fakeId}`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 with empty body', async () => {
      const res = await request(app)
        .put(`/products/${productId}`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when id is invalid ObjectId', async () => {
      const res = await request(app)
        .put('/products/invalid-id')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ name: 'Updated' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when new categoryId does not exist', async () => {
      const fakeCategoryId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .put(`/products/${productId}`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ categoryId: fakeCategoryId });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 without X-Internal-Key', async () => {
      const res = await request(app)
        .put(`/products/${productId}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('DELETE /products/:id', () => {
    let productId: string;

    beforeEach(async () => {
      const res = await createProduct(defaultProduct);
      productId = res.body.data.id;
    });

    it('should return 204 when deleted', async () => {
      const res = await request(app)
        .delete(`/products/${productId}`)
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
    });

    it('should return 404 when product not found', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .delete(`/products/${fakeId}`)
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 when id is invalid ObjectId', async () => {
      const res = await request(app)
        .delete('/products/invalid-id')
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 without X-Internal-Key', async () => {
      const res = await request(app)
        .delete(`/products/${productId}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('PATCH /products/:id/stock', () => {
    let productId: string;

    beforeEach(async () => {
      const res = await createProduct(defaultProduct);
      productId = res.body.data.id;
    });

    it('should return 200 when stock increased', async () => {
      const res = await request(app)
        .patch(`/products/${productId}/stock`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ quantity: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stock).toBe(60);
    });

    it('should return 200 when stock decreased', async () => {
      const res = await request(app)
        .patch(`/products/${productId}/stock`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ quantity: -10 });

      expect(res.status).toBe(200);
      expect(res.body.data.stock).toBe(40);
    });

    it('should return 200 when stock reaches exactly 0', async () => {
      const created = await createProduct({ name: 'Low Stock', price: 10, stock: 5 });
      const id = created.body.data.id;

      const res = await request(app)
        .patch(`/products/${id}/stock`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ quantity: -5 });

      expect(res.status).toBe(200);
      expect(res.body.data.stock).toBe(0);
    });

    it('should return 400 when stock would go negative (INSUFFICIENT_STOCK)', async () => {
      const res = await request(app)
        .patch(`/products/${productId}/stock`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ quantity: -51 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    });

    it('should return 400 when quantity is 0', async () => {
      const res = await request(app)
        .patch(`/products/${productId}/stock`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ quantity: 0 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when quantity exceeds +1,000,000', async () => {
      const res = await request(app)
        .patch(`/products/${productId}/stock`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ quantity: 1000001 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when quantity exceeds -1,000,000', async () => {
      const res = await request(app)
        .patch(`/products/${productId}/stock`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ quantity: -1000001 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when quantity is missing', async () => {
      const res = await request(app)
        .patch(`/products/${productId}/stock`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when quantity is float', async () => {
      const res = await request(app)
        .patch(`/products/${productId}/stock`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ quantity: 1.5 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 when product not found', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .patch(`/products/${fakeId}/stock`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ quantity: 10 });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 when id is invalid ObjectId', async () => {
      const res = await request(app)
        .patch('/products/invalid-id/stock')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ quantity: 10 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 without X-Internal-Key', async () => {
      const res = await request(app)
        .patch(`/products/${productId}/stock`)
        .send({ quantity: 10 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Category DELETE RESTRICT', () => {
    it('should return 409 when deleting category with products', async () => {
      const catRes = await createCategory('Elektronik');
      const categoryId = catRes.body.data.id;

      await createProduct({ ...defaultProduct, categoryId });

      const res = await request(app)
        .delete(`/categories/${categoryId}`)
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should return 204 when deleting category after all products removed', async () => {
      const catRes = await createCategory('Elektronik');
      const categoryId = catRes.body.data.id;

      const productRes = await createProduct({ ...defaultProduct, categoryId });
      const productId = productRes.body.data.id;

      await request(app)
        .delete(`/products/${productId}`)
        .set('X-Internal-Key', INTERNAL_KEY);

      const res = await request(app)
        .delete(`/categories/${categoryId}`)
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(204);
    });
  });
});
