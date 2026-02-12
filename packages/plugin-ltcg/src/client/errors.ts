/**
 * Custom Error Classes for LTCG API Client
 *
 * These errors map to specific HTTP status codes and error scenarios
 * from the REST API to provide clear error handling.
 */

import { ApiErrorCode } from "../types/api";
import type { ErrorDetails } from "../types/eliza";

/**
 * Base error class for all LTCG API errors
 */
export class LTCGApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: ErrorDetails;
  public readonly timestamp: number;

  constructor(
    message: string,
    code: string = ApiErrorCode.INTERNAL_ERROR,
    statusCode = 500,
    details?: ErrorDetails,
  ) {
    super(message);
    this.name = "LTCGApiError";
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
  constructor(message = "Authentication failed", details?: ErrorDetails) {
    super(message, ApiErrorCode.UNAUTHORIZED, 401, details);
    this.name = "AuthenticationError";
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
    message = "Rate limit exceeded",
    retryAfter?: number,
    remaining = 0,
    limit = 60,
    resetAt?: number,
    details?: ErrorDetails,
  ) {
    super(message, ApiErrorCode.RATE_LIMIT_EXCEEDED, 429, details);
    this.name = "RateLimitError";
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

  constructor(
    message = "Validation failed",
    invalidFields?: string[],
    details?: ErrorDetails,
  ) {
    super(message, ApiErrorCode.VALIDATION_ERROR, 400, details);
    this.name = "ValidationError";
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

  constructor(
    message = "Network request failed",
    originalError?: Error,
    details?: ErrorDetails,
  ) {
    super(message, ApiErrorCode.NETWORK_ERROR, 0, details);
    this.name = "NetworkError";
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
    statusCode = 400,
    gameId?: string,
    details?: ErrorDetails,
  ) {
    super(message, code, statusCode, details);
    this.name = "GameError";
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

// =============================================================================
// x402 Payment Errors
// =============================================================================

/**
 * Payment required error (402)
 * Thrown when a resource requires x402 payment
 */
export class PaymentRequiredError extends LTCGApiError {
  public readonly paymentRequirements: X402PaymentRequirements;

  constructor(
    requirements: X402PaymentRequirements,
    message = "Payment required",
    details?: ErrorDetails,
  ) {
    super(message, "PAYMENT_REQUIRED", 402, details);
    this.name = "PaymentRequiredError";
    this.paymentRequirements = requirements;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      paymentRequirements: this.paymentRequirements,
    };
  }
}

/**
 * Insufficient balance error
 * Thrown when agent doesn't have enough tokens for payment
 */
export class InsufficientBalanceError extends LTCGApiError {
  public readonly currentBalance: bigint;
  public readonly requiredAmount: bigint;

  constructor(
    currentBalance: bigint,
    requiredAmount: bigint,
    details?: ErrorDetails,
  ) {
    super(
      `Insufficient balance: have ${currentBalance.toString()}, need ${requiredAmount.toString()}`,
      "INSUFFICIENT_BALANCE",
      400,
      details,
    );
    this.name = "InsufficientBalanceError";
    this.currentBalance = currentBalance;
    this.requiredAmount = requiredAmount;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      currentBalance: this.currentBalance.toString(),
      requiredAmount: this.requiredAmount.toString(),
    };
  }
}

/**
 * Payment limit exceeded error
 * Thrown when payment exceeds configured safety limits
 */
export class PaymentLimitExceededError extends LTCGApiError {
  public readonly amount: bigint;
  public readonly limit: bigint;

  constructor(amount: bigint, limit: bigint, details?: ErrorDetails) {
    super(
      `Payment amount ${amount.toString()} exceeds limit ${limit.toString()}`,
      "PAYMENT_LIMIT_EXCEEDED",
      400,
      details,
    );
    this.name = "PaymentLimitExceededError";
    this.amount = amount;
    this.limit = limit;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      amount: this.amount.toString(),
      limit: this.limit.toString(),
    };
  }
}

/**
 * Wallet delegation error
 * Thrown when agent hasn't delegated signing permissions
 */
export class WalletDelegationError extends LTCGApiError {
  constructor(
    message = "Agent has not delegated signing permissions",
    details?: ErrorDetails,
  ) {
    super(message, "WALLET_DELEGATION_REQUIRED", 403, details);
    this.name = "WalletDelegationError";
  }
}

/**
 * Unsupported payment method error
 * Thrown when server requires payment method not supported by client
 */
export class UnsupportedPaymentError extends LTCGApiError {
  public readonly supportedSchemes: string[];

  constructor(
    message = "No supported payment method available",
    supportedSchemes: string[] = [],
    details?: ErrorDetails,
  ) {
    super(message, "UNSUPPORTED_PAYMENT", 400, details);
    this.name = "UnsupportedPaymentError";
    this.supportedSchemes = supportedSchemes;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      supportedSchemes: this.supportedSchemes,
    };
  }
}

/**
 * x402 Payment Requirements from server
 */
export interface X402PaymentRequirements {
  x402Version: number;
  accepts: Array<{
    scheme: string;
    network: string;
    amount: string;
    asset: string;
    payTo: string;
    maxTimeoutSeconds: number;
    extra?: {
      name?: string;
      description?: string;
    };
  }>;
  resource?: {
    url: string;
    description?: string;
  };
  error?: string;
}

/**
 * Parse error response from API and throw appropriate error
 */
export function parseErrorResponse(
  statusCode: number,
  body: ErrorDetails,
): LTCGApiError {
  const bodyWithError = body as ErrorDetails & {
    error?: { code?: string; message?: string; details?: ErrorDetails };
  };
  const errorCode = bodyWithError?.error?.code || "UNKNOWN_ERROR";
  const errorMessage =
    bodyWithError?.error?.message || "An unknown error occurred";
  const errorDetails = bodyWithError?.error?.details;

  // Authentication errors (401)
  if (
    statusCode === 401 ||
    errorCode === ApiErrorCode.UNAUTHORIZED ||
    errorCode === ApiErrorCode.INVALID_API_KEY
  ) {
    return new AuthenticationError(errorMessage, errorDetails);
  }

  // Rate limit errors (429)
  if (statusCode === 429 || errorCode === ApiErrorCode.RATE_LIMIT_EXCEEDED) {
    const retryAfter = errorDetails?.retryAfter;
    const remaining = errorDetails?.remaining ?? 0;
    const limit = errorDetails?.limit ?? 60;
    const resetAt = errorDetails?.resetAt;
    return new RateLimitError(
      errorMessage,
      retryAfter,
      remaining,
      limit,
      resetAt,
      errorDetails,
    );
  }

  // Validation errors (400)
  if (
    statusCode === 400 &&
    (errorCode === ApiErrorCode.VALIDATION_ERROR ||
      errorDetails?.missingFields ||
      errorDetails?.invalidFields)
  ) {
    const invalidFields =
      errorDetails?.missingFields || errorDetails?.invalidFields;
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
    return new GameError(
      errorMessage,
      errorCode,
      statusCode,
      gameId,
      errorDetails,
    );
  }

  // Generic API error
  return new LTCGApiError(errorMessage, errorCode, statusCode, errorDetails);
}
