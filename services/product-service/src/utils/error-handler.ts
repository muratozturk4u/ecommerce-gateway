import { Response } from 'express';
import { ZodError } from 'zod';

export function handleError(res: Response, error: unknown): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.errors[0].message
      }
    });
    return;
  }

  if (typeof error === 'object' && error !== null && 'status' in error) {
    const err = error as { status: number; code: string; message: string };
    res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message }
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
  });
}
