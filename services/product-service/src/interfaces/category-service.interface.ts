import { ICategory, CreateCategoryDto, UpdateCategoryDto } from './category.interface';

export interface ICategoryService {
  getAll(): Promise<ICategory[]>;
  getById(id: string): Promise<ICategory>;
  create(data: CreateCategoryDto): Promise<ICategory>;
  update(id: string, data: UpdateCategoryDto): Promise<ICategory>;
  delete(id: string): Promise<void>;
}
