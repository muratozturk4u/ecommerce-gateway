import { Request, Response, NextFunction } from 'express';
import { findMatchingRule } from '../utils/path-matcher';
import {
  IRouteAccessRule,
  RouteAccessRuleModel,
  DEFAULT_ROUTE_RULES
} from '../models/route-access-rule.model';

export interface IAuthorizationMiddleware {
  authorize(): (req: Request, res: Response, next: NextFunction) => void;
  loadRulesFromDatabase(): Promise<void>;
}

export class AuthorizationMiddleware implements IAuthorizationMiddleware {
  private rules: IRouteAccessRule[];

  constructor(rules: IRouteAccessRule[] = DEFAULT_ROUTE_RULES) {
    this.rules = rules;
  }

  public async loadRulesFromDatabase(): Promise<void> {
    const dbRules = await RouteAccessRuleModel.find().lean<IRouteAccessRule[]>();
    if (dbRules.length > 0) {
      this.rules = dbRules;
    }
  }

  public authorize(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      const rule = findMatchingRule(this.rules, req.path, req.method);

      if (!rule) {
        this.sendError(res, 403, 'FORBIDDEN', 'Access denied');
        return;
      }

      if (rule.authLevel === 'public') {
        next();
        return;
      }

      if (rule.authLevel === 'protected') {
        if (!req.userId) {
          this.sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
          return;
        }
        next();
        return;
      }

      if (rule.authLevel === 'admin') {
        if (!req.userId) {
          this.sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
          return;
        }
        if (req.role !== 'admin') {
          this.sendError(res, 403, 'FORBIDDEN', 'Insufficient permissions');
          return;
        }
        next();
        return;
      }

      this.sendError(res, 403, 'FORBIDDEN', 'Access denied');
    };
  }

  private sendError(res: Response, status: number, code: string, message: string): void {
    res.status(status).json({
      success: false,
      error: { code, message }
    });
  }
}
