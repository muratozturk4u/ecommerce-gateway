import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { ProductService } from '../services/product.service';
import { ProductRepository } from '../repositories/product.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { ProductModel } from '../models/product.model';
import { CategoryModel } from '../models/category.model';

const categoryRepository = new CategoryRepository(CategoryModel);
const productRepository = new ProductRepository(ProductModel);
const productService = new ProductService(productRepository, categoryRepository);
const productController = new ProductController(productService);

const router = Router();

router.get('/products', productController.getAll.bind(productController));
router.get('/products/:id', productController.getById.bind(productController));
router.post('/products', productController.create.bind(productController));
router.put('/products/:id', productController.update.bind(productController));
router.delete('/products/:id', productController.delete.bind(productController));
router.patch('/products/:id/stock', productController.updateStock.bind(productController));

export { router as productRouter };
