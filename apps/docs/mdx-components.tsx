import type { MDXComponents } from 'mdx/types';
import defaultComponents from 'fumadocs-ui/mdx';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { Accordion } from 'fumadocs-ui/components/accordion';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import { Callout } from 'fumadocs-ui/components/callout';
import { ImageZoom } from 'fumadocs-ui/components/image-zoom';

// Import custom LTCG components from packages/docs
import { CardPreview } from '../../packages/docs/components/shared/Card/CardPreview';
import { AbilityShowcase } from '../../packages/docs/components/shared/Ability/AbilityShowcase';
import { BattleSimulator } from '../../packages/docs/components/shared/Battle/BattleSimulator';

export function useMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    Tabs,
    Tab,
    Accordion,
    Steps,
    Step,
    TypeTable,
    Callout,
    ImageZoom,

    // LTCG custom components
    CardPreview,
    AbilityShowcase,
    BattleSimulator,
    Card: CardPreview,
    Ability: AbilityShowcase,
    Battle: BattleSimulator,

    ...components,
  };
}
