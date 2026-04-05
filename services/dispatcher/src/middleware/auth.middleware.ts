import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Config } from '../config';
import { findMatchingRule } from '../utils/path-matcher';
import { IRouteAccessRule, DEFAULT_ROUTE_RULES } from '../models/route-access-rule.model';

interface IJwtPayload {
  userId: string;
  role: string;
}

export interface IAuthMiddleware {
  authenticate(): (req: Request, res: Response, next: NextFunction) => void;
}

export class AuthMiddleware implements IAuthMiddleware {
  private readonly jwtSecret: string;
  private readonly rules: IRouteAccessRule[];

  constructor(
    jwtSecret: string = Config.JWT_SECRET,
    rules: IRouteAccessRule[] = DEFAULT_ROUTE_RULES
  ) {
    this.jwtSecret = jwtSecret;
    this.rules = rules;
  }

  public authenticate(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      const rule = findMatchingRule(this.rules, req.path, req.method);

      if (rule && rule.authLevel === 'public') {
        const token = this.extractToken(req);
        if (token) {
          try {
            const decoded = jwt.verify(token, this.jwtSecret) as IJwtPayload;
            req.userId = decoded.userId;
            req.role = decoded.role;
          } catch {
            // Best-effort decode for public routes — ignore failures
          }
        }
        next();
        return;
      }

      const token = this.extractToken(req);

      if (!token) {
        this.sendUnauthorized(res, 'Token required');
        return;
      }

      try {
        const decoded = jwt.verify(token, this.jwtSecret) as IJwtPayload;
        req.userId = decoded.userId;
        req.role = decoded.role;
        next();
      } catch {
        this.sendUnauthorized(res, 'Invalid or expired token');
      }
    };
  }

  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.split(' ')[1];
  }

  private sendUnauthorized(res: Response, message: string): void {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message
      }
    });
  }
}
