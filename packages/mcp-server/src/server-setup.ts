import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getConfig } from "./config.js";

// Helper function to make API requests
async function makeApiRequest(
  endpoint: string,
  method: "GET" | "POST" = "POST",
  body?: unknown
) {
  const config = getConfig();
  const url = `${config.apiUrl}${endpoint}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method === "POST") {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `API request failed (${response.status}): ${data.error?.message || JSON.stringify(data)}`
    );
  }

  return data;
}

/**
 * Creates and configures an MCP server with all handlers
 */
export function createMcpServer(): Server {
  const server = new Server(
    {
      name: "LunchTable-TCG MCP Server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
      },
    }
  );

  // Prompt list handler
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [
      {
        name: "play-casual",
        description: "Quick start a casual game and guide through the first turn",
        arguments: [],
      },
      {
        name: "play-ranked",
        description: "Quick start a ranked game and help play competitively",
        arguments: [],
      },
      {
        name: "analyze-game",
        description: "Analyze the current game state and suggest optimal moves",
        arguments: [
          {
            name: "gameId",
            description: "The game ID to analyze",
            required: true,
          },
        ],
      },
      {
        name: "build-deck",
        description: "Interactive deck building assistance for a specific archetype",
        arguments: [
          {
            name: "archetype",
            description: "Deck archetype (fire, water, earth, wind, light, dark, neutral)",
            required: true,
          },
        ],
      },
      {
        name: "spectate",
        description: "Watch a game and provide live commentary on the state",
        arguments: [
          {
            name: "lobbyId",
            description: "The lobby ID to spectate",
            required: true,
          },
        ],
      },
    ],
  }));

  // Prompt get handler
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: promptArgs } = request.params;

    switch (name) {
      case "play-casual":
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Start a casual game of LunchTable-TCG and guide me through my first turn.

Steps to follow:
1. Use ltcg_create_game with mode="casual" and isPrivate=false to create a lobby
2. Wait for an opponent to join (you can check the lobby state)
3. Once the game starts, use ltcg_get_legal_moves to see what actions are available
4. Explain the current game state and suggest the best first move
5. Help me execute that move using the appropriate tool (ltcg_summon_monster, etc.)

Please start by creating the casual game lobby now.`,
              },
            },
          ],
        };

      case "play-ranked":
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Start a ranked game of LunchTable-TCG and help me play competitively.

Steps to follow:
1. Use ltcg_create_game with mode="ranked" and isPrivate=false to create a ranked lobby
2. Monitor the lobby state until an opponent joins
3. Once the game starts, continuously analyze the game state using ltcg_get_legal_moves
4. Provide strategic advice on each turn, explaining:
   - Current board state
   - Available legal moves
   - Optimal play based on the situation
   - Risk/reward analysis of different actions
5. Help me execute the best moves to win the ranked match

