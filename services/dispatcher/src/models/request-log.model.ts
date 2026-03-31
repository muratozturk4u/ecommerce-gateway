import mongoose, { Schema, Document } from 'mongoose';

export interface IRequestLog {
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  userId?: string;
  targetService?: string;
  timestamp: Date;
}

export interface IRequestLogDocument extends IRequestLog, Document {}

const requestLogSchema = new Schema<IRequestLogDocument>({
  method: { type: String, required: true },
  path: { type: String, required: true },
  statusCode: { type: Number, required: true },
  responseTime: { type: Number, required: true },
  userId: { type: String },
  targetService: { type: String },
  timestamp: { type: Date, default: Date.now }
});

requestLogSchema.index({ timestamp: -1 });
requestLogSchema.index({ targetService: 1 });

export const RequestLogModel = mongoose.model<IRequestLogDocument>(
  'RequestLog',
  requestLogSchema
);
