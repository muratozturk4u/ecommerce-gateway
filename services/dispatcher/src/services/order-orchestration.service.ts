import axios, { AxiosRequestConfig } from 'axios';
import { Config } from '../config';
import {
  IOrderItem,
  IOrderOrchestrationService,
  IOrderResult,
  IStockCheckResult
} from '../interfaces/order-orchestration.interface';

export class OrderOrchestrationService implements IOrderOrchestrationService {
  private readonly productServiceUrl: string;
  private readonly orderServiceUrl: string;
  private readonly internalKey: string;

  constructor(
    productServiceUrl: string = Config.PRODUCT_SERVICE_URL,
    orderServiceUrl: string = Config.ORDER_SERVICE_URL,
    internalKey: string = Config.INTERNAL_KEY
  ) {
    this.productServiceUrl = productServiceUrl;
    this.orderServiceUrl = orderServiceUrl;
    this.internalKey = internalKey;
  }

  public async processOrder(items: IOrderItem[], userId: string): Promise<IOrderResult> {
    await this.checkAllStock(items);
    const decreasedItems = await this.decreaseStock(items);

    try {
      return await this.createOrder(items, userId);
    } catch (error) {
      await this.rollbackStock(decreasedItems);
      throw error;
    }
  }

  private async checkAllStock(items: IOrderItem[]): Promise<void> {
    for (const item of items) {
      const result = await this.checkStock(item.productId, item.quantity);
      if (!result.inStock) {
        throw {
          statusCode: 400,
          code: 'INSUFFICIENT_STOCK',
          message: `Insufficient stock for product ${item.productId}. Available: ${result.available}`
        };
      }
    }
  }

  private async checkStock(productId: string, quantity: number): Promise<IStockCheckResult> {
    const config = this.buildRequestConfig(
      'GET',
      `${this.productServiceUrl}/api/products/${productId}/stock?quantity=${quantity}`
    );
    const response = await axios.request(config);
    return { productId, ...response.data.data };
  }

  private async decreaseStock(items: IOrderItem[]): Promise<IOrderItem[]> {
    const decreased: IOrderItem[] = [];

    for (const item of items) {
      try {
        const config = this.buildRequestConfig(
          'PUT',
          `${this.productServiceUrl}/api/products/${item.productId}/stock/decrease`,
          { quantity: item.quantity }
        );
        await axios.request(config);
        decreased.push(item);
      } catch {
        await this.rollbackStock(decreased);
        throw {
          statusCode: 502,
          code: 'ORCHESTRATION_FAILED',
          message: 'Stock decrease failed, rollback executed'
        };
      }
    }

    return decreased;
  }

  private async rollbackStock(items: IOrderItem[]): Promise<void> {
    for (const item of items) {
      try {
        const config = this.buildRequestConfig(
          'PUT',
          `${this.productServiceUrl}/api/products/${item.productId}/stock/increase`,
          { quantity: item.quantity }
        );
        await axios.request(config);
      } catch {
        // Rollback failure: logged but not rethrown to avoid masking original error
      }
    }
  }

  private async createOrder(items: IOrderItem[], userId: string): Promise<IOrderResult> {
    const config = this.buildRequestConfig(
      'POST',
      `${this.orderServiceUrl}/api/orders`,
      { items, userId }
    );
    const response = await axios.request(config);
    return response.data.data;
  }

  private buildRequestConfig(
    method: string,
    url: string,
    data?: unknown
  ): AxiosRequestConfig {
    const config: AxiosRequestConfig = {
      method,
      url,
      headers: {
        'x-internal-key': this.internalKey,
        'content-type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    return config;
  }
}
