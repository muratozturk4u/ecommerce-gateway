import { ICategoryRepository } from '../interfaces/category-repository.interface';
import { ICategoryDocument, CreateCategoryDto, UpdateCategoryDto } from '../interfaces/category.interface';
import { Model } from 'mongoose';

export class CategoryRepository implements ICategoryRepository {
  constructor(private readonly categoryModel: Model<ICategoryDocument>) {}

  async findAll(): Promise<ICategoryDocument[]> {
    return this.categoryModel.find().sort({ name: 1 });
  }

  async findById(id: string): Promise<ICategoryDocument | null> {
    return this.categoryModel.findById(id);
  }

  async findByName(name: string): Promise<ICategoryDocument | null> {
    const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.categoryModel.findOne({
      name: { $regex: new RegExp(`^${escaped}$`, 'i') }
    });
  }

  async create(data: CreateCategoryDto): Promise<ICategoryDocument> {
    return this.categoryModel.create(data);
  }

  async update(id: string, data: UpdateCategoryDto): Promise<ICategoryDocument | null> {
    return this.categoryModel.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  async delete(id: string): Promise<ICategoryDocument | null> {
    return this.categoryModel.findByIdAndDelete(id);
  }
}
