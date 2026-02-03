/**
 * @module @ltcg/core/config/tailwind
 *
 * Base Tailwind CSS configuration for the LTCG monorepo.
 *
 * Provides consistent theme tokens, colors, and animations across all applications
 * using CSS variables for runtime theming support. Applications should extend this
 * configuration with their specific content paths.
 *
 * @example Basic usage
 * ```typescript
 * // tailwind.config.ts
 * import { createTailwindPreset } from "@ltcg/core/config";
 *
 * export default createTailwindPreset({
 *   content: [
 *     "./src/**\/*.{ts,tsx}",
 *     "./app/**\/*.{ts,tsx}",
 *   ],
 * });
 * ```
 *
 * @example Extending with custom config
 * ```typescript
 * import { createTailwindPreset } from "@ltcg/core/config";
 * import type { Config } from "tailwindcss";
 *
 * export default {
 *   ...createTailwindPreset({
 *     content: ["./src/**\/*.{ts,tsx}"],
 *   }),
 *   theme: {
 *     extend: {
 *       colors: {
 *         brand: "hsl(var(--brand))",
 *       },
 *     },
 *   },
 * } satisfies Config;
 * ```
 *
 * @see {@link https://tailwindcss.com/docs/configuration Tailwind Documentation}
 */

import type { Config } from "tailwindcss";

/**
 * Base Tailwind CSS configuration object.
 *
 * This configuration uses CSS variables for all colors, enabling runtime theming
 * without rebuilding CSS. The CSS variables should be defined in your global styles.
 *
 * **Color Tokens:**
 * - `border`, `input`, `ring`: Form and border colors
 * - `background`, `foreground`: Page background and text
 * - `primary`, `secondary`, `destructive`: Semantic colors
 * - `muted`, `accent`: Supporting colors
 * - `popover`, `card`: Component backgrounds
 *
 * **Border Radius Tokens:**
 * - `lg`, `md`, `sm`: Based on `--radius` CSS variable
 *
 * **Animations:**
 * - `accordion-down`, `accordion-up`: For collapsible components
 *
 * @example Required CSS variables
 * ```css
 * :root {
 *   --background: 0 0% 100%;
 *   --foreground: 222.2 84% 4.9%;
 *   --primary: 221.2 83.2% 53.3%;
 *   --primary-foreground: 210 40% 98%;
 *   --radius: 0.5rem;
 * }
 *
 * .dark {
 *   --background: 222.2 84% 4.9%;
 *   --foreground: 210 40% 98%;
 * }
 * ```
 *
 * @type {Partial<Config>}
 */
export const tailwindBaseConfig: Partial<Config> = {
  darkMode: "class",
  content: [],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

/**
 * Create a Tailwind CSS preset with custom content paths.
 *
 * This function returns a complete Tailwind configuration that extends the base
 * configuration with your application-specific content paths. Use this in your
 * app's `tailwind.config.ts` to ensure consistency with the monorepo theme.
 *
 * @param options - Configuration options
 * @param options.content - Glob patterns for files containing Tailwind classes
 *
 * @returns A Tailwind CSS configuration object ready to use
 *
 * @example Next.js application
 * ```typescript
 * import { createTailwindPreset } from "@ltcg/core/config";
 *
 * export default createTailwindPreset({
 *   content: [
 *     "./app/**\/*.{ts,tsx}",
 *     "./components/**\/*.{ts,tsx}",
 *   ],
 * });
 * ```
 *
 * @example React application
 * ```typescript
 * import { createTailwindPreset } from "@ltcg/core/config";
 *
 * export default createTailwindPreset({
 *   content: [
 *     "./index.html",
 *     "./src/**\/*.{ts,tsx}",
 *   ],
 * });
 * ```
 *
 * @example With custom extensions
 * ```typescript
 * import { createTailwindPreset } from "@ltcg/core/config";
 *
 * const config = createTailwindPreset({
 *   content: ["./src/**\/*.{ts,tsx}"],
 * });
 *
 * // Extend with custom configuration
 * config.theme = {
 *   ...config.theme,
 *   extend: {
 *     ...config.theme?.extend,
 *     fontFamily: {
 *       sans: ["Inter", "sans-serif"],
 *     },
 *   },
 * };
 *
 * export default config;
 * ```
 */
export function createTailwindPreset(options?: {
  content?: string[];
}): Partial<Config> {
  return {
    ...tailwindBaseConfig,
    content: options?.content || [],
    presets: [],
  };
}
