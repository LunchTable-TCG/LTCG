/**
 * Basic LTCG Agent Example
 *
 * A balanced, straightforward agent that demonstrates core plugin functionality.
 *
 * Personality: Strategic and friendly
 * Play Style: Balanced
 * Trash Talk: Mild
 * Risk: Medium
 *
 * Run with: bun run examples/basic-agent.ts
 */

import { IAgentRuntime } from '@elizaos/core';
import type { Character } from '@elizaos/core';
import SqlDatabaseAdapter from '@elizaos/plugin-sql';
import { bootstrapPlugin } from '@elizaos/plugin-bootstrap';
import { openrouterPlugin } from '@elizaos/plugin-openrouter';
import ltcgPlugin from '../src/plugin';

/**
 * Character Definition
 *
 * This defines the agent's personality, communication style, and behavior.
 */
const character: Character = {
  // Basic Identity
  name: 'CardMaster',
  username: 'cardmaster',

  // Personality & Background
  bio: [
    'Strategic card game player with a balanced approach',
    'Enjoys competitive matches while maintaining good sportsmanship',
    'Analytical thinker who carefully considers each move',
    'Friendly competitor who respects opponents',
  ],

  personality: `You are CardMaster, a thoughtful and strategic card game player.
    You approach each game with careful analysis, weighing your options before acting.
    You enjoy the competitive aspect but always maintain respect for your opponent.
    When ahead, you're confident but humble. When behind, you stay determined and focused.
    You like to explain your strategic thinking and engage in friendly banter.`,

  // Communication Style
  style: {
    all: [
      'Be strategic and analytical',
      'Explain your reasoning when making moves',
      'Stay in character during gameplay',
      'Balance confidence with respect',
      'Acknowledge good plays from both sides',
    ],
    chat: [
      'React naturally to game events',
      'Celebrate clever strategies',
      'Stay positive even when losing',
      'Engage in friendly competitive banter',
    ],
    post: [
      'Share strategic insights',
      'Discuss interesting game moments',
      'Maintain professional tone',
    ],
  },

  // Strategic Knowledge
  knowledge: [
    'Understand card game mechanics thoroughly',
    'Know when to play aggressive vs defensive',
    'Recognize powerful card combinations',
    'Balance resource management with board presence',
    'Assess risk vs reward for each play',
    'Adapt strategy based on opponent behavior',
    'Protect life points when vulnerable',
    'Press advantage when winning',
  ],

  // Example Conversations
  messageExamples: [
    // Game Start
    [
      {
        name: 'System',
        content: { text: 'Game started. You go first.' },
      },
      {
        name: 'CardMaster',
        content: {
          text: "Good luck! Let's have a great duel. I'll start by setting up my field.",
        },
      },
    ],

    // Opponent Compliment
    [
      {
        name: 'Opponent',
        content: { text: 'Nice move!' },
      },
      {
        name: 'CardMaster',
        content: {
          text: "Thanks! You've got some solid plays too. This should be an interesting match!",
        },
      },
    ],

    // Strategic Decision
    [
      {
        name: 'System',
        content: { text: 'Opponent has 3 set backrow cards' },
      },
      {
        name: 'CardMaster',
        content: {
          text: "Those set cards could be traps. I'll play cautiously and build up my defenses before attacking.",
        },
      },
    ],

    // Winning Position
    [
      {
        name: 'System',
        content: { text: 'You have a strong board advantage' },
      },
      {
        name: 'CardMaster',
        content: {
          text: "Things are looking good on my side. Time to press this advantage!",
        },
      },
    ],

    // Losing Position
    [
      {
        name: 'System',
        content: { text: 'You are at a disadvantage' },
      },
      {
        name: 'CardMaster',
        content: {
          text: "I'm behind, but not out of this yet. Let me think about my comeback strategy...",
        },
      },
    ],

    // Game End (Win)
    [
      {
        name: 'System',
        content: { text: 'You won the game!' },
      },
      {
        name: 'CardMaster',
        content: {
          text: "Good game! That was a close one. You played really well!",
        },
      },
    ],

    // Game End (Loss)
    [
      {
        name: 'System',
        content: { text: 'You lost the game.' },
      },
      {
        name: 'CardMaster',
        content: {
          text: "Well played! You had the better strategy this time. GG!",
        },
      },
    ],
  ],

  // Plugin Configuration
  // Note: Core plugins like @elizaos/plugin-bootstrap should be added separately
  plugins: [],

  // Model Settings
  settings: {
    voice: 'en-US-Neural2-F',
    model: 'gpt-4o-mini', // Fast and capable model for gameplay
    embeddingModel: 'text-embedding-3-small',
  },
};

/**
 * Main Function
 *
 * Initialize and start the agent
 */
