/**
 * Tests for Custom Error Classes
 * Converted to bun:test for ElizaOS pattern compatibility
 */

import { describe, expect, it } from "bun:test";
import { ApiErrorCode } from "../../src/types/api";
import {
  AuthenticationError,
  GameError,
  LTCGApiError,
  NetworkError,
  RateLimitError,
  ValidationError,
  parseErrorResponse,
} from "../../src/client/errors";

describe("LTCGApiError", () => {
  it("should create base error with all properties", () => {
    const error = new LTCGApiError("Test error", "TEST_CODE", 400, { extra: "data" });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("LTCGApiError");
    expect(error.message).toBe("Test error");
    expect(error.code).toBe("TEST_CODE");
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual({ extra: "data" });
    expect(error.timestamp).toBeGreaterThan(0);
  });

  it("should use default values when not provided", () => {
    const error = new LTCGApiError("Test error");

    expect(error.code).toBe(ApiErrorCode.INTERNAL_ERROR);
    expect(error.statusCode).toBe(500);
    expect(error.details).toBeUndefined();
  });

  it("should serialize to JSON correctly", () => {
    const error = new LTCGApiError("Test error", "TEST_CODE", 400, { extra: "data" });
    const json = error.toJSON();

    expect(json).toEqual({
      name: "LTCGApiError",
      message: "Test error",
      code: "TEST_CODE",
      statusCode: 400,
      details: { extra: "data" },
      timestamp: error.timestamp,
    });
  });

  it("should maintain proper stack trace", () => {
    const error = new LTCGApiError("Test error");
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain("LTCGApiError");
  });
});

describe("AuthenticationError", () => {
  it("should create authentication error with 401 status", () => {
    const error = new AuthenticationError("Invalid API key");

    expect(error).toBeInstanceOf(LTCGApiError);
    expect(error.name).toBe("AuthenticationError");
    expect(error.message).toBe("Invalid API key");
    expect(error.code).toBe(ApiErrorCode.UNAUTHORIZED);
    expect(error.statusCode).toBe(401);
  });

  it("should use default message when not provided", () => {
    const error = new AuthenticationError();
    expect(error.message).toBe("Authentication failed");
  });

  it("should include details when provided", () => {
    const error = new AuthenticationError("Invalid key", { keyPrefix: "ltcg_abc" });
    expect(error.details).toEqual({ keyPrefix: "ltcg_abc" });
  });
});

describe("RateLimitError", () => {
  it("should create rate limit error with retry information", () => {
    const error = new RateLimitError("Too many requests", 60, 0, 100, 1234567890000);

    expect(error).toBeInstanceOf(LTCGApiError);
    expect(error.name).toBe("RateLimitError");
    expect(error.message).toBe("Too many requests");
    expect(error.code).toBe(ApiErrorCode.RATE_LIMIT_EXCEEDED);
    expect(error.statusCode).toBe(429);
    expect(error.retryAfter).toBe(60);
    expect(error.remaining).toBe(0);
    expect(error.limit).toBe(100);
    expect(error.resetAt).toBe(1234567890000);
  });

  it("should use default values", () => {
    const error = new RateLimitError();

    expect(error.message).toBe("Rate limit exceeded");
    expect(error.remaining).toBe(0);
    expect(error.limit).toBe(60);
  });

  it("should calculate resetAt from retryAfter when not provided", () => {
    const before = Date.now();
    const error = new RateLimitError("Test", 30);
    const after = Date.now();

    expect(error.resetAt).toBeGreaterThanOrEqual(before + 30000);
    expect(error.resetAt).toBeLessThanOrEqual(after + 30000 + 10); // Allow 10ms tolerance
  });

  it("should serialize with retry information", () => {
    const error = new RateLimitError("Test", 60, 5, 100, 1234567890000);
    const json = error.toJSON();

    expect(json.retryAfter).toBe(60);
    expect(json.remaining).toBe(5);
    expect(json.limit).toBe(100);
    expect(json.resetAt).toBe(1234567890000);
  });
});

describe("ValidationError", () => {
  it("should create validation error with invalid fields", () => {
    const error = new ValidationError("Missing required fields", ["name", "email"]);

    expect(error).toBeInstanceOf(LTCGApiError);
    expect(error.name).toBe("ValidationError");
    expect(error.message).toBe("Missing required fields");
    expect(error.code).toBe(ApiErrorCode.VALIDATION_ERROR);
    expect(error.statusCode).toBe(400);
    expect(error.invalidFields).toEqual(["name", "email"]);
  });

  it("should use default message", () => {
    const error = new ValidationError();
    expect(error.message).toBe("Validation failed");
  });

  it("should serialize with invalid fields", () => {
    const error = new ValidationError("Test", ["field1"]);
    const json = error.toJSON();

    expect(json.invalidFields).toEqual(["field1"]);
  });
});

describe("NetworkError", () => {
  it("should create network error with original error", () => {
    const originalError = new Error("Connection refused");
    const error = new NetworkError("Network failed", originalError);

    expect(error).toBeInstanceOf(LTCGApiError);
    expect(error.name).toBe("NetworkError");
    expect(error.message).toBe("Network failed");
    expect(error.code).toBe(ApiErrorCode.NETWORK_ERROR);
    expect(error.statusCode).toBe(0);
    expect(error.originalError).toBe(originalError);
  });

  it("should use default message", () => {
    const error = new NetworkError();
    expect(error.message).toBe("Network request failed");
  });

  it("should serialize with original error message", () => {
    const originalError = new Error("Connection timeout");
    const error = new NetworkError("Network failed", originalError);
    const json = error.toJSON();

    expect(json.originalError).toBe("Connection timeout");
  });
});

