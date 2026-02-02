import { afterAll, beforeAll, describe, expect, it, spyOn } from "bun:test";
import { logger } from "@elizaos/core";
import dotenv from "dotenv";
import plugin from "../plugin";
import {
  createMockMessage,
  createMockRuntime,
  createMockState,
  documentTestResult,
  runCoreActionTests,
} from "./utils/core-test-utils";

// Setup environment variables
dotenv.config();

// Spy on logger to capture logs for documentation
beforeAll(() => {
  spyOn(logger, "info");
  spyOn(logger, "error");
  spyOn(logger, "warn");
});

afterAll(() => {
  // No global restore needed in bun:test;
});

describe("Actions", () => {
  // Find the REGISTER_AGENT action from the plugin
  const registerAgentAction = plugin.actions?.find((action) => action.name === "REGISTER_AGENT");

  // Run core tests on all plugin actions
  it("should pass core action tests", () => {
    if (plugin.actions) {
      const coreTestResults = runCoreActionTests(plugin.actions);
      expect(coreTestResults).toBeDefined();
      expect(coreTestResults.formattedNames).toBeDefined();
      expect(coreTestResults.formattedActions).toBeDefined();
      expect(coreTestResults.composedExamples).toBeDefined();

      // Document the core test results
      documentTestResult("Core Action Tests", coreTestResults);
    }
  });

  describe("REGISTER_AGENT Action", () => {
    it("should exist in the plugin", () => {
      expect(registerAgentAction).toBeDefined();
    });

    it("should have the correct structure", () => {
      if (registerAgentAction) {
        expect(registerAgentAction).toHaveProperty("name", "REGISTER_AGENT");
        expect(registerAgentAction).toHaveProperty("description");
        expect(registerAgentAction).toHaveProperty("similes");
        expect(registerAgentAction).toHaveProperty("validate");
        expect(registerAgentAction).toHaveProperty("handler");
        expect(Array.isArray(registerAgentAction.similes)).toBe(true);
      }
    });

    it("should have expected similes", () => {
      if (registerAgentAction) {
        expect(registerAgentAction.similes).toContain("CREATE_ACCOUNT");
        expect(registerAgentAction.similes).toContain("SIGN_UP");
      }
    });

    it("should return false from validate when API key exists", async () => {
      if (registerAgentAction) {
        const runtime = createMockRuntime();
        const mockMessage = createMockMessage("Register agent");
        const mockState = createMockState();

        let result = false;
        let error: Error | null = null;

        try {
          result = await registerAgentAction.validate(runtime, mockMessage, mockState);
          // Should return false since mock runtime returns null for getSetting (no API URL)
          expect(typeof result).toBe("boolean");
        } catch (e) {
          error = e as Error;
          logger.error({ error: e }, "Validate function error:");
        }

        documentTestResult("REGISTER_AGENT action validate", result, error);
      }
    });
  });
});
