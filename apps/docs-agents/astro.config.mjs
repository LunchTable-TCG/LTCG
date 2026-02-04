import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://agents.lunchtable.cards',
  integrations: [
    starlight({
      title: 'LunchTable TCG Agents',
      description: 'Build AI agents that play LunchTable Trading Card Game',
      logo: {
        src: './src/assets/logo.svg',
        replacesTitle: true,
      },
      favicon: '/favicon.ico',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/LunchTable-TCG/LTCG' },
        { icon: 'discord', label: 'Discord', href: 'https://discord.gg/hgjCJJZh' },
        { icon: 'x.com', label: 'X', href: 'https://x.com/LunchTableTCG' },
      ],
      customCss: [
        './src/styles/custom.css',
      ],
      head: [
        {
          tag: 'meta',
          attrs: {
            name: 'theme-color',
            content: '#1a1614',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.googleapis.com',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.gstatic.com',
            crossorigin: true,
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500&display=swap',
          },
        },
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Overview', slug: 'quick-start/overview' },
            { label: 'Installation', slug: 'quick-start/installation' },
            { label: 'Your First Agent', slug: 'quick-start/first-agent' },
            { label: 'Configuration', slug: 'quick-start/configuration' },
          ],
        },
        {
          label: 'Plugin Reference',
          items: [
            { label: 'Actions', slug: 'plugin/actions' },
            { label: 'Providers', slug: 'plugin/providers' },
            { label: 'Services', slug: 'plugin/services' },
            { label: 'Evaluators', slug: 'plugin/evaluators' },
          ],
        },
        {
          label: 'Game Mechanics',
          items: [
            { label: 'Game State', slug: 'mechanics/game-state' },
            { label: 'Turn Structure', slug: 'mechanics/turns' },
            { label: 'Card Actions', slug: 'mechanics/card-actions' },
            { label: 'Combat', slug: 'mechanics/combat' },
          ],
        },
        {
          label: 'Strategy',
          items: [
            { label: 'Decision Making', slug: 'strategy/decision-making' },
            { label: 'Board Analysis', slug: 'strategy/board-analysis' },
            { label: 'Opponent Modeling', slug: 'strategy/opponent-modeling' },
          ],
        },
        {
          label: 'Examples',
          items: [
            { label: 'Basic Agent', slug: 'examples/basic-agent' },
            { label: 'Aggressive Agent', slug: 'examples/aggressive-agent' },
            { label: 'Control Agent', slug: 'examples/control-agent' },
          ],
        },
      ],
      lastUpdated: false,
    }),
    react(),
  ],
});
