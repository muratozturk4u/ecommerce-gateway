import axios from 'axios';
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
      const order = await this.createOrder(items, userId);
      return order;
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
    const response = await axios.request({
      method: 'GET',
      url: `${this.productServiceUrl}/api/products/${productId}/stock?quantity=${quantity}`,
      headers: { 'x-internal-key': this.internalKey }
    });
    return { productId, ...response.data.data };
  }

  private async decreaseStock(items: IOrderItem[]): Promise<IOrderItem[]> {
    const decreased: IOrderItem[] = [];

    for (const item of items) {
      try {
        await axios.request({
          method: 'PUT',
          url: `${this.productServiceUrl}/api/products/${item.productId}/stock/decrease`,
          data: { quantity: item.quantity },
          headers: {
            'x-internal-key': this.internalKey,
            'content-type': 'application/json'
          }
        });
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
        await axios.request({
          method: 'PUT',
          url: `${this.productServiceUrl}/api/products/${item.productId}/stock/increase`,
          data: { quantity: item.quantity },
          headers: {
            'x-internal-key': this.internalKey,
            'content-type': 'application/json'
          }
        });
      } catch {
        // Rollback failure logged but not thrown
      }
    }
  }

  private async createOrder(items: IOrderItem[], userId: string): Promise<IOrderResult> {
    const response = await axios.request({
      method: 'POST',
      url: `${this.orderServiceUrl}/api/orders`,
      data: { items, userId },
      headers: {
        'x-internal-key': this.internalKey,
        'content-type': 'application/json'
      }
    });
    return response.data.data;
  }
}
