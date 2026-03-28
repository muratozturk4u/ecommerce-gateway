import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { CategoryService } from '../services/category.service';
import { CategoryRepository } from '../repositories/category.repository';
import { CategoryModel } from '../models/category.model';

const categoryRepository = new CategoryRepository(CategoryModel);
const categoryService = new CategoryService(categoryRepository);
const categoryController = new CategoryController(categoryService);

const router = Router();

router.get('/categories', categoryController.getAll.bind(categoryController));
router.get('/categories/:id', categoryController.getById.bind(categoryController));
router.post('/categories', categoryController.create.bind(categoryController));
router.put('/categories/:id', categoryController.update.bind(categoryController));
router.delete('/categories/:id', categoryController.delete.bind(categoryController));

export { router as categoryRouter };
