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

      if (!rule || rule.isPublic) {
        next();
        return;
      }

      if (!this.isAuthenticated(req)) {
        this.sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
        return;
      }

      if (!this.hasPermission(req.role!, rule.roles)) {
        this.sendError(res, 403, 'FORBIDDEN', 'Insufficient permissions');
        return;
      }

      next();
    };
  }

  private isAuthenticated(req: Request): boolean {
    return !!req.userId && !!req.role;
  }

  private hasPermission(userRole: string, allowedRoles: string[]): boolean {
    return allowedRoles.includes(userRole);
  }

  private findMatchingRule(path: string, method: string): IRouteAccessRule | undefined {
    return this.rules.find((rule) => {
      return this.matchPath(rule.path, path) && rule.method === method.toUpperCase();
    });
  }

  private matchPath(rulePath: string, requestPath: string): boolean {
    const ruleSegments = rulePath.split('/');
    const requestSegments = requestPath.split('/');

    if (ruleSegments.length !== requestSegments.length) {
      return false;
    }

    return ruleSegments.every((segment, index) =>
      segment.startsWith(':') || segment === requestSegments[index]
    );
  }

  private sendError(res: Response, status: number, code: string, message: string): void {
    res.status(status).json({
      success: false,
      error: { code, message }
    });
  }
}
