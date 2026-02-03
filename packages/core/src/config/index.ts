/**
 * @ltcg/core/config - Shared configuration
 *
 * Shared TypeScript, Tailwind, PostCSS, and Vitest configurations for the monorepo.
 *
 * @example
 * ```typescript
 * // Import Tailwind preset
 * import { createTailwindPreset } from "@ltcg/core/config";
 *
 * // Import PostCSS config
 * import { postcssConfig } from "@ltcg/core/config";
 *
 * // Import Vitest config
 * import { createVitestConfig } from "@ltcg/core/config";
 * ```
 */

export * from "./tailwind.base";
export * from "./postcss.config";
export * from "./vitest.config";
