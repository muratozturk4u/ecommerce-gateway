export interface IOrderItem {
  productId: string;
  quantity: number;
}

export interface IEnrichedOrderItem extends IOrderItem {
  productName: string;
  unitPrice: number;
  totalPrice: number;
}

export interface IShippingAddress {
  street: string;
  city: string;
  zip: string;
}

export interface IOrderRequest {
  items: IOrderItem[];
  shippingAddress?: IShippingAddress;
}

export interface IStockCheckResult {
  productId: string;
  inStock: boolean;
  available: number;
  productName: string;
  unitPrice: number;
}

export interface IOrderResult {
  orderId: string;
  status: string;
}

export interface IOrderOrchestrationService {
  processOrder(
    items: IOrderItem[],
    userId: string,
    shippingAddress?: IShippingAddress
  ): Promise<IOrderResult>;
}
