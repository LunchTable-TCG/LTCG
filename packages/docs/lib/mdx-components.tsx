/**
 * MDX components configuration
 * Makes custom components available in MDX files
 */

import type { MDXComponents } from 'mdx/types';
import defaultComponents from 'fumadocs-ui/mdx';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import { Callout } from 'fumadocs-ui/components/callout';
import { ImageZoom } from 'fumadocs-ui/components/image-zoom';

// Import custom LTCG components
import { CardPreview } from '@/components/shared/Card/CardPreview';
import { AbilityShowcase } from '@/components/shared/Ability/AbilityShowcase';
import { BattleSimulator } from '@/components/shared/Battle/BattleSimulator';

export function useMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    // Fumadocs built-in components
    ...defaultComponents,
    Tabs,
    Tab,
    Accordion,
    Accordions,
    Steps,
    Step,
    TypeTable,
    Callout,
    ImageZoom,

    // LTCG custom components
    CardPreview,
    AbilityShowcase,
    BattleSimulator,
    Card: CardPreview,  // Alias
    Ability: AbilityShowcase,  // Alias
    Battle: BattleSimulator,  // Alias

    // Allow custom components to be passed in
    ...components,
  };
}
