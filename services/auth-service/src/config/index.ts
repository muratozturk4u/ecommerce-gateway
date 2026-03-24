import dotenv from 'dotenv';
dotenv.config();

export class Config {
  static readonly PORT: number = parseInt(process.env.PORT || '3001', 10);
  static readonly MONGODB_URI: string = (process.env.MONGODB_URI || 'mongodb://localhost:27017') + '/auth_db';
  static readonly INTERNAL_KEY: string = process.env.INTERNAL_KEY || 'default-internal-key';
  static readonly JWT_SECRET: string = process.env.JWT_SECRET || 'default-jwt-secret';
  static readonly JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '24h';
  static readonly LOG_LEVEL: string = process.env.LOG_LEVEL || 'info';
  static readonly NODE_ENV: string = process.env.NODE_ENV || 'development';
  static readonly SERVICE_NAME: string = 'auth-service';
}
