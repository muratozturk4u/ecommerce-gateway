import dotenv from 'dotenv';
dotenv.config();

export class Config {
  static readonly PORT: number = parseInt(process.env.PORT || '3000', 10);
  static readonly MONGODB_URI: string = (process.env.MONGODB_URI || 'mongodb://localhost:27017') + '/dispatcher_db';
  static readonly SERVICE_NAME: string = 'dispatcher';
  static readonly LOG_LEVEL: string = process.env.LOG_LEVEL || 'info';
  static readonly NODE_ENV: string = process.env.NODE_ENV || 'development';
  static readonly INTERNAL_KEY: string = (() => {
    if (process.env.INTERNAL_KEY) return process.env.INTERNAL_KEY;
    if (process.env.NODE_ENV === 'production') {
      throw new Error('INTERNAL_KEY must be set in production');
    }
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[CONFIG] INTERNAL_KEY not set — using insecure default (non-production only)');
    }
    return 'insecure-default-internal-key';
  })();
  static readonly JWT_SECRET: string = (() => {
    if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[CONFIG] JWT_SECRET not set — using insecure default (non-production only)');
    }
    return 'insecure-default-jwt-secret';
  })();
  static readonly JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '24h';
  static readonly AUTH_SERVICE_URL: string = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
  static readonly PRODUCT_SERVICE_URL: string = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';
  static readonly ORDER_SERVICE_URL: string = process.env.ORDER_SERVICE_URL || 'http://localhost:3003';
  static readonly RATE_LIMIT_WINDOW_MS: number = parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000), 10);
  static readonly RATE_LIMIT_MAX: number = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);
}
