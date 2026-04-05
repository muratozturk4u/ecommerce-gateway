import { Request, Response } from 'express';
import { IProductController } from '../interfaces/product-controller.interface';
import { IProductService } from '../interfaces/product-service.interface';
import { createProductSchema, updateProductSchema, updateStockSchema, productQuerySchema } from '../validators/product.validator';
import { handleError } from '../utils/error-handler';

export class ProductController implements IProductController {
  constructor(private readonly productService: IProductService) {}

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const query = productQuerySchema.parse(req.query);
      const result = await this.productService.getAll(query);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const product = await this.productService.getById(id);
      res.status(200).json({ success: true, data: product });
    } catch (error) {
      handleError(res, error);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const data = createProductSchema.parse(req.body);
      const product = await this.productService.create(data);
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      handleError(res, error);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = updateProductSchema.parse(req.body);
      const product = await this.productService.update(id, data);
      res.status(200).json({ success: true, data: product });
    } catch (error) {
      handleError(res, error);
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      await this.productService.delete(id);
      res.status(204).send();
    } catch (error) {
      handleError(res, error);
    }
  }

  async updateStock(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const { quantity } = updateStockSchema.parse(req.body);
      const product = await this.productService.updateStock(id, quantity);
      res.status(200).json({ success: true, data: product });
    } catch (error) {
      handleError(res, error);
    }
  }
}
