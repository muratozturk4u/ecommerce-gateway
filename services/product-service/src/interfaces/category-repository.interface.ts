import { ICategoryDocument, CreateCategoryDto, UpdateCategoryDto } from './category.interface';

export interface ICategoryRepository {
  findAll(): Promise<ICategoryDocument[]>;
  findById(id: string): Promise<ICategoryDocument | null>;
  findByName(name: string): Promise<ICategoryDocument | null>;
  create(data: CreateCategoryDto): Promise<ICategoryDocument>;
  update(id: string, data: UpdateCategoryDto): Promise<ICategoryDocument | null>;
  delete(id: string): Promise<ICategoryDocument | null>;
}
