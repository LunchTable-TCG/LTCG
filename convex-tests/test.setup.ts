/**
 * Test setup for convex-test
 *
 * Provides module loaders for convex-test and Convex components.
 */

import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { convexTest } from "convex-test";
import schema from "./schema";

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(THIS_DIR, "..");
const CONVEX_DIR = path.join(REPO_ROOT, "convex");

function isTypeScriptFile(file: string): boolean {
  return file.endsWith(".ts") || file.endsWith(".tsx");
}

function shouldSkip(file: string): boolean {
  return (
    file.includes("__tests__") ||
    file.includes("node_modules") ||
    file.includes(".test.") ||
    file.includes("test.setup.ts")
  );
}

async function collectFiles(baseDir: string, currentDir: string): Promise<string[]> {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(baseDir, fullPath)));
      continue;
    }

    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
    if (!isTypeScriptFile(relativePath) || shouldSkip(relativePath)) {
      continue;
    }

    files.push(relativePath);
  }

  return files;
}

async function loadModulesFromDir(baseDir: string, importPrefix?: string) {
  const files = await collectFiles(baseDir, baseDir);
  const modules: Record<string, () => Promise<unknown>> = {};

  for (const file of files) {
    const importPath = importPrefix
      ? `${importPrefix}/${file}`
      : path.join(baseDir, file).replace(/\\/g, "/");

    const moduleLoader = async () => {
      try {
        return await import(importPath);
      } catch (error) {
        if (process.env["CONVEX_TEST_DEBUG"] === "1") {
          console.warn(`[convex-tests] Failed to import ${importPath}`, error);
        }
        // Ignore files that are not loadable in test runtime.
        return {};
      }
    };

    modules[`./${file}`] = moduleLoader;
    const extensionlessKey = `./${file.replace(/\.[^.]+$/, "")}`;
    modules[extensionlessKey] = moduleLoader;
  }

  return modules;
}

async function loadModules() {
  return loadModulesFromDir(CONVEX_DIR, "../convex");
}

// For vitest, export modules directly
export const modules = await loadModules();

// Load modules for a specific Convex component from node_modules
async function loadComponentModules(packageName: string) {
  const componentPath = path.join(
    REPO_ROOT,
    "node_modules",
    "@convex-dev",
    packageName,
    "src",
    "component"
  );
  return loadModulesFromDir(componentPath, `../node_modules/@convex-dev/${packageName}/src/component`);
}

/**
 * Create test instance with all components registered
 * Use this instead of convexTest() for tests that use component-dependent mutations
 */
export async function createTestWithComponents() {
  const t = convexTest(schema, modules);

  const components = [
    { name: "ratelimiter", packageName: "ratelimiter" },
    { name: "shardedCounter", packageName: "sharded-counter" },
    { name: "aggregate", packageName: "aggregate" },
    { name: "workpool", packageName: "workpool" },
    { name: "actionRetrier", packageName: "action-retrier" },
    { name: "presence", packageName: "presence" },
    { name: "agent", packageName: "agent" },
    { name: "rag", packageName: "rag" },
  ] as const;

  for (const component of components) {
    const componentModules = await loadComponentModules(component.packageName);
    const schemaModule = await import(
      `../node_modules/@convex-dev/${component.packageName}/src/component/schema.ts`
    );
    t.registerComponent(component.name, schemaModule.default, componentModules);
  }

  // Register for automatic cleanup (prevents scheduled function errors)
  try {
    const { registerTestInstance } = await import("./setup");
    registerTestInstance(t);
  } catch {
    // setup.ts may not be loaded in all runners
  }

  return t;
}
