import { IServiceConfig, IServiceRegistry } from '../interfaces/service-config.interface';
import { Config } from '../config';

export class ServiceRegistry implements IServiceRegistry {
  private readonly services: IServiceConfig[];

  constructor() {
    this.services = [
      {
        name: 'auth-service',
        url: Config.AUTH_SERVICE_URL,
        pathPrefixes: ['/api/auth']
      },
      {
        name: 'product-service',
        url: Config.PRODUCT_SERVICE_URL,
        pathPrefixes: ['/api/products', '/api/categories']
      },
      {
        name: 'order-service',
        url: Config.ORDER_SERVICE_URL,
        pathPrefixes: ['/api/orders']
      }
    ];
  }

  public resolve(path: string): IServiceConfig | null {
    for (const service of this.services) {
      for (const prefix of service.pathPrefixes) {
        if (path === prefix || path.startsWith(prefix + '/')) {
          return service;
        }
      }
    }
    return null;
  }

  public getAllServices(): IServiceConfig[] {
    return [...this.services];
  }
}
