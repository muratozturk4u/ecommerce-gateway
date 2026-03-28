import { Request, Response } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { IAuthController } from '../interfaces/auth-controller.interface';
import { IAuthService } from '../interfaces/auth-service.interface';
import { registerSchema, loginSchema } from '../validators/auth.validator';

export class AuthController implements IAuthController {
  constructor(private readonly authService: IAuthService) {}

  async register(req: Request, res: Response): Promise<void> {
    try {
      const data = registerSchema.parse(req.body);
      const result = await this.authService.register(data);

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const data = loginSchema.parse(req.body);
      const result = await this.authService.login(data);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'X-User-Id header is required' }
        });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid user ID format' }
        });
        return;
      }

      const profile = await this.authService.getProfile(userId);

      res.status(200).json({
        success: true,
        data: profile
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private handleError(res: Response, error: unknown): void {
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
}
