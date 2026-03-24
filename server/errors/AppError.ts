// server/errors/AppError.ts
// Centralized error class for standardized HTTP error responses

/**
 * Custom application error class for consistent error handling across the API.
 * Provides static factory methods for common HTTP error types.
 * 
 * Usage:
 *   throw AppError.notFound('User not found');
 *   throw AppError.badRequest('Invalid email format', 'INVALID_EMAIL');
 *   throw new AppError('Custom error', 422, 'CUSTOM_CODE');
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where the error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * 400 Bad Request - Invalid input or malformed request
   */
  static badRequest(message: string, code?: string): AppError {
    return new AppError(message, 400, code || 'BAD_REQUEST');
  }

  /**
   * 401 Unauthorized - Authentication required or failed
   */
  static unauthorized(message: string = 'Unauthorized'): AppError {
    return new AppError(message, 401, 'UNAUTHORIZED');
  }

  /**
   * 403 Forbidden - Authenticated but not allowed
   */
  static forbidden(message: string = 'Forbidden'): AppError {
    return new AppError(message, 403, 'FORBIDDEN');
  }

  /**
   * 404 Not Found - Resource doesn't exist
   */
  static notFound(message: string = 'Resource not found'): AppError {
    return new AppError(message, 404, 'NOT_FOUND');
  }

  /**
   * 409 Conflict - Resource state conflict (e.g., duplicate)
   */
  static conflict(message: string, code?: string): AppError {
    return new AppError(message, 409, code || 'CONFLICT');
  }

  /**
   * 422 Unprocessable Entity - Validation failed
   */
  static validation(message: string, code?: string): AppError {
    return new AppError(message, 422, code || 'VALIDATION_ERROR');
  }

  /**
   * 429 Too Many Requests - Rate limit exceeded
   */
  static rateLimited(message: string = 'Too many requests'): AppError {
    return new AppError(message, 429, 'RATE_LIMITED');
  }

  /**
   * 500 Internal Server Error - Unexpected server error
   */
  static internal(message: string = 'Internal server error'): AppError {
    return new AppError(message, 500, 'INTERNAL_ERROR');
  }

  /**
   * 503 Service Unavailable - Service temporarily unavailable
   */
  static serviceUnavailable(message: string = 'Service temporarily unavailable'): AppError {
    return new AppError(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

export default AppError;
