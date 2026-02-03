import { loader } from 'fumadocs-core/source';
import { createMDXSource } from 'fumadocs-mdx';
import { icons } from 'lucide-react';

export const source = loader({
  baseUrl: '/docs',
  source: createMDXSource({
    // Point to packages/docs content
    files: '../../packages/docs/content/**/*.mdx',
  }),
});

export const { getPage, getPages, pageTree } = source;
