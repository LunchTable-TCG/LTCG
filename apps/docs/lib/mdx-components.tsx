import { useMDXComponents as getDocsMDXComponents } from '@ltcg/docs/lib/mdx-components';
import type { MDXComponents } from 'mdx/types';

export function useMDXComponents(components?: MDXComponents): MDXComponents {
  // Get components from packages/docs
  return getDocsMDXComponents(components);
}
