import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters')
    .trim()
    .toLowerCase(),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must not exceed 128 characters'),
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .trim()
});

export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255)
    .trim()
    .toLowerCase(),
  password: z.string()
    .min(1, 'Password is required')
    .max(128)
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
