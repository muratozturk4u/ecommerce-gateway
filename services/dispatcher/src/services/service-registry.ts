import { IServiceConfig, IServiceRegistry } from '../interfaces/service-config.interface';
import { Config } from '../config';

export class ServiceRegistry implements IServiceRegistry {
  private readonly services: IServiceConfig[];

  constructor(services?: IServiceConfig[]) {
    this.services = services || this.getDefaultServices();
  }

  private getDefaultServices(): IServiceConfig[] {
    return [
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
      if (this.matchesService(path, service)) {
        return service;
      }
    }
    return null;
  }

  private matchesService(path: string, service: IServiceConfig): boolean {
    return service.pathPrefixes.some(
      (prefix) => path === prefix || path.startsWith(prefix + '/')
    );
  }

  public getAllServices(): IServiceConfig[] {
    return [...this.services];
  }
}
