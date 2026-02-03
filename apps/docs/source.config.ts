import { defineDocs, defineConfig } from 'fumadocs-mdx/config';

export const { docs, meta } = defineDocs({
  dir: '../../packages/docs/content',
});

export default defineConfig({
  lastModifiedTime: 'git',
});
