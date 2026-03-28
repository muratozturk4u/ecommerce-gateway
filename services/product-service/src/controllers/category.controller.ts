import { Request, Response } from 'express';
import { ICategoryController } from '../interfaces/category-controller.interface';
import { ICategoryService } from '../interfaces/category-service.interface';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validator';
import { handleError } from '../utils/error-handler';

export class CategoryController implements ICategoryController {
  constructor(private readonly categoryService: ICategoryService) {}

  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const categories = await this.categoryService.getAll();
      res.status(200).json({ success: true, data: categories });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const category = await this.categoryService.getById(id);
      res.status(200).json({ success: true, data: category });
    } catch (error) {
      handleError(res, error);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const data = createCategorySchema.parse(req.body);
      const category = await this.categoryService.create(data);
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      handleError(res, error);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = updateCategorySchema.parse(req.body);
      const category = await this.categoryService.update(id, data);
      res.status(200).json({ success: true, data: category });
    } catch (error) {
      handleError(res, error);
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      await this.categoryService.delete(id);
      res.status(204).send();
    } catch (error) {
      handleError(res, error);
    }
  }
}
