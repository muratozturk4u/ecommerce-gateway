import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthService } from '../src/services/auth.service';
import { IUserRepository } from '../src/interfaces/user-repository.interface';
import { IUserDocument } from '../src/interfaces/user.interface';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  const mockUser = {
    id: '507f1f77bcf86cd799439011',
    _id: '507f1f77bcf86cd799439011',
    email: 'test@test.com',
    passwordHash: '$2b$10$hashedpassword',
    name: 'Test User',
    role: 'customer' as const,
    createdAt: new Date('2026-03-28T10:00:00.000Z'),
    updatedAt: new Date('2026-03-28T10:00:00.000Z')
  } as unknown as IUserDocument;

  beforeEach(() => {
    mockUserRepository = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn()
    };
    authService = new AuthService(mockUserRepository, 'test-jwt-secret', '24h');
  });

  describe('register', () => {
    it('should create user with hashed password and return token', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await authService.register({
        email: 'test@test.com',
        password: 'password123',
        name: 'Test User'
      });

      expect(result.user).toEqual({
        id: mockUser.id,
        email: 'test@test.com',
        name: 'Test User',
        role: 'customer'
      });
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');

      const createCall = mockUserRepository.create.mock.calls[0][0];
      expect(createCall.passwordHash).not.toBe('password123');
      expect(createCall.email).toBe('test@test.com');
    });

    it('should always set role to customer', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);

      await authService.register({
        email: 'test@test.com',
        password: 'password123',
        name: 'Test User'
      });

      const createCall = mockUserRepository.create.mock.calls[0][0];
      expect(createCall.role).toBe('customer');
    });

    it('should throw 409 when email already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(
        authService.register({
          email: 'test@test.com',
          password: 'password123',
          name: 'Test User'
        })
      ).rejects.toEqual(
        expect.objectContaining({ status: 409, code: 'CONFLICT' })
      );
    });
  });

  describe('login', () => {
    it('should return token with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const userWithHash = { ...mockUser, passwordHash: hashedPassword } as unknown as IUserDocument;
      mockUserRepository.findByEmail.mockResolvedValue(userWithHash);

      const result = await authService.login({
        email: 'test@test.com',
        password: 'password123'
      });

      expect(result.user).toEqual({
        id: mockUser.id,
        email: 'test@test.com',
        name: 'Test User',
        role: 'customer'
      });
      expect(result.token).toBeDefined();

      const decoded = jwt.verify(result.token, 'test-jwt-secret') as { userId: string; role: string };
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.role).toBe('customer');
    });

    it('should throw 401 with wrong password', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const userWithHash = { ...mockUser, passwordHash: hashedPassword } as unknown as IUserDocument;
      mockUserRepository.findByEmail.mockResolvedValue(userWithHash);

      await expect(
        authService.login({ email: 'test@test.com', password: 'wrongpassword' })
      ).rejects.toEqual(
        expect.objectContaining({ status: 401, code: 'UNAUTHORIZED' })
      );
    });

    it('should throw 401 with non-existent email', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'noone@test.com', password: 'password123' })
      ).rejects.toEqual(
        expect.objectContaining({ status: 401, code: 'UNAUTHORIZED' })
      );
    });
  });

  describe('getProfile', () => {
    it('should return user data without passwordHash', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const profile = await authService.getProfile('507f1f77bcf86cd799439011');

      expect(profile).toEqual({
        id: mockUser.id,
        email: 'test@test.com',
        name: 'Test User',
        role: 'customer',
        createdAt: mockUser.createdAt
      });
      expect((profile as unknown as Record<string, unknown>)['passwordHash']).toBeUndefined();
    });

    it('should throw 404 when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        authService.getProfile('507f1f77bcf86cd799439011')
      ).rejects.toEqual(
        expect.objectContaining({ status: 404, code: 'NOT_FOUND' })
      );
    });
  });
});
