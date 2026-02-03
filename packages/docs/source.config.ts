import { defineDocs, defineConfig } from 'fumadocs-mdx/config';
import { z } from 'zod';

export const { docs, meta } = defineDocs({
  dir: 'content',
  docs: {
    schema: frontmatter => ({
      title: z.string(),
      description: z.string().optional(),
      lastUpdated: z.string().optional(),
      tags: z.array(z.string()).optional(),
      author: z.string().optional(),
    }),
  },
});

export default defineConfig({
  lastModifiedTime: 'git',
});
