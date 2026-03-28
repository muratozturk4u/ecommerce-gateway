import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'Product name must be at least 2 characters')
    .max(255, 'Product name must not exceed 255 characters'),
  description: z.string()
    .trim()
    .max(2000, 'Description must not exceed 2000 characters')
    .optional(),
  price: z.number()
    .positive('Price must be positive'),
  stock: z.number()
    .int('Stock must be an integer')
    .min(0, 'Stock cannot be negative'),
  categoryId: z.string().optional(),
  imageUrl: z.string()
    .url('Invalid image URL format')
    .max(2048, 'Image URL must not exceed 2048 characters')
    .optional()
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  description: z.string().trim().max(2000).optional(),
  price: z.number().positive().optional(),
  stock: z.number().int().min(0).optional(),
  categoryId: z.string().optional(),
  imageUrl: z.string().url().max(2048).optional(),
  isActive: z.boolean().optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

export const updateStockSchema = z.object({
  quantity: z.number()
    .int('Quantity must be an integer')
    .refine(n => n !== 0, { message: 'Quantity cannot be zero' })
    .refine(n => Math.abs(n) <= 1000000, { message: 'Quantity cannot exceed ±1,000,000' })
});

export const productQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  categoryId: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sortBy: z.enum(['name', 'price', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type UpdateStockInput = z.infer<typeof updateStockSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
