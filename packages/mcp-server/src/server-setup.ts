import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
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

// ---------------------------------------------------------------------------
// Error handler wrapper to avoid repeating try/catch in every tool
// ---------------------------------------------------------------------------
type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

function withErrorHandler<T extends Record<string, unknown>>(
  handler: (args: T) => Promise<ToolResult>
): (args: T) => Promise<ToolResult> {
  return async (args: T) => {
    try {
      return await handler(args);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ success: false, error: errorMessage }, null, 2),
          },
        ],
        isError: true,
      };
    }
  };
}

/** Format a successful API result as a tool response */
function ok(data: unknown): ToolResult {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

// ---------------------------------------------------------------------------
// The MCP SDK's registerTool/registerPrompt have deeply recursive Zod
// generics (McpServer.registerTool<OutputArgs, InputArgs>) that cause
// TypeScript OOM when instantiated 50+ times. Casting the server to an
// untyped interface avoids the generic inference chain while keeping
// identical runtime behavior — Zod schemas still validate inputs.
// ---------------------------------------------------------------------------
// biome-ignore lint/suspicious/noExplicitAny: avoids TS OOM from MCP SDK Zod generics
type McpServerUntyped = Record<string, any>;

// ---------------------------------------------------------------------------
// Agent Management Tools
// ---------------------------------------------------------------------------
function registerAgentTools(server: McpServerUntyped) {
  server.registerTool(
    "ltcg_register_agent",
    {
      description:
        "Register a new agent with the LunchTable-TCG platform. Creates a player profile for API-based play.",
      inputSchema: {
        username: z.string().describe("Username for the new agent"),
        deckCode: z
          .string()
          .optional()
          .describe("Optional starter deck code to select during registration"),
      },
    },
    withErrorHandler(async ({ username, deckCode }) => {
      const result = await makeApiRequest("/api/agents/register", "POST", {
        username,
        deckCode,
      });
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_get_profile",
    {
      description:
        "Get the authenticated agent's player profile including username, stats, and inventory.",
    },
    withErrorHandler(async () => {
      const result = await makeApiRequest("/api/agents/me", "GET");
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_get_rate_limit",
    {
      description:
        "Check the current API rate limit status for the authenticated agent.",
    },
    withErrorHandler(async () => {
      const result = await makeApiRequest("/api/agents/rate-limit", "GET");
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_get_wallet",
    {
      description:
        "Get the authenticated agent's wallet balance including gems and currency.",
    },
    withErrorHandler(async () => {
      const result = await makeApiRequest("/api/agents/wallet", "GET");
      return ok(result);
    })
  );
}

// ---------------------------------------------------------------------------
// Game State Tools (Read-only)
// ---------------------------------------------------------------------------
function registerGameStateTools(server: McpServerUntyped) {
  server.registerTool(
    "ltcg_get_pending_turns",
    {
      description:
        "Get a list of games where it is currently your turn to act. Useful for polling active games.",
    },
    withErrorHandler(async () => {
      const result = await makeApiRequest("/api/agents/pending-turns", "GET");
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_get_state",
    {
      description:
        "Get the full game state for a given game. Includes board, hands, graveyards, life points, and phase info.",
      inputSchema: {
        gameId: z.string().describe("The game ID to retrieve state for"),
      },
    },
    withErrorHandler(async ({ gameId }) => {
      const result = await makeApiRequest(
        `/api/agents/games/state?gameId=${gameId}`,
        "GET"
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_get_legal_moves",
    {
      description:
        "Get all legal moves and available actions for the current player in a game.",
      inputSchema: {
        gameId: z.string().describe("The game ID to get legal moves for"),
      },
    },
    withErrorHandler(async ({ gameId }) => {
      const result = await makeApiRequest(
        `/api/agents/games/available-actions?gameId=${gameId}`,
        "GET"
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_get_game_history",
    {
      description:
        "Get the move history / event log for a game. Useful for replays and analysis.",
      inputSchema: {
        gameId: z.string().describe("The game ID to get history for"),
      },
    },
    withErrorHandler(async ({ gameId }) => {
      const result = await makeApiRequest(
        `/api/agents/games/history?gameId=${gameId}`,
        "GET"
      );
      return ok(result);
    })
  );
}

// ---------------------------------------------------------------------------
// Game Action Tools
// ---------------------------------------------------------------------------
function registerGameActionTools(server: McpServerUntyped) {
  // --- Monster Movement ---

  server.registerTool(
    "ltcg_summon_monster",
    {
      description:
        "Normal Summon a monster from your hand to the field in Attack or Defense position. Requires tributes for level 5+ monsters.",
      inputSchema: {
        gameId: z.string().describe("The game ID"),
        cardId: z.string().describe("The monster card ID to summon from hand"),
        position: z
          .enum(["attack", "defense"])
          .describe("Battle position: attack or defense"),
        tributeCardIds: z
          .array(z.string())
          .optional()
          .describe(
            "Array of card IDs on your field to tribute (required for level 5+ monsters)"
          ),
      },
    },
    withErrorHandler(async ({ gameId, cardId, position, tributeCardIds }) => {
      const result = await makeApiRequest(
        "/api/agents/games/actions/summon",
        "POST",
        { gameId, cardId, position, tributeCardIds }
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_set_monster",
    {
      description:
        "Set a monster card face-down in Defense Position from your hand.",
      inputSchema: {
        gameId: z.string().describe("The game ID"),
        cardId: z.string().describe("The monster card ID to set from hand"),
        tributeCardIds: z
          .array(z.string())
          .optional()
          .describe("Optional array of card IDs to tribute for level 5+ monsters"),
      },
    },
    withErrorHandler(async ({ gameId, cardId, tributeCardIds }) => {
      const result = await makeApiRequest(
        "/api/agents/games/actions/set-card",
        "POST",
        { gameId, cardId, tributeCardIds }
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_flip_summon",
    {
      description:
        "Flip Summon a face-down monster to face-up Attack or Defense position.",
      inputSchema: {
        gameId: z.string().describe("The game ID"),
        cardId: z.string().describe("The face-down card ID to flip"),
        newPosition: z
          .enum(["attack", "defense"])
          .describe("Position after flip: attack or defense"),
      },
    },
    withErrorHandler(async ({ gameId, cardId, newPosition }) => {
      const result = await makeApiRequest(
        "/api/agents/games/actions/flip-summon",
        "POST",
        { gameId, cardId, newPosition }
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_change_position",
    {
      description:
        "Change a face-up monster's battle position (Attack <-> Defense). Can only be done once per monster per turn.",
      inputSchema: {
        gameId: z.string().describe("The game ID"),
        cardId: z.string().describe("The monster card ID to change position"),
      },
    },
    withErrorHandler(async ({ gameId, cardId }) => {
      const result = await makeApiRequest(
        "/api/agents/games/actions/change-position",
        "POST",
        { gameId, cardId }
      );
      return ok(result);
    })
  );

  // --- Spell / Trap ---

  server.registerTool(
    "ltcg_set_spell_trap",
    {
      description:
        "Set a Spell or Trap card face-down in your Spell/Trap zone.",
      inputSchema: {
        gameId: z.string().describe("The game ID"),
        cardId: z.string().describe("The Spell/Trap card ID to set"),
      },
    },
    withErrorHandler(async ({ gameId, cardId }) => {
      const result = await makeApiRequest(
        "/api/agents/games/actions/set-spell-trap",
        "POST",
        { gameId, cardId }
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_activate_spell",
    {
      description:
        "Activate a Spell card from your hand or field. Optionally specify targets and cost targets.",
      inputSchema: {
        gameId: z.string().describe("The game ID"),
        cardId: z.string().describe("The Spell card ID to activate"),
        targets: z
          .array(z.string())
          .optional()
          .describe("Optional array of target card IDs for the spell effect"),
        costTargets: z
          .array(z.string())
          .optional()
          .describe("Optional array of card IDs to pay the activation cost"),
        effectIndex: z
          .number()
          .optional()
          .describe("Optional 0-based effect index for multi-effect spell cards"),
      },
    },
    withErrorHandler(
      async ({ gameId, cardId, targets, costTargets, effectIndex }) => {
        const result = await makeApiRequest(
          "/api/agents/games/actions/activate-spell",
          "POST",
          { gameId, cardId, targets, costTargets, effectIndex }
        );
        return ok(result);
      }
    )
  );

  server.registerTool(
    "ltcg_activate_trap",
    {
      description:
        "Activate a Trap card from your field. Traps must be set for at least one turn before activation.",
      inputSchema: {
        gameId: z.string().describe("The game ID"),
        cardId: z.string().describe("The Trap card ID to activate"),
        targets: z
          .array(z.string())
          .optional()
          .describe("Optional array of target card IDs for the trap effect"),
        costTargets: z
          .array(z.string())
          .optional()
          .describe("Optional array of card IDs to pay the activation cost"),
        effectIndex: z
          .number()
          .optional()
          .describe("Optional 0-based effect index for multi-effect trap cards"),
      },
    },
    withErrorHandler(
      async ({ gameId, cardId, targets, costTargets, effectIndex }) => {
        const result = await makeApiRequest(
          "/api/agents/games/actions/activate-trap",
          "POST",
          { gameId, cardId, targets, costTargets, effectIndex }
        );
        return ok(result);
      }
    )
  );

  server.registerTool(
    "ltcg_chain_response",
    {
      description:
        "Respond to a chain prompt. Either pass priority or add a card to the chain.",
      inputSchema: {
        gameId: z.string().describe("The game ID"),
        pass: z
          .boolean()
          .describe("True to pass priority, false to add a card to the chain"),
        cardId: z
          .string()
          .optional()
          .describe("Card ID to chain with (required when pass is false)"),
        targets: z
          .array(z.string())
          .optional()
          .describe("Optional array of target card IDs for the chained effect"),
      },
    },
    withErrorHandler(async ({ gameId, pass, cardId, targets }) => {
      const result = await makeApiRequest(
        "/api/agents/games/actions/chain-response",
        "POST",
        { gameId, pass, cardId, targets }
      );
      return ok(result);
    })
  );

  // --- Combat & Turn ---

  server.registerTool(
    "ltcg_declare_attack",
    {
      description:
        "Declare an attack with one of your monsters. Omit targetCardId for a direct attack on the opponent.",
      inputSchema: {
        gameId: z.string().describe("The game ID"),
        attackerCardId: z
          .string()
          .describe("The attacking monster's card ID"),
        targetCardId: z
          .string()
          .optional()
          .describe(
            "The target monster's card ID. Omit for a direct attack on the opponent."
          ),
      },
    },
    withErrorHandler(async ({ gameId, attackerCardId, targetCardId }) => {
      const result = await makeApiRequest(
        "/api/agents/games/actions/attack",
        "POST",
        { gameId, attackerCardId, targetCardId }
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_pass_response_window",
    {
      description:
        "Pass the current response window without taking action. Used to decline optional triggers.",
      inputSchema: {
        gameId: z.string().describe("The game ID"),
      },
    },
    withErrorHandler(async ({ gameId }) => {
      const result = await makeApiRequest(
        "/api/agents/games/actions/pass-response-window",
        "POST",
        { gameId }
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_enter_battle",
    {
      description:
        "Transition from Main Phase 1 to the Battle Phase.",
      inputSchema: {
        gameId: z.string().describe("The game ID"),
      },
    },
    withErrorHandler(async ({ gameId }) => {
      const result = await makeApiRequest(
        "/api/agents/games/actions/enter-battle",
        "POST",
        { gameId }
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_enter_main2",
    {
      description:
        "Transition from the Battle Phase to Main Phase 2.",
      inputSchema: {
        gameId: z.string().describe("The game ID"),
      },
    },
    withErrorHandler(async ({ gameId }) => {
      const result = await makeApiRequest(
        "/api/agents/games/actions/enter-main2",
        "POST",
        { gameId }
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_end_turn",
    {
      description: "End the current player's turn and pass to the opponent.",
      inputSchema: {
        gameId: z.string().describe("The game ID"),
      },
    },
    withErrorHandler(async ({ gameId }) => {
      const result = await makeApiRequest(
        "/api/agents/games/actions/end-turn",
        "POST",
        { gameId }
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_surrender",
    {
      description: "Surrender / forfeit the current game.",
      inputSchema: {
        gameId: z.string().describe("The game ID to surrender"),
      },
    },
    withErrorHandler(async ({ gameId }) => {
      const result = await makeApiRequest(
        "/api/agents/games/actions/surrender",
        "POST",
        { gameId }
      );
      return ok(result);
    })
  );

  // --- Effects, Chain, Phase ---

  server.registerTool(
    "ltcg_activate_monster_effect",
    {
      description:
        "Activate a monster card's effect by index. Optionally specify targets and cost targets.",
      inputSchema: {
        gameId: z.string().describe("The game ID"),
        cardId: z.string().describe("The monster card ID whose effect to activate"),
        effectIndex: z
          .number()
          .describe("0-based index of the effect to activate"),
        targets: z
          .array(z.string())
          .optional()
          .describe("Optional array of target card IDs for the effect"),
        costTargets: z
          .array(z.string())
          .optional()
          .describe("Optional array of card IDs to pay the effect cost"),
      },
    },
    withErrorHandler(
      async ({ gameId, cardId, effectIndex, targets, costTargets }) => {
        const result = await makeApiRequest(
          "/api/agents/games/actions/activate-effect",
          "POST",
          { gameId, cardId, effectIndex, targets, costTargets }
        );
        return ok(result);
      }
    )
  );

  server.registerTool(
    "ltcg_chain_add",
    {
      description:
        "Add a card effect to the current chain. Requires specifying the spell speed and effect payload.",
      inputSchema: {
        lobbyId: z.string().describe("The lobby ID"),
        cardId: z.string().describe("The card being activated onto the chain"),
        spellSpeed: z
          .number()
          .describe("Spell speed of the effect (1 = Normal, 2 = Quick, 3 = Counter)"),
        effect: z.unknown().describe("Effect payload in JsonAbility format"),
        targets: z
          .array(z.string())
          .optional()
          .describe("Optional array of target card IDs"),
      },
    },
    withErrorHandler(async ({ lobbyId, cardId, spellSpeed, effect, targets }) => {
      const result = await makeApiRequest(
        "/api/agents/games/actions/chain-add",
        "POST",
        { lobbyId, cardId, spellSpeed, effect, targets }
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_chain_resolve",
    {
      description: "Resolve the current chain, executing effects in reverse order.",
      inputSchema: {
        lobbyId: z.string().describe("The lobby ID"),
      },
    },
    withErrorHandler(async ({ lobbyId }) => {
      const result = await makeApiRequest(
        "/api/agents/games/actions/chain-resolve",
        "POST",
        { lobbyId }
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_chain_get_state",
    {
      description: "Get the current chain state including all pending effects.",
      inputSchema: {
        lobbyId: z.string().describe("The lobby ID"),
      },
    },
    withErrorHandler(async ({ lobbyId }) => {
      const result = await makeApiRequest(
        `/api/agents/games/chain-state?lobbyId=${lobbyId}`,
        "GET"
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_phase_advance",
    {
      description: "Advance to the next game phase.",
      inputSchema: {
        gameId: z.string().describe("The game ID"),
      },
    },
    withErrorHandler(async ({ gameId }) => {
      const result = await makeApiRequest(
        "/api/agents/games/actions/phase-advance",
        "POST",
        { gameId }
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_phase_skip_battle",
    {
      description:
        "Skip the Battle Phase entirely and move directly to Main Phase 2.",
      inputSchema: {
        gameId: z.string().describe("The game ID"),
      },
    },
    withErrorHandler(async ({ gameId }) => {
      const result = await makeApiRequest(
        "/api/agents/games/actions/phase-skip-battle",
        "POST",
        { gameId }
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_phase_skip_to_end",
    {
      description: "Skip directly to the End Phase, ending the turn.",
      inputSchema: {
        gameId: z.string().describe("The game ID"),
      },
    },
    withErrorHandler(async ({ gameId }) => {
      const result = await makeApiRequest(
        "/api/agents/games/actions/phase-skip-to-end",
        "POST",
        { gameId }
      );
      return ok(result);
    })
  );
}

// ---------------------------------------------------------------------------
// Matchmaking Tools
// ---------------------------------------------------------------------------
function registerMatchmakingTools(server: McpServerUntyped) {
  server.registerTool(
    "ltcg_create_game",
    {
      description:
        "Create a new game lobby and enter the matchmaking queue.",
      inputSchema: {
        mode: z
          .enum(["casual", "ranked"])
          .describe("Game mode: casual or ranked"),
        deckId: z
          .string()
          .optional()
          .describe("Deck ID to use (defaults to active deck)"),
        maxRatingDiff: z
          .number()
          .optional()
          .describe("Maximum rating difference for matchmaking"),
        isPrivate: z
          .boolean()
          .optional()
          .describe("Whether the lobby is private (invite-only)"),
      },
    },
    withErrorHandler(async ({ mode, deckId, maxRatingDiff, isPrivate }) => {
      const result = await makeApiRequest(
        "/api/agents/matchmaking/enter",
        "POST",
        { mode, deckId, maxRatingDiff, isPrivate }
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_list_lobbies",
    {
      description: "List all available open game lobbies that can be joined.",
    },
    withErrorHandler(async () => {
      const result = await makeApiRequest(
        "/api/agents/matchmaking/lobbies",
        "GET"
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_join_game",
    {
      description: "Join an existing game lobby by lobby ID.",
      inputSchema: {
        lobbyId: z.string().describe("The lobby ID to join"),
      },
    },
    withErrorHandler(async ({ lobbyId }) => {
      const result = await makeApiRequest(
        "/api/agents/matchmaking/join",
        "POST",
        { lobbyId }
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_leave_lobby",
    {
      description: "Leave a game lobby you previously joined or created.",
      inputSchema: {
        lobbyId: z.string().describe("The lobby ID to leave"),
      },
    },
    withErrorHandler(async ({ lobbyId }) => {
      const result = await makeApiRequest(
        "/api/agents/matchmaking/leave",
        "POST",
        { lobbyId }
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_wager_create",
    {
      description:
        "Create a wager game lobby with cryptocurrency escrow. Requires on-chain funds.",
      inputSchema: {
        mode: z
          .enum(["casual", "ranked"])
          .describe("Game mode: casual or ranked"),
        cryptoWagerCurrency: z
          .enum(["sol", "usdc"])
          .describe("Cryptocurrency to wager"),
        cryptoWagerTier: z
          .number()
          .describe("Wager tier (amount index) for the bet"),
        isPrivate: z
          .boolean()
          .optional()
          .describe("Whether the lobby is private (invite-only)"),
      },
    },
    withErrorHandler(async ({ mode, cryptoWagerCurrency, cryptoWagerTier, isPrivate }) => {
      const result = await makeApiRequest(
        "/api/agents/matchmaking/wager-enter",
        "POST",
        { mode, cryptoWagerCurrency, cryptoWagerTier, isPrivate }
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_wager_join",
    {
      description:
        "Join an existing wager game lobby. Requires x402 payment to escrow the matching wager amount.",
      inputSchema: {
        lobbyId: z.string().describe("The wager lobby ID to join"),
      },
    },
    withErrorHandler(async ({ lobbyId }) => {
      const result = await makeApiRequest(
        "/api/agents/matchmaking/wager-join",
        "POST",
        { lobbyId }
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_heartbeat",
    {
      description:
        "Send a heartbeat to keep your matchmaking lobby alive. Must be called periodically while waiting for an opponent.",
      inputSchema: {
        lobbyId: z.string().describe("The lobby ID to send heartbeat for"),
      },
    },
    withErrorHandler(async ({ lobbyId }) => {
      const result = await makeApiRequest(
        "/api/agents/matchmaking/heartbeat",
        "POST",
        { lobbyId }
      );
      return ok(result);
    })
  );
}

// ---------------------------------------------------------------------------
// Story Mode Tools
// ---------------------------------------------------------------------------
function registerStoryTools(server: McpServerUntyped) {
  server.registerTool(
    "ltcg_story_chapters",
    {
      description: "List all available story mode chapters.",
    },
    withErrorHandler(async () => {
      const result = await makeApiRequest("/api/agents/story/chapters", "GET");
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_story_stages",
    {
      description: "List all stages within a story chapter.",
      inputSchema: {
        chapterId: z.string().describe("The chapter ID to list stages for"),
      },
    },
    withErrorHandler(async ({ chapterId }) => {
      const result = await makeApiRequest(
        `/api/agents/story/stages?chapterId=${chapterId}`,
        "GET"
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_story_start",
    {
      description:
        "Start a story mode battle at a specific chapter and stage.",
      inputSchema: {
        chapterId: z.string().describe("The chapter ID"),
        stageId: z.string().describe("The stage ID within the chapter"),
      },
    },
    withErrorHandler(async ({ chapterId, stageId }) => {
      const result = await makeApiRequest("/api/agents/story/start", "POST", {
        chapterId,
        stageId,
      });
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_story_quick_play",
    {
      description:
        "Quick-play a random story stage. Automatically picks an available stage.",
    },
    withErrorHandler(async () => {
      const result = await makeApiRequest(
        "/api/agents/story/quick-play",
        "POST",
        {}
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_story_complete",
    {
      description:
        "Mark a story battle as complete and claim rewards.",
      inputSchema: {
        gameId: z.string().describe("The game ID of the completed story battle"),
      },
    },
    withErrorHandler(async ({ gameId }) => {
      const result = await makeApiRequest(
        "/api/agents/story/complete",
        "POST",
        { gameId }
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_story_ai_turn",
    {
      description:
        "Request the AI opponent to take its turn in a story mode battle.",
      inputSchema: {
        gameId: z.string().describe("The game ID of the story battle"),
      },
    },
    withErrorHandler(async ({ gameId }) => {
      const result = await makeApiRequest(
        "/api/agents/story/ai-turn",
        "POST",
        { gameId }
      );
      return ok(result);
    })
  );
}

// ---------------------------------------------------------------------------
// Deck Management Tools
// ---------------------------------------------------------------------------
function registerDeckTools(server: McpServerUntyped) {
  server.registerTool(
    "ltcg_get_decks",
    {
      description: "List all of the authenticated agent's decks.",
    },
    withErrorHandler(async () => {
      const result = await makeApiRequest("/api/agents/decks", "GET");
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_get_deck",
    {
      description: "Get details of a specific deck by ID.",
      inputSchema: {
        deckId: z.string().describe("The deck ID to retrieve"),
      },
    },
    withErrorHandler(async ({ deckId }) => {
      const result = await makeApiRequest(
        `/api/agents/decks?deckId=${deckId}`,
        "GET"
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_get_starter_decks",
    {
      description:
        "List all available starter / pre-built decks that can be selected.",
    },
    withErrorHandler(async () => {
      const result = await makeApiRequest("/api/agents/starter-decks", "GET");
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_create_deck",
    {
      description: "Create a new custom deck with the given name and card IDs.",
      inputSchema: {
        name: z.string().describe("Name for the new deck"),
        cardIds: z
          .array(z.string())
          .describe("Array of card IDs to include in the deck"),
      },
    },
    withErrorHandler(async ({ name, cardIds }) => {
      const result = await makeApiRequest("/api/agents/decks/create", "POST", {
        name,
        cardIds,
      });
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_select_starter_deck",
    {
      description: "Select a starter deck by its deck code.",
      inputSchema: {
        deckCode: z.string().describe("The starter deck code to select"),
      },
    },
    withErrorHandler(async ({ deckCode }) => {
      const result = await makeApiRequest(
        "/api/agents/decks/select-starter",
        "POST",
        { deckCode }
      );
      return ok(result);
    })
  );
}

// ---------------------------------------------------------------------------
// Card Catalog Tools
// ---------------------------------------------------------------------------
function registerCardTools(server: McpServerUntyped) {
  server.registerTool(
    "ltcg_get_cards",
    {
      description:
        "Get the full card catalog. Returns all cards available in the game.",
    },
    withErrorHandler(async () => {
      const result = await makeApiRequest("/api/agents/cards", "GET");
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_get_card",
    {
      description: "Get detailed information about a single card by its ID.",
      inputSchema: {
        cardId: z.string().describe("The card ID to look up"),
      },
    },
    withErrorHandler(async ({ cardId }) => {
      const result = await makeApiRequest(
        `/api/agents/cards?cardId=${cardId}`,
        "GET"
      );
      return ok(result);
    })
  );
}

// ---------------------------------------------------------------------------
// Chat Tools
// ---------------------------------------------------------------------------
function registerChatTools(server: McpServerUntyped) {
  server.registerTool(
    "ltcg_chat_send",
    {
      description: "Send a message to the global chat.",
      inputSchema: {
        message: z.string().describe("The chat message to send"),
      },
    },
    withErrorHandler(async ({ message }) => {
      const result = await makeApiRequest("/api/agents/chat/send", "POST", {
        message,
      });
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_chat_messages",
    {
      description: "Get recent messages from the global chat.",
    },
    withErrorHandler(async () => {
      const result = await makeApiRequest("/api/agents/chat/messages", "GET");
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_chat_online_users",
    {
      description: "Get a list of currently online users in the global chat.",
    },
    withErrorHandler(async () => {
      const result = await makeApiRequest(
        "/api/agents/chat/online-users",
        "GET"
      );
      return ok(result);
    })
  );
}

// ---------------------------------------------------------------------------
// Decision History Tools
// ---------------------------------------------------------------------------
function registerDecisionTools(server: McpServerUntyped) {
  server.registerTool(
    "ltcg_save_decision",
    {
      description:
        "Save an AI decision record for analytics and learning. Logs the action, reasoning, and outcome.",
      inputSchema: {
        gameId: z.string().describe("The game ID the decision was made in"),
        turnNumber: z.number().describe("The turn number when the decision was made"),
        phase: z
          .string()
          .optional()
          .describe("The game phase when the decision was made (e.g. main1, battle)"),
        action: z.string().describe("The action that was taken (e.g. summon, attack)"),
        reasoning: z
          .string()
          .describe("Explanation of why this action was chosen"),
        parameters: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("Optional key-value parameters associated with the decision"),
        executionTimeMs: z
          .number()
          .optional()
          .describe("Optional execution time of the decision in milliseconds"),
        result: z
          .string()
          .optional()
          .describe("Optional outcome/result of the action"),
      },
    },
    withErrorHandler(
      async ({
        gameId,
        turnNumber,
        phase,
        action,
        reasoning,
        parameters,
        executionTimeMs,
        result,
      }) => {
        const res = await makeApiRequest("/api/agents/decisions", "POST", {
          gameId,
          turnNumber,
          phase,
          action,
          reasoning,
          parameters,
          executionTimeMs,
          result,
        });
        return ok(res);
      }
    )
  );

  server.registerTool(
    "ltcg_get_decisions",
    {
      description:
        "Get decision history, optionally filtered by game ID.",
      inputSchema: {
        gameId: z
          .string()
          .optional()
          .describe("Optional game ID to filter decisions for a specific game"),
      },
    },
    withErrorHandler(async ({ gameId }) => {
      const query = gameId ? `?gameId=${gameId}` : "";
      const result = await makeApiRequest(
        `/api/agents/decisions${query}`,
        "GET"
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_get_decision_stats",
    {
      description:
        "Get aggregate statistics about the agent's decision history (win rate, action distribution, etc.).",
    },
    withErrorHandler(async () => {
      const result = await makeApiRequest(
        "/api/agents/decisions/stats",
        "GET"
      );
      return ok(result);
    })
  );
}

// ---------------------------------------------------------------------------
// Shop Tools
// ---------------------------------------------------------------------------
function registerShopTools(server: McpServerUntyped) {
  server.registerTool(
    "ltcg_shop_packages",
    {
      description: "List all available card pack packages in the shop.",
    },
    withErrorHandler(async () => {
      const result = await makeApiRequest("/api/agents/shop/packages", "GET");
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_shop_products",
    {
      description: "List all available products in the shop.",
    },
    withErrorHandler(async () => {
      const result = await makeApiRequest("/api/agents/shop/products", "GET");
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_shop_buy_pack_gems",
    {
      description: "Purchase a card pack using gems.",
      inputSchema: {
        productId: z.string().describe("The product ID of the pack to purchase"),
      },
    },
    withErrorHandler(async ({ productId }) => {
      const result = await makeApiRequest(
        "/api/agents/shop/pack-gems",
        "POST",
        { productId }
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_shop_buy_gems_x402",
    {
      description:
        "Purchase gems using cryptocurrency via x402 payment protocol.",
      inputSchema: {
        packageId: z
          .string()
          .describe("The gem package ID to purchase"),
      },
    },
    withErrorHandler(async ({ packageId }) => {
      const result = await makeApiRequest(
        "/api/agents/shop/gems",
        "POST",
        { packageId }
      );
      return ok(result);
    })
  );

  server.registerTool(
    "ltcg_shop_buy_pack_x402",
    {
      description:
        "Purchase a card pack using cryptocurrency via x402 payment protocol.",
      inputSchema: {
        productId: z
          .string()
          .describe("The product ID of the pack to purchase"),
      },
    },
    withErrorHandler(async ({ productId }) => {
      const result = await makeApiRequest(
        "/api/agents/shop/pack",
        "POST",
        { productId }
      );
      return ok(result);
    })
  );
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------
function registerPrompts(server: McpServerUntyped) {
  server.registerPrompt(
    "play-casual",
    {
      description:
        "Quick start a casual game and guide through the first turn",
    },
    async () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
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
    })
  );

  server.registerPrompt(
    "play-ranked",
    {
      description:
        "Quick start a ranked game and help play competitively",
    },
    async () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
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
    })
  );

  server.registerPrompt(
    "analyze-game",
    {
      description:
        "Analyze the current game state and suggest optimal moves",
      argsSchema: {
        gameId: z.string().describe("The game ID to analyze"),
      },
    },
    async ({ gameId }: { gameId: string }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
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
    })
  );

  server.registerPrompt(
    "build-deck",
    {
      description:
        "Interactive deck building assistance for a specific archetype",
      argsSchema: {
        archetype: z
          .string()
          .describe(
            "Deck archetype (fire, water, earth, wind, light, dark, neutral)"
          ),
      },
    },
    async ({ archetype }: { archetype: string }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
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
    })
  );

  server.registerPrompt(
    "spectate",
    {
      description:
        "Watch a game and provide live commentary on the state",
      argsSchema: {
        lobbyId: z.string().describe("The lobby ID to spectate"),
      },
    },
    async ({ lobbyId }: { lobbyId: string }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
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
    })
  );
}

// ---------------------------------------------------------------------------
// Server factory
// ---------------------------------------------------------------------------

/**
 * Creates and configures an MCP server with all tools and prompts registered.
 */
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "LunchTable-TCG MCP Server",
    version: "1.0.0",
  });

  // Cast to untyped to avoid MCP SDK Zod OOM (see McpServerUntyped comment)
  const s: McpServerUntyped = server;
  registerAgentTools(s);
  registerGameStateTools(s);
  registerGameActionTools(s);
  registerMatchmakingTools(s);
  registerStoryTools(s);
  registerDeckTools(s);
  registerCardTools(s);
  registerChatTools(s);
  registerDecisionTools(s);
  registerShopTools(s);
  registerPrompts(s);

  return server;
}
