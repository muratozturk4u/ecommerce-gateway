import { Request, Response, NextFunction, RequestHandler } from 'express';

export class InternalAuthMiddleware {
  private readonly internalKey: string;

  constructor(internalKey: string) {
    this.internalKey = internalKey;
  }

  middleware(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (req.path === '/health') {
        next();
        return;
      }

      const key = req.headers['x-internal-key'] as string | undefined;

      if (!key || key !== this.internalKey) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Internal access only'
          }
        });
        return;
      }

      next();
    };
  }
}
