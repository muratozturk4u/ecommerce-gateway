export interface IOrderItem {
  productId: string;
  quantity: number;
}

export interface IOrderRequest {
  items: IOrderItem[];
}

export interface IStockCheckResult {
  productId: string;
  inStock: boolean;
  available: number;
}

export interface IOrderResult {
  orderId: string;
  status: string;
}

export interface IOrderOrchestrationService {
  processOrder(items: IOrderItem[], userId: string): Promise<IOrderResult>;
}
