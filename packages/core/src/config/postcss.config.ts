/**
 * @module @ltcg/core/config/postcss
 *
 * Shared PostCSS configuration for the LTCG monorepo.
 *
 * Provides a standardized PostCSS setup with Tailwind CSS v4 and Autoprefixer.
 * This configuration ensures consistent CSS processing across all applications
 * in the monorepo.
 *
 * @example Using in a Next.js project
 * ```typescript
 * // postcss.config.js
 * import { postcssConfig } from "@ltcg/core/config";
 * export default postcssConfig;
 * ```
 *
 * @example Using in a custom build setup
 * ```typescript
 * import { postcssConfig } from "@ltcg/core/config";
 * import postcss from "postcss";
 *
 * const result = await postcss(Object.values(postcssConfig.plugins))
 *   .process(css, { from: "input.css", to: "output.css" });
 * ```
 */

/**
 * Standard PostCSS configuration object.
 *
 * Includes:
 * - `@tailwindcss/postcss`: Tailwind CSS v4 PostCSS plugin for utility-first styling
 * - `autoprefixer`: Automatically adds vendor prefixes for cross-browser compatibility
 *
 * @type {Object}
 * @property {Object} plugins - PostCSS plugin configuration
 * @property {Object} plugins.@tailwindcss/postcss - Tailwind CSS v4 plugin configuration
 * @property {Object} plugins.autoprefixer - Autoprefixer plugin configuration
 */
export const postcssConfig = {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
};

export default postcssConfig;
