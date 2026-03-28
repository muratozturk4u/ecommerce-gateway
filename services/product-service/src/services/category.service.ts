import mongoose from 'mongoose';
import { ICategoryService } from '../interfaces/category-service.interface';
import { ICategoryRepository } from '../interfaces/category-repository.interface';
import { ICategory, ICategoryDocument, CreateCategoryDto, UpdateCategoryDto } from '../interfaces/category.interface';

export class CategoryService implements ICategoryService {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  async getAll(): Promise<ICategory[]> {
    const categories = await this.categoryRepository.findAll();
    return categories.map(this.toCategory);
  }

  async getById(id: string): Promise<ICategory> {
    this.validateObjectId(id);
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Category not found' };
    }
    return this.toCategory(category);
  }

  async create(data: CreateCategoryDto): Promise<ICategory> {
    const existing = await this.categoryRepository.findByName(data.name);
    if (existing) {
      throw { status: 409, code: 'CONFLICT', message: 'Category name already exists' };
    }
    const category = await this.categoryRepository.create(data);
    return this.toCategory(category);
  }

  async update(id: string, data: UpdateCategoryDto): Promise<ICategory> {
    this.validateObjectId(id);

    const existing = await this.categoryRepository.findById(id);
    if (!existing) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Category not found' };
    }

    if (data.name) {
      const duplicate = await this.categoryRepository.findByName(data.name);
      if (duplicate && duplicate.id !== id) {
        throw { status: 409, code: 'CONFLICT', message: 'Category name already exists' };
      }
    }

    const updated = await this.categoryRepository.update(id, data);
    return this.toCategory(updated!);
  }

  async delete(id: string): Promise<void> {
    this.validateObjectId(id);

    const existing = await this.categoryRepository.findById(id);
    if (!existing) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Category not found' };
    }

    await this.categoryRepository.delete(id);
  }

  private validateObjectId(id: string): void {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid category ID format' };
    }
  }

  private toCategory(doc: ICategoryDocument): ICategory {
    return {
      id: doc.id,
      name: doc.name,
      description: doc.description,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
}