describe("GameError", () => {
  it("should create game error with game context", () => {
    const error = new GameError("Not your turn", ApiErrorCode.NOT_YOUR_TURN, 400, "game123", {
      phase: "combat",
      turnPlayer: "opponent",
    });

    expect(error).toBeInstanceOf(LTCGApiError);
    expect(error.name).toBe("GameError");
    expect(error.message).toBe("Not your turn");
    expect(error.code).toBe(ApiErrorCode.NOT_YOUR_TURN);
    expect(error.statusCode).toBe(400);
    expect(error.gameId).toBe("game123");
    expect(error.phase).toBe("combat");
    expect(error.turnPlayer).toBe("opponent");
  });

  it("should work without optional game context", () => {
    const error = new GameError("Game not found", ApiErrorCode.GAME_NOT_FOUND, 404);

    expect(error.gameId).toBeUndefined();
    expect(error.phase).toBeUndefined();
    expect(error.turnPlayer).toBeUndefined();
  });

  it("should serialize with game context", () => {
    const error = new GameError("Test", ApiErrorCode.INVALID_MOVE, 400, "game123", {
      phase: "main",
    });
    const json = error.toJSON();

    expect(json.gameId).toBe("game123");
    expect(json.phase).toBe("main");
  });
});

describe("parseErrorResponse", () => {
  it("should parse authentication error (401)", () => {
    const body = {
      success: false,
      error: {
        code: ApiErrorCode.UNAUTHORIZED,
        message: "Invalid API key",
      },
    };

    const error = parseErrorResponse(401, body);

    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.message).toBe("Invalid API key");
  });

  it("should parse invalid API key error", () => {
    const body = {
      success: false,
      error: {
        code: ApiErrorCode.INVALID_API_KEY,
        message: "API key is invalid",
      },
    };

    const error = parseErrorResponse(401, body);

    expect(error).toBeInstanceOf(AuthenticationError);
  });

  it("should parse rate limit error (429)", () => {
    const body = {
      success: false,
      error: {
        code: ApiErrorCode.RATE_LIMIT_EXCEEDED,
        message: "Rate limit exceeded",
        details: {
          retryAfter: 30,
          remaining: 0,
          limit: 60,
          resetAt: 1234567890000,
        },
      },
    };

    const error = parseErrorResponse(429, body);

    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.message).toBe("Rate limit exceeded");
    if (error instanceof RateLimitError) {
      expect(error.retryAfter).toBe(30);
      expect(error.remaining).toBe(0);
      expect(error.limit).toBe(60);
      expect(error.resetAt).toBe(1234567890000);
    }
  });

  it("should parse validation error with missing fields", () => {
    const body = {
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "Missing required fields",
        details: {
          missingFields: ["name", "email"],
        },
      },
    };

    const error = parseErrorResponse(400, body);

    expect(error).toBeInstanceOf(ValidationError);
    if (error instanceof ValidationError) {
      expect(error.invalidFields).toEqual(["name", "email"]);
    }
  });

  it("should parse validation error with invalid fields", () => {
    const body = {
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "Invalid fields",
        details: {
          invalidFields: ["email"],
        },
      },
    };

    const error = parseErrorResponse(400, body);

    expect(error).toBeInstanceOf(ValidationError);
    if (error instanceof ValidationError) {
      expect(error.invalidFields).toEqual(["email"]);
    }
  });

  it("should parse game not found error", () => {
    const body = {
      success: false,
      error: {
        code: ApiErrorCode.GAME_NOT_FOUND,
        message: "Game not found",
        details: {
          gameId: "game123",
        },
      },
    };

    const error = parseErrorResponse(404, body);

    expect(error).toBeInstanceOf(GameError);
    expect(error.message).toBe("Game not found");
    if (error instanceof GameError) {
      expect(error.gameId).toBe("game123");
    }
  });

  it("should parse not your turn error", () => {
    const body = {
      success: false,
      error: {
        code: ApiErrorCode.NOT_YOUR_TURN,
        message: "It is not your turn",
        details: {
          gameId: "game123",
          phase: "combat",
          turnPlayer: "opponent",
        },
      },
    };

    const error = parseErrorResponse(400, body);

    expect(error).toBeInstanceOf(GameError);
    if (error instanceof GameError) {
      expect(error.gameId).toBe("game123");
      expect(error.phase).toBe("combat");
      expect(error.turnPlayer).toBe("opponent");
    }
  });

  it("should parse all game error codes", () => {
    const gameErrorCodes = [
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
    ];

    for (const code of gameErrorCodes) {
      const body = {
        success: false,
        error: {
          code,
          message: "Test error",
        },
      };

      const error = parseErrorResponse(400, body);
      expect(error).toBeInstanceOf(GameError);
      expect(error.code).toBe(code);
    }
  });

  it("should handle unknown error codes", () => {
    const body = {
      success: false,
      error: {
        code: "UNKNOWN_ERROR",
        message: "Something went wrong",
      },
    };

    const error = parseErrorResponse(500, body);

    expect(error).toBeInstanceOf(LTCGApiError);
    expect(error).not.toBeInstanceOf(AuthenticationError);
    expect(error.message).toBe("Something went wrong");
    expect(error.code).toBe("UNKNOWN_ERROR");
  });

  it("should handle malformed response bodies", () => {
    const error = parseErrorResponse(500, {});

    expect(error).toBeInstanceOf(LTCGApiError);
    expect(error.message).toBe("An unknown error occurred");
    expect(error.code).toBe("UNKNOWN_ERROR");
  });

  it("should handle missing error message", () => {
    const body = {
      error: {
        code: "TEST_CODE",
      },
    };

    const error = parseErrorResponse(500, body);

    expect(error.message).toBe("An unknown error occurred");
    expect(error.code).toBe("TEST_CODE");
  });
});
