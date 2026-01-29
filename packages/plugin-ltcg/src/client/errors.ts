/**
 * Custom Error Classes for LTCG API Client
 *
 * These errors map to specific HTTP status codes and error scenarios
 * from the REST API to provide clear error handling.
 */

import { ApiErrorCode } from '../types/api';

/**
 * Base error class for all LTCG API errors
 */
export class LTCGApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  public readonly timestamp: number;

  constructor(
    message: string,
    code: string = ApiErrorCode.INTERNAL_ERROR,
    statusCode: number = 500,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'LTCGApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = Date.now();

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Authentication error (401)
 * Thrown when API key is missing, invalid, or expired
 */
export class AuthenticationError extends LTCGApiError {
  constructor(message: string = 'Authentication failed', details?: Record<string, any>) {
    super(message, ApiErrorCode.UNAUTHORIZED, 401, details);
    this.name = 'AuthenticationError';
  }
}

/**
 * Rate limit error (429)
 * Thrown when API rate limits are exceeded
 */
export class RateLimitError extends LTCGApiError {
  public readonly retryAfter?: number; // Seconds until retry
  public readonly remaining: number;
  public readonly limit: number;
  public readonly resetAt: number;

  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter?: number,
    remaining: number = 0,
    limit: number = 60,
    resetAt?: number,
    details?: Record<string, any>
  ) {
    super(message, ApiErrorCode.RATE_LIMIT_EXCEEDED, 429, details);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    this.remaining = remaining;
    this.limit = limit;
    this.resetAt = resetAt ?? Date.now() + (retryAfter ?? 60) * 1000;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
      remaining: this.remaining,
      limit: this.limit,
      resetAt: this.resetAt,
    };
  }
}

/**
 * Validation error (400)
 * Thrown when request parameters are invalid or missing
 */
export class ValidationError extends LTCGApiError {
  public readonly invalidFields?: string[];

  constructor(message: string = 'Validation failed', invalidFields?: string[], details?: Record<string, any>) {
    super(message, ApiErrorCode.VALIDATION_ERROR, 400, details);
    this.name = 'ValidationError';
    this.invalidFields = invalidFields;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      invalidFields: this.invalidFields,
    };
  }
}

/**
 * Network error
 * Thrown when network request fails (connection issues, timeouts)
 */
export class NetworkError extends LTCGApiError {
  public readonly originalError?: Error;

  constructor(message: string = 'Network request failed', originalError?: Error, details?: Record<string, any>) {
    super(message, ApiErrorCode.NETWORK_ERROR, 0, details);
    this.name = 'NetworkError';
    this.originalError = originalError;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      originalError: this.originalError?.message,
    };
  }
}

/**
 * Game error (404, 400 game-specific errors)
 * Thrown for game logic errors like invalid moves, wrong phase, etc.
 */
export class GameError extends LTCGApiError {
  public readonly gameId?: string;
  public readonly phase?: string;
  public readonly turnPlayer?: string;

  constructor(
    message: string,
    code: string,
    statusCode: number = 400,
    gameId?: string,
    details?: Record<string, any>
  ) {
    super(message, code, statusCode, details);
    this.name = 'GameError';
    this.gameId = gameId;
    this.phase = details?.phase;
    this.turnPlayer = details?.turnPlayer;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      gameId: this.gameId,
      phase: this.phase,
      turnPlayer: this.turnPlayer,
    };
  }
}

/**
 * Parse error response from API and throw appropriate error
 */
export function parseErrorResponse(statusCode: number, body: any): LTCGApiError {
  const errorCode = body?.error?.code || 'UNKNOWN_ERROR';
  const errorMessage = body?.error?.message || 'An unknown error occurred';
  const errorDetails = body?.error?.details;

  // Authentication errors (401)
  if (statusCode === 401 || errorCode === ApiErrorCode.UNAUTHORIZED || errorCode === ApiErrorCode.INVALID_API_KEY) {
    return new AuthenticationError(errorMessage, errorDetails);
  }

  // Rate limit errors (429)
  if (statusCode === 429 || errorCode === ApiErrorCode.RATE_LIMIT_EXCEEDED) {
    const retryAfter = errorDetails?.retryAfter;
    const remaining = errorDetails?.remaining ?? 0;
    const limit = errorDetails?.limit ?? 60;
    const resetAt = errorDetails?.resetAt;
    return new RateLimitError(errorMessage, retryAfter, remaining, limit, resetAt, errorDetails);
  }

  // Validation errors (400)
  if (
    statusCode === 400 &&
    (errorCode === ApiErrorCode.VALIDATION_ERROR ||
      errorDetails?.missingFields ||
      errorDetails?.invalidFields)
  ) {
    const invalidFields = errorDetails?.missingFields || errorDetails?.invalidFields;
    return new ValidationError(errorMessage, invalidFields, errorDetails);
  }

  // Game-specific errors
  if (
    [
      ApiErrorCode.GAME_NOT_FOUND,
      ApiErrorCode.NOT_YOUR_TURN,
      ApiErrorCode.INVALID_PHASE,
      ApiErrorCode.INVALID_MOVE,
      ApiErrorCode.ALREADY_SUMMONED,
      ApiErrorCode.INSUFFICIENT_TRIBUTES,
      ApiErrorCode.CARD_NOT_FOUND,
      ApiErrorCode.INVALID_TARGET,
      ApiErrorCode.LOBBY_NOT_FOUND,
      ApiErrorCode.LOBBY_FULL,
      ApiErrorCode.INVALID_DECK,
    ].includes(errorCode as ApiErrorCode)
  ) {
    const gameId = errorDetails?.gameId;
    return new GameError(errorMessage, errorCode, statusCode, gameId, errorDetails);
  }

  // Generic API error
  return new LTCGApiError(errorMessage, errorCode, statusCode, errorDetails);
}