Please start by creating the ranked game lobby now.`,
              },
            },
          ],
        };

      case "analyze-game": {
        const gameId = promptArgs?.gameId as string | undefined;
        if (!gameId) {
          throw new Error("gameId argument is required for analyze-game prompt");
        }
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Analyze the current state of game ${gameId} and suggest optimal moves.

Steps to follow:
1. Use ltcg_get_legal_moves with gameId="${gameId}" to get the current game state and available actions
2. Analyze the game state comprehensively:
   - Your life points vs opponent's life points
   - Cards in hand, on field, and in graveyard for both players
   - Current phase and available actions
   - Monsters' attack/defense positions and stats
3. Evaluate all legal moves and rank them by strategic value
4. Recommend the best move with detailed reasoning:
   - Why this move is optimal
   - What it accomplishes strategically
   - Potential opponent responses
   - Alternative plays if the primary option isn't viable
5. If appropriate, suggest a sequence of moves for this turn

Please start the analysis now.`,
              },
            },
          ],
        };
      }

      case "build-deck": {
        const archetype = promptArgs?.archetype as string | undefined;
        if (!archetype) {
          throw new Error("archetype argument is required for build-deck prompt");
        }
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Help me build a competitive ${archetype} deck for LunchTable-TCG.

Please guide me through deck building with the following approach:

1. **Archetype Overview**: Explain the ${archetype} archetype's:
   - Core strategy and win condition
   - Key strengths and weaknesses
   - Typical play style

2. **Core Cards**: Recommend essential monsters and spells for ${archetype}:
   - Must-have cards that define the archetype
   - Key combo pieces
   - Staple support cards

3. **Deck Ratios**: Suggest optimal card counts:
   - Monster cards (typically 20-24)
   - Spell cards (typically 10-15)
   - Trap cards (if applicable, 5-10)
   - Total deck size (40-60 cards recommended)

4. **Card Synergies**: Explain important card interactions and combos

5. **Tech Choices**: Suggest situational cards based on the current meta

6. **Sample Deck List**: Provide a complete decklist with explanations for each card choice

Please start by explaining the ${archetype} archetype strategy.`,
              },
            },
          ],
        };
      }

      case "spectate": {
        const lobbyId = promptArgs?.lobbyId as string | undefined;
        if (!lobbyId) {
          throw new Error("lobbyId argument is required for spectate prompt");
        }
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Spectate the game in lobby ${lobbyId} and provide live commentary.

Steps to follow:
1. Use ltcg_get_state with lobbyId="${lobbyId}" to get the current game state
2. Provide engaging commentary on the match:
   - Current game situation and score
   - Analysis of both players' board states
   - Recent plays and their impact
   - Strategic considerations for both players
   - Prediction of likely next moves
3. Explain any interesting plays, combos, or decisions
4. Offer insights that would help viewers understand the strategy

Please start by checking the current state of the game and providing your first commentary.`,
              },
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  });

  // Tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "ltcg_create_game",
        description: "Create a new LunchTable-TCG game lobby",
        inputSchema: {
          type: "object",
          properties: {
            mode: {
              type: "string",
              enum: ["casual", "ranked"],
              description: "Game mode for the lobby",
            },
            isPrivate: {
              type: "boolean",
              description: "Whether the lobby is private (requires join code)",
            },
          },
          required: ["mode", "isPrivate"],
        },
      },
      {
        name: "ltcg_join_game",
        description: "Join an existing game lobby",
        inputSchema: {
          type: "object",
          properties: {
            lobbyId: {
              type: "string",
              description: "The ID of the lobby to join",
            },
            joinCode: {
              type: "string",
              description: "The join code for private lobbies (optional)",
            },
          },
          required: ["lobbyId"],
        },
      },
      {
        name: "ltcg_get_state",
        description: "Get current game state for a lobby",
        inputSchema: {
          type: "object",
          properties: {
            lobbyId: {
              type: "string",
              description: "The lobby ID to get state for",
            },
          },
          required: ["lobbyId"],
        },
      },
      {
        name: "ltcg_get_legal_moves",
        description: "Get all legal moves and game state for the current player",
        inputSchema: {
          type: "object",
          properties: {
            gameId: {
              type: "string",
              description: "The game ID to get legal moves for",
            },
          },
          required: ["gameId"],
        },
      },
      {
        name: "ltcg_summon_monster",
        description: "Summon a monster from hand to the field",
        inputSchema: {
          type: "object",
          properties: {
            gameId: {
              type: "string",
              description: "The game ID",
            },
            cardId: {
              type: "string",
              description: "The card ID to summon from hand",
            },
            position: {
              type: "string",
              enum: ["attack", "defense"],
              description: "Attack or Defense Position",
            },
            tributeCardIds: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Array of card IDs to tribute (optional)",
            },
          },
          required: ["gameId", "cardId", "position"],
        },
      },
      {
        name: "ltcg_declare_attack",
        description: "Attack with a monster card",
        inputSchema: {
          type: "object",
          properties: {
            gameId: {
              type: "string",
              description: "The game ID",
            },
            attackerCardId: {
              type: "string",
              description: "The attacker monster card ID",
            },
            targetCardId: {
              type: "string",
              description: "The target monster card ID (optional, omit for direct attack)",
            },
          },
          required: ["gameId", "attackerCardId"],
        },
      },
      {
        name: "ltcg_end_turn",
        description: "End the current player's turn",
        inputSchema: {
          type: "object",
          properties: {
            gameId: {
              type: "string",
              description: "The game ID",
            },
          },
          required: ["gameId"],
        },
      },
      {
        name: "ltcg_set_monster",
        description: "Set a monster card face-down in Defense Position",
        inputSchema: {
          type: "object",
          properties: {
            gameId: {
              type: "string",
              description: "The game ID",
            },
            cardId: {
              type: "string",
              description: "The card ID to set from hand",
            },
            tributeCardIds: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Optional array of card IDs to tribute for levels 5+",
            },
          },
          required: ["gameId", "cardId"],
        },
      },
      {
        name: "ltcg_flip_summon",
        description: "Flip Summon a face-down monster to face-up position",
        inputSchema: {
          type: "object",
          properties: {
            gameId: {
              type: "string",
              description: "The game ID",
            },
            cardId: {
              type: "string",
              description: "The face-down card ID to flip",
            },
            newPosition: {
              type: "string",
              enum: ["attack", "defense"],
              description: "Position after flip (attack or defense)",
            },
          },
          required: ["gameId", "cardId", "newPosition"],
        },
      },
      {
        name: "ltcg_change_position",
        description: "Change a monster's battle position (Attack ↔ Defense)",
        inputSchema: {
          type: "object",
          properties: {
            gameId: {
              type: "string",
              description: "The game ID",
            },
            cardId: {
              type: "string",
              description: "The card ID to change position",
            },
          },
          required: ["gameId", "cardId"],
        },
      },
      {
        name: "ltcg_set_spell_trap",
        description: "Set a Spell or Trap card face-down",
        inputSchema: {
          type: "object",
          properties: {
            gameId: {
              type: "string",
              description: "The game ID",
            },
            cardId: {
              type: "string",
              description: "The Spell/Trap card ID to set",
            },
          },
          required: ["gameId", "cardId"],
        },
      },
      {
        name: "ltcg_activate_spell",
        description: "Activate a Spell card from hand or field",
        inputSchema: {
          type: "object",
          properties: {
            gameId: {
              type: "string",
              description: "The game ID",
            },
            cardId: {
              type: "string",
              description: "The Spell card ID to activate",
            },
            targets: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Optional array of target card IDs",
            },
            costTargets: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Optional array of cards to pay cost",
            },
            effectIndex: {
              type: "number",
              description: "Optional effect index for multi-effect cards",
            },
          },
          required: ["gameId", "cardId"],
        },
      },
      {
        name: "ltcg_activate_trap",
        description: "Activate a Trap card from field",
        inputSchema: {
          type: "object",
          properties: {
            gameId: {
              type: "string",
              description: "The game ID",
            },
            cardId: {
              type: "string",
              description: "The Trap card ID to activate",
            },
            targets: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Optional array of target card IDs",
            },
            costTargets: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Optional array of cards to pay cost",
            },
            effectIndex: {
              type: "number",
              description: "Optional effect index for multi-effect cards",
            },
          },
          required: ["gameId", "cardId"],
        },
      },
      {
        name: "ltcg_activate_monster_effect",
        description: "Activate a monster card's effect",
        inputSchema: {
          type: "object",
          properties: {
            gameId: {
              type: "string",
              description: "The game ID",
            },
            cardId: {
              type: "string",
              description: "The monster card ID",
            },
            effectIndex: {
              type: "number",
              description: "Which effect to activate (0-based index)",
            },
            targets: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Optional array of target card IDs",
            },
            costTargets: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Optional array of cards to pay cost",
            },
          },
          required: ["gameId", "cardId", "effectIndex"],
        },
      },
      {
        name: "ltcg_surrender",
        description: "Surrender/forfeit the current game",
        inputSchema: {
          type: "object",
          properties: {
            gameId: {
              type: "string",
              description: "The game ID to surrender",
            },
          },
          required: ["gameId"],
        },
      },
      {
        name: "ltcg_chain_add",
        description: "Add a card effect to the current chain",
        inputSchema: {
          type: "object",
          properties: {
            lobbyId: {
              type: "string",
              description: "The lobby ID",
            },
            cardId: {
              type: "string",
              description: "The card being activated",
            },
            spellSpeed: {
              type: "number",
              enum: [1, 2, 3],
              description: "Spell speed (1 = Normal, 2 = Quick, 3 = Counter)",
            },
            effect: {
              type: "object",
              description: "Effect to execute (JsonAbility format)",
            },
            targets: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Optional array of target card IDs",
            },
          },
          required: ["lobbyId", "cardId", "spellSpeed", "effect"],
        },
      },
      {
        name: "ltcg_chain_pass",
        description: "Pass priority on the current chain",
        inputSchema: {
          type: "object",
          properties: {
            lobbyId: {
              type: "string",
              description: "The lobby ID",
            },
          },
          required: ["lobbyId"],
        },
      },
      {
        name: "ltcg_chain_resolve",
        description: "Resolve the current chain",
        inputSchema: {
          type: "object",
          properties: {
            lobbyId: {
              type: "string",
              description: "The lobby ID",
            },
          },
          required: ["lobbyId"],
        },
      },
      {
        name: "ltcg_chain_get_state",
        description: "Get the current chain state",
        inputSchema: {
          type: "object",
          properties: {
            lobbyId: {
              type: "string",
              description: "The lobby ID",
            },
          },
          required: ["lobbyId"],
        },
      },
      {
        name: "ltcg_phase_advance",
        description: "Advance to the next game phase",
        inputSchema: {
          type: "object",
          properties: {
            gameId: {
              type: "string",
              description: "The game ID",
            },
          },
          required: ["gameId"],
        },
      },
      {
        name: "ltcg_phase_skip_battle",
        description: "Skip the Battle Phase",
        inputSchema: {
          type: "object",
          properties: {
            gameId: {
              type: "string",
              description: "The game ID",
            },
          },
          required: ["gameId"],
        },
      },
      {
        name: "ltcg_phase_skip_to_end",
        description: "Skip directly to the End Phase",
        inputSchema: {
          type: "object",
          properties: {
            gameId: {
              type: "string",
              description: "The game ID",
            },
          },
          required: ["gameId"],
        },
      },
    ],
  }));

  // Tool execution handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "ltcg_create_game": {
          const { mode, isPrivate } = args as { mode: string; isPrivate: boolean };
          const result = await makeApiRequest("/api/game/create", "POST", {
            mode,
            isPrivate,
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "ltcg_join_game": {
          const { lobbyId, joinCode } = args as { lobbyId: string; joinCode?: string };
          const result = await makeApiRequest("/api/game/join", "POST", {
            lobbyId,
            joinCode,
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "ltcg_get_state": {
          const { lobbyId } = args as { lobbyId: string };
          const result = await makeApiRequest(`/api/game/state?lobbyId=${lobbyId}`, "GET");
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "ltcg_get_legal_moves": {
          const { gameId } = args as { gameId: string };
          const result = await makeApiRequest(`/api/game/legal-moves?gameId=${gameId}`, "GET");
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "ltcg_summon_monster": {
          const { gameId, cardId, position, tributeCardIds } = args as {
            gameId: string;
            cardId: string;
            position: string;
            tributeCardIds?: string[];
          };
          const result = await makeApiRequest("/api/game/summon", "POST", {
            gameId,
            cardId,
            position,
            tributeCardIds,
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "ltcg_declare_attack": {
          const { gameId, attackerCardId, targetCardId } = args as {
            gameId: string;
            attackerCardId: string;
            targetCardId?: string;
          };
          const result = await makeApiRequest("/api/game/attack", "POST", {
            gameId,
            attackerCardId,
            targetCardId,
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "ltcg_end_turn": {
          const { gameId } = args as { gameId: string };
          const result = await makeApiRequest("/api/game/end-turn", "POST", {
            gameId,
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "ltcg_set_monster": {
          const { gameId, cardId, tributeCardIds } = args as {
            gameId: string;
            cardId: string;
            tributeCardIds?: string[];
          };
          const result = await makeApiRequest("/api/game/set-monster", "POST", {
            gameId,
            cardId,
            tributeCardIds,
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "ltcg_flip_summon": {
          const { gameId, cardId, newPosition } = args as {
            gameId: string;
            cardId: string;
            newPosition: string;
          };
          const result = await makeApiRequest("/api/game/flip-summon", "POST", {
            gameId,
            cardId,
            newPosition,
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "ltcg_change_position": {
          const { gameId, cardId } = args as {
            gameId: string;
            cardId: string;
          };
          const result = await makeApiRequest("/api/game/change-position", "POST", {
            gameId,
            cardId,
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "ltcg_set_spell_trap": {
          const { gameId, cardId } = args as {
            gameId: string;
            cardId: string;
          };
          const result = await makeApiRequest("/api/game/set-spell-trap", "POST", {
            gameId,
            cardId,
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "ltcg_activate_spell": {
          const { gameId, cardId, targets, costTargets, effectIndex } = args as {
            gameId: string;
            cardId: string;
            targets?: string[];
            costTargets?: string[];
            effectIndex?: number;
          };
          const result = await makeApiRequest("/api/game/activate-spell", "POST", {
            gameId,
            cardId,
            targets,
            costTargets,
            effectIndex,
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "ltcg_activate_trap": {
          const { gameId, cardId, targets, costTargets, effectIndex } = args as {
            gameId: string;
            cardId: string;
            targets?: string[];
            costTargets?: string[];
            effectIndex?: number;
          };
          const result = await makeApiRequest("/api/game/activate-trap", "POST", {
            gameId,
            cardId,
            targets,
            costTargets,
            effectIndex,
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "ltcg_activate_monster_effect": {
          const { gameId, cardId, effectIndex, targets, costTargets } = args as {
            gameId: string;
            cardId: string;
            effectIndex: number;
            targets?: string[];
            costTargets?: string[];
          };
          const result = await makeApiRequest("/api/game/activate-effect", "POST", {
            gameId,
            cardId,
            effectIndex,
            targets,
            costTargets,
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "ltcg_surrender": {
          const { gameId } = args as { gameId: string };
          const result = await makeApiRequest("/api/game/surrender", "POST", {
            gameId,
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "ltcg_chain_add": {
          const { lobbyId, cardId, spellSpeed, effect, targets } = args as {
            lobbyId: string;
            cardId: string;
            spellSpeed: number;
            effect: unknown;
            targets?: string[];
          };
          const result = await makeApiRequest("/api/game/chain/add", "POST", {
            lobbyId,
            cardId,
            spellSpeed,
            effect,
            targets,
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "ltcg_chain_pass": {
          const { lobbyId } = args as { lobbyId: string };
          const result = await makeApiRequest("/api/game/chain/pass", "POST", {
            lobbyId,
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "ltcg_chain_resolve": {
          const { lobbyId } = args as { lobbyId: string };
          const result = await makeApiRequest("/api/game/chain/resolve", "POST", {
            lobbyId,
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "ltcg_chain_get_state": {
          const { lobbyId } = args as { lobbyId: string };
          const result = await makeApiRequest(`/api/game/chain/state?lobbyId=${lobbyId}`, "GET");
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "ltcg_phase_advance": {
          const { gameId } = args as { gameId: string };
          const result = await makeApiRequest("/api/game/phase/advance", "POST", {
            gameId,
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "ltcg_phase_skip_battle": {
          const { gameId } = args as { gameId: string };
          const result = await makeApiRequest("/api/game/phase/skip-battle", "POST", {
            gameId,
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "ltcg_phase_skip_to_end": {
          const { gameId } = args as { gameId: string };
          const result = await makeApiRequest("/api/game/phase/skip-to-end", "POST", {
            gameId,
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error: errorMessage,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}
