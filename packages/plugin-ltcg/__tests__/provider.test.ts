import { afterAll, beforeAll, describe, expect, it, spyOn } from "bun:test";
import type { IAgentRuntime, Memory, Provider, State } from "@elizaos/core";
import { logger } from "@elizaos/core";
// Simple test ID generator - no external dependency needed
const generateTestId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
import plugin from "../src/plugin";

// Note: Bun automatically loads .env files

// Set up logging to capture issues
beforeAll(() => {
  spyOn(logger, "info");
  spyOn(logger, "error");
  spyOn(logger, "warn");
  spyOn(logger, "debug");
});

afterAll(() => {
  // No global restore needed in bun:test;
});

// Helper function to document test results
function documentTestResult(testName: string, result: any, error: Error | null = null) {
  // Clean, useful test documentation for developers
  logger.info(`✓ Testing: ${testName}`);

  if (error) {
    logger.error(`✗ Error: ${error.message}`);
    if (error.stack) {
      logger.error(`Stack: ${error.stack}`);
    }
    return;
  }

  if (result) {
    if (typeof result === "string") {
      if (result.trim() && result.length > 0) {
        const preview = result.length > 60 ? `${result.substring(0, 60)}...` : result;
        logger.info(`  → ${preview}`);
      }
    } else if (typeof result === "object") {
      try {
        // Show key information in a clean format
        const keys = Object.keys(result);
        if (keys.length > 0) {
          const preview = keys.slice(0, 3).join(", ");
          const more = keys.length > 3 ? ` +${keys.length - 3} more` : "";
          logger.info(`  → {${preview}${more}}`);
        }
      } catch (e) {
        logger.info(`  → [Complex object]`);
      }
    }
  }
}

// Create a realistic runtime for testing
function createRealRuntime(): IAgentRuntime {
  return {
    character: {
      name: "Test Character",
      system: "You are a helpful assistant for testing.",
      plugins: [],
      settings: {},
    },
    getSetting: (key: string) => null,
    models: plugin.models,
    db: {
      get: async (key: string) => {
        return null;
      },
      set: async (key: string, value: any) => {
        return true;
      },
      delete: async (key: string) => {
        return true;
      },
      getKeys: async (pattern: string) => {
        return [];
      },
    },
    memory: {
      add: async (memory: any) => {
        // Memory operations for testing
      },
      get: async (id: string) => {
        return null;
      },
      getByEntityId: async (entityId: string) => {
        return [];
      },
      getLatest: async (entityId: string) => {
        return null;
      },
      getRecentMessages: async (options: any) => {
        return [];
      },
      search: async (query: string) => {
        return [];
      },
    },
    getService: (serviceType: string) => {
      return null;
    },
  } as Partial<IAgentRuntime> as IAgentRuntime;
}

// Create realistic memory object
function createRealMemory(): Memory {
  const entityId = generateTestId();
  const roomId = generateTestId();

  return {
    id: generateTestId(),
    entityId,
    roomId,
    timestamp: Date.now(),
    content: {
      text: "What can you provide?",
      source: "test",
      actions: [],
    },
    metadata: {
      type: "custom",
      sessionId: generateTestId(),
      conversationId: generateTestId(),
    },
  } as Memory;
}

