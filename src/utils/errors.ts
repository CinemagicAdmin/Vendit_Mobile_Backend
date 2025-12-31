/**
 * Custom Error Classes for Vend-IT API
 *
 * Standardized error handling with error codes for better client-side handling
 */

/**
 * Error codes for client-side error handling
 */
export enum ErrorCode {
  // Validation Errors (1000-1999)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_FIELD = 'MISSING_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',

  // Authentication Errors (2000-2999)
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_OTP = 'INVALID_OTP',
  OTP_EXPIRED = 'OTP_EXPIRED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  CSRF_TOKEN_INVALID = 'CSRF_TOKEN_INVALID',

  // Authorization Errors (3000-3999)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',

  // Resource Errors (4000-4999)
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',

  // Rate Limiting (5000-5999)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',

  // Payment Errors (6000-6999)
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  PAYMENT_PROCESSING_ERROR = 'PAYMENT_PROCESSING_ERROR',

  // Business Logic Errors (7000-7999)
  PRODUCT_OUT_OF_STOCK = 'PRODUCT_OUT_OF_STOCK',
  MACHINE_OFFLINE = 'MACHINE_OFFLINE',
  DISPENSE_FAILED = 'DISPENSE_FAILED',

  // Server Errors (9000-9999)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

/**
 * Base API Error class
 */
export class BaseApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly details: any;
  public readonly correlationId?: string;
  public readonly timestamp: string;

  constructor(
    statusCode: number,
    errorCode: ErrorCode,
    message: string,
    details: any = null,
    correlationId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.correlationId = correlationId;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      status: this.statusCode,
      error: this.name,
      code: this.errorCode,
      message: this.message,
      details: this.details,
      correlationId: this.correlationId,
      timestamp: this.timestamp
    };
  }
}

/**
 * Validation Error (400)
 */
export class ValidationError extends BaseApiError {
  constructor(message: string = 'Validation failed', details: any = null, correlationId?: string) {
    super(400, ErrorCode.VALIDATION_ERROR, message, details, correlationId);
  }
}

/**
 * Authentication Error (401)
 */
export class AuthenticationError extends BaseApiError {
  constructor(
    message: string = 'Authentication failed',
    errorCode: ErrorCode = ErrorCode.AUTHENTICATION_FAILED,
    details: any = null,
    correlationId?: string
  ) {
    super(401, errorCode, message, details, correlationId);
  }
}

/**
 * Authorization Error (403)
 */
export class AuthorizationError extends BaseApiError {
  constructor(
    message: string = 'Access forbidden',
    errorCode: ErrorCode = ErrorCode.FORBIDDEN,
    details: any = null,
    correlationId?: string
  ) {
    super(403, errorCode, message, details, correlationId);
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends BaseApiError {
  constructor(
    resource: string = 'Resource',
    errorCode: ErrorCode = ErrorCode.NOT_FOUND,
    correlationId?: string
  ) {
    super(404, errorCode, `${resource} not found`, null, correlationId);
  }
}

/**
 * Conflict Error (409)
 */
export class ConflictError extends BaseApiError {
  constructor(
    message: string = 'Resource conflict',
    errorCode: ErrorCode = ErrorCode.CONFLICT,
    details: any = null,
    correlationId?: string
  ) {
    super(409, errorCode, message, details, correlationId);
  }
}

/**
 * Rate Limit Error (429)
 */
export class RateLimitError extends BaseApiError {
  public readonly retryAfter?: number;

  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter?: number,
    correlationId?: string
  ) {
    super(429, ErrorCode.RATE_LIMIT_EXCEEDED, message, { retryAfter }, correlationId);
    this.retryAfter = retryAfter;
  }
}

/**
 * Server Error (500)
 */
export class ServerError extends BaseApiError {
  constructor(
    message: string = 'Internal server error',
    errorCode: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    details: any = null,
    correlationId?: string
  ) {
    super(500, errorCode, message, details, correlationId);
  }
}

/**
 * Payment Error (402/400)
 */
export class PaymentError extends BaseApiError {
  constructor(
    message: string = 'Payment processing failed',
    errorCode: ErrorCode = ErrorCode.PAYMENT_FAILED,
    details: any = null,
    correlationId?: string
  ) {
    super(402, errorCode, message, details, correlationId);
  }
}

/**
 * Business Logic Error (400/422)
 */
export class BusinessLogicError extends BaseApiError {
  constructor(
    message: string,
    errorCode: ErrorCode,
    statusCode: number = 422,
    details: any = null,
    correlationId?: string
  ) {
    super(statusCode, errorCode, message, details, correlationId);
  }
}
