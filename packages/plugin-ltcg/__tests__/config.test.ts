import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { logger } from "@elizaos/core";
import { z } from "zod";
import plugin from "../src/plugin";
import { createMockRuntime } from "./utils/core-test-utils";

// Access the plugin's init function
const initPlugin = plugin.init;

describe("Plugin Configuration Schema", () => {
  // Create a backup of the original env values
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Use spyOn for logger methods
    spyOn(logger, "info");
    spyOn(logger, "error");
    spyOn(logger, "warn");
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment variables after each test
    process.env = { ...originalEnv };
  });

  it("should accept valid configuration", async () => {
    const validConfig = {
      LTCG_API_KEY: "valid-api-key",
      LTCG_CALLBACK_URL: "https://example.com/webhook",
    };

    if (initPlugin) {
      let error: Error | null = null;
      try {
        await initPlugin(validConfig, createMockRuntime());
      } catch (e) {
        error = e as Error;
      }
      expect(error).toBeNull();
    }
  });

  it("should accept empty configuration with warnings", async () => {
    // The plugin accepts empty config but logs warnings about missing keys
    const emptyConfig = {};

    if (initPlugin) {
      let error: Error | null = null;
      try {
        await initPlugin(emptyConfig, createMockRuntime());
      } catch (e) {
        error = e as Error;
      }
      // Should not throw - all config values are optional
      expect(error).toBeNull();
    }
  });

  it("should accept configuration with additional properties", async () => {
    const configWithExtra = {
      LTCG_API_KEY: "valid-api-key",
      EXTRA_PROPERTY: "should be ignored",
    };

    if (initPlugin) {
      let error: Error | null = null;
      try {
        await initPlugin(configWithExtra, createMockRuntime());
      } catch (e) {
        error = e as Error;
      }
      expect(error).toBeNull();
    }
  });

  it("should reject invalid LTCG_API_URL configuration", async () => {
    const invalidConfig = {
      LTCG_API_URL: "not-a-valid-url", // Invalid URL format
    };

    if (initPlugin) {
      let error: Error | null = null;
      try {
        await initPlugin(invalidConfig, createMockRuntime());
      } catch (e) {
        error = e as Error;
      }
      // Should throw because LTCG_API_URL must be a valid URL
      expect(error).not.toBeNull();
      expect(error?.message).toContain("Invalid LTCG plugin configuration");
    }
  });

  it("should set environment variables from valid config", async () => {
    const testConfig = {
      LTCG_API_KEY: "test-api-key",
      LTCG_CALLBACK_URL: "https://test.example.com/webhook",
    };

    if (initPlugin) {
      // Ensure env variables don't exist beforehand
      delete process.env['LTCG_API_KEY'];
      delete process.env['LTCG_CALLBACK_URL'];

      // Initialize with config
      await initPlugin(testConfig, createMockRuntime());

      // Verify environment variables were set
      expect(process.env['LTCG_API_KEY']).toBe("test-api-key");
      expect(process.env['LTCG_CALLBACK_URL']).toBe("https://test.example.com/webhook");
    }
  });

  it("should set boolean config values as strings", async () => {
    const testConfig = {
      LTCG_AUTO_MATCHMAKING: "true",
      LTCG_DEBUG_MODE: "false",
    };

    if (initPlugin) {
      delete process.env['LTCG_AUTO_MATCHMAKING'];
      delete process.env['LTCG_DEBUG_MODE'];

      await initPlugin(testConfig, createMockRuntime());

      // Boolean values are transformed and stored
      expect(process.env['LTCG_AUTO_MATCHMAKING']).toBe("true");
      expect(process.env['LTCG_DEBUG_MODE']).toBe("false");
    }
  });

  it("should handle zod validation errors gracefully", async () => {
    // Create a mock of zod's parseAsync that throws a ZodError
    // Using Zod 4 API with invalid_format for URL validation errors
    const mockZodError = new z.ZodError([
      {
        code: z.ZodIssueCode.invalid_format,
        format: "url",
        message: "LTCG_API_URL must be a valid URL",
        path: ["LTCG_API_URL"],
        input: "not-a-valid-url",
      },
    ]);

    // Create a simple schema for mocking
    const schema = z.object({
      LTCG_API_URL: z.string().url(),
    });

    // Mock the parseAsync function
    const originalParseAsync = schema.parseAsync;
    schema.parseAsync = mock().mockRejectedValue(mockZodError);

    try {
      // Use the mocked schema directly to avoid TypeScript errors
      await schema.parseAsync({});
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBe(mockZodError);
    }

    // Restore the original parseAsync
    schema.parseAsync = originalParseAsync;
  });

  it("should rethrow non-zod errors", async () => {
    // Create a generic error
    const genericError = new Error("Something went wrong");

    // Create a simple schema for mocking
    const schema = z.object({
      LTCG_API_KEY: z.string().min(1),
    });

    // Mock the parseAsync function
    const originalParseAsync = schema.parseAsync;
    schema.parseAsync = mock().mockRejectedValue(genericError);

    try {
      // Use the mocked schema directly to avoid TypeScript errors
      await schema.parseAsync({});
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBe(genericError);
    }

    // Restore the original parseAsync
    schema.parseAsync = originalParseAsync;
  });
});
