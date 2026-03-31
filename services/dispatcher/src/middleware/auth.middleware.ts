import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Config } from '../config';

interface IJwtPayload {
  userId: string;
  role: string;
}

export interface IAuthMiddleware {
  authenticate(): (req: Request, res: Response, next: NextFunction) => void;
}

export class AuthMiddleware implements IAuthMiddleware {
  private readonly jwtSecret: string;

  constructor(jwtSecret: string = Config.JWT_SECRET) {
    this.jwtSecret = jwtSecret;
  }

  public authenticate(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token required'
          }
        });
        return;
      }

      const token = authHeader.split(' ')[1];

      try {
        const decoded = jwt.verify(token, this.jwtSecret) as IJwtPayload;
        req.userId = decoded.userId;
        req.role = decoded.role;
        next();
      } catch {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired token'
          }
        });
      }
    };
  }
}
