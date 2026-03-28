import { IProductDocument, CreateProductDto, UpdateProductDto, ProductQuery } from './product.interface';

export interface IProductRepository {
  findAll(query: ProductQuery): Promise<{ docs: IProductDocument[]; total: number }>;
  findById(id: string): Promise<IProductDocument | null>;
  create(data: CreateProductDto): Promise<IProductDocument>;
  update(id: string, data: UpdateProductDto): Promise<IProductDocument | null>;
  delete(id: string): Promise<IProductDocument | null>;
  updateStock(id: string, quantity: number): Promise<IProductDocument | null>;
  countByCategoryId(categoryId: string): Promise<number>;
}
