export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string) {
    super(message, 403, 'FORBIDDEN');
  }
}

export class InvalidStatusTransitionError extends AppError {
  constructor(message: string) {
    super(message, 400, 'INVALID_STATUS_TRANSITION');
  }
}

export class ItemPriceMismatchError extends AppError {
  constructor(message: string) {
    super(message, 400, 'ITEM_PRICE_MISMATCH');
  }
}

export class TotalAmountMismatchError extends AppError {
  constructor(message: string) {
    super(message, 400, 'TOTAL_AMOUNT_MISMATCH');
  }
}
