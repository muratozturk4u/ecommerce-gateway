import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export interface IErrorHandler {
  handle(): (err: Error, req: Request, res: Response, next: NextFunction) => void;
}

export class ErrorHandler implements IErrorHandler {
  public handle(): (err: Error, req: Request, res: Response, next: NextFunction) => void {
    return (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({
          success: false,
          error: {
            code: err.code,
            message: err.message
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        }
      });
    };
  }
}
