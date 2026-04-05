import { z } from 'zod';

export const createOrderSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  items: z.array(
    z.object({
      productId: z.string().min(1, 'Product ID is required'),
      productName: z.string().min(1, 'Product name is required').max(255),
      quantity: z.number().int('Quantity must be integer').positive('Quantity must be positive'),
      unitPrice: z.number().positive('Unit price must be positive'),
      totalPrice: z.number().positive('Total price must be positive')
    })
  ).min(1, 'At least one item is required'),
  totalAmount: z.number().positive('Total amount must be positive').max(999999999, 'Total amount too large'),
  shippingAddress: z.object({
    street: z.string().min(1, 'Street is required').max(255),
    city: z.string().min(1, 'City is required').max(100),
    zip: z.string().min(1, 'ZIP is required').max(20)
  }).optional()
});

export const updateStatusSchema = z.object({
  status: z.enum(['confirmed', 'shipped', 'delivered', 'cancelled'], {
    errorMap: () => ({ message: 'Invalid status. Allowed: confirmed, shipped, delivered, cancelled' })
  })
});

export const orderQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']).optional()
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type OrderQueryInput = z.infer<typeof orderQuerySchema>;
