import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string()
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name must not exceed 100 characters')
    .trim(),
  description: z.string()
    .max(1000, 'Description must not exceed 1000 characters')
    .trim()
    .optional()
});

export const updateCategorySchema = z.object({
  name: z.string()
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name must not exceed 100 characters')
    .trim()
    .optional(),
  description: z.string()
    .max(1000, 'Description must not exceed 1000 characters')
    .trim()
    .optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
