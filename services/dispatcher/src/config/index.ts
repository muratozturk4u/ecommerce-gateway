import dotenv from 'dotenv';
dotenv.config();

export class Config {
  static readonly PORT: number = parseInt(process.env.PORT || '3000', 10);
  static readonly MONGODB_URI: string = (process.env.MONGODB_URI || 'mongodb://localhost:27017') + '/dispatcher_db';
  static readonly SERVICE_NAME: string = 'dispatcher';
  static readonly LOG_LEVEL: string = process.env.LOG_LEVEL || 'info';
  static readonly NODE_ENV: string = process.env.NODE_ENV || 'development';
  static readonly INTERNAL_KEY: string = process.env.INTERNAL_KEY || 'default-internal-key';
  static readonly JWT_SECRET: string = process.env.JWT_SECRET || 'default-jwt-secret';
  static readonly JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '24h';
  static readonly AUTH_SERVICE_URL: string = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
  static readonly PRODUCT_SERVICE_URL: string = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';
  static readonly ORDER_SERVICE_URL: string = process.env.ORDER_SERVICE_URL || 'http://localhost:3003';
}
