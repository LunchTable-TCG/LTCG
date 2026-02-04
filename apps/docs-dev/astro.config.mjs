import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://dev.lunchtable.cards',
  integrations: [
    starlight({
      title: 'Lunchtable TCG Dev',
      description: 'Build with the Lunchtable Trading Card Game platform',
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
            { label: 'First Game', slug: 'quick-start/first-game' },
            { label: 'Environment Setup', slug: 'quick-start/environment' },
          ],
        },
        {
          label: 'API Reference',
          items: [
            { label: 'Core API', slug: 'api-reference/core' },
            { label: 'Game API', slug: 'api-reference/game' },
            { label: 'Economy API', slug: 'api-reference/economy' },
          ],
        },
        {
          label: 'Architecture',
          items: [
            { label: 'Database Schema', slug: 'architecture/schema' },
            { label: 'Game Engine', slug: 'architecture/game-engine' },
            { label: 'Effect System', slug: 'architecture/effect-system' },
            { label: 'Real-time Updates', slug: 'architecture/realtime' },
          ],
        },
        {
          label: 'Contributing',
          items: [
            { label: 'Guidelines', slug: 'contributing/guidelines' },
            { label: 'Code Style', slug: 'contributing/code-style' },
            { label: 'Testing', slug: 'contributing/testing' },
            { label: 'Pull Requests', slug: 'contributing/pull-requests' },
          ],
        },
        {
          label: 'Operations',
          items: [
            { label: 'Deployment', slug: 'operations/deployment' },
            { label: 'Monitoring', slug: 'operations/monitoring' },
            { label: 'Security', slug: 'operations/security' },
          ],
        },
        {
          label: 'Design System',
          items: [
            { label: 'Colors', slug: 'design-system/colors' },
            { label: 'Typography', slug: 'design-system/typography' },
            { label: 'Components', slug: 'design-system/components' },
          ],
        },
      ],
      lastUpdated: false,
    }),
    react(),
  ],
});
