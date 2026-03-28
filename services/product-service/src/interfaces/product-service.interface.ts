import { IProduct, CreateProductDto, UpdateProductDto, ProductQuery, PaginatedResult } from './product.interface';

export interface IProductService {
  getAll(query: ProductQuery): Promise<PaginatedResult<IProduct>>;
  getById(id: string): Promise<IProduct>;
  create(data: CreateProductDto): Promise<IProduct>;
  update(id: string, data: UpdateProductDto): Promise<IProduct>;
  delete(id: string): Promise<void>;
  updateStock(id: string, quantity: number): Promise<IProduct>;
}
