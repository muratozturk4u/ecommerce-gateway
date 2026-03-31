import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';

export interface IRateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface IRateLimitMiddleware {
  create(): RateLimitRequestHandler;
}

export class RateLimitMiddleware implements IRateLimitMiddleware {
  private static readonly DEFAULT_CONFIG: IRateLimitConfig = {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  };

  private readonly config: IRateLimitConfig;

  constructor(config?: IRateLimitConfig) {
    this.config = config || RateLimitMiddleware.DEFAULT_CONFIG;
  }

  public create(): RateLimitRequestHandler {
    return rateLimit({
      windowMs: this.config.windowMs,
      max: this.config.maxRequests,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, res) => {
        this.sendRateLimitResponse(res);
      }
    });
  }

  private sendRateLimitResponse(res: import('express').Response): void {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later'
      }
    });
  }
}
