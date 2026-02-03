/**
 * Shared PostCSS configuration for LTCG monorepo
 *
 * Provides standard PostCSS setup with Tailwind CSS and Autoprefixer.
 */

export const postcssConfig = {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
};

export default postcssConfig;
