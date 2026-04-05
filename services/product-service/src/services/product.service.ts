import mongoose from 'mongoose';
import { IProductService } from '../interfaces/product-service.interface';
import { IProductRepository } from '../interfaces/product-repository.interface';
import { ICategoryRepository } from '../interfaces/category-repository.interface';
import { IProduct, IProductDocument, CreateProductDto, UpdateProductDto, ProductQuery, PaginatedResult } from '../interfaces/product.interface';

export class ProductService implements IProductService {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly categoryRepository: ICategoryRepository
  ) {}

  async getAll(query: ProductQuery): Promise<PaginatedResult<IProduct>> {
    if (query.minPrice !== undefined && query.maxPrice !== undefined && query.minPrice > query.maxPrice) {
      throw { status: 400, code: 'VALIDATION_ERROR', message: 'minPrice cannot be greater than maxPrice' };
    }

    if (query.categoryId) {
      this.validateObjectId(query.categoryId, 'category');
    }

    const { docs, total } = await this.productRepository.findAll(query);

    return {
      data: docs.map(doc => this.toProduct(doc)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 0
      }
    };
  }

  async getById(id: string): Promise<IProduct> {
    this.validateObjectId(id, 'product');
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Product not found' };
    }
    return this.toProduct(product);
  }

  async create(data: CreateProductDto): Promise<IProduct> {
    if (data.categoryId) {
      this.validateObjectId(data.categoryId, 'category');
      const category = await this.categoryRepository.findById(data.categoryId);
      if (!category) {
        throw { status: 400, code: 'VALIDATION_ERROR', message: 'Category not found' };
      }
    }

    const product = await this.productRepository.create(data);
    return this.toProduct(product);
  }

  async update(id: string, data: UpdateProductDto): Promise<IProduct> {
    this.validateObjectId(id, 'product');

    const existing = await this.productRepository.findById(id);
    if (!existing) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Product not found' };
    }

    if (data.categoryId) {
      this.validateObjectId(data.categoryId, 'category');
      const category = await this.categoryRepository.findById(data.categoryId);
      if (!category) {
        throw { status: 400, code: 'VALIDATION_ERROR', message: 'Category not found' };
      }
    }

    const updated = await this.productRepository.update(id, data);
    return this.toProduct(updated!);
  }

  async delete(id: string): Promise<void> {
    this.validateObjectId(id, 'product');
    const existing = await this.productRepository.findById(id);
    if (!existing) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Product not found' };
    }
    await this.productRepository.delete(id);
  }

  async updateStock(id: string, quantity: number): Promise<IProduct> {
    this.validateObjectId(id, 'product');

    const product = await this.productRepository.findById(id);
    if (!product) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Product not found' };
    }

    if (product.stock + quantity < 0) {
      throw {
        status: 400,
        code: 'INSUFFICIENT_STOCK',
        message: `Insufficient stock. Current: ${product.stock}, requested change: ${quantity}`
      };
    }

    const updated = await this.productRepository.updateStock(id, quantity);
    if (!updated) {
      throw {
        status: 400,
        code: 'INSUFFICIENT_STOCK',
        message: 'Stock update failed due to concurrent modification'
      };
    }
    return this.toProduct(updated);
  }

  private validateObjectId(id: string, entity: string): void {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw { status: 400, code: 'VALIDATION_ERROR', message: `Invalid ${entity} ID format` };
    }
  }

  private toProduct(doc: IProductDocument): IProduct {
    return {
      id: doc.id,
      name: doc.name,
      description: doc.description,
      price: doc.price,
      stock: doc.stock,
      categoryId: doc.categoryId ? String(doc.categoryId) : undefined,
      imageUrl: doc.imageUrl,
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
}
