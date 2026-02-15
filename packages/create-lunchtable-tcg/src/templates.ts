import type { ScaffoldConfig } from "./prompts.js";
import type { ParsedCSVData } from "./csv-import.js";

export function generatePackageJson(config: ScaffoldConfig) {
  const starterDeps: Record<string, string> = {
    convex: "^1.31.0",
    "@lunchtable-tcg/engine": "workspace:*",
    "@lunchtable-tcg/config": "workspace:*",
    "@lunchtable-tcg/cards": "workspace:*",
    react: "^19.2.0",
    "react-dom": "^19.2.0",
  };

  const standardDeps: Record<string, string> = {
    "@lunchtable-tcg/economy": "workspace:*",
    "@lunchtable-tcg/progression": "workspace:*",
    "@lunchtable-tcg/competitive": "workspace:*",
  };

  const fullDeps: Record<string, string> = {
    "@lunchtable-tcg/social": "workspace:*",
    "@lunchtable-tcg/marketplace": "workspace:*",
    "@lunchtable-tcg/story": "workspace:*",
    "@lunchtable-tcg/guilds": "workspace:*",
    "@lunchtable-tcg/payments": "workspace:*",
  };

  const blockchainDeps: Record<string, string> = {
    "@lunchtable-tcg/token": "workspace:*",
    "@lunchtable-tcg/treasury": "workspace:*",
  };

  const aiDeps: Record<string, string> = {
    "@lunchtable-tcg/ai": "workspace:*",
  };

  let dependencies = { ...starterDeps };

  if (config.tier === "standard" || config.tier === "full") {
    dependencies = { ...dependencies, ...standardDeps };
  }

  if (config.tier === "full") {
    dependencies = { ...dependencies, ...fullDeps };
  }

  if (config.includeBlockchain) {
    dependencies = { ...dependencies, ...blockchainDeps };
  }

  if (config.includeAI) {
    dependencies = { ...dependencies, ...aiDeps };
  }

  const pkg = {
    name: config.projectName,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      dev: "concurrently -n convex,app -c blue,magenta \"npx convex dev\" \"next dev\"",
      build: "next build",
      start: "next start",
      lint: "next lint",
    },
    dependencies,
    devDependencies: {
      "@types/node": "^22.0.0",
      "@types/react": "^19.0.0",
      "@types/react-dom": "^19.0.0",
      typescript: "^5.8.0",
      concurrently: "^9.2.1",
    },
  };

  return JSON.stringify(pkg, null, 2) + "\n";
}

export function generateConvexConfig(config: ScaffoldConfig) {
  const imports: string[] = [
    `import engine from "@lunchtable-tcg/engine/convex.config";`,
  ];
  const installs: string[] = [
    `  app.use(engine);`,
  ];

  if (config.tier === "standard" || config.tier === "full") {
    imports.push(`import economy from "@lunchtable-tcg/economy/convex.config";`);
    imports.push(`import progression from "@lunchtable-tcg/progression/convex.config";`);
    imports.push(`import competitive from "@lunchtable-tcg/competitive/convex.config";`);
    installs.push(`  app.use(economy);`);
    installs.push(`  app.use(progression);`);
    installs.push(`  app.use(competitive);`);
  }

  if (config.tier === "full") {
    imports.push(`import social from "@lunchtable-tcg/social/convex.config";`);
    imports.push(`import marketplace from "@lunchtable-tcg/marketplace/convex.config";`);
    imports.push(`import story from "@lunchtable-tcg/story/convex.config";`);
    imports.push(`import guilds from "@lunchtable-tcg/guilds/convex.config";`);
    imports.push(`import payments from "@lunchtable-tcg/payments/convex.config";`);
    installs.push(`  app.use(social);`);
    installs.push(`  app.use(marketplace);`);
    installs.push(`  app.use(story);`);
    installs.push(`  app.use(guilds);`);
    installs.push(`  app.use(payments);`);
  }

  if (config.includeBlockchain) {
    imports.push(`import token from "@lunchtable-tcg/token/convex.config";`);
    imports.push(`import treasury from "@lunchtable-tcg/treasury/convex.config";`);
    installs.push(`  app.use(token);`);
    installs.push(`  app.use(treasury);`);
  }

  return `import { defineApp } from "convex/server";
${imports.join("\n")}

const app = defineApp();

${installs.join("\n")}

export default app;
`;
}

