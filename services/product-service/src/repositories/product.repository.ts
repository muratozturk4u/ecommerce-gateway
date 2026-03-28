import { IProductRepository } from '../interfaces/product-repository.interface';
import { IProductDocument, CreateProductDto, UpdateProductDto, ProductQuery } from '../interfaces/product.interface';
import { Model } from 'mongoose';

export class ProductRepository implements IProductRepository {
  constructor(private readonly productModel: Model<IProductDocument>) {}

  async findAll(query: ProductQuery): Promise<{ docs: IProductDocument[]; total: number }> {
    const filter: Record<string, unknown> = { isActive: true };

    if (query.search) {
      filter.$text = { $search: query.search };
    }

    if (query.categoryId) {
      filter.categoryId = query.categoryId;
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      const priceFilter: { $gte?: number; $lte?: number } = {};
      if (query.minPrice !== undefined) priceFilter.$gte = query.minPrice;
      if (query.maxPrice !== undefined) priceFilter.$lte = query.maxPrice;
      filter.price = priceFilter;
    }

    const sort: Record<string, 1 | -1> = {};
    sort[query.sortBy] = query.sortOrder === 'asc' ? 1 : -1;

    const total = await this.productModel.countDocuments(filter);
    const skip = (query.page - 1) * query.limit;
    const docs = await this.productModel
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(query.limit);

    return { docs, total };
  }

  async findById(id: string): Promise<IProductDocument | null> {
    return this.productModel.findById(id);
  }

  async create(data: CreateProductDto): Promise<IProductDocument> {
    return this.productModel.create(data);
  }

  async update(id: string, data: UpdateProductDto): Promise<IProductDocument | null> {
    return this.productModel.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  async delete(id: string): Promise<IProductDocument | null> {
    return this.productModel.findByIdAndDelete(id);
  }

  async updateStock(id: string, quantity: number): Promise<IProductDocument | null> {
    if (quantity < 0) {
      return this.productModel.findOneAndUpdate(
        { _id: id, stock: { $gte: Math.abs(quantity) } },
        { $inc: { stock: quantity } },
        { new: true }
      );
    }
    return this.productModel.findByIdAndUpdate(
      id,
      { $inc: { stock: quantity } },
      { new: true }
    );
  }

  async countByCategoryId(categoryId: string): Promise<number> {
    return this.productModel.countDocuments({ categoryId });
  }
}
