import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export interface IErrorHandler {
  handle(): (err: Error, req: Request, res: Response, next: NextFunction) => void;
}

export class ErrorHandler implements IErrorHandler {
  public handle(): (err: Error, req: Request, res: Response, next: NextFunction) => void {
    return (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
      if (err instanceof AppError) {
        this.sendErrorResponse(res, err.statusCode, err.code, err.message);
        return;
      }

      this.sendErrorResponse(res, 500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred');
    };
  }

  private sendErrorResponse(
    res: Response,
    statusCode: number,
    code: string,
    message: string
  ): void {
    res.status(statusCode).json({
      success: false,
      error: { code, message }
    });
  }
}
