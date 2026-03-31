import mongoose, { Schema, Document } from 'mongoose';

export interface IRouteAccessRule {
  path: string;
  method: string;
  roles: string[];
  isPublic: boolean;
}

export interface IRouteAccessRuleDocument extends IRouteAccessRule, Document {}

const routeAccessRuleSchema = new Schema<IRouteAccessRuleDocument>({
  path: { type: String, required: true },
  method: { type: String, required: true },
  roles: { type: [String], default: [] },
  isPublic: { type: Boolean, default: false }
});

routeAccessRuleSchema.index({ path: 1, method: 1 }, { unique: true });

export const RouteAccessRuleModel = mongoose.model<IRouteAccessRuleDocument>(
  'RouteAccessRule',
  routeAccessRuleSchema
);

export const DEFAULT_ROUTE_RULES: IRouteAccessRule[] = [
  { path: '/api/auth/login', method: 'POST', roles: [], isPublic: true },
  { path: '/api/auth/register', method: 'POST', roles: [], isPublic: true },
  { path: '/api/auth/profile', method: 'GET', roles: ['customer', 'admin'], isPublic: false },
  { path: '/api/products', method: 'GET', roles: [], isPublic: true },
  { path: '/api/products/:id', method: 'GET', roles: [], isPublic: true },
  { path: '/api/products', method: 'POST', roles: ['admin'], isPublic: false },
  { path: '/api/products/:id', method: 'PUT', roles: ['admin'], isPublic: false },
  { path: '/api/products/:id', method: 'DELETE', roles: ['admin'], isPublic: false },
  { path: '/api/categories', method: 'GET', roles: [], isPublic: true },
  { path: '/api/categories/:id', method: 'GET', roles: [], isPublic: true },
  { path: '/api/categories', method: 'POST', roles: ['admin'], isPublic: false },
  { path: '/api/categories/:id', method: 'PUT', roles: ['admin'], isPublic: false },
  { path: '/api/categories/:id', method: 'DELETE', roles: ['admin'], isPublic: false },
  { path: '/api/orders', method: 'GET', roles: ['customer', 'admin'], isPublic: false },
  { path: '/api/orders', method: 'POST', roles: ['customer', 'admin'], isPublic: false },
  { path: '/api/orders/:id', method: 'GET', roles: ['customer', 'admin'], isPublic: false },
  { path: '/api/orders/:id', method: 'PUT', roles: ['admin'], isPublic: false },
  { path: '/api/orders/:id/cancel', method: 'PUT', roles: ['customer', 'admin'], isPublic: false },
  { path: '/api/logs', method: 'GET', roles: ['admin'], isPublic: false },
  { path: '/api/metrics', method: 'GET', roles: [], isPublic: true }
];
