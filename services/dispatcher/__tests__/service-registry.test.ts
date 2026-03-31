import { ServiceRegistry } from '../src/services/service-registry';
import { IServiceConfig } from '../src/interfaces/service-config.interface';

describe('ServiceRegistry', () => {
  let registry: ServiceRegistry;

  beforeEach(() => {
    registry = new ServiceRegistry();
  });

  describe('resolve', () => {
    it('should route /api/auth/* to auth-service on port 3001', () => {
      const result: IServiceConfig | null = registry.resolve('/api/auth/login');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('auth-service');
      expect(result!.url).toContain('3001');
    });

    it('should route /api/auth/register to auth-service', () => {
      const result = registry.resolve('/api/auth/register');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('auth-service');
    });

    it('should route /api/products/* to product-service on port 3002', () => {
      const result = registry.resolve('/api/products/123');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('product-service');
      expect(result!.url).toContain('3002');
    });

    it('should route /api/categories/* to product-service on port 3002', () => {
      const result = registry.resolve('/api/categories');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('product-service');
      expect(result!.url).toContain('3002');
    });

    it('should route /api/orders/* to order-service on port 3003', () => {
      const result = registry.resolve('/api/orders');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('order-service');
      expect(result!.url).toContain('3003');
    });

    it('should return null for unknown routes', () => {
      const result = registry.resolve('/api/unknown/path');
      expect(result).toBeNull();
    });

    it('should return null for root path', () => {
      const result = registry.resolve('/');
      expect(result).toBeNull();
    });

    it('should handle nested paths correctly', () => {
      const result = registry.resolve('/api/products/category/electronics');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('product-service');
    });
  });

  describe('getAllServices', () => {
    it('should return all registered services', () => {
      const services = registry.getAllServices();
      expect(services.length).toBe(3);
    });

    it('should contain auth, product, and order services', () => {
      const services = registry.getAllServices();
      const names = services.map((s: IServiceConfig) => s.name);
      expect(names).toContain('auth-service');
      expect(names).toContain('product-service');
      expect(names).toContain('order-service');
    });
  });
});