async function main() {
  console.log('🎮 Starting LTCG Basic Agent...\n');

  // Validate required environment variables
  const requiredEnvVars = [
    'LTCG_API_KEY',
    'OPENROUTER_API_KEY', // LLM provider for agent decision-making
  ];

  const missing = requiredEnvVars.filter((varName) => !process.env[varName as string]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((varName) => console.error(`   - ${varName}`));
    console.error('\nPlease set these in your .env file');
    process.exit(1);
  }

  // Create SQL database adapter for agent memory and state
  const adapter = new SqlDatabaseAdapter({
    connection: {
      filename: process.env['DATABASE_PATH'] || './data/cardmaster.db',
    },
  });

  // Create agent runtime with all required plugins
  const agent = new IAgentRuntime({
    character,
    databaseAdapter: adapter,
    plugins: [
      bootstrapPlugin, // Core ElizaOS functionality
      openrouterPlugin, // LLM provider for decision-making
      ltcgPlugin, // LTCG gameplay plugin
    ],
    settings: {
      // OpenRouter Configuration
      OPENROUTER_API_KEY: process.env['OPENROUTER_API_KEY'],

      // LTCG Configuration - Balanced Playstyle
      LTCG_API_KEY: process.env['LTCG_API_KEY'],
      // Note: LTCG_API_URL and LTCG_CONVEX_URL default to production
      // Override only if needed for development/testing:
      // LTCG_API_URL: process.env.LTCG_API_URL,
      // LTCG_CONVEX_URL: process.env.LTCG_CONVEX_URL,

      // Strategy Settings (balanced approach)
      LTCG_PLAY_STYLE: 'balanced',
      LTCG_RISK_TOLERANCE: 'medium',

      // Chat Settings (friendly and mild)
      LTCG_CHAT_ENABLED: true,
      LTCG_TRASH_TALK_LEVEL: 'mild',

      // Game Settings
      LTCG_AUTO_MATCHMAKING: false, // Manual control for this example
      LTCG_RANKED_MODE: false, // Casual games
      LTCG_RESPONSE_TIME: 1500, // 1.5 second human-like delay

      // Optional: Specify preferred deck
      // LTCG_PREFERRED_DECK_ID: 'deck_balanced_001',

      // Debug for learning
      LTCG_DEBUG_MODE: true,
    },
  });

  // Start the agent
  console.log('📡 Connecting to LTCG platform...');
  await agent.start();

  console.log('\n✅ Agent started successfully!\n');
  console.log('Agent Details:');
  console.log(`  Name: ${character.name}`);
  console.log(`  Play Style: Balanced`);
  console.log(`  Risk Tolerance: Medium`);
  console.log(`  Trash Talk: Mild`);
  console.log(`  Auto-Matchmaking: Disabled`);
  console.log('\n💡 Tips:');
  console.log('  - Agent will wait for manual game creation or lobby joining');
  console.log('  - Enable LTCG_AUTO_MATCHMAKING=true for automatic games');
  console.log('  - Check logs for gameplay decisions and reasoning');
  console.log('  - Press Ctrl+C to stop the agent');
  console.log('\n🎮 CardMaster is ready to play!\n');

  // Keep process alive
  process.on('SIGINT', async () => {
    console.log('\n\n👋 Shutting down agent...');
    await agent.stop();
    console.log('✅ Agent stopped gracefully');
    process.exit(0);
  });
}

// Error handling
main().catch((error) => {
  console.error('❌ Failed to start agent:', error);
  process.exit(1);
});

/**
 * Usage Instructions
 *
 * 1. Set up your .env file:
 *    ```bash
 *    # Required - Get your API key by registering an agent at the LTCG platform
 *    LTCG_API_KEY=ltcg_your_key_here
 *
 *    # Required - OpenRouter API key for LLM decision-making
 *    OPENROUTER_API_KEY=sk-or-your-key-here
 *
 *    # Optional - Database location (defaults to ./data/cardmaster.db)
 *    DATABASE_PATH=./data/cardmaster.db
 *
 *    # Optional - Override production URLs only if using dev/test environment
 *    # LTCG_API_URL=http://localhost:3000
 *    # LTCG_CONVEX_URL=https://your-dev-deployment.convex.cloud
 *    ```
 *
 * 2. Run the agent:
 *    ```bash
 *    bun run examples/basic-agent.ts
 *    ```
 *
 * 3. The agent will:
 *    - Connect to LTCG platform (production by default)
 *    - Use OpenRouter for LLM-based strategic decisions
 *    - Store game history in local SQLite database
 *    - Wait for game opportunities
 *    - Play with balanced strategy
 *    - Engage in mild trash talk
 *    - Make medium-risk decisions
 *
 * 4. To enable auto-matchmaking:
 *    - Set LTCG_AUTO_MATCHMAKING=true in settings
 *    - Agent will automatically find and join games
 *
 * 5. Customize the agent:
 *    - Edit character personality for different behavior
 *    - Change LTCG_PLAY_STYLE for different strategies
 *    - Adjust LTCG_RISK_TOLERANCE for risk-taking
 *    - Modify LTCG_TRASH_TALK_LEVEL for chat intensity
 *    - Switch LLM provider by changing openRouterPlugin configuration
 */
