import type { LTCGConfig } from "./schema.js";
import { DEFAULT_LTCG_CONFIG } from "./defaults.js";

export type { LTCGConfig } from "./schema.js";
export { DEFAULT_LTCG_CONFIG } from "./defaults.js";

export function defineConfig(overrides: Partial<LTCGConfig>): LTCGConfig {
  return deepMerge(DEFAULT_LTCG_CONFIG, overrides) as LTCGConfig;
}

function deepMerge<T>(base: T, override: Partial<T>): T {
  const result = { ...base } as Record<string, unknown>;
  const overrideObj = override as Record<string, unknown>;

  for (const key of Object.keys(overrideObj)) {
    const val = overrideObj[key];
    const baseVal = (base as Record<string, unknown>)[key];

    if (val && typeof val === "object" && !Array.isArray(val) && baseVal && typeof baseVal === "object" && !Array.isArray(baseVal)) {
      result[key] = deepMerge(baseVal, val);
    } else if (val !== undefined) {
      result[key] = val;
    }
  }

  return result as T;
}
