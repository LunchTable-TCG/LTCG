/**
 * Test setup for convex-test
 *
 * Provides module loader for convex-test with Bun compatibility
 * and component registration for tests requiring Convex components.
 */

import { Glob } from "bun";
import { convexTest } from "convex-test";
import schema from "./schema";

// Load all Convex modules for testing using Bun's Glob API
// convex-test expects modules to be lazy-loaded functions
async function loadModules() {
  const glob = new Glob("**/*.ts");
  const modules: Record<string, () => Promise<unknown>> = {};

  const convexPath = import.meta.dir;

  for await (const file of glob.scan({
    cwd: convexPath,
    onlyFiles: true,
  })) {
    // Skip test files and node_modules, but INCLUDE _generated
    if (
      file.includes("__tests__") ||
      file.includes("node_modules") ||
      file.includes("test.setup.ts")
    ) {
      continue;
    }

    const modulePath = `./${file}`;

    // Wrap in lazy-loading function as convex-test expects
    modules[modulePath] = async () => {
      try {
        return await import(modulePath);
      } catch {
        // Skip files that can't be imported (e.g., type-only files, convex.config.ts)
        return {};
      }
    };
  }

  return modules;
}

// For Bun test runner, we need to export modules directly
export const modules = await loadModules();

// Load modules for a specific Convex component from node_modules
async function loadComponentModules(packageName: string) {
  const glob = new Glob("**/*.ts");
  const modules: Record<string, () => Promise<unknown>> = {};

  // Use absolute path to avoid path resolution issues
  const componentPath = `/Users/home/Desktop/LTCG/node_modules/@convex-dev/${packageName}/src/component`;

  for await (const file of glob.scan({
    cwd: componentPath,
    onlyFiles: true,
  })) {
    // Skip test files but INCLUDE _generated (required by convex-test)
    if (file.includes(".test.")) {
      continue;
    }

    const modulePath = `${componentPath}/${file}`;

    modules[`./${file}`] = async () => {
      try {
        return await import(modulePath);
      } catch {
        return {};
      }
    };
  }

  return modules;
}

/**
 * Create test instance with all components registered
 * Use this instead of convexTest() for tests that use component-dependent mutations
 *
 * Automatically registers the instance for cleanup to prevent scheduled function errors.
 *
 * Example:
 *   const t = await createTestWithComponents();
 *   await t.mutation(api.economy.marketplace.placeBid, { ... }); // Uses ratelimiter
 */
export async function createTestWithComponents() {
  const t = convexTest(schema, modules);

  // Register all components used by the app
  // Note: Component registration must happen before running any mutations/queries
  const components = [
    { name: "ratelimiter", packageName: "ratelimiter" },
    { name: "shardedCounter", packageName: "sharded-counter" },
    { name: "aggregate", packageName: "aggregate" },
    { name: "workpool", packageName: "workpool" },
    { name: "actionRetrier", packageName: "action-retrier" },
    { name: "presence", packageName: "presence" },
    { name: "agent", packageName: "agent" },
    { name: "rag", packageName: "rag" },
  ];

  for (const component of components) {
    const componentModules = await loadComponentModules(component.packageName);
    // Import schema dynamically
    const schemaModule = await import(
      `/Users/home/Desktop/LTCG/node_modules/@convex-dev/${component.packageName}/src/component/schema.ts`
    );
    t.registerComponent(component.name, schemaModule.default, componentModules);
  }

  // Register for automatic cleanup (prevents scheduled function errors)
  try {
    const { registerTestInstance } = await import("./convex-tests/setup");
    registerTestInstance(t);
  } catch {
    // Setup file not loaded (running tests without vitest config) - skip registration
  }

  return t;
}
