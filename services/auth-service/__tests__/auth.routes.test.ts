import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { createApp } from '../src/app';
import { UserModel } from '../src/models/user.model';
import { Express } from 'express';

const INTERNAL_KEY = 'test-internal-key';

describe('Auth Routes', () => {
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
    await UserModel.deleteMany({});
  });

  describe('POST /auth/register', () => {
    it('should return 201 with user and token', async () => {
      const res = await request(app)
        .post('/auth/register')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ email: 'test@test.com', password: 'password123', name: 'Test User' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('test@test.com');
      expect(res.body.data.user.name).toBe('Test User');
      expect(res.body.data.user.role).toBe('customer');
      expect(res.body.data.user.id).toBeDefined();
      expect(res.body.data.token).toBeDefined();
    });

    it('should return 409 when email already exists', async () => {
      await request(app)
        .post('/auth/register')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ email: 'test@test.com', password: 'password123', name: 'Test User' });

      const res = await request(app)
        .post('/auth/register')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ email: 'test@test.com', password: 'password456', name: 'Other User' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should return 409 with same email different case (case insensitive)', async () => {
      await request(app)
        .post('/auth/register')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ email: 'test@test.com', password: 'password123', name: 'Test User' });

      const res = await request(app)
        .post('/auth/register')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ email: 'TEST@TEST.COM', password: 'password456', name: 'Other User' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should return 400 with invalid email format', async () => {
      const res = await request(app)
        .post('/auth/register')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ email: 'notanemail', password: 'password123', name: 'Test User' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 with short password (< 6 chars)', async () => {
      const res = await request(app)
        .post('/auth/register')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ email: 'test@test.com', password: '12345', name: 'Test User' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 with too long password (> 128 chars)', async () => {
      const res = await request(app)
        .post('/auth/register')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ email: 'test@test.com', password: 'a'.repeat(129), name: 'Test User' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 with short name (< 2 chars)', async () => {
      const res = await request(app)
        .post('/auth/register')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ email: 'test@test.com', password: 'password123', name: 'A' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 with missing fields', async () => {
      const res = await request(app)
        .post('/auth/register')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 with empty body {}', async () => {
      const res = await request(app)
        .post('/auth/register')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 without X-Internal-Key', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'test@test.com', password: 'password123', name: 'Test User' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 403 with wrong X-Internal-Key', async () => {
      const res = await request(app)
        .post('/auth/register')
        .set('X-Internal-Key', 'wrong-key')
        .send({ email: 'test@test.com', password: 'password123', name: 'Test User' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should always assign customer role (ignore extra role field)', async () => {
      const res = await request(app)
        .post('/auth/register')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ email: 'admin@test.com', password: 'password123', name: 'Admin User', role: 'admin' });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('customer');
    });

    it('should hash password with bcrypt (not plaintext in DB)', async () => {
      await request(app)
        .post('/auth/register')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ email: 'test@test.com', password: 'password123', name: 'Test User' });

      const user = await UserModel.findOne({ email: 'test@test.com' });
      expect(user).not.toBeNull();
      expect(user!.passwordHash).not.toBe('password123');
      const isMatch = await bcrypt.compare('password123', user!.passwordHash);
      expect(isMatch).toBe(true);
    });

    it('should return valid JWT with correct payload (userId, role)', async () => {
      const res = await request(app)
        .post('/auth/register')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ email: 'test@test.com', password: 'password123', name: 'Test User' });

      const decoded = jwt.verify(res.body.data.token, 'test-jwt-secret') as { userId: string; role: string };
      expect(decoded.userId).toBeDefined();
      expect(decoded.role).toBe('customer');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/auth/register')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ email: 'login@test.com', password: 'password123', name: 'Login User' });
    });

    it('should return 200 with token for valid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ email: 'login@test.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('login@test.com');
      expect(res.body.data.token).toBeDefined();
    });

    it('should return 401 with wrong password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ email: 'login@test.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 with non-existent email', async () => {
      const res = await request(app)
        .post('/auth/login')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ email: 'noone@test.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 with missing email', async () => {
      const res = await request(app)
        .post('/auth/login')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 with missing password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ email: 'login@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 without X-Internal-Key', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'login@test.com', password: 'password123' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /auth/profile', () => {
    let userId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/auth/register')
        .set('X-Internal-Key', INTERNAL_KEY)
        .send({ email: 'profile@test.com', password: 'password123', name: 'Profile User' });

      userId = res.body.data.user.id;
    });

    it('should return 200 with user profile', async () => {
      const res = await request(app)
        .get('/auth/profile')
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', userId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('profile@test.com');
      expect(res.body.data.name).toBe('Profile User');
      expect(res.body.data.role).toBe('customer');
      expect(res.body.data.createdAt).toBeDefined();
    });

    it('should not include passwordHash in response', async () => {
      const res = await request(app)
        .get('/auth/profile')
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', userId);

      expect(res.status).toBe(200);
      expect(res.body.data.passwordHash).toBeUndefined();
      expect(res.body.data.password).toBeUndefined();
    });

    it('should return 404 with non-existent userId', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get('/auth/profile')
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', fakeId);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 without X-User-Id header', async () => {
      const res = await request(app)
        .get('/auth/profile')
        .set('X-Internal-Key', INTERNAL_KEY);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 with invalid ObjectId format in X-User-Id', async () => {
      const res = await request(app)
        .get('/auth/profile')
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-User-Id', 'invalid-id');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 without X-Internal-Key', async () => {
      const res = await request(app)
        .get('/auth/profile')
        .set('X-User-Id', userId);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /health', () => {
    it('should return 200 without X-Internal-Key (bypass)', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
    });

    it('should return service name as auth-service', async () => {
      const res = await request(app).get('/health');

      expect(res.body.data.service).toBe('auth-service');
    });
  });
});
