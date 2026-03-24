import dotenv from 'dotenv';
dotenv.config();

export class Config {
  static readonly PORT: number = parseInt(process.env.PORT || '3000', 10);
  static readonly MONGODB_URI: string = (process.env.MONGODB_URI || 'mongodb://localhost:27017') + '/dispatcher_db';
  static readonly SERVICE_NAME: string = 'dispatcher';
  static readonly LOG_LEVEL: string = process.env.LOG_LEVEL || 'info';
  static readonly NODE_ENV: string = process.env.NODE_ENV || 'development';
}
