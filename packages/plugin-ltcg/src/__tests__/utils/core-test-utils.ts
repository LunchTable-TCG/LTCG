import { mock } from "bun:test";
import {
  composeActionExamples,
  formatActionNames,
  formatActions,
} from "@elizaos/core";
import type { Action, IAgentRuntime, Memory, State } from "@elizaos/core";
import { logger } from "@elizaos/core";
// Simple UUID-like generator for tests - no external dependency needed
const generateTestId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;

/**
 * Utility functions for reusing core package tests in project-starter tests
 * Following official ElizaOS testing patterns from elizaos/eliza
 */

/**
 * Type for state values used in tests
 */
export type StateValues = Record<string, unknown>;

/**
 * Type for state data used in tests
 */
export type StateData = Record<string, unknown>;

/**
 * Type for runtime settings map
 */
export type SettingsMap = Record<string, unknown>;

/**
 * Type for mock runtime with additional test methods
 */
export type MockRuntime = IAgentRuntime & {
  _settings: SettingsMap;
  _secretSettings: Set<string>;
};

/**
 * Options for setting up action tests
 * Follows ElizaOS pattern with stateOverrides
 */
export interface SetupActionTestOptions {
  /** Override state values (for transient game state) */
  stateOverrides?: {
    values?: StateValues;
    data?: StateData;
    text?: string;
  };
  /** Override runtime settings (for persistent configuration) */
  settingOverrides?: SettingsMap;
  /** Custom character configuration */
  characterOverrides?: {
    name?: string;
    bio?: string;
    system?: string;
  };
}

/**
 * Sets up a standardized test environment for action tests
 * Following official ElizaOS testing patterns
 *
 * @example
 * ```typescript
 * describe('My Action', () => {
 *   let mockRuntime: MockRuntime;
 *   let mockMessage: Partial<Memory>;
 *   let mockState: State;
 *   let callbackFn: ReturnType<typeof mock>;
 *
 *   beforeEach(() => {
 *     const setup = setupActionTest({
 *       stateOverrides: {
 *         values: {
 *           LTCG_CURRENT_GAME_ID: 'game-123',
 *         },
 *       },
 *       settingOverrides: {
 *         LTCG_API_KEY: 'test-key',
 *       },
 *     });
 *     mockRuntime = setup.mockRuntime;
 *     mockMessage = setup.mockMessage;
 *     mockState = setup.mockState;
 *     callbackFn = setup.callbackFn;
 *   });
 * });
 * ```
 */
export const setupActionTest = (options: SetupActionTestOptions = {}) => {
  const {
    stateOverrides = {},
    settingOverrides = {},
    characterOverrides = {},
  } = options;

  // Create mock runtime with proper getSetting/setSetting
  const mockRuntime = createMockRuntimeWithSettings(
    settingOverrides,
    characterOverrides,
  );

  // Create mock message
  const mockMessage = createMockMessage("Test message");

  // Create mock state with overrides
  const mockState = createMockStateWithOverrides(stateOverrides);

  // Create mock callback
  const callbackFn = mock();

  return {
    mockRuntime,
    mockMessage,
    mockState,
    callbackFn,
  };
};

/**
 * Creates a mock runtime with proper getSetting/setSetting support
 * Following ElizaOS pattern for persistent settings
 */
export const createMockRuntimeWithSettings = (
  initialSettings: SettingsMap = {},
  characterOverrides: { name?: string; bio?: string; system?: string } = {},
): MockRuntime => {
  const _settings: SettingsMap = { ...initialSettings };
  const _secretSettings = new Set<string>();

  const runtime = {
    initPromise: Promise.resolve(),
    character: {
      name: characterOverrides.name || "Test Character",
      bio: characterOverrides.bio || "A test character for unit tests",
      system:
        characterOverrides.system || "You are a helpful assistant for testing.",
    },
    _settings,
    _secretSettings,
    getSetting: (key: string) => {
      return _settings[key] ?? null;
    },
    setSetting: mock(
      async (key: string, value: unknown, isSecret?: boolean) => {
        _settings[key] = value;
        if (isSecret) {
          _secretSettings.add(key);
        }
      },
    ),
    // Legacy methods for compatibility - prefer state.values for transient state
    get: mock(async (key: string) => _settings[key] ?? null),
    set: mock(async (key: string, value: unknown) => {
      _settings[key] = value;
    }),
    delete: mock(async (key: string) => {
      delete _settings[key];
      _secretSettings.delete(key);
    }),
    // Model support
    models: {},
    useModel: mock(async () => "{}"),
    // Database support
    db: {
      get: async () => null,
      set: async () => true,
      delete: async () => true,
      getKeys: async () => [],
    },
    // Memory support
    memory: {
      add: async () => {},
      get: async () => null,
      getByEntityId: async () => [],
      getLatest: async () => null,
      getRecentMessages: async () => [],
      search: async () => [],
    },
    actions: [],
    providers: [],
    getService: mock(),
    registerPlugin: mock(async () => {}),
    processActions: mock(),
    hasElizaOS: mock(() => false),
  } as unknown as MockRuntime;

  return runtime;
};