export function generateStarterCards() {
  return `export const STARTER_CARDS = [
  {
    id: "warrior-basic",
    name: "Basic Warrior",
    type: "stereotype",
    description: "A straightforward fighter.",
    rarity: "common",
    attack: 1500,
    defense: 1000,
    level: 4,
    attribute: "fire",
    cost: 1,
  },
  {
    id: "quick-draw",
    name: "Quick Draw",
    type: "spell",
    description: "Draw 2 cards.",
    rarity: "rare",
    spellType: "normal",
    cost: 1,
    effects: [
      {
        id: "qd-draw",
        type: "ignition",
        description: "Draw 2 cards",
        actions: [{ type: "draw", count: 2 }],
      },
    ],
  },
  {
    id: "counter-trap",
    name: "Counter Strike",
    type: "trap",
    description: "Destroy 1 attacking stereotype.",
    rarity: "uncommon",
    trapType: "normal",
    cost: 1,
    effects: [
      {
        id: "cs-destroy",
        type: "trigger",
        description: "Destroy 1 attacking stereotype",
        actions: [{ type: "destroy", target: "selected" }],
      },
    ],
  },
];
`;
}

export function generateGameConfig(config: ScaffoldConfig) {
  return `export const gameConfig = {
  name: ${JSON.stringify(config.gameName)},
  primaryColor: ${JSON.stringify(config.primaryColor)},
  tier: ${JSON.stringify(config.tier)},
  features: {
    blockchain: ${config.includeBlockchain},
    ai: ${config.includeAI},
  },
  settings: {
    startingLifePoints: 8000,
    maxHandSize: 7,
    maxDeckSize: 40,
    minDeckSize: 20,
    maxCopiesPerCard: 3,
  },
};
`;
}

export function generateEnvExample() {
  return `# Convex
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
`;
}

export function generateTsConfig() {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ESNext",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true,
        noEmit: true,
        paths: {
          "@/*": ["./src/*"],
          "@convex/*": ["./convex/*"],
        },
      },
      include: ["**/*.ts", "**/*.tsx"],
      exclude: ["node_modules"],
    },
    null,
    2
  ) + "\n";
}

export function generateCardData(data: ParsedCSVData) {
  const { cards, decks, deckRecipes } = data;

  const archetypes = [...new Set(cards.map((c) => c.archetype))];
  const header = [
    `// Auto-generated from card set CSV`,
    `// ${cards.length} unique cards across ${archetypes.length} archetypes: ${archetypes.join(", ")}`,
    ``,
  ].join("\n");

  const cardDefs = `export const CARD_DEFINITIONS = ${JSON.stringify(cards, null, 2)};`;
  const deckDefs = `\nexport const STARTER_DECKS = ${JSON.stringify(decks, null, 2)};`;
  const recipeDefs = `\nexport const DECK_RECIPES: Record<string, Array<{ cardName: string; copies: number }>> = ${JSON.stringify(deckRecipes, null, 2)};`;

  return `${header}\n${cardDefs}\n${deckDefs}\n${recipeDefs}\n`;
}

export function generateSeedFile(hasCardCsv: boolean) {
  if (hasCardCsv) {
    return `import { components } from "./_generated/api";
import { mutation } from "./_generated/server";
import { LTCGCards } from "@lunchtable-tcg/cards";
import { CARD_DEFINITIONS, STARTER_DECKS } from "./cardData";

const cards = new LTCGCards(components.lunchtable_tcg_cards as any);

export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    const cardResult = await cards.seeds.seedCardDefinitions(
      ctx,
      CARD_DEFINITIONS as any[],
    );

    const deckResult = await cards.seeds.seedStarterDecks(ctx, STARTER_DECKS);

    return { cards: cardResult, decks: deckResult };
  },
});
`;
  }

  // Fallback: seed with the 3 starter cards from generateStarterCards()
  return `import { components } from "./_generated/api";
import { mutation } from "./_generated/server";
import { LTCGCards } from "@lunchtable-tcg/cards";
import { STARTER_CARDS } from "../src/cards/starter-set";

const cards = new LTCGCards(components.lunchtable_tcg_cards as any);

export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    const cardResult = await cards.seeds.seedCardDefinitions(
      ctx,
      STARTER_CARDS as any[],
    );

    return { cards: cardResult };
  },
});
`;
}
