import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { IAuthService, RegisterDto, LoginDto, AuthResponse, UserProfile } from '../interfaces/auth-service.interface';
import { IUserRepository } from '../interfaces/user-repository.interface';
import { ConflictError, AuthenticationError, NotFoundError } from '../utils/errors';

export class AuthService implements IAuthService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtSecret: string,
    private readonly jwtExpiresIn: SignOptions['expiresIn']
  ) {}

  async register(data: RegisterDto): Promise<AuthResponse> {
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictError('Email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, this.SALT_ROUNDS);

    const user = await this.userRepository.create({
      email: data.email,
      passwordHash,
      name: data.name,
      role: 'customer'
    });

    const token = this.generateToken(user.id, user.role);

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token
    };
  }

  async login(data: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepository.findByEmail(data.email);
    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Invalid credentials');
    }

    const token = this.generateToken(user.id, user.role);

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token
    };
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt
    };
  }

  private generateToken(userId: string, role: string): string {
    return jwt.sign(
      { userId, role },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn }
    );
  }
}