/**
 * Creates a mock state with optional overrides
 * Following ElizaOS pattern: state.values for transient game state
 */
export const createMockStateWithOverrides = (
  overrides: { values?: StateValues; data?: StateData; text?: string } = {},
): State => {
  return {
    values: { ...overrides.values },
    data: { ...overrides.data },
    text: overrides.text || "",
  };
};

/**
 * Runs core package action tests against the provided actions
 * @param actions The actions to test
 */
export const runCoreActionTests = (actions: Action[]) => {
  // Validate action structure (similar to core tests)
  for (const action of actions) {
    if (!action.name) {
      throw new Error("Action missing name property");
    }
    if (!action.description) {
      throw new Error(`Action ${action.name} missing description property`);
    }
    if (!action.examples || !Array.isArray(action.examples)) {
      throw new Error(`Action ${action.name} missing examples array`);
    }
    if (!action.similes || !Array.isArray(action.similes)) {
      throw new Error(`Action ${action.name} missing similes array`);
    }
    if (typeof action.handler !== "function") {
      throw new Error(`Action ${action.name} missing handler function`);
    }
    if (typeof action.validate !== "function") {
      throw new Error(`Action ${action.name} missing validate function`);
    }
  }

  // Validate example structure
  for (const action of actions) {
    for (const example of action.examples ?? []) {
      for (const message of example) {
        if (!message.name) {
          throw new Error(
            `Example message in action ${action.name} missing name property`,
          );
        }
        if (!message.content) {
          throw new Error(
            `Example message in action ${action.name} missing content property`,
          );
        }
        if (!message.content.text) {
          throw new Error(
            `Example message in action ${action.name} missing content.text property`,
          );
        }
      }
    }
  }

  // Validate uniqueness of action names
  const names = actions.map((action) => action.name);
  const uniqueNames = new Set(names);
  if (names.length !== uniqueNames.size) {
    throw new Error("Duplicate action names found");
  }

  // Test action formatting
  const formattedNames = formatActionNames(actions);
  if (!formattedNames && actions.length > 0) {
    throw new Error("formatActionNames failed to produce output");
  }

  const formattedActions = formatActions(actions);
  if (!formattedActions && actions.length > 0) {
    throw new Error("formatActions failed to produce output");
  }

  const composedExamples = composeActionExamples(actions, 1);
  if (!composedExamples && actions.length > 0) {
    throw new Error("composeActionExamples failed to produce output");
  }

  return {
    formattedNames,
    formattedActions,
    composedExamples,
  };
};

/**
 * Creates a mock runtime for testing
 * @deprecated Use createMockRuntimeWithSettings or setupActionTest instead for better ElizaOS pattern compliance
 */
export const createMockRuntime = (): IAgentRuntime => {
  return createMockRuntimeWithSettings() as IAgentRuntime;
};

/**
 * Documents test results for logging and debugging
 */
export const documentTestResult = (
  testName: string,
  result: unknown,
  error: Error | null = null,
) => {
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
        const preview =
          result.length > 60 ? `${result.substring(0, 60)}...` : result;
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
      } catch (_e) {
        logger.info("  → [Complex object]");
      }
    }
  }
};

/**
 * Creates a mock message for testing
 */
export const createMockMessage = (text: string): Memory => {
  return {
    entityId: generateTestId(),
    roomId: generateTestId(),
    content: {
      text,
      source: "test",
    },
  } as Memory;
};

/**
 * Creates a mock state for testing
 * @deprecated Use createMockStateWithOverrides or setupActionTest instead for better ElizaOS pattern compliance
 */
export const createMockState = (): State => {
  return createMockStateWithOverrides();
};
