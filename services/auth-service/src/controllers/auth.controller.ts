import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { registerSchema, loginSchema } from '../validators/auth.validator';

export class AuthController {
  private readonly authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async register(req: Request, res: Response): Promise<void> {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
      });
      return;
    }

    try {
      const { email, password } = parsed.data;
      const { user, token } = await this.authService.register(email, password);
      res.status(201).json({
        success: true,
        data: {
          token,
          user: { id: user._id, email: user.email, role: user.role },
        },
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'EMAIL_ALREADY_EXISTS') {
        res.status(409).json({
          success: false,
          error: { code: 'EMAIL_ALREADY_EXISTS', message: 'Bu email zaten kayıtlı' },
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Sunucu hatası' },
      });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
      });
      return;
    }

    try {
      const { email, password } = parsed.data;
      const { user, token } = await this.authService.login(email, password);
      res.status(200).json({
        success: true,
        data: {
          token,
          user: { id: user._id, email: user.email, role: user.role },
        },
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'INVALID_CREDENTIALS') {
        res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Email veya şifre hatalı' },
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Sunucu hatası' },
      });
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_USER_ID', message: 'X-User-Id header zorunludur' },
      });
      return;
    }

    try {
      const user = await this.authService.getProfile(userId);
      res.status(200).json({
        success: true,
        data: { id: user._id, email: user.email, role: user.role, createdAt: user.createdAt },
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'Kullanıcı bulunamadı' },
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Sunucu hatası' },
      });
    }
  }
}