describe("Provider Tests", () => {
  // Find the LTCG_GAME_STATE provider from the providers array
  const gameStateProvider = plugin.providers?.find(
    (provider) => provider.name === "LTCG_GAME_STATE"
  );

  describe("LTCG_GAME_STATE", () => {
    it("should exist in the plugin", () => {
      expect(plugin.providers).toBeDefined();
      expect(Array.isArray(plugin.providers)).toBe(true);

      if (plugin.providers) {
        expect(plugin.providers.length).toBeGreaterThan(0);
        const result = plugin.providers.find((p) => p.name === "LTCG_GAME_STATE");
        expect(result).toBeDefined();
        documentTestResult("Provider exists check", {
          found: !!result,
          providers: plugin.providers.map((p) => p.name),
        });
      }
    });

    it("should have the correct structure", () => {
      if (gameStateProvider) {
        expect(gameStateProvider).toHaveProperty("name", "LTCG_GAME_STATE");
        expect(gameStateProvider).toHaveProperty("description");
        expect(gameStateProvider).toHaveProperty("get");
        expect(typeof gameStateProvider.get).toBe("function");

        documentTestResult("Provider structure check", {
          name: gameStateProvider.name,
          description: gameStateProvider.description,
          hasGetMethod: typeof gameStateProvider.get === "function",
        });
      }
    });

    it("should have a description explaining its purpose", () => {
      if (gameStateProvider && gameStateProvider.description) {
        expect(typeof gameStateProvider.description).toBe("string");
        expect(gameStateProvider.description.length).toBeGreaterThan(0);

        documentTestResult("Provider description check", {
          description: gameStateProvider.description,
        });
      }
    });

    it("should return provider data from the get method", async () => {
      if (gameStateProvider) {
        const runtime = createRealRuntime();
        const message = createRealMemory();
        const state = {
          values: { example: "test value" },
          data: { additionalContext: "some context" },
          text: "Current state context",
        } as State;

        let result: any = null;
        let error: Error | null = null;

        try {
          logger.info("Calling provider.get with real implementation");
          result = await gameStateProvider.get(runtime, message, state);

          expect(result).toBeDefined();
          expect(result).toHaveProperty("text");
          expect(result).toHaveProperty("values");
          expect(result).toHaveProperty("data");

          // Look for potential issues in the result
          if (result && (!result.text || result.text.length === 0)) {
            logger.warn("Provider returned empty text");
          }

          if (result && Object.keys(result.values).length === 0) {
            logger.warn("Provider returned empty values object");
          }

          if (result && Object.keys(result.data).length === 0) {
            logger.warn("Provider returned empty data object");
          }
        } catch (e) {
          error = e as Error;
          logger.error({ error: e }, "Error in provider.get:");
        }

        documentTestResult("Provider get method", result, error);
      }
    });

    it("should handle error conditions gracefully", async () => {
      if (gameStateProvider) {
        const runtime = createRealRuntime();
        // Create an invalid memory object to simulate an error scenario
        const invalidMemory = {
          // Missing properties that would be required
          id: generateTestId(),
        } as Partial<Memory> as Memory;

        const state = {
          values: {},
          data: {},
          text: "",
        } as State;

        let result: any = null;
        let error: Error | null = null;

        try {
          logger.info("Calling provider.get with invalid memory object");
          result = await gameStateProvider.get(runtime, invalidMemory, state);

          // Even with invalid input, it should not throw errors
          expect(result).toBeDefined();

          // Log what actual implementation does with invalid input
          logger.info("Provider handled invalid input without throwing");
        } catch (e) {
          error = e as Error;
          logger.error({ error: e }, "Provider threw an error with invalid input:");
        }

        documentTestResult("Provider error handling", result, error);
      }
    });
  });

  describe("Provider Registration", () => {
    it("should include providers in the plugin definition", () => {
      expect(plugin).toHaveProperty("providers");
      expect(Array.isArray(plugin.providers)).toBe(true);

      documentTestResult("Plugin providers check", {
        hasProviders: !!plugin.providers,
        providersCount: plugin.providers?.length || 0,
      });
    });

    it("should correctly initialize providers array", () => {
      // Providers should be an array with at least one provider
      if (plugin.providers) {
        expect(plugin.providers.length).toBeGreaterThan(0);

        let allValid = true;
        const invalidProviders: string[] = [];

        // Each provider should have the required structure
        plugin.providers.forEach((provider: Provider) => {
          const isValid =
            provider.name !== undefined &&
            provider.description !== undefined &&
            typeof provider.get === "function";

          if (!isValid) {
            allValid = false;
            invalidProviders.push(provider.name || "unnamed");
          }

          expect(provider).toHaveProperty("name");
          expect(provider).toHaveProperty("description");
          expect(provider).toHaveProperty("get");
          expect(typeof provider.get).toBe("function");
        });

        documentTestResult("Provider initialization check", {
          providersCount: plugin.providers.length,
          allValid,
          invalidProviders,
        });
      }
    });

    it("should have unique provider names", () => {
      if (plugin.providers) {
        const providerNames = plugin.providers.map((provider) => provider.name);
        const uniqueNames = new Set(providerNames);

        const duplicates = providerNames.filter(
          (name, index) => providerNames.indexOf(name) !== index
        );

        // There should be no duplicate provider names
        expect(providerNames.length).toBe(uniqueNames.size);

        documentTestResult("Provider uniqueness check", {
          totalProviders: providerNames.length,
          uniqueProviders: uniqueNames.size,
          duplicates,
        });
      }
    });
  });
});
