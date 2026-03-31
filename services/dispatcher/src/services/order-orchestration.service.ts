import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { Config } from '../config';
import {
  IOrderItem,
  IEnrichedOrderItem,
  IOrderOrchestrationService,
  IOrderResult,
  IStockCheckResult,
  IShippingAddress
} from '../interfaces/order-orchestration.interface';
import { AppError, InsufficientStockError, NotFoundError, ProxyError } from '../utils/errors';

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

  public async processOrder(
    items: IOrderItem[],
    userId: string,
    shippingAddress?: IShippingAddress
  ): Promise<IOrderResult> {
    // Step 1: Stock check + data collection
    const stockResults = await this.checkAllStock(items);

    // Step 2: Decrease stock sequentially (with partial rollback on failure)
    const decreasedItems = await this.decreaseAllStock(items);

    // Step 3: Enrich data and create order
    try {
      const enrichedItems = this.enrichItems(items, stockResults);
      const totalAmount = enrichedItems.reduce((sum, item) => sum + item.totalPrice, 0);
      return await this.createOrder(enrichedItems, totalAmount, userId, shippingAddress);
    } catch (error) {
      // Step 4: Rollback ALL decreased stock on order creation failure
      await this.rollbackStock(decreasedItems);
      throw error;
    }
  }

  private async checkAllStock(items: IOrderItem[]): Promise<IStockCheckResult[]> {
    const results: IStockCheckResult[] = [];
    for (const item of items) {
      const result = await this.checkStock(item.productId, item.quantity);
      if (!result.inStock) {
        throw new InsufficientStockError(
          `Insufficient stock for product ${item.productId}. Available: ${result.available}, requested: ${item.quantity}`
        );
      }
      results.push(result);
    }
    return results;
  }

  private async checkStock(productId: string, quantity: number): Promise<IStockCheckResult> {
    try {
      const config = this.buildRequestConfig('GET', `${this.productServiceUrl}/products/${productId}`);
      const response = await axios.request(config);
      const product = response.data.data;
      const hasDirectStockInfo = typeof product.inStock === 'boolean';
      return {
        productId,
        inStock: hasDirectStockInfo ? product.inStock : product.stock >= quantity,
        available: hasDirectStockInfo ? product.available : product.stock,
        productName: product.name || '',
        unitPrice: product.price || 0
      };
    } catch (error) {
      if (error instanceof InsufficientStockError || error instanceof NotFoundError) {
        throw error;
      }
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        throw new NotFoundError(`Product ${productId} not found`);
      }
      throw new ProxyError(`Product Service unreachable for product ${productId}`);
    }
  }

  private enrichItems(items: IOrderItem[], stockResults: IStockCheckResult[]): IEnrichedOrderItem[] {
    return items.map((item) => {
      const result = stockResults.find((r) => r.productId === item.productId);
      if (!result) {
        throw new ProxyError(`Stock result missing for product ${item.productId}`);
      }
      return {
        productId: item.productId,
        productName: result.productName,
        quantity: item.quantity,
        unitPrice: result.unitPrice,
        totalPrice: item.quantity * result.unitPrice
      };
    });
  }

  private async decreaseAllStock(items: IOrderItem[]): Promise<IOrderItem[]> {
    const decreased: IOrderItem[] = [];
    for (const item of items) {
      try {
        const config = this.buildRequestConfig(
          'PATCH',
          `${this.productServiceUrl}/products/${item.productId}/stock`,
          { quantity: -item.quantity }
        );
        await axios.request(config);
        decreased.push(item);
      } catch {
        // Rollback previously decreased items
        await this.rollbackStock(decreased);
        throw new AppError('Stock decrease failed, rollback executed', 502, 'ORCHESTRATION_FAILED');
      }
    }
    return decreased;
  }

  private async rollbackStock(items: IOrderItem[]): Promise<void> {
    for (const item of items) {
      try {
        const config = this.buildRequestConfig(
          'PATCH',
          `${this.productServiceUrl}/products/${item.productId}/stock`,
          { quantity: item.quantity }
        );
        await axios.request(config);
      } catch (rollbackError) {
        console.error(
          `[ROLLBACK FAILED] Could not restore stock for product ${item.productId}, quantity: ${item.quantity}`,
          rollbackError instanceof Error ? rollbackError.message : String(rollbackError)
        );
      }
    }
  }

  private async createOrder(
    items: IEnrichedOrderItem[],
    totalAmount: number,
    userId: string,
    shippingAddress?: IShippingAddress
  ): Promise<IOrderResult> {
    try {
      const body: Record<string, unknown> = { items, totalAmount, userId };
      if (shippingAddress) {
        body.shippingAddress = shippingAddress;
      }
      const config = this.buildRequestConfig('POST', `${this.orderServiceUrl}/orders`, body);
      const response = await axios.request(config);
      return response.data.data;
    } catch {
      throw new ProxyError('Order creation failed');
    }
  }

  private buildRequestConfig(method: string, url: string, data?: unknown): AxiosRequestConfig {
    const config: AxiosRequestConfig = {
      method,
      url,
      headers: {
        'x-internal-key': this.internalKey,
        'content-type': 'application/json'
      },
      timeout: 30000
    };
    if (data !== undefined) {
      config.data = data;
    }
    return config;
  }
}
