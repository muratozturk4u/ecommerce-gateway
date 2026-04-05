import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app';
import { CategoryModel } from '../src/models/category.model';
import { Express } from 'express';

const INTERNAL_KEY = 'test-internal-key';

describe('Category Routes', () => {
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
  });

  const createCategory = (name: string, description?: string) =>
    request(app)
      .post('/categories')
      .set('X-Internal-Key', INTERNAL_KEY)
      .send({ name, description });

  describe('GET /categories', () => {
    it('should return 200 with empty array when no categories', async () => {
      const res = await request(app)
        .get('/categories')
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('should return 200 with all categories sorted by name', async () => {
      await createCategory('Giyim', 'Giyim urunleri');
      await createCategory('Elektronik', 'Elektronik urunler');

      const res = await request(app)
        .get('/categories')
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].name).toBe('Elektronik');
      expect(res.body.data[1].name).toBe('Giyim');
    });

    it('should return 403 without X-Internal-Key', async () => {
      const res = await request(app).get('/categories');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /categories/:id', () => {
    it('should return 200 with category data', async () => {
      const created = await createCategory('Elektronik', 'Elektronik urunler');
      const id = created.body.data.id;

      const res = await request(app)
        .get(`/categories/${id}`)
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Elektronik');
      expect(res.body.data.description).toBe('Elektronik urunler');
    });

    it('should return 404 when category not found', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/categories/${fakeId}`)
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 when id is invalid ObjectId', async () => {
      const res = await request(app)
        .get('/categories/invalid-id')
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 without X-Internal-Key', async () => {
      const res = await request(app).get('/categories/someid');

      expect(res.status).toBe(403);
    });
  });

  describe('POST /categories', () => {
    it('should return 201 with created category', async () => {
      const res = await createCategory('Elektronik', 'Elektronik urunler');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Elektronik');
      expect(res.body.data.description).toBe('Elektronik urunler');
      expect(res.body.data.id).toBeDefined();
    });

    it('should return 201 with timestamps in response', async () => {
      const res = await createCategory('Elektronik');

      expect(res.body.data.createdAt).toBeDefined();
      expect(res.body.data.updatedAt).toBeDefined();
    });

    it('should return 201 with description when provided', async () => {
      const res = await createCategory('Elektronik', 'Desc here');

      expect(res.body.data.description).toBe('Desc here');
    });

    it('should return 201 without description when not provided', async () => {
      const res = await request(app)
        .post('/categories')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ name: 'Elektronik' });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Elektronik');
    });

    it('should return 201 with unicode/Turkish characters in name', async () => {
      const res = await createCategory('Ev & Yaşam');

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Ev & Yaşam');
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/categories')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ description: 'No name' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when name is shorter than 2 characters', async () => {
      const res = await createCategory('A');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when name exceeds 100 characters', async () => {
      const res = await createCategory('a'.repeat(101));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when description exceeds 1000 characters', async () => {
      const res = await createCategory('Elektronik', 'a'.repeat(1001));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when body is empty {}', async () => {
      const res = await request(app)
        .post('/categories')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when name is whitespace only', async () => {
      const res = await createCategory('   ');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle regex injection attempt in name safely', async () => {
      const res = await createCategory('.*');

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('.*');

      const res2 = await createCategory('Test Category');
      expect(res2.status).toBe(201);
    });

    it('should return 409 when category name already exists', async () => {
      await createCategory('Elektronik');
      const res = await createCategory('Elektronik');

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should return 409 for case-insensitive duplicate name', async () => {
      await createCategory('Elektronik');
      const res = await createCategory('elektronik');

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should return 403 without X-Internal-Key', async () => {
      const res = await request(app)
        .post('/categories')
        .send({ name: 'Elektronik' });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /categories/:id', () => {
    let categoryId: string;

    beforeEach(async () => {
      const res = await createCategory('Elektronik', 'Elektronik urunler');
      categoryId = res.body.data.id;
    });

    it('should return 200 with updated category (name change)', async () => {
      const res = await request(app)
        .put(`/categories/${categoryId}`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ name: 'Teknoloji' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Teknoloji');
    });

    it('should return 200 with updated category (description only)', async () => {
      const res = await request(app)
        .put(`/categories/${categoryId}`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ description: 'Yeni aciklama' });

      expect(res.status).toBe(200);
      expect(res.body.data.description).toBe('Yeni aciklama');
    });

    it('should return 200 and preserve name when only description sent', async () => {
      const res = await request(app)
        .put(`/categories/${categoryId}`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ description: 'Updated' });

      expect(res.body.data.name).toBe('Elektronik');
    });

    it('should return 200 when updating name to same value (own name)', async () => {
      const res = await request(app)
        .put(`/categories/${categoryId}`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ name: 'Elektronik' });

      expect(res.status).toBe(200);
    });

    it('should return 200 when setting description to empty string', async () => {
      const res = await request(app)
        .put(`/categories/${categoryId}`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ description: '' });

      expect(res.status).toBe(200);
      expect(res.body.data.description).toBe('');
    });

    it('should return 404 when category not found', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .put(`/categories/${fakeId}`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 when id is invalid ObjectId', async () => {
      const res = await request(app)
        .put('/categories/invalid-id')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ name: 'Updated' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when name is shorter than 2 characters', async () => {
      const res = await request(app)
        .put(`/categories/${categoryId}`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ name: 'A' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when body is empty (no fields)', async () => {
      const res = await request(app)
        .put(`/categories/${categoryId}`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 when updating name to existing name', async () => {
      await createCategory('Giyim');

      const res = await request(app)
        .put(`/categories/${categoryId}`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ name: 'Giyim' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should return 409 for case-insensitive duplicate on update', async () => {
      await createCategory('Giyim');

      const res = await request(app)
        .put(`/categories/${categoryId}`)
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ name: 'giyim' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should return 403 without X-Internal-Key', async () => {
      const res = await request(app)
        .put(`/categories/${categoryId}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /categories/:id', () => {
    let categoryId: string;

    beforeEach(async () => {
      const res = await createCategory('Elektronik');
      categoryId = res.body.data.id;
    });

    it('should return 204 when deleted successfully', async () => {
      const res = await request(app)
        .delete(`/categories/${categoryId}`)
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(204);
    });

    it('should return 204 with no response body', async () => {
      const res = await request(app)
        .delete(`/categories/${categoryId}`)
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.body).toEqual({});
    });

    it('should return 404 when category not found', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .delete(`/categories/${fakeId}`)
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 when id is invalid ObjectId', async () => {
      const res = await request(app)
        .delete('/categories/invalid-id')
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 without X-Internal-Key', async () => {
      const res = await request(app)
        .delete(`/categories/${categoryId}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /health', () => {
    it('should return 200 without X-Internal-Key (bypass)', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.service).toBe('product-service');
    });
  });

  describe('Response format', () => {
    it('should return { success: true, data } on success', async () => {
      const res = await createCategory('Elektronik');

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('name');
    });

    it('should return { success: false, error: { code, message } } on error', async () => {
      const res = await request(app)
        .get('/categories/invalid-id')
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code');
      expect(res.body.error).toHaveProperty('message');
    });
  });
});
