import mongoose, { Schema, Document } from 'mongoose';

export type AuthLevel = 'public' | 'protected' | 'admin';

export interface IRouteAccessRule {
  path: string;
  method: string;
  authLevel: AuthLevel;
  description?: string;
}

export interface IRouteAccessRuleDocument extends IRouteAccessRule, Document {}

const routeAccessRuleSchema = new Schema<IRouteAccessRuleDocument>({
  path: { type: String, required: true },
  method: { type: String, required: true },
  authLevel: { type: String, required: true, enum: ['public', 'protected', 'admin'] },
  description: { type: String }
});

routeAccessRuleSchema.index({ path: 1, method: 1 }, { unique: true });

export const RouteAccessRuleModel = mongoose.model<IRouteAccessRuleDocument>(
  'RouteAccessRule',
  routeAccessRuleSchema
);

export const DEFAULT_ROUTE_RULES: IRouteAccessRule[] = [
  { path: '/health', method: 'GET', authLevel: 'public', description: 'Health check' },
  { path: '/api/auth/register', method: 'POST', authLevel: 'public', description: 'User registration' },
  { path: '/api/auth/login', method: 'POST', authLevel: 'public', description: 'User login' },
  { path: '/api/auth/profile', method: 'GET', authLevel: 'protected', description: 'Get user profile' },
  { path: '/api/products', method: 'GET', authLevel: 'protected', description: 'List products' },
  { path: '/api/products/:id', method: 'GET', authLevel: 'protected', description: 'Get product by ID' },
  { path: '/api/products', method: 'POST', authLevel: 'admin', description: 'Create product' },
  { path: '/api/products/:id', method: 'PUT', authLevel: 'admin', description: 'Update product' },
  { path: '/api/products/:id', method: 'DELETE', authLevel: 'admin', description: 'Delete product' },
  { path: '/api/products/:id/stock', method: 'PATCH', authLevel: 'admin', description: 'Update product stock' },
  { path: '/api/categories', method: 'GET', authLevel: 'protected', description: 'List categories' },
  { path: '/api/categories/:id', method: 'GET', authLevel: 'protected', description: 'Get category by ID' },
  { path: '/api/categories', method: 'POST', authLevel: 'admin', description: 'Create category' },
  { path: '/api/categories/:id', method: 'PUT', authLevel: 'admin', description: 'Update category' },
  { path: '/api/categories/:id', method: 'DELETE', authLevel: 'admin', description: 'Delete category' },
  { path: '/api/orders', method: 'POST', authLevel: 'protected', description: 'Create order (orchestrated)' },
  { path: '/api/orders', method: 'GET', authLevel: 'protected', description: 'List orders' },
  { path: '/api/orders/:id', method: 'GET', authLevel: 'protected', description: 'Get order by ID' },
  { path: '/api/orders/:id/status', method: 'PATCH', authLevel: 'protected', description: 'Update order status' },
  { path: '/api/logs', method: 'GET', authLevel: 'admin', description: 'View request logs' },
  { path: '/api/metrics', method: 'GET', authLevel: 'public', description: 'Prometheus metrics' }
];

export async function seedRouteRules(): Promise<void> {
  const operations = DEFAULT_ROUTE_RULES.map((rule) => ({
    updateOne: {
      filter: { path: rule.path, method: rule.method },
      update: { $set: rule },
      upsert: true
    }
  }));

  await RouteAccessRuleModel.bulkWrite(operations);
}
