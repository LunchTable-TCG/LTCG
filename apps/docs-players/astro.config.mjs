import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://docs.lunchtable.cards',
  integrations: [
    starlight({
      title: 'Lunchtable TCG',
      description: 'Learn to play Lunchtable Trading Card Game',
      logo: {
        src: './src/assets/logo.svg',
        replacesTitle: true,
      },
      favicon: '/favicon.ico',
      social: [
        { icon: 'discord', label: 'Discord', href: 'https://discord.gg/hgjCJJZh' },
        { icon: 'github', label: 'GitHub', href: 'https://github.com/LunchTable-TCG/LTCG' },
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
            { label: 'How to Play', slug: 'rules/how-to-play' },
            { label: 'Card Types', slug: 'rules/card-types' },
            { label: 'Archetypes', slug: 'rules/archetypes' },
            { label: 'Combat', slug: 'rules/combat' },
          ],
        },
        {
          label: 'Strategy',
          items: [
            { label: 'Deck Building', slug: 'strategy/deck-building' },
            { label: 'Beginner Tips', slug: 'strategy/beginner-tips' },
            { label: 'Advanced Tactics', slug: 'strategy/advanced-tactics' },
            { label: 'Meta Analysis', slug: 'strategy/meta' },
          ],
        },
        {
          label: 'Lore',
          items: [
            { label: 'The World', slug: 'lore/world' },
            { label: 'Factions', slug: 'lore/factions' },
            { label: 'Characters', slug: 'lore/characters' },
          ],
        },
        {
          label: 'Game Modes',
          items: [
            { label: 'Ranked', slug: 'modes/ranked' },
            { label: 'Casual', slug: 'modes/casual' },
            { label: 'Story Mode', slug: 'modes/story' },
            { label: 'Draft', slug: 'modes/draft' },
          ],
        },
        {
          label: 'Community',
          items: [
            { label: 'Tournaments', slug: 'community/tournaments' },
            { label: 'Leaderboards', slug: 'community/leaderboards' },
          ],
        },
      ],
      lastUpdated: false,
    }),
    react(),
  ],
});
