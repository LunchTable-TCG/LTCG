import type { Config } from 'tailwindcss';
import { createPreset } from 'fumadocs-ui/tailwind-plugin';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './content/**/*.{md,mdx}',
    './node_modules/fumadocs-ui/dist/**/*.js',
    '../../packages/docs/components/**/*.{ts,tsx}',
    '../../packages/docs/content/**/*.mdx',
  ],
  presets: [createPreset()],
};

export default config;
