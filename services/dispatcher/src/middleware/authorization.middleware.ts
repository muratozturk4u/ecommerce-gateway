import { Request, Response, NextFunction } from 'express';
import { IRouteAccessRule, DEFAULT_ROUTE_RULES } from '../models/route-access-rule.model';

export interface IAuthorizationMiddleware {
  authorize(): (req: Request, res: Response, next: NextFunction) => void;
}

export class AuthorizationMiddleware implements IAuthorizationMiddleware {
  private readonly rules: IRouteAccessRule[];

  constructor(rules: IRouteAccessRule[] = DEFAULT_ROUTE_RULES) {
    this.rules = rules;
  }

  public authorize(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      const rule = this.findMatchingRule(req.path, req.method);

      if (!rule) {
        next();
        return;
      }

      if (rule.isPublic) {
        next();
        return;
      }

      if (!req.userId || !req.role) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
        return;
      }

      if (!rule.roles.includes(req.role)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions'
          }
        });
        return;
      }

      next();
    };
  }

  private findMatchingRule(path: string, method: string): IRouteAccessRule | undefined {
    return this.rules.find((rule) => {
      const pathMatch = this.matchPath(rule.path, path);
      const methodMatch = rule.method === method.toUpperCase();
      return pathMatch && methodMatch;
    });
  }

  private matchPath(rulePath: string, requestPath: string): boolean {
    const ruleSegments = rulePath.split('/');
    const requestSegments = requestPath.split('/');

    if (ruleSegments.length !== requestSegments.length) {
      return false;
    }

    return ruleSegments.every((segment, index) => {
      if (segment.startsWith(':')) {
        return true;
      }
      return segment === requestSegments[index];
    });
  }
}
