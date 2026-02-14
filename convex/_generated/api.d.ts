/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth_auth from "../auth/auth.js";
import type * as auth_syncUser from "../auth/syncUser.js";
import type * as chainResolver from "../chainResolver.js";
import type * as crons from "../crons.js";
import type * as economy_economy from "../economy/economy.js";
import type * as events_emitter from "../events/emitter.js";
import type * as events_handlers_economyHandler from "../events/handlers/economyHandler.js";
import type * as events_handlers_progressionHandler from "../events/handlers/progressionHandler.js";
import type * as events_handlers_statsHandler from "../events/handlers/statsHandler.js";
import type * as events_router from "../events/router.js";
import type * as events_types from "../events/types.js";
import type * as functions from "../functions.js";
import type * as gameplay_ai_aiDifficulty from "../gameplay/ai/aiDifficulty.js";
import type * as gameplay_ai_aiEngine from "../gameplay/ai/aiEngine.js";
import type * as gameplay_ai_aiTurn from "../gameplay/ai/aiTurn.js";
import type * as gameplay_chainResolver from "../gameplay/chainResolver.js";
import type * as gameplay_combatSystem from "../gameplay/combatSystem.js";
import type * as gameplay_effectSystem_continuousEffects from "../gameplay/effectSystem/continuousEffects.js";
import type * as gameplay_effectSystem_costPayment from "../gameplay/effectSystem/costPayment.js";
import type * as gameplay_effectSystem_costValidator from "../gameplay/effectSystem/costValidator.js";
import type * as gameplay_effectSystem_effectLibrary from "../gameplay/effectSystem/effectLibrary.js";
import type * as gameplay_effectSystem_exampleCards from "../gameplay/effectSystem/exampleCards.js";
import type * as gameplay_effectSystem_executor from "../gameplay/effectSystem/executor.js";
import type * as gameplay_effectSystem_executors_cardMovement_banish from "../gameplay/effectSystem/executors/cardMovement/banish.js";
import type * as gameplay_effectSystem_executors_cardMovement_discard from "../gameplay/effectSystem/executors/cardMovement/discard.js";
import type * as gameplay_effectSystem_executors_cardMovement_draw from "../gameplay/effectSystem/executors/cardMovement/draw.js";
import type * as gameplay_effectSystem_executors_cardMovement_mill from "../gameplay/effectSystem/executors/cardMovement/mill.js";
import type * as gameplay_effectSystem_executors_cardMovement_returnToDeck from "../gameplay/effectSystem/executors/cardMovement/returnToDeck.js";
import type * as gameplay_effectSystem_executors_cardMovement_search from "../gameplay/effectSystem/executors/cardMovement/search.js";
import type * as gameplay_effectSystem_executors_cardMovement_toGraveyard from "../gameplay/effectSystem/executors/cardMovement/toGraveyard.js";
import type * as gameplay_effectSystem_executors_cardMovement_toHand from "../gameplay/effectSystem/executors/cardMovement/toHand.js";
import type * as gameplay_effectSystem_executors_combat_damage from "../gameplay/effectSystem/executors/combat/damage.js";
import type * as gameplay_effectSystem_executors_combat_gainLP from "../gameplay/effectSystem/executors/combat/gainLP.js";
import type * as gameplay_effectSystem_executors_combat_modifyATK from "../gameplay/effectSystem/executors/combat/modifyATK.js";
import type * as gameplay_effectSystem_executors_combat_modifyDEF from "../gameplay/effectSystem/executors/combat/modifyDEF.js";
import type * as gameplay_effectSystem_executors_control_negateActivation from "../gameplay/effectSystem/executors/control/negateActivation.js";
import type * as gameplay_effectSystem_executors_index from "../gameplay/effectSystem/executors/index.js";
import type * as gameplay_effectSystem_executors_summon_destroy from "../gameplay/effectSystem/executors/summon/destroy.js";
import type * as gameplay_effectSystem_executors_summon_generateToken from "../gameplay/effectSystem/executors/summon/generateToken.js";
import type * as gameplay_effectSystem_executors_summon_summon from "../gameplay/effectSystem/executors/summon/summon.js";
import type * as gameplay_effectSystem_executors_utility_negate from "../gameplay/effectSystem/executors/utility/negate.js";
import type * as gameplay_effectSystem_index from "../gameplay/effectSystem/index.js";
import type * as gameplay_effectSystem_jsonEffectSchema from "../gameplay/effectSystem/jsonEffectSchema.js";
import type * as gameplay_effectSystem_jsonEffectValidators from "../gameplay/effectSystem/jsonEffectValidators.js";
import type * as gameplay_effectSystem_jsonParser from "../gameplay/effectSystem/jsonParser.js";
import type * as gameplay_effectSystem_lingeringEffects from "../gameplay/effectSystem/lingeringEffects.js";
import type * as gameplay_effectSystem_optTracker from "../gameplay/effectSystem/optTracker.js";
import type * as gameplay_effectSystem_parser from "../gameplay/effectSystem/parser.js";
import type * as gameplay_effectSystem_selectionHandler from "../gameplay/effectSystem/selectionHandler.js";
import type * as gameplay_effectSystem_types from "../gameplay/effectSystem/types.js";
import type * as gameplay_gameEngine_index from "../gameplay/gameEngine/index.js";
import type * as gameplay_gameEngine_monsterEffects from "../gameplay/gameEngine/monsterEffects.js";
import type * as gameplay_gameEngine_phases from "../gameplay/gameEngine/phases.js";
import type * as gameplay_gameEngine_positions from "../gameplay/gameEngine/positions.js";
import type * as gameplay_gameEngine_selectionEffects from "../gameplay/gameEngine/selectionEffects.js";
import type * as gameplay_gameEngine_spellsTraps from "../gameplay/gameEngine/spellsTraps.js";
import type * as gameplay_gameEngine_stateBasedActions from "../gameplay/gameEngine/stateBasedActions.js";
import type * as gameplay_gameEngine_summons from "../gameplay/gameEngine/summons.js";
import type * as gameplay_gameEngine_turns from "../gameplay/gameEngine/turns.js";
import type * as gameplay_gameEngine_viceSystem from "../gameplay/gameEngine/viceSystem.js";
import type * as gameplay_gameEvents from "../gameplay/gameEvents.js";
import type * as gameplay_games_cleanup from "../gameplay/games/cleanup.js";
import type * as gameplay_games_gameEndHandlers from "../gameplay/games/gameEndHandlers.js";
import type * as gameplay_games_heartbeat from "../gameplay/games/heartbeat.js";
import type * as gameplay_games_index from "../gameplay/games/index.js";
import type * as gameplay_games_lifecycle from "../gameplay/games/lifecycle.js";
import type * as gameplay_games_lobby from "../gameplay/games/lobby.js";
import type * as gameplay_games_queries from "../gameplay/games/queries.js";
import type * as gameplay_games_spectator from "../gameplay/games/spectator.js";
import type * as gameplay_games_stats from "../gameplay/games/stats.js";
import type * as gameplay_legalMoves from "../gameplay/legalMoves.js";
import type * as gameplay_phaseManager from "../gameplay/phaseManager.js";
import type * as gameplay_replaySystem from "../gameplay/replaySystem.js";
import type * as gameplay_responseWindow from "../gameplay/responseWindow.js";
import type * as gameplay_summonValidator from "../gameplay/summonValidator.js";
import type * as gameplay_timeoutSystem from "../gameplay/timeoutSystem.js";
import type * as gameplay_triggerSystem from "../gameplay/triggerSystem.js";
import type * as gameplay_webhooks from "../gameplay/webhooks.js";
import type * as http from "../http.js";
import type * as http_agents from "../http/agents.js";
import type * as http_chat from "../http/chat.js";
import type * as http_decisions from "../http/decisions.js";
import type * as http_decks from "../http/decks.js";
import type * as http_games from "../http/games.js";
import type * as http_lib_apiHelpers from "../http/lib/apiHelpers.js";
import type * as http_matchmaking from "../http/matchmaking.js";
import type * as http_middleware_auth from "../http/middleware/auth.js";
import type * as http_middleware_authX402 from "../http/middleware/authX402.js";
import type * as http_middleware_rateLimit from "../http/middleware/rateLimit.js";
import type * as http_middleware_rateLimitInternal from "../http/middleware/rateLimitInternal.js";
import type * as http_middleware_responses from "../http/middleware/responses.js";
import type * as http_middleware_x402 from "../http/middleware/x402.js";
import type * as http_shop from "../http/shop.js";
import type * as http_story from "../http/story.js";
import type * as http_types from "../http/types.js";
import type * as http_wellknown from "../http/wellknown.js";
import type * as infrastructure_actionCaches from "../infrastructure/actionCaches.js";
import type * as infrastructure_actionRetrier from "../infrastructure/actionRetrier.js";
import type * as infrastructure_crons from "../infrastructure/crons.js";
import type * as infrastructure_rateLimiters from "../infrastructure/rateLimiters.js";
import type * as infrastructure_shardedCounters from "../infrastructure/shardedCounters.js";
import type * as infrastructure_triggers from "../infrastructure/triggers.js";
import type * as lib_abilityHelpers from "../lib/abilityHelpers.js";
import type * as lib_cardPropertyHelpers from "../lib/cardPropertyHelpers.js";
import type * as lib_componentClients from "../lib/componentClients.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_convexAuth from "../lib/convexAuth.js";
import type * as lib_debug from "../lib/debug.js";
import type * as lib_deterministicRandom from "../lib/deterministicRandom.js";
import type * as lib_errorCodes from "../lib/errorCodes.js";
import type * as lib_gameHelpers from "../lib/gameHelpers.js";
import type * as lib_gameValidation from "../lib/gameValidation.js";
import type * as lib_helpers from "../lib/helpers.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_spellSpeedHelper from "../lib/spellSpeedHelper.js";
import type * as lib_validation from "../lib/validation.js";
import type * as lib_wagerTiers from "../lib/wagerTiers.js";
import type * as lib_x402_config from "../lib/x402/config.js";
import type * as lib_x402_constants from "../lib/x402/constants.js";
import type * as lib_x402_facilitator from "../lib/x402/facilitator.js";
import type * as lib_x402_queries from "../lib/x402/queries.js";
import type * as lib_x402_types from "../lib/x402/types.js";
import type * as lib_xpHelpers from "../lib/xpHelpers.js";
import type * as livekit_http_webhook from "../livekit/http/webhook.js";
import type * as livekit_internal_dedupe from "../livekit/internal/dedupe.js";
import type * as livekit_internal_mutations from "../livekit/internal/mutations.js";
import type * as livekit_public_queries from "../livekit/public/queries.js";
import type * as livekit_public_tokens from "../livekit/public/tokens.js";
import type * as presence from "../presence.js";
import type * as router from "../router.js";
import type * as setup from "../setup.js";
import type * as setupSystem from "../setupSystem.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "auth/auth": typeof auth_auth;
  "auth/syncUser": typeof auth_syncUser;
  chainResolver: typeof chainResolver;
  crons: typeof crons;
  "economy/economy": typeof economy_economy;
  "events/emitter": typeof events_emitter;
  "events/handlers/economyHandler": typeof events_handlers_economyHandler;
  "events/handlers/progressionHandler": typeof events_handlers_progressionHandler;
  "events/handlers/statsHandler": typeof events_handlers_statsHandler;
  "events/router": typeof events_router;
  "events/types": typeof events_types;
  functions: typeof functions;
  "gameplay/ai/aiDifficulty": typeof gameplay_ai_aiDifficulty;
  "gameplay/ai/aiEngine": typeof gameplay_ai_aiEngine;
  "gameplay/ai/aiTurn": typeof gameplay_ai_aiTurn;
  "gameplay/chainResolver": typeof gameplay_chainResolver;
  "gameplay/combatSystem": typeof gameplay_combatSystem;
  "gameplay/effectSystem/continuousEffects": typeof gameplay_effectSystem_continuousEffects;
  "gameplay/effectSystem/costPayment": typeof gameplay_effectSystem_costPayment;
  "gameplay/effectSystem/costValidator": typeof gameplay_effectSystem_costValidator;
  "gameplay/effectSystem/effectLibrary": typeof gameplay_effectSystem_effectLibrary;
  "gameplay/effectSystem/exampleCards": typeof gameplay_effectSystem_exampleCards;
  "gameplay/effectSystem/executor": typeof gameplay_effectSystem_executor;
  "gameplay/effectSystem/executors/cardMovement/banish": typeof gameplay_effectSystem_executors_cardMovement_banish;
  "gameplay/effectSystem/executors/cardMovement/discard": typeof gameplay_effectSystem_executors_cardMovement_discard;
  "gameplay/effectSystem/executors/cardMovement/draw": typeof gameplay_effectSystem_executors_cardMovement_draw;
  "gameplay/effectSystem/executors/cardMovement/mill": typeof gameplay_effectSystem_executors_cardMovement_mill;
  "gameplay/effectSystem/executors/cardMovement/returnToDeck": typeof gameplay_effectSystem_executors_cardMovement_returnToDeck;
  "gameplay/effectSystem/executors/cardMovement/search": typeof gameplay_effectSystem_executors_cardMovement_search;
  "gameplay/effectSystem/executors/cardMovement/toGraveyard": typeof gameplay_effectSystem_executors_cardMovement_toGraveyard;
  "gameplay/effectSystem/executors/cardMovement/toHand": typeof gameplay_effectSystem_executors_cardMovement_toHand;
  "gameplay/effectSystem/executors/combat/damage": typeof gameplay_effectSystem_executors_combat_damage;
  "gameplay/effectSystem/executors/combat/gainLP": typeof gameplay_effectSystem_executors_combat_gainLP;
  "gameplay/effectSystem/executors/combat/modifyATK": typeof gameplay_effectSystem_executors_combat_modifyATK;
  "gameplay/effectSystem/executors/combat/modifyDEF": typeof gameplay_effectSystem_executors_combat_modifyDEF;
  "gameplay/effectSystem/executors/control/negateActivation": typeof gameplay_effectSystem_executors_control_negateActivation;
  "gameplay/effectSystem/executors/index": typeof gameplay_effectSystem_executors_index;
  "gameplay/effectSystem/executors/summon/destroy": typeof gameplay_effectSystem_executors_summon_destroy;
  "gameplay/effectSystem/executors/summon/generateToken": typeof gameplay_effectSystem_executors_summon_generateToken;
  "gameplay/effectSystem/executors/summon/summon": typeof gameplay_effectSystem_executors_summon_summon;
  "gameplay/effectSystem/executors/utility/negate": typeof gameplay_effectSystem_executors_utility_negate;
  "gameplay/effectSystem/index": typeof gameplay_effectSystem_index;
  "gameplay/effectSystem/jsonEffectSchema": typeof gameplay_effectSystem_jsonEffectSchema;
  "gameplay/effectSystem/jsonEffectValidators": typeof gameplay_effectSystem_jsonEffectValidators;
  "gameplay/effectSystem/jsonParser": typeof gameplay_effectSystem_jsonParser;
  "gameplay/effectSystem/lingeringEffects": typeof gameplay_effectSystem_lingeringEffects;
  "gameplay/effectSystem/optTracker": typeof gameplay_effectSystem_optTracker;
  "gameplay/effectSystem/parser": typeof gameplay_effectSystem_parser;
  "gameplay/effectSystem/selectionHandler": typeof gameplay_effectSystem_selectionHandler;
  "gameplay/effectSystem/types": typeof gameplay_effectSystem_types;
  "gameplay/gameEngine/index": typeof gameplay_gameEngine_index;
  "gameplay/gameEngine/monsterEffects": typeof gameplay_gameEngine_monsterEffects;
  "gameplay/gameEngine/phases": typeof gameplay_gameEngine_phases;
  "gameplay/gameEngine/positions": typeof gameplay_gameEngine_positions;
  "gameplay/gameEngine/selectionEffects": typeof gameplay_gameEngine_selectionEffects;
  "gameplay/gameEngine/spellsTraps": typeof gameplay_gameEngine_spellsTraps;
  "gameplay/gameEngine/stateBasedActions": typeof gameplay_gameEngine_stateBasedActions;
  "gameplay/gameEngine/summons": typeof gameplay_gameEngine_summons;
  "gameplay/gameEngine/turns": typeof gameplay_gameEngine_turns;
  "gameplay/gameEngine/viceSystem": typeof gameplay_gameEngine_viceSystem;
  "gameplay/gameEvents": typeof gameplay_gameEvents;
  "gameplay/games/cleanup": typeof gameplay_games_cleanup;
  "gameplay/games/gameEndHandlers": typeof gameplay_games_gameEndHandlers;
  "gameplay/games/heartbeat": typeof gameplay_games_heartbeat;
  "gameplay/games/index": typeof gameplay_games_index;
  "gameplay/games/lifecycle": typeof gameplay_games_lifecycle;
  "gameplay/games/lobby": typeof gameplay_games_lobby;
  "gameplay/games/queries": typeof gameplay_games_queries;
  "gameplay/games/spectator": typeof gameplay_games_spectator;
  "gameplay/games/stats": typeof gameplay_games_stats;
  "gameplay/legalMoves": typeof gameplay_legalMoves;
  "gameplay/phaseManager": typeof gameplay_phaseManager;
  "gameplay/replaySystem": typeof gameplay_replaySystem;
  "gameplay/responseWindow": typeof gameplay_responseWindow;
  "gameplay/summonValidator": typeof gameplay_summonValidator;
  "gameplay/timeoutSystem": typeof gameplay_timeoutSystem;
  "gameplay/triggerSystem": typeof gameplay_triggerSystem;
  "gameplay/webhooks": typeof gameplay_webhooks;
  http: typeof http;
  "http/agents": typeof http_agents;
  "http/chat": typeof http_chat;
  "http/decisions": typeof http_decisions;
  "http/decks": typeof http_decks;
  "http/games": typeof http_games;
  "http/lib/apiHelpers": typeof http_lib_apiHelpers;
  "http/matchmaking": typeof http_matchmaking;
  "http/middleware/auth": typeof http_middleware_auth;
  "http/middleware/authX402": typeof http_middleware_authX402;
  "http/middleware/rateLimit": typeof http_middleware_rateLimit;
  "http/middleware/rateLimitInternal": typeof http_middleware_rateLimitInternal;
  "http/middleware/responses": typeof http_middleware_responses;
  "http/middleware/x402": typeof http_middleware_x402;
  "http/shop": typeof http_shop;
  "http/story": typeof http_story;
  "http/types": typeof http_types;
  "http/wellknown": typeof http_wellknown;
  "infrastructure/actionCaches": typeof infrastructure_actionCaches;
  "infrastructure/actionRetrier": typeof infrastructure_actionRetrier;
  "infrastructure/crons": typeof infrastructure_crons;
  "infrastructure/rateLimiters": typeof infrastructure_rateLimiters;
  "infrastructure/shardedCounters": typeof infrastructure_shardedCounters;
  "infrastructure/triggers": typeof infrastructure_triggers;
  "lib/abilityHelpers": typeof lib_abilityHelpers;
  "lib/cardPropertyHelpers": typeof lib_cardPropertyHelpers;
  "lib/componentClients": typeof lib_componentClients;
  "lib/constants": typeof lib_constants;
  "lib/convexAuth": typeof lib_convexAuth;
  "lib/debug": typeof lib_debug;
  "lib/deterministicRandom": typeof lib_deterministicRandom;
  "lib/errorCodes": typeof lib_errorCodes;
  "lib/gameHelpers": typeof lib_gameHelpers;
  "lib/gameValidation": typeof lib_gameValidation;
  "lib/helpers": typeof lib_helpers;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/spellSpeedHelper": typeof lib_spellSpeedHelper;
  "lib/validation": typeof lib_validation;
  "lib/wagerTiers": typeof lib_wagerTiers;
  "lib/x402/config": typeof lib_x402_config;
  "lib/x402/constants": typeof lib_x402_constants;
  "lib/x402/facilitator": typeof lib_x402_facilitator;
  "lib/x402/queries": typeof lib_x402_queries;
  "lib/x402/types": typeof lib_x402_types;
  "lib/xpHelpers": typeof lib_xpHelpers;
  "livekit/http/webhook": typeof livekit_http_webhook;
  "livekit/internal/dedupe": typeof livekit_internal_dedupe;
  "livekit/internal/mutations": typeof livekit_internal_mutations;
  "livekit/public/queries": typeof livekit_public_queries;
  "livekit/public/tokens": typeof livekit_public_tokens;
  presence: typeof presence;
  router: typeof router;
  setup: typeof setup;
  setupSystem: typeof setupSystem;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  actionCache: {
    crons: {
      purge: FunctionReference<
        "mutation",
        "internal",
        { expiresAt?: number },
        null
      >;
    };
    lib: {
      get: FunctionReference<
        "query",
        "internal",
        { args: any; name: string; ttl: number | null },
        { kind: "hit"; value: any } | { expiredEntry?: string; kind: "miss" }
      >;
      put: FunctionReference<
        "mutation",
        "internal",
        {
          args: any;
          expiredEntry?: string;
          name: string;
          ttl: number | null;
          value: any;
        },
        { cacheHit: boolean; deletedExpiredEntry: boolean }
      >;
      remove: FunctionReference<
        "mutation",
        "internal",
        { args: any; name: string },
        null
      >;
      removeAll: FunctionReference<
        "mutation",
        "internal",
        { batchSize?: number; before?: number; name?: string },
        null
      >;
    };
  };
  actionRetrier: {
    public: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { runId: string },
        boolean
      >;
      cleanup: FunctionReference<
        "mutation",
        "internal",
        { runId: string },
        any
      >;
      start: FunctionReference<
        "mutation",
        "internal",
        {
          functionArgs: any;
          functionHandle: string;
          options: {
            base: number;
            initialBackoffMs: number;
            logLevel: "DEBUG" | "INFO" | "WARN" | "ERROR";
            maxFailures: number;
            onComplete?: string;
            runAfter?: number;
            runAt?: number;
          };
        },
        string
      >;
      status: FunctionReference<
        "query",
        "internal",
        { runId: string },
        | { type: "inProgress" }
        | {
            result:
              | { returnValue: any; type: "success" }
              | { error: string; type: "failed" }
              | { type: "canceled" };
            type: "completed";
          }
      >;
    };
  };
  ratelimiter: {
    public: {
      checkRateLimit: FunctionReference<
        "query",
        "internal",
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          count?: number;
          key?: string;
          name: string;
          reserve?: boolean;
          throws?: boolean;
        },
        { ok: true; retryAfter?: number } | { ok: false; retryAfter: number }
      >;
      rateLimit: FunctionReference<
        "mutation",
        "internal",
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          count?: number;
          key?: string;
          name: string;
          reserve?: boolean;
          throws?: boolean;
        },
        { ok: true; retryAfter?: number } | { ok: false; retryAfter: number }
      >;
      resetRateLimit: FunctionReference<
        "mutation",
        "internal",
        { key?: string; name: string },
        null
      >;
    };
  };
  aggregate: {
    btree: {
      aggregateBetween: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any },
        { count: number; sum: number }
      >;
      aggregateBetweenBatch: FunctionReference<
        "query",
        "internal",
        { queries: Array<{ k1?: any; k2?: any; namespace?: any }> },
        Array<{ count: number; sum: number }>
      >;
      atNegativeOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      atOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      atOffsetBatch: FunctionReference<
        "query",
        "internal",
        {
          queries: Array<{
            k1?: any;
            k2?: any;
            namespace?: any;
            offset: number;
          }>;
        },
        Array<{ k: any; s: number; v: any }>
      >;
      get: FunctionReference<
        "query",
        "internal",
        { key: any; namespace?: any },
        null | { k: any; s: number; v: any }
      >;
      offset: FunctionReference<
        "query",
        "internal",
        { k1?: any; key: any; namespace?: any },
        number
      >;
      offsetUntil: FunctionReference<
        "query",
        "internal",
        { k2?: any; key: any; namespace?: any },
        number
      >;
      paginate: FunctionReference<
        "query",
        "internal",
        {
          cursor?: string;
          k1?: any;
          k2?: any;
          limit: number;
          namespace?: any;
          order: "asc" | "desc";
        },
        {
          cursor: string;
          isDone: boolean;
          page: Array<{ k: any; s: number; v: any }>;
        }
      >;
      paginateNamespaces: FunctionReference<
        "query",
        "internal",
        { cursor?: string; limit: number },
        { cursor: string; isDone: boolean; page: Array<any> }
      >;
      validate: FunctionReference<
        "query",
        "internal",
        { namespace?: any },
        any
      >;
    };
    inspect: {
      display: FunctionReference<"query", "internal", { namespace?: any }, any>;
      dump: FunctionReference<"query", "internal", { namespace?: any }, string>;
      inspectNode: FunctionReference<
        "query",
        "internal",
        { namespace?: any; node?: string },
        null
      >;
      listTreeNodes: FunctionReference<
        "query",
        "internal",
        { take?: number },
        Array<{
          _creationTime: number;
          _id: string;
          aggregate?: { count: number; sum: number };
          items: Array<{ k: any; s: number; v: any }>;
          subtrees: Array<string>;
        }>
      >;
      listTrees: FunctionReference<
        "query",
        "internal",
        { take?: number },
        Array<{
          _creationTime: number;
          _id: string;
          maxNodeSize: number;
          namespace?: any;
          root: string;
        }>
      >;
    };
    public: {
      clear: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      delete_: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        null
      >;
      deleteIfExists: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        any
      >;
      init: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      insert: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any; summand?: number; value: any },
        null
      >;
      makeRootLazy: FunctionReference<
        "mutation",
        "internal",
        { namespace?: any },
        null
      >;
      replace: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        null
      >;
      replaceOrInsert: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        any
      >;
    };
  };
  crons: {
    public: {
      del: FunctionReference<
        "mutation",
        "internal",
        { identifier: { id: string } | { name: string } },
        null
      >;
      get: FunctionReference<
        "query",
        "internal",
        { identifier: { id: string } | { name: string } },
        {
          args: Record<string, any>;
          functionHandle: string;
          id: string;
          name?: string;
          schedule:
            | { kind: "interval"; ms: number }
            | { cronspec: string; kind: "cron"; tz?: string };
        } | null
      >;
      list: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          args: Record<string, any>;
          functionHandle: string;
          id: string;
          name?: string;
          schedule:
            | { kind: "interval"; ms: number }
            | { cronspec: string; kind: "cron"; tz?: string };
        }>
      >;
      register: FunctionReference<
        "mutation",
        "internal",
        {
          args: Record<string, any>;
          functionHandle: string;
          name?: string;
          schedule:
            | { kind: "interval"; ms: number }
            | { cronspec: string; kind: "cron"; tz?: string };
        },
        string
      >;
    };
  };
  migrations: {
    lib: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { name: string },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
      cancelAll: FunctionReference<
        "mutation",
        "internal",
        { sinceTs?: number },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      clearAll: FunctionReference<
        "mutation",
        "internal",
        { before?: number },
        null
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { limit?: number; names?: Array<string> },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      migrate: FunctionReference<
        "mutation",
        "internal",
        {
          batchSize?: number;
          cursor?: string | null;
          dryRun: boolean;
          fnHandle: string;
          name: string;
          next?: Array<{ fnHandle: string; name: string }>;
          oneBatchOnly?: boolean;
        },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
    };
  };
  shardedCounter: {
    public: {
      add: FunctionReference<
        "mutation",
        "internal",
        { count: number; name: string; shard?: number; shards?: number },
        number
      >;
      count: FunctionReference<"query", "internal", { name: string }, number>;
      estimateCount: FunctionReference<
        "query",
        "internal",
        { name: string; readFromShards?: number; shards?: number },
        any
      >;
      rebalance: FunctionReference<
        "mutation",
        "internal",
        { name: string; shards?: number },
        any
      >;
      reset: FunctionReference<"mutation", "internal", { name: string }, any>;
    };
  };
  agent: {
    apiKeys: {
      destroy: FunctionReference<
        "mutation",
        "internal",
        { apiKey?: string; name?: string },
        | "missing"
        | "deleted"
        | "name mismatch"
        | "must provide either apiKey or name"
      >;
      issue: FunctionReference<
        "mutation",
        "internal",
        { name?: string },
        string
      >;
      validate: FunctionReference<
        "query",
        "internal",
        { apiKey: string },
        boolean
      >;
    };
    files: {
      addFile: FunctionReference<
        "mutation",
        "internal",
        {
          filename?: string;
          hash: string;
          mimeType: string;
          storageId: string;
        },
        { fileId: string; storageId: string }
      >;
      copyFile: FunctionReference<
        "mutation",
        "internal",
        { fileId: string },
        null
      >;
      deleteFiles: FunctionReference<
        "mutation",
        "internal",
        { fileIds: Array<string>; force?: boolean },
        Array<string>
      >;
      get: FunctionReference<
        "query",
        "internal",
        { fileId: string },
        null | {
          _creationTime: number;
          _id: string;
          filename?: string;
          hash: string;
          lastTouchedAt: number;
          mimeType: string;
          refcount: number;
          storageId: string;
        }
      >;
      getFilesToDelete: FunctionReference<
        "query",
        "internal",
        {
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            _creationTime: number;
            _id: string;
            filename?: string;
            hash: string;
            lastTouchedAt: number;
            mimeType: string;
            refcount: number;
            storageId: string;
          }>;
        }
      >;
      useExistingFile: FunctionReference<
        "mutation",
        "internal",
        { filename?: string; hash: string },
        null | { fileId: string; storageId: string }
      >;
    };
    messages: {
      addMessages: FunctionReference<
        "mutation",
        "internal",
        {
          agentName?: string;
          embeddings?: {
            dimension:
              | 128
              | 256
              | 512
              | 768
              | 1024
              | 1408
              | 1536
              | 2048
              | 3072
              | 4096;
            model: string;
            vectors: Array<Array<number> | null>;
          };
          failPendingSteps?: boolean;
          hideFromUserIdSearch?: boolean;
          messages: Array<{
            error?: string;
            fileIds?: Array<string>;
            finishReason?:
              | "stop"
              | "length"
              | "content-filter"
              | "tool-calls"
              | "error"
              | "other"
              | "unknown";
            message:
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            image: string | ArrayBuffer;
                            mimeType?: string;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "image";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mimeType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "user";
                }
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mimeType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            signature?: string;
                            text: string;
                            type: "reasoning";
                          }
                        | {
                            data: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "redacted-reasoning";
                          }
                        | {
                            args: any;
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-call";
                          }
                        | {
                            args?: any;
                            experimental_content?: Array<
                              | { text: string; type: "text" }
                              | {
                                  data: string;
                                  mimeType?: string;
                                  type: "image";
                                }
                            >;
                            isError?: boolean;
                            output?:
                              | { type: "text"; value: string }
                              | { type: "json"; value: any }
                              | { type: "error-text"; value: string }
                              | { type: "error-json"; value: any }
                              | {
                                  type: "content";
                                  value: Array<
                                    | { text: string; type: "text" }
                                    | {
                                        data: string;
                                        mediaType: string;
                                        type: "media";
                                      }
                                  >;
                                };
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            result?: any;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-result";
                          }
                        | {
                            id: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "url";
                            title?: string;
                            type: "source";
                            url: string;
                          }
                        | {
                            filename?: string;
                            id: string;
                            mediaType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "document";
                            title: string;
                            type: "source";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "assistant";
                }
              | {
                  content: Array<{
                    args?: any;
                    experimental_content?: Array<
                      | { text: string; type: "text" }
                      | { data: string; mimeType?: string; type: "image" }
                    >;
                    isError?: boolean;
                    output?:
                      | { type: "text"; value: string }
                      | { type: "json"; value: any }
                      | { type: "error-text"; value: string }
                      | { type: "error-json"; value: any }
                      | {
                          type: "content";
                          value: Array<
                            | { text: string; type: "text" }
                            | { data: string; mediaType: string; type: "media" }
                          >;
                        };
                    providerExecuted?: boolean;
                    providerMetadata?: Record<string, Record<string, any>>;
                    providerOptions?: Record<string, Record<string, any>>;
                    result?: any;
                    toolCallId: string;
                    toolName: string;
                    type: "tool-result";
                  }>;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "tool";
                }
              | {
                  content: string;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "system";
                };
            model?: string;
            provider?: string;
            providerMetadata?: Record<string, Record<string, any>>;
            reasoning?: string;
            reasoningDetails?: Array<
              | {
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  signature?: string;
                  text: string;
                  type: "reasoning";
                }
              | { signature?: string; text: string; type: "text" }
              | { data: string; type: "redacted" }
            >;
            sources?: Array<
              | {
                  id: string;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "url";
                  title?: string;
                  type?: "source";
                  url: string;
                }
              | {
                  filename?: string;
                  id: string;
                  mediaType: string;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "document";
                  title: string;
                  type: "source";
                }
            >;
            status?: "pending" | "success" | "failed";
            text?: string;
            usage?: {
              cachedInputTokens?: number;
              completionTokens: number;
              promptTokens: number;
              reasoningTokens?: number;
              totalTokens: number;
            };
            warnings?: Array<
              | {
                  details?: string;
                  setting: string;
                  type: "unsupported-setting";
                }
              | { details?: string; tool: any; type: "unsupported-tool" }
              | { message: string; type: "other" }
            >;
          }>;
          pendingMessageId?: string;
          promptMessageId?: string;
          threadId: string;
          userId?: string;
        },
        {
          messages: Array<{
            _creationTime: number;
            _id: string;
            agentName?: string;
            embeddingId?: string;
            error?: string;
            fileIds?: Array<string>;
            finishReason?:
              | "stop"
              | "length"
              | "content-filter"
              | "tool-calls"
              | "error"
              | "other"
              | "unknown";
            id?: string;
            message?:
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            image: string | ArrayBuffer;
                            mimeType?: string;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "image";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mimeType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "user";
                }
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mimeType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            signature?: string;
                            text: string;
                            type: "reasoning";
                          }
                        | {
                            data: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "redacted-reasoning";
                          }
                        | {
                            args: any;
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-call";
                          }
                        | {
                            args?: any;
                            experimental_content?: Array<
                              | { text: string; type: "text" }
                              | {
                                  data: string;
                                  mimeType?: string;
                                  type: "image";
                                }
                            >;
                            isError?: boolean;
                            output?:
                              | { type: "text"; value: string }
                              | { type: "json"; value: any }
                              | { type: "error-text"; value: string }
                              | { type: "error-json"; value: any }
                              | {
                                  type: "content";
                                  value: Array<
                                    | { text: string; type: "text" }
                                    | {
                                        data: string;
                                        mediaType: string;
                                        type: "media";
                                      }
                                  >;
                                };
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            result?: any;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-result";
                          }
                        | {
                            id: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "url";
                            title?: string;
                            type: "source";
                            url: string;
                          }
                        | {
                            filename?: string;
                            id: string;
                            mediaType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "document";
                            title: string;
                            type: "source";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "assistant";
                }
              | {
                  content: Array<{
                    args?: any;
                    experimental_content?: Array<
                      | { text: string; type: "text" }
                      | { data: string; mimeType?: string; type: "image" }
                    >;
                    isError?: boolean;
                    output?:
                      | { type: "text"; value: string }
                      | { type: "json"; value: any }
                      | { type: "error-text"; value: string }
                      | { type: "error-json"; value: any }
                      | {
                          type: "content";
                          value: Array<
                            | { text: string; type: "text" }
                            | { data: string; mediaType: string; type: "media" }
                          >;
                        };
                    providerExecuted?: boolean;
                    providerMetadata?: Record<string, Record<string, any>>;
                    providerOptions?: Record<string, Record<string, any>>;
                    result?: any;
                    toolCallId: string;
                    toolName: string;
                    type: "tool-result";
                  }>;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "tool";
                }
              | {
                  content: string;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "system";
                };
            model?: string;
            order: number;
            provider?: string;
            providerMetadata?: Record<string, Record<string, any>>;
            providerOptions?: Record<string, Record<string, any>>;
            reasoning?: string;
            reasoningDetails?: Array<
              | {
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  signature?: string;
                  text: string;
                  type: "reasoning";
                }
              | { signature?: string; text: string; type: "text" }
              | { data: string; type: "redacted" }
            >;
            sources?: Array<
              | {
                  id: string;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "url";
                  title?: string;
                  type?: "source";
                  url: string;
                }
              | {
                  filename?: string;
                  id: string;
                  mediaType: string;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "document";
                  title: string;
                  type: "source";
                }
            >;
            status: "pending" | "success" | "failed";
            stepOrder: number;
            text?: string;
            threadId: string;
            tool: boolean;
            usage?: {
              cachedInputTokens?: number;
              completionTokens: number;
              promptTokens: number;
              reasoningTokens?: number;
              totalTokens: number;
            };
            userId?: string;
            warnings?: Array<
              | {
                  details?: string;
                  setting: string;
                  type: "unsupported-setting";
                }
              | { details?: string; tool: any; type: "unsupported-tool" }
              | { message: string; type: "other" }
            >;
          }>;
        }
      >;
      cloneThread: FunctionReference<
        "action",
        "internal",
        {
          batchSize?: number;
          copyUserIdForVectorSearch?: boolean;
          excludeToolMessages?: boolean;
          insertAtOrder?: number;
          limit?: number;
          sourceThreadId: string;
          statuses?: Array<"pending" | "success" | "failed">;
          targetThreadId: string;
          upToAndIncludingMessageId?: string;
        },
        number
      >;
      deleteByIds: FunctionReference<
        "mutation",
        "internal",
        { messageIds: Array<string> },
        Array<string>
      >;
      deleteByOrder: FunctionReference<
        "mutation",
        "internal",
        {
          endOrder: number;
          endStepOrder?: number;
          startOrder: number;
          startStepOrder?: number;
          threadId: string;
        },
        { isDone: boolean; lastOrder?: number; lastStepOrder?: number }
      >;
      finalizeMessage: FunctionReference<
        "mutation",
        "internal",
        {
          messageId: string;
          result: { status: "success" } | { error: string; status: "failed" };
        },
        null
      >;
      getMessagesByIds: FunctionReference<
        "query",
        "internal",
        { messageIds: Array<string> },
        Array<null | {
          _creationTime: number;
          _id: string;
          agentName?: string;
          embeddingId?: string;
          error?: string;
          fileIds?: Array<string>;
          finishReason?:
            | "stop"
            | "length"
            | "content-filter"
            | "tool-calls"
            | "error"
            | "other"
            | "unknown";
          id?: string;
          message?:
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          image: string | ArrayBuffer;
                          mimeType?: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "image";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mimeType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "user";
              }
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mimeType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          signature?: string;
                          text: string;
                          type: "reasoning";
                        }
                      | {
                          data: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "redacted-reasoning";
                        }
                      | {
                          args: any;
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                      | {
                          args?: any;
                          experimental_content?: Array<
                            | { text: string; type: "text" }
                            | { data: string; mimeType?: string; type: "image" }
                          >;
                          isError?: boolean;
                          output?:
                            | { type: "text"; value: string }
                            | { type: "json"; value: any }
                            | { type: "error-text"; value: string }
                            | { type: "error-json"; value: any }
                            | {
                                type: "content";
                                value: Array<
                                  | { text: string; type: "text" }
                                  | {
                                      data: string;
                                      mediaType: string;
                                      type: "media";
                                    }
                                >;
                              };
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          result?: any;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-result";
                        }
                      | {
                          id: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "url";
                          title?: string;
                          type: "source";
                          url: string;
                        }
                      | {
                          filename?: string;
                          id: string;
                          mediaType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "document";
                          title: string;
                          type: "source";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "assistant";
              }
            | {
                content: Array<{
                  args?: any;
                  experimental_content?: Array<
                    | { text: string; type: "text" }
                    | { data: string; mimeType?: string; type: "image" }
                  >;
                  isError?: boolean;
                  output?:
                    | { type: "text"; value: string }
                    | { type: "json"; value: any }
                    | { type: "error-text"; value: string }
                    | { type: "error-json"; value: any }
                    | {
                        type: "content";
                        value: Array<
                          | { text: string; type: "text" }
                          | { data: string; mediaType: string; type: "media" }
                        >;
                      };
                  providerExecuted?: boolean;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  result?: any;
                  toolCallId: string;
                  toolName: string;
                  type: "tool-result";
                }>;
                providerOptions?: Record<string, Record<string, any>>;
                role: "tool";
              }
            | {
                content: string;
                providerOptions?: Record<string, Record<string, any>>;
                role: "system";
              };
          model?: string;
          order: number;
          provider?: string;
          providerMetadata?: Record<string, Record<string, any>>;
          providerOptions?: Record<string, Record<string, any>>;
          reasoning?: string;
          reasoningDetails?: Array<
            | {
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                signature?: string;
                text: string;
                type: "reasoning";
              }
            | { signature?: string; text: string; type: "text" }
            | { data: string; type: "redacted" }
          >;
          sources?: Array<
            | {
                id: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "url";
                title?: string;
                type?: "source";
                url: string;
              }
            | {
                filename?: string;
                id: string;
                mediaType: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "document";
                title: string;
                type: "source";
              }
          >;
          status: "pending" | "success" | "failed";
          stepOrder: number;
          text?: string;
          threadId: string;
          tool: boolean;
          usage?: {
            cachedInputTokens?: number;
            completionTokens: number;
            promptTokens: number;
            reasoningTokens?: number;
            totalTokens: number;
          };
          userId?: string;
          warnings?: Array<
            | { details?: string; setting: string; type: "unsupported-setting" }
            | { details?: string; tool: any; type: "unsupported-tool" }
            | { message: string; type: "other" }
          >;
        }>
      >;
      getMessageSearchFields: FunctionReference<
        "query",
        "internal",
        { messageId: string },
        { embedding?: Array<number>; embeddingModel?: string; text?: string }
      >;
      listMessagesByThreadId: FunctionReference<
        "query",
        "internal",
        {
          excludeToolMessages?: boolean;
          order: "asc" | "desc";
          paginationOpts?: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          statuses?: Array<"pending" | "success" | "failed">;
          threadId: string;
          upToAndIncludingMessageId?: string;
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            _creationTime: number;
            _id: string;
            agentName?: string;
            embeddingId?: string;
            error?: string;
            fileIds?: Array<string>;
            finishReason?:
              | "stop"
              | "length"
              | "content-filter"
              | "tool-calls"
              | "error"
              | "other"
              | "unknown";
            id?: string;
            message?:
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            image: string | ArrayBuffer;
                            mimeType?: string;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "image";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mimeType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "user";
                }
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mimeType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            signature?: string;
                            text: string;
                            type: "reasoning";
                          }
                        | {
                            data: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "redacted-reasoning";
                          }
                        | {
                            args: any;
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-call";
                          }
                        | {
                            args?: any;
                            experimental_content?: Array<
                              | { text: string; type: "text" }
                              | {
                                  data: string;
                                  mimeType?: string;
                                  type: "image";
                                }
                            >;
                            isError?: boolean;
                            output?:
                              | { type: "text"; value: string }
                              | { type: "json"; value: any }
                              | { type: "error-text"; value: string }
                              | { type: "error-json"; value: any }
                              | {
                                  type: "content";
                                  value: Array<
                                    | { text: string; type: "text" }
                                    | {
                                        data: string;
                                        mediaType: string;
                                        type: "media";
                                      }
                                  >;
                                };
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            result?: any;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-result";
                          }
                        | {
                            id: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "url";
                            title?: string;
                            type: "source";
                            url: string;
                          }
                        | {
                            filename?: string;
                            id: string;
                            mediaType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "document";
                            title: string;
                            type: "source";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "assistant";
                }
              | {
                  content: Array<{
                    args?: any;
                    experimental_content?: Array<
                      | { text: string; type: "text" }
                      | { data: string; mimeType?: string; type: "image" }
                    >;
                    isError?: boolean;
                    output?:
                      | { type: "text"; value: string }
                      | { type: "json"; value: any }
                      | { type: "error-text"; value: string }
                      | { type: "error-json"; value: any }
                      | {
                          type: "content";
                          value: Array<
                            | { text: string; type: "text" }
                            | { data: string; mediaType: string; type: "media" }
                          >;
                        };
                    providerExecuted?: boolean;
                    providerMetadata?: Record<string, Record<string, any>>;
                    providerOptions?: Record<string, Record<string, any>>;
                    result?: any;
                    toolCallId: string;
                    toolName: string;
                    type: "tool-result";
                  }>;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "tool";
                }
              | {
                  content: string;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "system";
                };
            model?: string;
            order: number;
            provider?: string;
            providerMetadata?: Record<string, Record<string, any>>;
            providerOptions?: Record<string, Record<string, any>>;
            reasoning?: string;
            reasoningDetails?: Array<
              | {
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  signature?: string;
                  text: string;
                  type: "reasoning";
                }
              | { signature?: string; text: string; type: "text" }
              | { data: string; type: "redacted" }
            >;
            sources?: Array<
              | {
                  id: string;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "url";
                  title?: string;
                  type?: "source";
                  url: string;
                }
              | {
                  filename?: string;
                  id: string;
                  mediaType: string;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "document";
                  title: string;
                  type: "source";
                }
            >;
            status: "pending" | "success" | "failed";
            stepOrder: number;
            text?: string;
            threadId: string;
            tool: boolean;
            usage?: {
              cachedInputTokens?: number;
              completionTokens: number;
              promptTokens: number;
              reasoningTokens?: number;
              totalTokens: number;
            };
            userId?: string;
            warnings?: Array<
              | {
                  details?: string;
                  setting: string;
                  type: "unsupported-setting";
                }
              | { details?: string; tool: any; type: "unsupported-tool" }
              | { message: string; type: "other" }
            >;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      searchMessages: FunctionReference<
        "action",
        "internal",
        {
          embedding?: Array<number>;
          embeddingModel?: string;
          limit: number;
          messageRange?: { after: number; before: number };
          searchAllMessagesForUserId?: string;
          targetMessageId?: string;
          text?: string;
          textSearch?: boolean;
          threadId?: string;
          vectorScoreThreshold?: number;
          vectorSearch?: boolean;
        },
        Array<{
          _creationTime: number;
          _id: string;
          agentName?: string;
          embeddingId?: string;
          error?: string;
          fileIds?: Array<string>;
          finishReason?:
            | "stop"
            | "length"
            | "content-filter"
            | "tool-calls"
            | "error"
            | "other"
            | "unknown";
          id?: string;
          message?:
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          image: string | ArrayBuffer;
                          mimeType?: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "image";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mimeType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "user";
              }
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mimeType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          signature?: string;
                          text: string;
                          type: "reasoning";
                        }
                      | {
                          data: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "redacted-reasoning";
                        }
                      | {
                          args: any;
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                      | {
                          args?: any;
                          experimental_content?: Array<
                            | { text: string; type: "text" }
                            | { data: string; mimeType?: string; type: "image" }
                          >;
                          isError?: boolean;
                          output?:
                            | { type: "text"; value: string }
                            | { type: "json"; value: any }
                            | { type: "error-text"; value: string }
                            | { type: "error-json"; value: any }
                            | {
                                type: "content";
                                value: Array<
                                  | { text: string; type: "text" }
                                  | {
                                      data: string;
                                      mediaType: string;
                                      type: "media";
                                    }
                                >;
                              };
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          result?: any;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-result";
                        }
                      | {
                          id: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "url";
                          title?: string;
                          type: "source";
                          url: string;
                        }
                      | {
                          filename?: string;
                          id: string;
                          mediaType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "document";
                          title: string;
                          type: "source";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "assistant";
              }
            | {
                content: Array<{
                  args?: any;
                  experimental_content?: Array<
                    | { text: string; type: "text" }
                    | { data: string; mimeType?: string; type: "image" }
                  >;
                  isError?: boolean;
                  output?:
                    | { type: "text"; value: string }
                    | { type: "json"; value: any }
                    | { type: "error-text"; value: string }
                    | { type: "error-json"; value: any }
                    | {
                        type: "content";
                        value: Array<
                          | { text: string; type: "text" }
                          | { data: string; mediaType: string; type: "media" }
                        >;
                      };
                  providerExecuted?: boolean;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  result?: any;
                  toolCallId: string;
                  toolName: string;
                  type: "tool-result";
                }>;
                providerOptions?: Record<string, Record<string, any>>;
                role: "tool";
              }
            | {
                content: string;
                providerOptions?: Record<string, Record<string, any>>;
                role: "system";
              };
          model?: string;
          order: number;
          provider?: string;
          providerMetadata?: Record<string, Record<string, any>>;
          providerOptions?: Record<string, Record<string, any>>;
          reasoning?: string;
          reasoningDetails?: Array<
            | {
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                signature?: string;
                text: string;
                type: "reasoning";
              }
            | { signature?: string; text: string; type: "text" }
            | { data: string; type: "redacted" }
          >;
          sources?: Array<
            | {
                id: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "url";
                title?: string;
                type?: "source";
                url: string;
              }
            | {
                filename?: string;
                id: string;
                mediaType: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "document";
                title: string;
                type: "source";
              }
          >;
          status: "pending" | "success" | "failed";
          stepOrder: number;
          text?: string;
          threadId: string;
          tool: boolean;
          usage?: {
            cachedInputTokens?: number;
            completionTokens: number;
            promptTokens: number;
            reasoningTokens?: number;
            totalTokens: number;
          };
          userId?: string;
          warnings?: Array<
            | { details?: string; setting: string; type: "unsupported-setting" }
            | { details?: string; tool: any; type: "unsupported-tool" }
            | { message: string; type: "other" }
          >;
        }>
      >;
      textSearch: FunctionReference<
        "query",
        "internal",
        {
          limit: number;
          searchAllMessagesForUserId?: string;
          targetMessageId?: string;
          text?: string;
          threadId?: string;
        },
        Array<{
          _creationTime: number;
          _id: string;
          agentName?: string;
          embeddingId?: string;
          error?: string;
          fileIds?: Array<string>;
          finishReason?:
            | "stop"
            | "length"
            | "content-filter"
            | "tool-calls"
            | "error"
            | "other"
            | "unknown";
          id?: string;
          message?:
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          image: string | ArrayBuffer;
                          mimeType?: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "image";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mimeType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "user";
              }
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mimeType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          signature?: string;
                          text: string;
                          type: "reasoning";
                        }
                      | {
                          data: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "redacted-reasoning";
                        }
                      | {
                          args: any;
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                      | {
                          args?: any;
                          experimental_content?: Array<
                            | { text: string; type: "text" }
                            | { data: string; mimeType?: string; type: "image" }
                          >;
                          isError?: boolean;
                          output?:
                            | { type: "text"; value: string }
                            | { type: "json"; value: any }
                            | { type: "error-text"; value: string }
                            | { type: "error-json"; value: any }
                            | {
                                type: "content";
                                value: Array<
                                  | { text: string; type: "text" }
                                  | {
                                      data: string;
                                      mediaType: string;
                                      type: "media";
                                    }
                                >;
                              };
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          result?: any;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-result";
                        }
                      | {
                          id: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "url";
                          title?: string;
                          type: "source";
                          url: string;
                        }
                      | {
                          filename?: string;
                          id: string;
                          mediaType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "document";
                          title: string;
                          type: "source";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "assistant";
              }
            | {
                content: Array<{
                  args?: any;
                  experimental_content?: Array<
                    | { text: string; type: "text" }
                    | { data: string; mimeType?: string; type: "image" }
                  >;
                  isError?: boolean;
                  output?:
                    | { type: "text"; value: string }
                    | { type: "json"; value: any }
                    | { type: "error-text"; value: string }
                    | { type: "error-json"; value: any }
                    | {
                        type: "content";
                        value: Array<
                          | { text: string; type: "text" }
                          | { data: string; mediaType: string; type: "media" }
                        >;
                      };
                  providerExecuted?: boolean;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  result?: any;
                  toolCallId: string;
                  toolName: string;
                  type: "tool-result";
                }>;
                providerOptions?: Record<string, Record<string, any>>;
                role: "tool";
              }
            | {
                content: string;
                providerOptions?: Record<string, Record<string, any>>;
                role: "system";
              };
          model?: string;
          order: number;
          provider?: string;
          providerMetadata?: Record<string, Record<string, any>>;
          providerOptions?: Record<string, Record<string, any>>;
          reasoning?: string;
          reasoningDetails?: Array<
            | {
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                signature?: string;
                text: string;
                type: "reasoning";
              }
            | { signature?: string; text: string; type: "text" }
            | { data: string; type: "redacted" }
          >;
          sources?: Array<
            | {
                id: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "url";
                title?: string;
                type?: "source";
                url: string;
              }
            | {
                filename?: string;
                id: string;
                mediaType: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "document";
                title: string;
                type: "source";
              }
          >;
          status: "pending" | "success" | "failed";
          stepOrder: number;
          text?: string;
          threadId: string;
          tool: boolean;
          usage?: {
            cachedInputTokens?: number;
            completionTokens: number;
            promptTokens: number;
            reasoningTokens?: number;
            totalTokens: number;
          };
          userId?: string;
          warnings?: Array<
            | { details?: string; setting: string; type: "unsupported-setting" }
            | { details?: string; tool: any; type: "unsupported-tool" }
            | { message: string; type: "other" }
          >;
        }>
      >;
      updateMessage: FunctionReference<
        "mutation",
        "internal",
        {
          messageId: string;
          patch: {
            error?: string;
            fileIds?: Array<string>;
            finishReason?:
              | "stop"
              | "length"
              | "content-filter"
              | "tool-calls"
              | "error"
              | "other"
              | "unknown";
            message?:
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            image: string | ArrayBuffer;
                            mimeType?: string;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "image";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mimeType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "user";
                }
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mimeType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            signature?: string;
                            text: string;
                            type: "reasoning";
                          }
                        | {
                            data: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "redacted-reasoning";
                          }
                        | {
                            args: any;
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-call";
                          }
                        | {
                            args?: any;
                            experimental_content?: Array<
                              | { text: string; type: "text" }
                              | {
                                  data: string;
                                  mimeType?: string;
                                  type: "image";
                                }
                            >;
                            isError?: boolean;
                            output?:
                              | { type: "text"; value: string }
                              | { type: "json"; value: any }
                              | { type: "error-text"; value: string }
                              | { type: "error-json"; value: any }
                              | {
                                  type: "content";
                                  value: Array<
                                    | { text: string; type: "text" }
                                    | {
                                        data: string;
                                        mediaType: string;
                                        type: "media";
                                      }
                                  >;
                                };
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            result?: any;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-result";
                          }
                        | {
                            id: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "url";
                            title?: string;
                            type: "source";
                            url: string;
                          }
                        | {
                            filename?: string;
                            id: string;
                            mediaType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "document";
                            title: string;
                            type: "source";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "assistant";
                }
              | {
                  content: Array<{
                    args?: any;
                    experimental_content?: Array<
                      | { text: string; type: "text" }
                      | { data: string; mimeType?: string; type: "image" }
                    >;
                    isError?: boolean;
                    output?:
                      | { type: "text"; value: string }
                      | { type: "json"; value: any }
                      | { type: "error-text"; value: string }
                      | { type: "error-json"; value: any }
                      | {
                          type: "content";
                          value: Array<
                            | { text: string; type: "text" }
                            | { data: string; mediaType: string; type: "media" }
                          >;
                        };
                    providerExecuted?: boolean;
                    providerMetadata?: Record<string, Record<string, any>>;
                    providerOptions?: Record<string, Record<string, any>>;
                    result?: any;
                    toolCallId: string;
                    toolName: string;
                    type: "tool-result";
                  }>;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "tool";
                }
              | {
                  content: string;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "system";
                };
            model?: string;
            provider?: string;
            providerOptions?: Record<string, Record<string, any>>;
            status?: "pending" | "success" | "failed";
          };
        },
        {
          _creationTime: number;
          _id: string;
          agentName?: string;
          embeddingId?: string;
          error?: string;
          fileIds?: Array<string>;
          finishReason?:
            | "stop"
            | "length"
            | "content-filter"
            | "tool-calls"
            | "error"
            | "other"
            | "unknown";
          id?: string;
          message?:
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          image: string | ArrayBuffer;
                          mimeType?: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "image";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mimeType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "user";
              }
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mimeType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          signature?: string;
                          text: string;
                          type: "reasoning";
                        }
                      | {
                          data: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "redacted-reasoning";
                        }
                      | {
                          args: any;
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                      | {
                          args?: any;
                          experimental_content?: Array<
                            | { text: string; type: "text" }
                            | { data: string; mimeType?: string; type: "image" }
                          >;
                          isError?: boolean;
                          output?:
                            | { type: "text"; value: string }
                            | { type: "json"; value: any }
                            | { type: "error-text"; value: string }
                            | { type: "error-json"; value: any }
                            | {
                                type: "content";
                                value: Array<
                                  | { text: string; type: "text" }
                                  | {
                                      data: string;
                                      mediaType: string;
                                      type: "media";
                                    }
                                >;
                              };
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          result?: any;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-result";
                        }
                      | {
                          id: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "url";
                          title?: string;
                          type: "source";
                          url: string;
                        }
                      | {
                          filename?: string;
                          id: string;
                          mediaType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "document";
                          title: string;
                          type: "source";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "assistant";
              }
            | {
                content: Array<{
                  args?: any;
                  experimental_content?: Array<
                    | { text: string; type: "text" }
                    | { data: string; mimeType?: string; type: "image" }
                  >;
                  isError?: boolean;
                  output?:
                    | { type: "text"; value: string }
                    | { type: "json"; value: any }
                    | { type: "error-text"; value: string }
                    | { type: "error-json"; value: any }
                    | {
                        type: "content";
                        value: Array<
                          | { text: string; type: "text" }
                          | { data: string; mediaType: string; type: "media" }
                        >;
                      };
                  providerExecuted?: boolean;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  result?: any;
                  toolCallId: string;
                  toolName: string;
                  type: "tool-result";
                }>;
                providerOptions?: Record<string, Record<string, any>>;
                role: "tool";
              }
            | {
                content: string;
                providerOptions?: Record<string, Record<string, any>>;
                role: "system";
              };
          model?: string;
          order: number;
          provider?: string;
          providerMetadata?: Record<string, Record<string, any>>;
          providerOptions?: Record<string, Record<string, any>>;
          reasoning?: string;
          reasoningDetails?: Array<
            | {
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                signature?: string;
                text: string;
                type: "reasoning";
              }
            | { signature?: string; text: string; type: "text" }
            | { data: string; type: "redacted" }
          >;
          sources?: Array<
            | {
                id: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "url";
                title?: string;
                type?: "source";
                url: string;
              }
            | {
                filename?: string;
                id: string;
                mediaType: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "document";
                title: string;
                type: "source";
              }
          >;
          status: "pending" | "success" | "failed";
          stepOrder: number;
          text?: string;
          threadId: string;
          tool: boolean;
          usage?: {
            cachedInputTokens?: number;
            completionTokens: number;
            promptTokens: number;
            reasoningTokens?: number;
            totalTokens: number;
          };
          userId?: string;
          warnings?: Array<
            | { details?: string; setting: string; type: "unsupported-setting" }
            | { details?: string; tool: any; type: "unsupported-tool" }
            | { message: string; type: "other" }
          >;
        }
      >;
    };
    streams: {
      abort: FunctionReference<
        "mutation",
        "internal",
        {
          finalDelta?: {
            end: number;
            parts: Array<any>;
            start: number;
            streamId: string;
          };
          reason: string;
          streamId: string;
        },
        boolean
      >;
      abortByOrder: FunctionReference<
        "mutation",
        "internal",
        { order: number; reason: string; threadId: string },
        boolean
      >;
      addDelta: FunctionReference<
        "mutation",
        "internal",
        { end: number; parts: Array<any>; start: number; streamId: string },
        boolean
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          agentName?: string;
          format?: "UIMessageChunk" | "TextStreamPart";
          model?: string;
          order: number;
          provider?: string;
          providerOptions?: Record<string, Record<string, any>>;
          stepOrder: number;
          threadId: string;
          userId?: string;
        },
        string
      >;
      deleteAllStreamsForThreadIdAsync: FunctionReference<
        "mutation",
        "internal",
        { deltaCursor?: string; streamOrder?: number; threadId: string },
        { deltaCursor?: string; isDone: boolean; streamOrder?: number }
      >;
      deleteAllStreamsForThreadIdSync: FunctionReference<
        "action",
        "internal",
        { threadId: string },
        null
      >;
      deleteStreamAsync: FunctionReference<
        "mutation",
        "internal",
        { cursor?: string; streamId: string },
        null
      >;
      deleteStreamSync: FunctionReference<
        "mutation",
        "internal",
        { streamId: string },
        null
      >;
      finish: FunctionReference<
        "mutation",
        "internal",
        {
          finalDelta?: {
            end: number;
            parts: Array<any>;
            start: number;
            streamId: string;
          };
          streamId: string;
        },
        null
      >;
      heartbeat: FunctionReference<
        "mutation",
        "internal",
        { streamId: string },
        null
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          startOrder?: number;
          statuses?: Array<"streaming" | "finished" | "aborted">;
          threadId: string;
        },
        Array<{
          agentName?: string;
          format?: "UIMessageChunk" | "TextStreamPart";
          model?: string;
          order: number;
          provider?: string;
          providerOptions?: Record<string, Record<string, any>>;
          status: "streaming" | "finished" | "aborted";
          stepOrder: number;
          streamId: string;
          userId?: string;
        }>
      >;
      listDeltas: FunctionReference<
        "query",
        "internal",
        {
          cursors: Array<{ cursor: number; streamId: string }>;
          threadId: string;
        },
        Array<{
          end: number;
          parts: Array<any>;
          start: number;
          streamId: string;
        }>
      >;
    };
    threads: {
      createThread: FunctionReference<
        "mutation",
        "internal",
        {
          defaultSystemPrompt?: string;
          parentThreadIds?: Array<string>;
          summary?: string;
          title?: string;
          userId?: string;
        },
        {
          _creationTime: number;
          _id: string;
          status: "active" | "archived";
          summary?: string;
          title?: string;
          userId?: string;
        }
      >;
      deleteAllForThreadIdAsync: FunctionReference<
        "mutation",
        "internal",
        {
          cursor?: string;
          deltaCursor?: string;
          limit?: number;
          messagesDone?: boolean;
          streamOrder?: number;
          streamsDone?: boolean;
          threadId: string;
        },
        { isDone: boolean }
      >;
      deleteAllForThreadIdSync: FunctionReference<
        "action",
        "internal",
        { limit?: number; threadId: string },
        null
      >;
      getThread: FunctionReference<
        "query",
        "internal",
        { threadId: string },
        {
          _creationTime: number;
          _id: string;
          status: "active" | "archived";
          summary?: string;
          title?: string;
          userId?: string;
        } | null
      >;
      listThreadsByUserId: FunctionReference<
        "query",
        "internal",
        {
          order?: "asc" | "desc";
          paginationOpts?: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          userId?: string;
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            _creationTime: number;
            _id: string;
            status: "active" | "archived";
            summary?: string;
            title?: string;
            userId?: string;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      searchThreadTitles: FunctionReference<
        "query",
        "internal",
        { limit: number; query: string; userId?: string | null },
        Array<{
          _creationTime: number;
          _id: string;
          status: "active" | "archived";
          summary?: string;
          title?: string;
          userId?: string;
        }>
      >;
      updateThread: FunctionReference<
        "mutation",
        "internal",
        {
          patch: {
            status?: "active" | "archived";
            summary?: string;
            title?: string;
            userId?: string;
          };
          threadId: string;
        },
        {
          _creationTime: number;
          _id: string;
          status: "active" | "archived";
          summary?: string;
          title?: string;
          userId?: string;
        }
      >;
    };
    users: {
      deleteAllForUserId: FunctionReference<
        "action",
        "internal",
        { userId: string },
        null
      >;
      deleteAllForUserIdAsync: FunctionReference<
        "mutation",
        "internal",
        { userId: string },
        boolean
      >;
      listUsersWithThreads: FunctionReference<
        "query",
        "internal",
        {
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<string>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
    };
    vector: {
      index: {
        deleteBatch: FunctionReference<
          "mutation",
          "internal",
          {
            ids: Array<
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string
            >;
          },
          null
        >;
        deleteBatchForThread: FunctionReference<
          "mutation",
          "internal",
          {
            cursor?: string;
            limit: number;
            model: string;
            threadId: string;
            vectorDimension:
              | 128
              | 256
              | 512
              | 768
              | 1024
              | 1408
              | 1536
              | 2048
              | 3072
              | 4096;
          },
          { continueCursor: string; isDone: boolean }
        >;
        insertBatch: FunctionReference<
          "mutation",
          "internal",
          {
            vectorDimension:
              | 128
              | 256
              | 512
              | 768
              | 1024
              | 1408
              | 1536
              | 2048
              | 3072
              | 4096;
            vectors: Array<{
              messageId?: string;
              model: string;
              table: string;
              threadId?: string;
              userId?: string;
              vector: Array<number>;
            }>;
          },
          Array<
            | string
            | string
            | string
            | string
            | string
            | string
            | string
            | string
            | string
            | string
          >
        >;
        paginate: FunctionReference<
          "query",
          "internal",
          {
            cursor?: string;
            limit: number;
            table?: string;
            targetModel: string;
            vectorDimension:
              | 128
              | 256
              | 512
              | 768
              | 1024
              | 1408
              | 1536
              | 2048
              | 3072
              | 4096;
          },
          {
            continueCursor: string;
            ids: Array<
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string
            >;
            isDone: boolean;
          }
        >;
        updateBatch: FunctionReference<
          "mutation",
          "internal",
          {
            vectors: Array<{
              id:
                | string
                | string
                | string
                | string
                | string
                | string
                | string
                | string
                | string
                | string;
              model: string;
              vector: Array<number>;
            }>;
          },
          null
        >;
      };
    };
  };
  rag: {
    chunks: {
      insert: FunctionReference<
        "mutation",
        "internal",
        {
          chunks: Array<{
            content: { metadata?: Record<string, any>; text: string };
            embedding: Array<number>;
            searchableText?: string;
          }>;
          entryId: string;
          startOrder: number;
        },
        { status: "pending" | "ready" | "replaced" }
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          entryId: string;
          order: "desc" | "asc";
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            metadata?: Record<string, any>;
            order: number;
            state: "pending" | "ready" | "replaced";
            text: string;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      replaceChunksPage: FunctionReference<
        "mutation",
        "internal",
        { entryId: string; startOrder: number },
        { nextStartOrder: number; status: "pending" | "ready" | "replaced" }
      >;
    };
    entries: {
      add: FunctionReference<
        "mutation",
        "internal",
        {
          allChunks?: Array<{
            content: { metadata?: Record<string, any>; text: string };
            embedding: Array<number>;
            searchableText?: string;
          }>;
          entry: {
            contentHash?: string;
            filterValues: Array<{ name: string; value: any }>;
            importance: number;
            key?: string;
            metadata?: Record<string, any>;
            namespaceId: string;
            title?: string;
          };
          onComplete?: string;
        },
        {
          created: boolean;
          entryId: string;
          status: "pending" | "ready" | "replaced";
        }
      >;
      addAsync: FunctionReference<
        "mutation",
        "internal",
        {
          chunker: string;
          entry: {
            contentHash?: string;
            filterValues: Array<{ name: string; value: any }>;
            importance: number;
            key?: string;
            metadata?: Record<string, any>;
            namespaceId: string;
            title?: string;
          };
          onComplete?: string;
        },
        { created: boolean; entryId: string; status: "pending" | "ready" }
      >;
      deleteAsync: FunctionReference<
        "mutation",
        "internal",
        { entryId: string; startOrder: number },
        null
      >;
      deleteByKeyAsync: FunctionReference<
        "mutation",
        "internal",
        { beforeVersion?: number; key: string; namespaceId: string },
        null
      >;
      deleteByKeySync: FunctionReference<
        "action",
        "internal",
        { key: string; namespaceId: string },
        null
      >;
      deleteSync: FunctionReference<
        "action",
        "internal",
        { entryId: string },
        null
      >;
      findByContentHash: FunctionReference<
        "query",
        "internal",
        {
          contentHash: string;
          dimension: number;
          filterNames: Array<string>;
          key: string;
          modelId: string;
          namespace: string;
        },
        {
          contentHash?: string;
          entryId: string;
          filterValues: Array<{ name: string; value: any }>;
          importance: number;
          key?: string;
          metadata?: Record<string, any>;
          replacedAt?: number;
          status: "pending" | "ready" | "replaced";
          title?: string;
        } | null
      >;
      get: FunctionReference<
        "query",
        "internal",
        { entryId: string },
        {
          contentHash?: string;
          entryId: string;
          filterValues: Array<{ name: string; value: any }>;
          importance: number;
          key?: string;
          metadata?: Record<string, any>;
          replacedAt?: number;
          status: "pending" | "ready" | "replaced";
          title?: string;
        } | null
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          namespaceId?: string;
          order?: "desc" | "asc";
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          status: "pending" | "ready" | "replaced";
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            contentHash?: string;
            entryId: string;
            filterValues: Array<{ name: string; value: any }>;
            importance: number;
            key?: string;
            metadata?: Record<string, any>;
            replacedAt?: number;
            status: "pending" | "ready" | "replaced";
            title?: string;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      promoteToReady: FunctionReference<
        "mutation",
        "internal",
        { entryId: string },
        {
          replacedEntry: {
            contentHash?: string;
            entryId: string;
            filterValues: Array<{ name: string; value: any }>;
            importance: number;
            key?: string;
            metadata?: Record<string, any>;
            replacedAt?: number;
            status: "pending" | "ready" | "replaced";
            title?: string;
          } | null;
        }
      >;
    };
    namespaces: {
      deleteNamespace: FunctionReference<
        "mutation",
        "internal",
        { namespaceId: string },
        {
          deletedNamespace: null | {
            createdAt: number;
            dimension: number;
            filterNames: Array<string>;
            modelId: string;
            namespace: string;
            namespaceId: string;
            status: "pending" | "ready" | "replaced";
            version: number;
          };
        }
      >;
      deleteNamespaceSync: FunctionReference<
        "action",
        "internal",
        { namespaceId: string },
        null
      >;
      get: FunctionReference<
        "query",
        "internal",
        {
          dimension: number;
          filterNames: Array<string>;
          modelId: string;
          namespace: string;
        },
        null | {
          createdAt: number;
          dimension: number;
          filterNames: Array<string>;
          modelId: string;
          namespace: string;
          namespaceId: string;
          status: "pending" | "ready" | "replaced";
          version: number;
        }
      >;
      getOrCreate: FunctionReference<
        "mutation",
        "internal",
        {
          dimension: number;
          filterNames: Array<string>;
          modelId: string;
          namespace: string;
          onComplete?: string;
          status: "pending" | "ready";
        },
        { namespaceId: string; status: "pending" | "ready" }
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          status: "pending" | "ready" | "replaced";
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            createdAt: number;
            dimension: number;
            filterNames: Array<string>;
            modelId: string;
            namespace: string;
            namespaceId: string;
            status: "pending" | "ready" | "replaced";
            version: number;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      listNamespaceVersions: FunctionReference<
        "query",
        "internal",
        {
          namespace: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            createdAt: number;
            dimension: number;
            filterNames: Array<string>;
            modelId: string;
            namespace: string;
            namespaceId: string;
            status: "pending" | "ready" | "replaced";
            version: number;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      lookup: FunctionReference<
        "query",
        "internal",
        {
          dimension: number;
          filterNames: Array<string>;
          modelId: string;
          namespace: string;
        },
        null | string
      >;
      promoteToReady: FunctionReference<
        "mutation",
        "internal",
        { namespaceId: string },
        {
          replacedNamespace: null | {
            createdAt: number;
            dimension: number;
            filterNames: Array<string>;
            modelId: string;
            namespace: string;
            namespaceId: string;
            status: "pending" | "ready" | "replaced";
            version: number;
          };
        }
      >;
    };
    search: {
      search: FunctionReference<
        "action",
        "internal",
        {
          chunkContext?: { after: number; before: number };
          embedding: Array<number>;
          filters: Array<{ name: string; value: any }>;
          limit: number;
          modelId: string;
          namespace: string;
          vectorScoreThreshold?: number;
        },
        {
          entries: Array<{
            contentHash?: string;
            entryId: string;
            filterValues: Array<{ name: string; value: any }>;
            importance: number;
            key?: string;
            metadata?: Record<string, any>;
            replacedAt?: number;
            status: "pending" | "ready" | "replaced";
            title?: string;
          }>;
          results: Array<{
            content: Array<{ metadata?: Record<string, any>; text: string }>;
            entryId: string;
            order: number;
            score: number;
            startOrder: number;
          }>;
        }
      >;
    };
  };
  presence: {
    public: {
      disconnect: FunctionReference<
        "mutation",
        "internal",
        { sessionToken: string },
        null
      >;
      heartbeat: FunctionReference<
        "mutation",
        "internal",
        {
          interval?: number;
          roomId: string;
          sessionId: string;
          userId: string;
        },
        { roomToken: string; sessionToken: string }
      >;
      list: FunctionReference<
        "query",
        "internal",
        { limit?: number; roomToken: string },
        Array<{
          data?: any;
          lastDisconnected: number;
          online: boolean;
          userId: string;
        }>
      >;
      listRoom: FunctionReference<
        "query",
        "internal",
        { limit?: number; onlineOnly?: boolean; roomId: string },
        Array<{ lastDisconnected: number; online: boolean; userId: string }>
      >;
      listUser: FunctionReference<
        "query",
        "internal",
        { limit?: number; onlineOnly?: boolean; userId: string },
        Array<{ lastDisconnected: number; online: boolean; roomId: string }>
      >;
      removeRoom: FunctionReference<
        "mutation",
        "internal",
        { roomId: string },
        null
      >;
      removeRoomUser: FunctionReference<
        "mutation",
        "internal",
        { roomId: string; userId: string },
        null
      >;
      updateRoomUser: FunctionReference<
        "mutation",
        "internal",
        { data?: any; roomId: string; userId: string },
        null
      >;
    };
  };
  workpool: {
    config: {
      update: FunctionReference<
        "mutation",
        "internal",
        {
          logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
          maxParallelism?: number;
        },
        any
      >;
    };
    lib: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        {
          id: string;
          logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
        },
        any
      >;
      cancelAll: FunctionReference<
        "mutation",
        "internal",
        {
          before?: number;
          limit?: number;
          logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
        },
        any
      >;
      enqueue: FunctionReference<
        "mutation",
        "internal",
        {
          config: {
            logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
            maxParallelism?: number;
          };
          fnArgs: any;
          fnHandle: string;
          fnName: string;
          fnType: "action" | "mutation" | "query";
          onComplete?: { context?: any; fnHandle: string };
          retryBehavior?: {
            base: number;
            initialBackoffMs: number;
            maxAttempts: number;
          };
          runAt: number;
        },
        string
      >;
      enqueueBatch: FunctionReference<
        "mutation",
        "internal",
        {
          config: {
            logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
            maxParallelism?: number;
          };
          items: Array<{
            fnArgs: any;
            fnHandle: string;
            fnName: string;
            fnType: "action" | "mutation" | "query";
            onComplete?: { context?: any; fnHandle: string };
            retryBehavior?: {
              base: number;
              initialBackoffMs: number;
              maxAttempts: number;
            };
            runAt: number;
          }>;
        },
        Array<string>
      >;
      status: FunctionReference<
        "query",
        "internal",
        { id: string },
        | { previousAttempts: number; state: "pending" }
        | { previousAttempts: number; state: "running" }
        | { state: "finished" }
      >;
      statusBatch: FunctionReference<
        "query",
        "internal",
        { ids: Array<string> },
        Array<
          | { previousAttempts: number; state: "pending" }
          | { previousAttempts: number; state: "running" }
          | { state: "finished" }
        >
      >;
    };
  };
  workflow: {
    event: {
      create: FunctionReference<
        "mutation",
        "internal",
        { name: string; workflowId: string },
        string
      >;
      send: FunctionReference<
        "mutation",
        "internal",
        {
          eventId?: string;
          name?: string;
          result:
            | { kind: "success"; returnValue: any }
            | { error: string; kind: "failed" }
            | { kind: "canceled" };
          workflowId?: string;
          workpoolOptions?: {
            defaultRetryBehavior?: {
              base: number;
              initialBackoffMs: number;
              maxAttempts: number;
            };
            logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
            maxParallelism?: number;
            retryActionsByDefault?: boolean;
          };
        },
        string
      >;
    };
    journal: {
      load: FunctionReference<
        "query",
        "internal",
        { shortCircuit?: boolean; workflowId: string },
        {
          blocked?: boolean;
          journalEntries: Array<{
            _creationTime: number;
            _id: string;
            step:
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  functionType: "query" | "mutation" | "action";
                  handle: string;
                  inProgress: boolean;
                  kind?: "function";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workId?: string;
                }
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  handle: string;
                  inProgress: boolean;
                  kind: "workflow";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workflowId?: string;
                }
              | {
                  args: { eventId?: string };
                  argsSize: number;
                  completedAt?: number;
                  eventId?: string;
                  inProgress: boolean;
                  kind: "event";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                };
            stepNumber: number;
            workflowId: string;
          }>;
          logLevel: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
          ok: boolean;
          workflow: {
            _creationTime: number;
            _id: string;
            args: any;
            generationNumber: number;
            logLevel?: any;
            name?: string;
            onComplete?: { context?: any; fnHandle: string };
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt?: any;
            state?: any;
            workflowHandle: string;
          };
        }
      >;
      startSteps: FunctionReference<
        "mutation",
        "internal",
        {
          generationNumber: number;
          steps: Array<{
            retry?:
              | boolean
              | { base: number; initialBackoffMs: number; maxAttempts: number };
            schedulerOptions?: { runAt?: number } | { runAfter?: number };
            step:
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  functionType: "query" | "mutation" | "action";
                  handle: string;
                  inProgress: boolean;
                  kind?: "function";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workId?: string;
                }
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  handle: string;
                  inProgress: boolean;
                  kind: "workflow";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workflowId?: string;
                }
              | {
                  args: { eventId?: string };
                  argsSize: number;
                  completedAt?: number;
                  eventId?: string;
                  inProgress: boolean;
                  kind: "event";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                };
          }>;
          workflowId: string;
          workpoolOptions?: {
            defaultRetryBehavior?: {
              base: number;
              initialBackoffMs: number;
              maxAttempts: number;
            };
            logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
            maxParallelism?: number;
            retryActionsByDefault?: boolean;
          };
        },
        Array<{
          _creationTime: number;
          _id: string;
          step:
            | {
                args: any;
                argsSize: number;
                completedAt?: number;
                functionType: "query" | "mutation" | "action";
                handle: string;
                inProgress: boolean;
                kind?: "function";
                name: string;
                runResult?:
                  | { kind: "success"; returnValue: any }
                  | { error: string; kind: "failed" }
                  | { kind: "canceled" };
                startedAt: number;
                workId?: string;
              }
            | {
                args: any;
                argsSize: number;
                completedAt?: number;
                handle: string;
                inProgress: boolean;
                kind: "workflow";
                name: string;
                runResult?:
                  | { kind: "success"; returnValue: any }
                  | { error: string; kind: "failed" }
                  | { kind: "canceled" };
                startedAt: number;
                workflowId?: string;
              }
            | {
                args: { eventId?: string };
                argsSize: number;
                completedAt?: number;
                eventId?: string;
                inProgress: boolean;
                kind: "event";
                name: string;
                runResult?:
                  | { kind: "success"; returnValue: any }
                  | { error: string; kind: "failed" }
                  | { kind: "canceled" };
                startedAt: number;
              };
          stepNumber: number;
          workflowId: string;
        }>
      >;
    };
    workflow: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { workflowId: string },
        null
      >;
      cleanup: FunctionReference<
        "mutation",
        "internal",
        { workflowId: string },
        boolean
      >;
      complete: FunctionReference<
        "mutation",
        "internal",
        {
          generationNumber: number;
          runResult:
            | { kind: "success"; returnValue: any }
            | { error: string; kind: "failed" }
            | { kind: "canceled" };
          workflowId: string;
        },
        null
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          maxParallelism?: number;
          onComplete?: { context?: any; fnHandle: string };
          startAsync?: boolean;
          workflowArgs: any;
          workflowHandle: string;
          workflowName: string;
        },
        string
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { workflowId: string },
        {
          inProgress: Array<{
            _creationTime: number;
            _id: string;
            step:
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  functionType: "query" | "mutation" | "action";
                  handle: string;
                  inProgress: boolean;
                  kind?: "function";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workId?: string;
                }
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  handle: string;
                  inProgress: boolean;
                  kind: "workflow";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workflowId?: string;
                }
              | {
                  args: { eventId?: string };
                  argsSize: number;
                  completedAt?: number;
                  eventId?: string;
                  inProgress: boolean;
                  kind: "event";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                };
            stepNumber: number;
            workflowId: string;
          }>;
          logLevel: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
          workflow: {
            _creationTime: number;
            _id: string;
            args: any;
            generationNumber: number;
            logLevel?: any;
            name?: string;
            onComplete?: { context?: any; fnHandle: string };
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt?: any;
            state?: any;
            workflowHandle: string;
          };
        }
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          order: "asc" | "desc";
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            args: any;
            context?: any;
            name?: string;
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            workflowId: string;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      listByName: FunctionReference<
        "query",
        "internal",
        {
          name: string;
          order: "asc" | "desc";
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            args: any;
            context?: any;
            name?: string;
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            workflowId: string;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      listSteps: FunctionReference<
        "query",
        "internal",
        {
          order: "asc" | "desc";
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          workflowId: string;
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            args: any;
            completedAt?: number;
            eventId?: string;
            kind: "function" | "workflow" | "event";
            name: string;
            nestedWorkflowId?: string;
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt: number;
            stepId: string;
            stepNumber: number;
            workId?: string;
            workflowId: string;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
    };
  };
  stripe: {
    private: {
      handleCheckoutSessionCompleted: FunctionReference<
        "mutation",
        "internal",
        {
          metadata?: any;
          mode: string;
          stripeCheckoutSessionId: string;
          stripeCustomerId?: string;
        },
        null
      >;
      handleCustomerCreated: FunctionReference<
        "mutation",
        "internal",
        {
          email?: string;
          metadata?: any;
          name?: string;
          stripeCustomerId: string;
        },
        null
      >;
      handleCustomerUpdated: FunctionReference<
        "mutation",
        "internal",
        {
          email?: string;
          metadata?: any;
          name?: string;
          stripeCustomerId: string;
        },
        null
      >;
      handleInvoiceCreated: FunctionReference<
        "mutation",
        "internal",
        {
          amountDue: number;
          amountPaid: number;
          created: number;
          status: string;
          stripeCustomerId: string;
          stripeInvoiceId: string;
          stripeSubscriptionId?: string;
        },
        null
      >;
      handleInvoicePaid: FunctionReference<
        "mutation",
        "internal",
        { amountPaid: number; stripeInvoiceId: string },
        null
      >;
      handleInvoicePaymentFailed: FunctionReference<
        "mutation",
        "internal",
        { stripeInvoiceId: string },
        null
      >;
      handlePaymentIntentSucceeded: FunctionReference<
        "mutation",
        "internal",
        {
          amount: number;
          created: number;
          currency: string;
          metadata?: any;
          status: string;
          stripeCustomerId?: string;
          stripePaymentIntentId: string;
        },
        null
      >;
      handleSubscriptionCreated: FunctionReference<
        "mutation",
        "internal",
        {
          cancelAt?: number;
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: number;
          metadata?: any;
          priceId: string;
          quantity?: number;
          status: string;
          stripeCustomerId: string;
          stripeSubscriptionId: string;
        },
        null
      >;
      handleSubscriptionDeleted: FunctionReference<
        "mutation",
        "internal",
        { stripeSubscriptionId: string },
        null
      >;
      handleSubscriptionUpdated: FunctionReference<
        "mutation",
        "internal",
        {
          cancelAt?: number;
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: number;
          metadata?: any;
          priceId?: string;
          quantity?: number;
          status: string;
          stripeSubscriptionId: string;
        },
        null
      >;
      updatePaymentCustomer: FunctionReference<
        "mutation",
        "internal",
        { stripeCustomerId: string; stripePaymentIntentId: string },
        null
      >;
      updateSubscriptionQuantityInternal: FunctionReference<
        "mutation",
        "internal",
        { quantity: number; stripeSubscriptionId: string },
        null
      >;
    };
    public: {
      createOrUpdateCustomer: FunctionReference<
        "mutation",
        "internal",
        {
          email?: string;
          metadata?: any;
          name?: string;
          stripeCustomerId: string;
        },
        string
      >;
      getCustomer: FunctionReference<
        "query",
        "internal",
        { stripeCustomerId: string },
        {
          email?: string;
          metadata?: any;
          name?: string;
          stripeCustomerId: string;
        } | null
      >;
      getPayment: FunctionReference<
        "query",
        "internal",
        { stripePaymentIntentId: string },
        {
          amount: number;
          created: number;
          currency: string;
          metadata?: any;
          orgId?: string;
          status: string;
          stripeCustomerId?: string;
          stripePaymentIntentId: string;
          userId?: string;
        } | null
      >;
      getSubscription: FunctionReference<
        "query",
        "internal",
        { stripeSubscriptionId: string },
        {
          cancelAt?: number;
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: number;
          metadata?: any;
          orgId?: string;
          priceId: string;
          quantity?: number;
          status: string;
          stripeCustomerId: string;
          stripeSubscriptionId: string;
          userId?: string;
        } | null
      >;
      getSubscriptionByOrgId: FunctionReference<
        "query",
        "internal",
        { orgId: string },
        {
          cancelAt?: number;
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: number;
          metadata?: any;
          orgId?: string;
          priceId: string;
          quantity?: number;
          status: string;
          stripeCustomerId: string;
          stripeSubscriptionId: string;
          userId?: string;
        } | null
      >;
      listInvoices: FunctionReference<
        "query",
        "internal",
        { stripeCustomerId: string },
        Array<{
          amountDue: number;
          amountPaid: number;
          created: number;
          orgId?: string;
          status: string;
          stripeCustomerId: string;
          stripeInvoiceId: string;
          stripeSubscriptionId?: string;
          userId?: string;
        }>
      >;
      listInvoicesByOrgId: FunctionReference<
        "query",
        "internal",
        { orgId: string },
        Array<{
          amountDue: number;
          amountPaid: number;
          created: number;
          orgId?: string;
          status: string;
          stripeCustomerId: string;
          stripeInvoiceId: string;
          stripeSubscriptionId?: string;
          userId?: string;
        }>
      >;
      listInvoicesByUserId: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          amountDue: number;
          amountPaid: number;
          created: number;
          orgId?: string;
          status: string;
          stripeCustomerId: string;
          stripeInvoiceId: string;
          stripeSubscriptionId?: string;
          userId?: string;
        }>
      >;
      listPayments: FunctionReference<
        "query",
        "internal",
        { stripeCustomerId: string },
        Array<{
          amount: number;
          created: number;
          currency: string;
          metadata?: any;
          orgId?: string;
          status: string;
          stripeCustomerId?: string;
          stripePaymentIntentId: string;
          userId?: string;
        }>
      >;
      listPaymentsByOrgId: FunctionReference<
        "query",
        "internal",
        { orgId: string },
        Array<{
          amount: number;
          created: number;
          currency: string;
          metadata?: any;
          orgId?: string;
          status: string;
          stripeCustomerId?: string;
          stripePaymentIntentId: string;
          userId?: string;
        }>
      >;
      listPaymentsByUserId: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          amount: number;
          created: number;
          currency: string;
          metadata?: any;
          orgId?: string;
          status: string;
          stripeCustomerId?: string;
          stripePaymentIntentId: string;
          userId?: string;
        }>
      >;
      listSubscriptions: FunctionReference<
        "query",
        "internal",
        { stripeCustomerId: string },
        Array<{
          cancelAt?: number;
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: number;
          metadata?: any;
          orgId?: string;
          priceId: string;
          quantity?: number;
          status: string;
          stripeCustomerId: string;
          stripeSubscriptionId: string;
          userId?: string;
        }>
      >;
      listSubscriptionsByUserId: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          cancelAt?: number;
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: number;
          metadata?: any;
          orgId?: string;
          priceId: string;
          quantity?: number;
          status: string;
          stripeCustomerId: string;
          stripeSubscriptionId: string;
          userId?: string;
        }>
      >;
      updateSubscriptionMetadata: FunctionReference<
        "mutation",
        "internal",
        {
          metadata: any;
          orgId?: string;
          stripeSubscriptionId: string;
          userId?: string;
        },
        null
      >;
      updateSubscriptionQuantity: FunctionReference<
        "action",
        "internal",
        { apiKey: string; quantity: number; stripeSubscriptionId: string },
        null
      >;
    };
  };
  lunchtable_tcg_admin: {
    alerts: {
      acknowledgeAlert: FunctionReference<
        "mutation",
        "internal",
        { acknowledgedBy: string; alertHistoryId: string },
        null
      >;
      createAlertChannel: FunctionReference<
        "mutation",
        "internal",
        {
          config: {
            email?: string;
            minSeverity: "info" | "warning" | "critical";
            webhookUrl?: string;
          };
          createdBy: string;
          isEnabled: boolean;
          name: string;
          type: "in_app" | "push" | "slack" | "discord" | "email";
        },
        string
      >;
      createAlertRule: FunctionReference<
        "mutation",
        "internal",
        {
          conditions: {
            direction?: "above" | "below" | "change";
            percentChange?: number;
            threshold?: number;
            timeframeMinutes?: number;
          };
          cooldownMinutes: number;
          createdBy: string;
          description?: string;
          isEnabled: boolean;
          name: string;
          severity: "info" | "warning" | "critical";
          triggerType:
            | "price_change"
            | "price_threshold"
            | "volume_spike"
            | "whale_activity"
            | "holder_milestone"
            | "bonding_progress"
            | "treasury_balance"
            | "transaction_failed"
            | "graduation"
            | "integrity_violation";
        },
        string
      >;
      getAlertHistory: FunctionReference<
        "query",
        "internal",
        { limit?: number; ruleId?: string },
        any
      >;
      listAlertChannels: FunctionReference<"query", "internal", {}, any>;
      listAlertRules: FunctionReference<
        "query",
        "internal",
        { enabled?: boolean },
        any
      >;
      triggerAlert: FunctionReference<
        "mutation",
        "internal",
        { data?: any; message: string; ruleId: string; title: string },
        string | null
      >;
    };
    analytics: {
      captureSnapshot: FunctionReference<
        "mutation",
        "internal",
        {
          metrics: {
            activeMarketplaceListings: number;
            dailyActiveUsers: number;
            gamesPlayedLast24h: number;
            playersInMatchmakingQueue: number;
            totalGemsInCirculation: number;
            totalGoldInCirculation: number;
            totalUsers: number;
          };
          period: "hourly" | "daily" | "weekly";
        },
        string
      >;
      cleanupOldSnapshots: FunctionReference<
        "mutation",
        "internal",
        { olderThan: number },
        number
      >;
      getSnapshots: FunctionReference<
        "query",
        "internal",
        { period: "hourly" | "daily" | "weekly"; since?: number },
        any
      >;
    };
    apiKeys: {
      create: FunctionReference<
        "mutation",
        "internal",
        { agentId: string; keyHash: string; keyPrefix: string; userId: string },
        string
      >;
      deactivate: FunctionReference<
        "mutation",
        "internal",
        { keyHash: string },
        null
      >;
      getByAgent: FunctionReference<
        "query",
        "internal",
        { agentId: string },
        any
      >;
      getByHash: FunctionReference<
        "query",
        "internal",
        { keyHash: string },
        any
      >;
      getByUser: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any
      >;
      getUsage: FunctionReference<
        "query",
        "internal",
        { apiKeyId: string; limit?: number; since?: number },
        any
      >;
      recordUsage: FunctionReference<
        "mutation",
        "internal",
        {
          apiKeyId: string;
          durationMs?: number;
          endpoint?: string;
          responseStatus?: number;
        },
        string
      >;
    };
    audit: {
      getAdminAuditLog: FunctionReference<
        "query",
        "internal",
        { action?: string; adminId?: string; limit?: number },
        any
      >;
      getDataAuditLog: FunctionReference<
        "query",
        "internal",
        {
          documentId?: string;
          limit?: number;
          table?: string;
          userId?: string;
        },
        any
      >;
      logAdminAction: FunctionReference<
        "mutation",
        "internal",
        {
          action: string;
          adminId: string;
          errorMessage?: string;
          ipAddress?: string;
          metadata?: any;
          success: boolean;
          targetEmail?: string;
          targetUserId?: string;
        },
        string
      >;
      logDataChange: FunctionReference<
        "mutation",
        "internal",
        {
          changedFields?: Array<string>;
          documentId: string;
          newValue?: any;
          oldValue?: any;
          operation: "insert" | "patch" | "delete";
          table: string;
          userId?: string;
        },
        string
      >;
    };
    config: {
      bulkUpdateConfigs: FunctionReference<
        "mutation",
        "internal",
        { configs: Array<{ key: string; value: any }>; updatedBy: string },
        { notFound: Array<string>; updated: number }
      >;
      getConfig: FunctionReference<"query", "internal", { key: string }, any>;
      getConfigsByCategory: FunctionReference<
        "query",
        "internal",
        { category: string },
        any
      >;
      seedDefaultConfigs: FunctionReference<
        "mutation",
        "internal",
        {
          configs: Array<{
            category: string;
            description: string;
            displayName: string;
            key: string;
            maxValue?: number;
            minValue?: number;
            value: any;
            valueType: "number" | "string" | "boolean" | "json" | "secret";
          }>;
          updatedBy: string;
        },
        { inserted: number; skipped: number }
      >;
      updateConfig: FunctionReference<
        "mutation",
        "internal",
        { key: string; updatedBy: string; value: any },
        null
      >;
    };
    features: {
      checkFeatureFlag: FunctionReference<
        "query",
        "internal",
        { name: string; userId?: string },
        boolean
      >;
      createFeatureFlag: FunctionReference<
        "mutation",
        "internal",
        {
          category: string;
          description: string;
          displayName: string;
          enabled: boolean;
          name: string;
          rolloutPercentage?: number;
          targetRoles?: Array<string>;
          targetUserIds?: Array<string>;
          updatedBy: string;
        },
        string
      >;
      listFeatureFlags: FunctionReference<
        "query",
        "internal",
        { category?: string },
        any
      >;
      toggleFeatureFlag: FunctionReference<
        "mutation",
        "internal",
        { enabled: boolean; name: string; updatedBy: string },
        null
      >;
      updateFeatureFlag: FunctionReference<
        "mutation",
        "internal",
        {
          name: string;
          updatedBy: string;
          updates: {
            category?: string;
            description?: string;
            displayName?: string;
            enabled?: boolean;
            rolloutPercentage?: number;
            targetRoles?: Array<string>;
            targetUserIds?: Array<string>;
          };
        },
        null
      >;
    };
    files: {
      createFileMetadata: FunctionReference<
        "mutation",
        "internal",
        {
          blobPathname?: string;
          blobUrl?: string;
          category:
            | "profile_picture"
            | "card_image"
            | "document"
            | "other"
            | "background"
            | "texture"
            | "ui_element"
            | "shop_asset"
            | "story_asset"
            | "logo";
          contentType: string;
          description?: string;
          fileName: string;
          size: number;
          storageId: string;
          userId: string;
        },
        string
      >;
      deleteFileMetadata: FunctionReference<
        "mutation",
        "internal",
        { fileId: string },
        null
      >;
      getByCategory: FunctionReference<
        "query",
        "internal",
        {
          category:
            | "profile_picture"
            | "card_image"
            | "document"
            | "other"
            | "background"
            | "texture"
            | "ui_element"
            | "shop_asset"
            | "story_asset"
            | "logo";
          limit?: number;
        },
        any
      >;
      getByStorageId: FunctionReference<
        "query",
        "internal",
        { storageId: string },
        any
      >;
      getByUser: FunctionReference<
        "query",
        "internal",
        { limit?: number; userId: string },
        any
      >;
      getByUserCategory: FunctionReference<
        "query",
        "internal",
        {
          category:
            | "profile_picture"
            | "card_image"
            | "document"
            | "other"
            | "background"
            | "texture"
            | "ui_element"
            | "shop_asset"
            | "story_asset"
            | "logo";
          userId: string;
        },
        any
      >;
    };
    moderation: {
      createModerationAction: FunctionReference<
        "mutation",
        "internal",
        {
          actionType:
            | "mute"
            | "unmute"
            | "warn"
            | "suspend"
            | "unsuspend"
            | "ban"
            | "unban";
          adminId: string;
          duration?: number;
          expiresAt?: number;
          reason?: string;
          userId: string;
        },
        string
      >;
      getActiveModerations: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any
      >;
      getModerationHistory: FunctionReference<
        "query",
        "internal",
        { limit?: number; userId: string },
        any
      >;
    };
    notifications: {
      createNotification: FunctionReference<
        "mutation",
        "internal",
        {
          adminId: string;
          alertHistoryId?: string;
          message: string;
          title: string;
          type: "alert" | "system" | "action_required";
        },
        string
      >;
      getNotifications: FunctionReference<
        "query",
        "internal",
        { adminId: string; unreadOnly?: boolean },
        any
      >;
      markAllAsRead: FunctionReference<
        "mutation",
        "internal",
        { adminId: string },
        number
      >;
      markAsRead: FunctionReference<
        "mutation",
        "internal",
        { notificationId: string },
        null
      >;
    };
    reports: {
      getByReportedUser: FunctionReference<
        "query",
        "internal",
        { reportedUserId: string },
        any
      >;
      getByReporter: FunctionReference<
        "query",
        "internal",
        { reporterId: string },
        any
      >;
      getByStatus: FunctionReference<
        "query",
        "internal",
        {
          limit?: number;
          status: "pending" | "reviewed" | "resolved" | "dismissed";
        },
        any
      >;
      submitReport: FunctionReference<
        "mutation",
        "internal",
        {
          reason: string;
          reportedUserId: string;
          reportedUsername: string;
          reporterId: string;
          reporterUsername: string;
        },
        string
      >;
      updateReportStatus: FunctionReference<
        "mutation",
        "internal",
        {
          notes?: string;
          reportId: string;
          reviewedBy: string;
          status: "pending" | "reviewed" | "resolved" | "dismissed";
        },
        null
      >;
    };
    roles: {
      cleanupExpiredRoles: FunctionReference<
        "mutation",
        "internal",
        {},
        number
      >;
      getRole: FunctionReference<"query", "internal", { userId: string }, any>;
      grantRole: FunctionReference<
        "mutation",
        "internal",
        {
          expiresAt?: number;
          grantNote?: string;
          grantedBy: string;
          role: "moderator" | "admin" | "superadmin";
          userId: string;
        },
        string
      >;
      hasRole: FunctionReference<
        "query",
        "internal",
        { requiredRole: "moderator" | "admin" | "superadmin"; userId: string },
        boolean
      >;
      listAdmins: FunctionReference<
        "query",
        "internal",
        { role?: "moderator" | "admin" | "superadmin" },
        any
      >;
      revokeRole: FunctionReference<
        "mutation",
        "internal",
        { revokedBy: string; userId: string },
        null
      >;
    };
  };
  lunchtable_tcg_ai: {
    agents: {
      createAgent: FunctionReference<
        "mutation",
        "internal",
        {
          callbackUrl?: string;
          isActive?: boolean;
          lastStreamAt?: number;
          lastWebhookAt?: number;
          name: string;
          privyUserId?: string;
          profilePictureUrl?: string;
          socialLink?: string;
          starterDeckCode: string;
          streamingAutoStart?: boolean;
          streamingEnabled?: boolean;
          streamingKeyHash?: string;
          streamingPersistent?: boolean;
          streamingPlatform?:
            | "twitch"
            | "youtube"
            | "kick"
            | "custom"
            | "retake"
            | "x"
            | "pumpfun";
          streamingProfilePictureUrl?: string;
          streamingRtmpUrl?: string;
          streamingVisualMode?: "webcam" | "profile-picture";
          streamingVoiceLoop?: boolean;
          streamingVoiceTrackUrl?: string;
          streamingVoiceVolume?: number;
          userId: string;
          walletAddress?: string;
          walletChainType?: string;
          walletCreatedAt?: number;
          walletErrorMessage?: string;
          walletId?: string;
          walletIndex?: number;
          walletStatus?: "pending" | "created" | "failed";
          webhookEnabled?: boolean;
          webhookFailCount?: number;
          webhookSecret?: string;
        },
        string
      >;
      getAgent: FunctionReference<
        "query",
        "internal",
        { agentId: string },
        any
      >;
      getAgentByName: FunctionReference<
        "query",
        "internal",
        { name: string },
        any
      >;
      getAgentByWallet: FunctionReference<
        "query",
        "internal",
        { walletAddress: string },
        any
      >;
      getAgentsByUser: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any
      >;
      listAgents: FunctionReference<
        "query",
        "internal",
        { limit?: number },
        any
      >;
      updateAgent: FunctionReference<
        "mutation",
        "internal",
        { agentId: string; updates: any },
        null
      >;
    };
    chat: {
      addChatMessage: FunctionReference<
        "mutation",
        "internal",
        {
          message: string;
          role: "user" | "agent";
          sessionId: string;
          userId: string;
        },
        string
      >;
      createChatSession: FunctionReference<
        "mutation",
        "internal",
        { sessionId: string; userId: string },
        string
      >;
      endChatSession: FunctionReference<
        "mutation",
        "internal",
        { sessionId: string },
        null
      >;
      getChatMessages: FunctionReference<
        "query",
        "internal",
        { limit?: number; sessionId: string },
        any
      >;
      getChatSession: FunctionReference<
        "query",
        "internal",
        { sessionId: string },
        any
      >;
      getChatSessions: FunctionReference<
        "query",
        "internal",
        { activeOnly?: boolean; userId: string },
        any
      >;
    };
    decisions: {
      getDecisions: FunctionReference<
        "query",
        "internal",
        { agentId?: string; gameId?: string; limit?: number },
        any
      >;
      getDecisionsByGame: FunctionReference<
        "query",
        "internal",
        { gameId: string },
        any
      >;
      recordDecision: FunctionReference<
        "mutation",
        "internal",
        {
          action: string;
          agentId: string;
          executionTimeMs?: number;
          gameId: string;
          parameters?: any;
          phase: string;
          reasoning: string;
          result?: string;
          turnNumber: number;
        },
        string
      >;
    };
    usage: {
      getDailyStats: FunctionReference<
        "query",
        "internal",
        {
          endDate?: string;
          provider?: "openrouter" | "vercel";
          startDate?: string;
        },
        any
      >;
      getUsage: FunctionReference<
        "query",
        "internal",
        {
          feature?: string;
          limit?: number;
          provider?: "openrouter" | "vercel";
        },
        any
      >;
      recordUsage: FunctionReference<
        "mutation",
        "internal",
        {
          errorMessage?: string;
          estimatedCost: number;
          feature: string;
          inputTokens: number;
          latencyMs: number;
          modelId: string;
          modelType: "language" | "embedding" | "image";
          outputTokens: number;
          provider: "openrouter" | "vercel";
          success: boolean;
          totalTokens: number;
          userId?: string;
        },
        string
      >;
      upsertDailyStats: FunctionReference<
        "mutation",
        "internal",
        {
          avgLatencyMs: number;
          date: string;
          embeddingRequests: number;
          failedRequests: number;
          imageRequests: number;
          languageRequests: number;
          provider: "openrouter" | "vercel";
          successfulRequests: number;
          topModels: Array<{
            cost: number;
            modelId: string;
            requests: number;
            tokens: number;
          }>;
          totalCost: number;
          totalInputTokens: number;
          totalOutputTokens: number;
          totalRequests: number;
          totalTokens: number;
        },
        null
      >;
    };
  };
  lunchtable_tcg_branding: {
    assets: {
      createAsset: FunctionReference<
        "mutation",
        "internal",
        {
          aiDescription: string;
          fileMetadataId: string;
          fileSpecs?: {
            custom?: any;
            format?: string;
            maxHeight?: number;
            maxWidth?: number;
            minHeight?: number;
            minWidth?: number;
            transparent?: boolean;
          };
          folderId: string;
          name: string;
          sortOrder: number;
          tags: Array<string>;
          usageContext: Array<string>;
          variants?: {
            custom?: any;
            orientation?: string;
            size?: string;
            theme?: string;
          };
        },
        string
      >;
      deleteAsset: FunctionReference<
        "mutation",
        "internal",
        { assetId: string },
        null
      >;
      getAsset: FunctionReference<
        "query",
        "internal",
        { assetId: string },
        any
      >;
      getAssets: FunctionReference<
        "query",
        "internal",
        { folderId: string },
        any
      >;
      searchAssets: FunctionReference<
        "query",
        "internal",
        { query: string },
        any
      >;
      updateAsset: FunctionReference<
        "mutation",
        "internal",
        { assetId: string; updates: any },
        null
      >;
    };
    folders: {
      createFolder: FunctionReference<
        "mutation",
        "internal",
        {
          createdBy: string;
          description?: string;
          name: string;
          parentId?: string;
          path: string;
          section: string;
          sortOrder: number;
        },
        string
      >;
      deleteFolder: FunctionReference<
        "mutation",
        "internal",
        { folderId: string },
        null
      >;
      getFolder: FunctionReference<
        "query",
        "internal",
        { folderId: string },
        any
      >;
      getFolders: FunctionReference<
        "query",
        "internal",
        { parentId?: string; section?: string },
        any
      >;
      updateFolder: FunctionReference<
        "mutation",
        "internal",
        { folderId: string; updates: any },
        null
      >;
    };
    guidelines: {
      getAllGuidelines: FunctionReference<"query", "internal", {}, any>;
      getGuidelines: FunctionReference<
        "query",
        "internal",
        { section: string },
        any
      >;
      updateGuidelines: FunctionReference<
        "mutation",
        "internal",
        {
          richTextContent: string;
          section: string;
          structuredData: {
            brandVoice?: {
              avoid?: Array<string>;
              formality: number;
              keywords?: Array<string>;
              tone: string;
            };
            colors?: Array<{ hex: string; name: string; usage?: string }>;
            customFields?: any;
            fonts?: Array<{
              name: string;
              usage?: string;
              weights: Array<number>;
            }>;
          };
          updatedBy: string;
        },
        null
      >;
    };
  };
  lunchtable_tcg_cards: {
    cards: {
      addCardsToInventory: FunctionReference<
        "mutation",
        "internal",
        {
          cardDefinitionId: string;
          quantity: number;
          serialNumber?: number;
          source?: string;
          userId: string;
          variant?: "standard" | "foil" | "alt_art" | "full_art" | "numbered";
        },
        { newQuantity: number; success: boolean }
      >;
      createCardDefinition: FunctionReference<
        "mutation",
        "internal",
        {
          ability?: any;
          archetype: string;
          attack?: number;
          attribute?: string;
          cardType: string;
          cost: number;
          defense?: number;
          flavorText?: string;
          imageUrl?: string;
          isActive?: boolean;
          level?: number;
          monsterType?: string;
          name: string;
          rarity: string;
          spellType?: string;
          trapType?: string;
        },
        string
      >;
      getAllCards: FunctionReference<"query", "internal", {}, any>;
      getCard: FunctionReference<"query", "internal", { cardId: string }, any>;
      getCardsBatch: FunctionReference<
        "query",
        "internal",
        { cardIds: Array<string> },
        any
      >;
      getCollectionStats: FunctionReference<
        "query",
        "internal",
        { userId: string },
        { favoriteCount: number; totalCards: number; uniqueCards: number }
      >;
      getUserCards: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any
      >;
      getUserFavoriteCards: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any
      >;
      removeCardsFromInventory: FunctionReference<
        "mutation",
        "internal",
        { cardDefinitionId: string; quantity: number; userId: string },
        { remainingQuantity: number; success: boolean }
      >;
      toggleCardActive: FunctionReference<
        "mutation",
        "internal",
        { cardId: string },
        { isActive: boolean }
      >;
      toggleFavorite: FunctionReference<
        "mutation",
        "internal",
        { playerCardId: string; userId: string },
        { isFavorite: boolean }
      >;
      updateCardDefinition: FunctionReference<
        "mutation",
        "internal",
        {
          ability?: any;
          archetype?: string;
          attack?: number;
          attribute?: string;
          cardId: string;
          cardType?: string;
          cost?: number;
          defense?: number;
          flavorText?: string;
          imageUrl?: string;
          isActive?: boolean;
          level?: number;
          monsterType?: string;
          name?: string;
          rarity?: string;
          spellType?: string;
          trapType?: string;
        },
        { success: boolean }
      >;
    };
    decks: {
      createDeck: FunctionReference<
        "mutation",
        "internal",
        {
          deckArchetype?: string;
          description?: string;
          maxDecks?: number;
          name: string;
          userId: string;
        },
        string
      >;
      deleteDeck: FunctionReference<
        "mutation",
        "internal",
        { deckId: string },
        any
      >;
      duplicateDeck: FunctionReference<
        "mutation",
        "internal",
        { deckId: string; maxDecks?: number; name: string },
        string
      >;
      getDeckStats: FunctionReference<
        "query",
        "internal",
        { deckId: string },
        {
          averageCost: number;
          cardsByRarity: {
            common: number;
            epic: number;
            legendary: number;
            rare: number;
            uncommon: number;
          };
          cardsByType: {
            creature: number;
            equipment: number;
            spell: number;
            trap: number;
          };
          totalCards: number;
        }
      >;
      getDeckWithCards: FunctionReference<
        "query",
        "internal",
        { deckId: string },
        any
      >;
      getUserDecks: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          cardCount: number;
          createdAt: number;
          deckArchetype?: string;
          deckId: string;
          description?: string;
          name: string;
          updatedAt: number;
        }>
      >;
      renameDeck: FunctionReference<
        "mutation",
        "internal",
        { deckId: string; name: string },
        any
      >;
      saveDeck: FunctionReference<
        "mutation",
        "internal",
        {
          cards: Array<{ cardDefinitionId: string; quantity: number }>;
          deckId: string;
          maxCopies?: number;
          maxLegendaryCopies?: number;
          maxSize?: number;
          minSize?: number;
        },
        any
      >;
      selectStarterDeck: FunctionReference<
        "mutation",
        "internal",
        {
          deckCode: string;
          starterCards: Array<{
            ability?: any;
            archetype: string;
            attack?: number;
            attribute?: string;
            cardType: string;
            cost: number;
            defense?: number;
            flavorText?: string;
            imageUrl?: string;
            level?: number;
            monsterType?: string;
            name: string;
            rarity: string;
            spellType?: string;
            trapType?: string;
          }>;
          userId: string;
        },
        { cardsReceived: number; deckId: string; deckSize: number }
      >;
      setActiveDeck: FunctionReference<
        "mutation",
        "internal",
        {
          deckId: string;
          maxCopies?: number;
          maxLegendaryCopies?: number;
          maxSize?: number;
          minSize?: number;
          userId: string;
        },
        string
      >;
      validateDeck: FunctionReference<
        "query",
        "internal",
        {
          deckId: string;
          maxCopies?: number;
          maxLegendaryCopies?: number;
          maxSize?: number;
          minSize?: number;
        },
        {
          errors: Array<string>;
          isValid: boolean;
          totalCards: number;
          warnings: Array<string>;
        }
      >;
    };
    seeds: {
      seedCardDefinitions: FunctionReference<
        "mutation",
        "internal",
        {
          cards: Array<{
            ability?: any;
            archetype: string;
            attack?: number;
            attribute?: string;
            cardType: string;
            cost: number;
            defense?: number;
            flavorText?: string;
            imageUrl?: string;
            level?: number;
            monsterType?: string;
            name: string;
            rarity: string;
            spellType?: string;
            trapType?: string;
          }>;
        },
        { created: number; skipped: number }
      >;
      seedStarterDecks: FunctionReference<
        "mutation",
        "internal",
        {
          decks: Array<{
            archetype: string;
            cardCount: number;
            deckCode: string;
            description: string;
            name: string;
            playstyle: string;
          }>;
        },
        { created: number; skipped: number }
      >;
    };
  };
  lunchtable_tcg_competitive: {
    brackets: {
      advanceBracket: FunctionReference<
        "mutation",
        "internal",
        { matchId: string; nextMatchId: string },
        null
      >;
      createMatch: FunctionReference<
        "mutation",
        "internal",
        {
          bracketPosition: number;
          matchNumber: number;
          player1Id?: string;
          player1ParticipantId?: string;
          player1SourceMatchId?: string;
          player1Username?: string;
          player2Id?: string;
          player2ParticipantId?: string;
          player2SourceMatchId?: string;
          player2Username?: string;
          round: number;
          scheduledAt?: number;
          tournamentId: string;
        },
        string
      >;
      getMatchById: FunctionReference<
        "query",
        "internal",
        { id: string },
        {
          _creationTime: number;
          _id: string;
          bracketPosition: number;
          completedAt?: number;
          createdAt: number;
          gameId?: string;
          lobbyId?: string;
          loserId?: string;
          loserUsername?: string;
          matchNumber: number;
          player1Id?: string;
          player1ParticipantId?: string;
          player1SourceMatchId?: string;
          player1Username?: string;
          player2Id?: string;
          player2ParticipantId?: string;
          player2SourceMatchId?: string;
          player2Username?: string;
          round: number;
          scheduledAt?: number;
          startedAt?: number;
          status: "pending" | "ready" | "active" | "completed" | "forfeit";
          tournamentId: string;
          updatedAt: number;
          winReason?:
            | "game_win"
            | "opponent_forfeit"
            | "opponent_no_show"
            | "bye";
          winnerId?: string;
          winnerUsername?: string;
        } | null
      >;
      getMatches: FunctionReference<
        "query",
        "internal",
        { tournamentId: string },
        Array<{
          _creationTime: number;
          _id: string;
          bracketPosition: number;
          completedAt?: number;
          createdAt: number;
          gameId?: string;
          lobbyId?: string;
          loserId?: string;
          loserUsername?: string;
          matchNumber: number;
          player1Id?: string;
          player1ParticipantId?: string;
          player1SourceMatchId?: string;
          player1Username?: string;
          player2Id?: string;
          player2ParticipantId?: string;
          player2SourceMatchId?: string;
          player2Username?: string;
          round: number;
          scheduledAt?: number;
          startedAt?: number;
          status: "pending" | "ready" | "active" | "completed" | "forfeit";
          tournamentId: string;
          updatedAt: number;
          winReason?:
            | "game_win"
            | "opponent_forfeit"
            | "opponent_no_show"
            | "bye";
          winnerId?: string;
          winnerUsername?: string;
        }>
      >;
      getRoundMatches: FunctionReference<
        "query",
        "internal",
        { round: number; tournamentId: string },
        Array<{
          _creationTime: number;
          _id: string;
          bracketPosition: number;
          completedAt?: number;
          createdAt: number;
          gameId?: string;
          lobbyId?: string;
          loserId?: string;
          loserUsername?: string;
          matchNumber: number;
          player1Id?: string;
          player1ParticipantId?: string;
          player1SourceMatchId?: string;
          player1Username?: string;
          player2Id?: string;
          player2ParticipantId?: string;
          player2SourceMatchId?: string;
          player2Username?: string;
          round: number;
          scheduledAt?: number;
          startedAt?: number;
          status: "pending" | "ready" | "active" | "completed" | "forfeit";
          tournamentId: string;
          updatedAt: number;
          winReason?:
            | "game_win"
            | "opponent_forfeit"
            | "opponent_no_show"
            | "bye";
          winnerId?: string;
          winnerUsername?: string;
        }>
      >;
      reportResult: FunctionReference<
        "mutation",
        "internal",
        {
          gameId?: string;
          id: string;
          loserId?: string;
          loserUsername?: string;
          winReason?:
            | "game_win"
            | "opponent_forfeit"
            | "opponent_no_show"
            | "bye";
          winnerId: string;
          winnerUsername: string;
        },
        null
      >;
      updateMatchStatus: FunctionReference<
        "mutation",
        "internal",
        {
          id: string;
          status: "pending" | "ready" | "active" | "completed" | "forfeit";
        },
        null
      >;
    };
    history: {
      getRecentHistory: FunctionReference<
        "query",
        "internal",
        { limit?: number },
        Array<{
          _creationTime: number;
          _id: string;
          completedAt: number;
          matchesPlayed: number;
          matchesWon: number;
          maxPlayers: number;
          placement: number;
          prizeWon: number;
          tournamentId: string;
          tournamentName: string;
          userId: string;
        }>
      >;
      getTournamentHistory: FunctionReference<
        "query",
        "internal",
        { tournamentId: string },
        Array<{
          _creationTime: number;
          _id: string;
          completedAt: number;
          matchesPlayed: number;
          matchesWon: number;
          maxPlayers: number;
          placement: number;
          prizeWon: number;
          tournamentId: string;
          tournamentName: string;
          userId: string;
        }>
      >;
      getUserHistory: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          _creationTime: number;
          _id: string;
          completedAt: number;
          matchesPlayed: number;
          matchesWon: number;
          maxPlayers: number;
          placement: number;
          prizeWon: number;
          tournamentId: string;
          tournamentName: string;
          userId: string;
        }>
      >;
      getUserStats: FunctionReference<
        "query",
        "internal",
        { userId: string },
        {
          averagePlacement: number;
          bestPlacement: number;
          totalMatchesPlayed: number;
          totalMatchesWon: number;
          totalPrizesWon: number;
          totalTournaments: number;
        }
      >;
      recordHistory: FunctionReference<
        "mutation",
        "internal",
        {
          matchesPlayed: number;
          matchesWon: number;
          maxPlayers: number;
          placement: number;
          prizeWon: number;
          tournamentId: string;
          tournamentName: string;
          userId: string;
        },
        string
      >;
    };
    matches: {
      getHeadToHead: FunctionReference<
        "query",
        "internal",
        {
          gameType?: "ranked" | "casual" | "story";
          opponentId: string;
          playerId: string;
        },
        {
          losses: number;
          matches: Array<{
            _creationTime: number;
            _id: string;
            completedAt: number;
            gameType: "ranked" | "casual" | "story";
            loserId: string;
            loserRatingAfter: number;
            loserRatingBefore: number;
            winnerId: string;
            winnerRatingAfter: number;
            winnerRatingBefore: number;
            xpAwarded?: number;
          }>;
          wins: number;
        }
      >;
      getPlayerMatches: FunctionReference<
        "query",
        "internal",
        {
          gameType?: "ranked" | "casual" | "story";
          limit?: number;
          playerId: string;
        },
        Array<{
          _creationTime: number;
          _id: string;
          completedAt: number;
          gameType: "ranked" | "casual" | "story";
          loserId: string;
          loserRatingAfter: number;
          loserRatingBefore: number;
          winnerId: string;
          winnerRatingAfter: number;
          winnerRatingBefore: number;
          xpAwarded?: number;
        }>
      >;
      getRecentMatches: FunctionReference<
        "query",
        "internal",
        { gameType?: "ranked" | "casual" | "story"; limit?: number },
        Array<{
          _creationTime: number;
          _id: string;
          completedAt: number;
          gameType: "ranked" | "casual" | "story";
          loserId: string;
          loserRatingAfter: number;
          loserRatingBefore: number;
          winnerId: string;
          winnerRatingAfter: number;
          winnerRatingBefore: number;
          xpAwarded?: number;
        }>
      >;
      recordMatch: FunctionReference<
        "mutation",
        "internal",
        {
          gameType: "ranked" | "casual" | "story";
          loserId: string;
          loserRatingAfter: number;
          loserRatingBefore: number;
          winnerId: string;
          winnerRatingAfter: number;
          winnerRatingBefore: number;
          xpAwarded?: number;
        },
        string
      >;
    };
    participants: {
      awardPrize: FunctionReference<
        "mutation",
        "internal",
        { prizeAmount: number; tournamentId: string; userId: string },
        null
      >;
      checkIn: FunctionReference<
        "mutation",
        "internal",
        { tournamentId: string; userId: string },
        null
      >;
      eliminate: FunctionReference<
        "mutation",
        "internal",
        { eliminatedInRound: number; tournamentId: string; userId: string },
        null
      >;
      getParticipants: FunctionReference<
        "query",
        "internal",
        { tournamentId: string },
        Array<{
          _creationTime: number;
          _id: string;
          bracket?: number;
          checkedInAt?: number;
          currentRound?: number;
          eliminatedInRound?: number;
          finalPlacement?: number;
          prizeAwarded?: number;
          prizeAwardedAt?: number;
          registeredAt: number;
          seedRating: number;
          status:
            | "registered"
            | "checked_in"
            | "active"
            | "eliminated"
            | "winner"
            | "forfeit"
            | "refunded";
          tournamentId: string;
          userId: string;
          username: string;
        }>
      >;
      getUserTournaments: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          _creationTime: number;
          _id: string;
          bracket?: number;
          checkedInAt?: number;
          currentRound?: number;
          eliminatedInRound?: number;
          finalPlacement?: number;
          prizeAwarded?: number;
          prizeAwardedAt?: number;
          registeredAt: number;
          seedRating: number;
          status:
            | "registered"
            | "checked_in"
            | "active"
            | "eliminated"
            | "winner"
            | "forfeit"
            | "refunded";
          tournamentId: string;
          userId: string;
          username: string;
        }>
      >;
      register: FunctionReference<
        "mutation",
        "internal",
        {
          seedRating: number;
          tournamentId: string;
          userId: string;
          username: string;
        },
        string
      >;
      unregister: FunctionReference<
        "mutation",
        "internal",
        { tournamentId: string; userId: string },
        null
      >;
      updateStatus: FunctionReference<
        "mutation",
        "internal",
        {
          currentRound?: number;
          eliminatedInRound?: number;
          finalPlacement?: number;
          status:
            | "registered"
            | "checked_in"
            | "active"
            | "eliminated"
            | "winner"
            | "forfeit"
            | "refunded";
          tournamentId: string;
          userId: string;
        },
        null
      >;
    };
    rankings: {
      getAroundPlayer: FunctionReference<
        "query",
        "internal",
        {
          leaderboardType: "ranked" | "casual" | "story";
          playerId: string;
          playerSegment?: "all" | "humans" | "ai";
          range?: number;
        },
        {
          above: Array<{
            isAiAgent: boolean;
            level?: number;
            losses: number;
            rank: number;
            rating: number;
            userId: string;
            username: string;
            winRate: number;
            wins: number;
          }>;
          below: Array<{
            isAiAgent: boolean;
            level?: number;
            losses: number;
            rank: number;
            rating: number;
            userId: string;
            username: string;
            winRate: number;
            wins: number;
          }>;
          player: {
            isAiAgent: boolean;
            level?: number;
            losses: number;
            rank: number;
            rating: number;
            userId: string;
            username: string;
            winRate: number;
            wins: number;
          } | null;
        }
      >;
      getLeaderboard: FunctionReference<
        "query",
        "internal",
        {
          leaderboardType: "ranked" | "casual" | "story";
          playerSegment?: "all" | "humans" | "ai";
        },
        {
          _creationTime: number;
          _id: string;
          lastUpdated: number;
          leaderboardType: "ranked" | "casual" | "story";
          playerSegment: "all" | "humans" | "ai";
          rankings: Array<{
            isAiAgent: boolean;
            level?: number;
            losses: number;
            rank: number;
            rating: number;
            userId: string;
            username: string;
            winRate: number;
            wins: number;
          }>;
        } | null
      >;
      getPlayerRank: FunctionReference<
        "query",
        "internal",
        {
          leaderboardType: "ranked" | "casual" | "story";
          playerId: string;
          playerSegment?: "all" | "humans" | "ai";
        },
        {
          isAiAgent: boolean;
          level?: number;
          losses: number;
          rank: number;
          rating: number;
          userId: string;
          username: string;
          winRate: number;
          wins: number;
        } | null
      >;
      getTopPlayers: FunctionReference<
        "query",
        "internal",
        {
          leaderboardType: "ranked" | "casual" | "story";
          limit?: number;
          playerSegment?: "all" | "humans" | "ai";
        },
        Array<{
          isAiAgent: boolean;
          level?: number;
          losses: number;
          rank: number;
          rating: number;
          userId: string;
          username: string;
          winRate: number;
          wins: number;
        }>
      >;
    };
    snapshots: {
      createSnapshot: FunctionReference<
        "mutation",
        "internal",
        {
          leaderboardType: "ranked" | "casual" | "story";
          playerSegment: "all" | "humans" | "ai";
          rankings: Array<{
            isAiAgent: boolean;
            level?: number;
            losses: number;
            rank: number;
            rating: number;
            userId: string;
            username: string;
            winRate: number;
            wins: number;
          }>;
        },
        string
      >;
      getSnapshot: FunctionReference<
        "query",
        "internal",
        {
          leaderboardType: "ranked" | "casual" | "story";
          playerSegment: "all" | "humans" | "ai";
        },
        {
          _creationTime: number;
          _id: string;
          lastUpdated: number;
          leaderboardType: "ranked" | "casual" | "story";
          playerSegment: "all" | "humans" | "ai";
          rankings: Array<{
            isAiAgent: boolean;
            level?: number;
            losses: number;
            rank: number;
            rating: number;
            userId: string;
            username: string;
            winRate: number;
            wins: number;
          }>;
        } | null
      >;
      getSnapshotById: FunctionReference<
        "query",
        "internal",
        { id: string },
        {
          _creationTime: number;
          _id: string;
          lastUpdated: number;
          leaderboardType: "ranked" | "casual" | "story";
          playerSegment: "all" | "humans" | "ai";
          rankings: Array<{
            isAiAgent: boolean;
            level?: number;
            losses: number;
            rank: number;
            rating: number;
            userId: string;
            username: string;
            winRate: number;
            wins: number;
          }>;
        } | null
      >;
      getSnapshots: FunctionReference<
        "query",
        "internal",
        {
          leaderboardType?: "ranked" | "casual" | "story";
          playerSegment?: "all" | "humans" | "ai";
        },
        Array<{
          _creationTime: number;
          _id: string;
          lastUpdated: number;
          leaderboardType: "ranked" | "casual" | "story";
          playerSegment: "all" | "humans" | "ai";
          rankings: Array<{
            isAiAgent: boolean;
            level?: number;
            losses: number;
            rank: number;
            rating: number;
            userId: string;
            username: string;
            winRate: number;
            wins: number;
          }>;
        }>
      >;
    };
    tournaments: {
      advanceRound: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        null
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          autoStartOnFull?: boolean;
          checkInEndsAt: number;
          checkInStartsAt: number;
          createdBy: string;
          creatorType?: "admin" | "user";
          description?: string;
          entryFee: number;
          expiresAt?: number;
          format: "single_elimination";
          joinCode?: string;
          maxPlayers: 4 | 8 | 16 | 32;
          mode: "ranked" | "casual";
          name: string;
          prizePool: { first: number; second: number; thirdFourth: number };
          registrationEndsAt: number;
          registrationStartsAt: number;
          scheduledStartAt: number;
          visibility?: "public" | "private";
        },
        string
      >;
      getActive: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          _creationTime: number;
          _id: string;
          actualStartedAt?: number;
          autoStartOnFull?: boolean;
          checkInEndsAt: number;
          checkInStartsAt: number;
          checkedInCount: number;
          completedAt?: number;
          createdAt: number;
          createdBy: string;
          creatorType?: "admin" | "user";
          currentRound: number;
          description?: string;
          entryFee: number;
          expiresAt?: number;
          format: "single_elimination";
          joinCode?: string;
          maxPlayers: 4 | 8 | 16 | 32;
          mode: "ranked" | "casual";
          name: string;
          prizePool: { first: number; second: number; thirdFourth: number };
          registeredCount: number;
          registrationEndsAt: number;
          registrationStartsAt: number;
          scheduledStartAt: number;
          secondPlaceId?: string;
          secondPlaceUsername?: string;
          status:
            | "registration"
            | "checkin"
            | "active"
            | "completed"
            | "cancelled";
          totalRounds?: number;
          updatedAt: number;
          visibility?: "public" | "private";
          winnerId?: string;
          winnerUsername?: string;
        }>
      >;
      getByCreator: FunctionReference<
        "query",
        "internal",
        {
          createdBy: string;
          status?:
            | "registration"
            | "checkin"
            | "active"
            | "completed"
            | "cancelled";
        },
        Array<{
          _creationTime: number;
          _id: string;
          actualStartedAt?: number;
          autoStartOnFull?: boolean;
          checkInEndsAt: number;
          checkInStartsAt: number;
          checkedInCount: number;
          completedAt?: number;
          createdAt: number;
          createdBy: string;
          creatorType?: "admin" | "user";
          currentRound: number;
          description?: string;
          entryFee: number;
          expiresAt?: number;
          format: "single_elimination";
          joinCode?: string;
          maxPlayers: 4 | 8 | 16 | 32;
          mode: "ranked" | "casual";
          name: string;
          prizePool: { first: number; second: number; thirdFourth: number };
          registeredCount: number;
          registrationEndsAt: number;
          registrationStartsAt: number;
          scheduledStartAt: number;
          secondPlaceId?: string;
          secondPlaceUsername?: string;
          status:
            | "registration"
            | "checkin"
            | "active"
            | "completed"
            | "cancelled";
          totalRounds?: number;
          updatedAt: number;
          visibility?: "public" | "private";
          winnerId?: string;
          winnerUsername?: string;
        }>
      >;
      getById: FunctionReference<
        "query",
        "internal",
        { id: string },
        {
          _creationTime: number;
          _id: string;
          actualStartedAt?: number;
          autoStartOnFull?: boolean;
          checkInEndsAt: number;
          checkInStartsAt: number;
          checkedInCount: number;
          completedAt?: number;
          createdAt: number;
          createdBy: string;
          creatorType?: "admin" | "user";
          currentRound: number;
          description?: string;
          entryFee: number;
          expiresAt?: number;
          format: "single_elimination";
          joinCode?: string;
          maxPlayers: 4 | 8 | 16 | 32;
          mode: "ranked" | "casual";
          name: string;
          prizePool: { first: number; second: number; thirdFourth: number };
          registeredCount: number;
          registrationEndsAt: number;
          registrationStartsAt: number;
          scheduledStartAt: number;
          secondPlaceId?: string;
          secondPlaceUsername?: string;
          status:
            | "registration"
            | "checkin"
            | "active"
            | "completed"
            | "cancelled";
          totalRounds?: number;
          updatedAt: number;
          visibility?: "public" | "private";
          winnerId?: string;
          winnerUsername?: string;
        } | null
      >;
      updateSettings: FunctionReference<
        "mutation",
        "internal",
        {
          id: string;
          settings: {
            autoStartOnFull?: boolean;
            checkInEndsAt?: number;
            checkInStartsAt?: number;
            description?: string;
            expiresAt?: number;
            name?: string;
            registrationEndsAt?: number;
            registrationStartsAt?: number;
            scheduledStartAt?: number;
            visibility?: "public" | "private";
          };
        },
        null
      >;
      updateStatus: FunctionReference<
        "mutation",
        "internal",
        {
          id: string;
          status:
            | "registration"
            | "checkin"
            | "active"
            | "completed"
            | "cancelled";
        },
        null
      >;
    };
  };
  lunchtable_tcg_content: {
    feedback: {
      getFeedback: FunctionReference<
        "query",
        "internal",
        {
          limit?: number;
          status?: "new" | "triaged" | "in_progress" | "resolved" | "closed";
          type?: "bug" | "feature";
          userId?: string;
        },
        any
      >;
      getFeedbackById: FunctionReference<
        "query",
        "internal",
        { feedbackId: string },
        any
      >;
      submitFeedback: FunctionReference<
        "mutation",
        "internal",
        {
          description: string;
          pageUrl: string;
          priority?: "low" | "medium" | "high" | "critical";
          recordingUrl?: string;
          screenshotUrl?: string;
          status?: "new" | "triaged" | "in_progress" | "resolved" | "closed";
          title: string;
          type: "bug" | "feature";
          userAgent: string;
          userId: string;
          username: string;
          viewport: { height: number; width: number };
        },
        string
      >;
      updateFeedbackStatus: FunctionReference<
        "mutation",
        "internal",
        {
          adminNotes?: string;
          assignedTo?: string;
          feedbackId: string;
          priority?: "low" | "medium" | "high" | "critical";
          resolvedAt?: number;
          resolvedBy?: string;
          status: "new" | "triaged" | "in_progress" | "resolved" | "closed";
        },
        null
      >;
    };
    news: {
      createNewsArticle: FunctionReference<
        "mutation",
        "internal",
        {
          authorId: string;
          category:
            | "update"
            | "event"
            | "patch"
            | "announcement"
            | "maintenance";
          content: string;
          excerpt: string;
          imageUrl?: string;
          isPinned: boolean;
          isPublished: boolean;
          publishedAt?: number;
          slug: string;
          title: string;
        },
        string
      >;
      deleteNewsArticle: FunctionReference<
        "mutation",
        "internal",
        { articleId: string },
        null
      >;
      getNewsArticle: FunctionReference<
        "query",
        "internal",
        { articleId: string },
        any
      >;
      getNewsArticleBySlug: FunctionReference<
        "query",
        "internal",
        { slug: string },
        any
      >;
      getNewsArticles: FunctionReference<
        "query",
        "internal",
        {
          category?:
            | "update"
            | "event"
            | "patch"
            | "announcement"
            | "maintenance";
          isPublished?: boolean;
          limit?: number;
        },
        any
      >;
      updateNewsArticle: FunctionReference<
        "mutation",
        "internal",
        { articleId: string; updates: any },
        null
      >;
    };
    scheduledContent: {
      createScheduledContent: FunctionReference<
        "mutation",
        "internal",
        {
          authorId: string;
          content: string;
          metadata: {
            altText?: string;
            caption?: string;
            excerpt?: string;
            expiresAt?: number;
            featuredImage?: string;
            imageUrl?: string;
            newsArticleId?: string;
            priority?: "normal" | "important" | "urgent";
            recipientListId?: string;
            recipientType?: "players" | "subscribers" | "both" | "custom";
            redditPostId?: string;
            slug?: string;
            subject?: string;
            subreddit?: string;
            templateId?: string;
            tweetId?: string;
          };
          publishError?: string;
          publishedAt?: number;
          scheduledFor: number;
          status: "draft" | "scheduled" | "published" | "failed";
          title: string;
          type:
            | "blog"
            | "x_post"
            | "reddit"
            | "email"
            | "announcement"
            | "news"
            | "image";
        },
        string
      >;
      deleteScheduledContent: FunctionReference<
        "mutation",
        "internal",
        { contentId: string },
        null
      >;
      getScheduledContent: FunctionReference<
        "query",
        "internal",
        {
          status?: "draft" | "scheduled" | "published" | "failed";
          type?:
            | "blog"
            | "x_post"
            | "reddit"
            | "email"
            | "announcement"
            | "news"
            | "image";
        },
        any
      >;
      getScheduledContentById: FunctionReference<
        "query",
        "internal",
        { contentId: string },
        any
      >;
      updateScheduledContent: FunctionReference<
        "mutation",
        "internal",
        { contentId: string; updates: any },
        null
      >;
    };
  };
  lunchtable_tcg_economy: {
    currency: {
      adjustPlayerCurrency: FunctionReference<
        "mutation",
        "internal",
        {
          amount: number;
          currencyType: "gold" | "gems";
          description: string;
          metadata?: any;
          referenceId?: string;
          transactionType:
            | "purchase"
            | "reward"
            | "sale"
            | "gift"
            | "refund"
            | "admin_refund"
            | "conversion"
            | "marketplace_fee"
            | "auction_bid"
            | "auction_refund"
            | "wager"
            | "wager_payout"
            | "wager_refund"
            | "tournament_entry"
            | "tournament_refund"
            | "tournament_prize";
          userId: string;
        },
        { gems: number; gold: number }
      >;
      getPlayerBalance: FunctionReference<
        "query",
        "internal",
        { userId: string },
        {
          gems: number;
          gold: number;
          lastUpdatedAt: number;
          lifetimeGemsEarned: number;
          lifetimeGemsSpent: number;
          lifetimeGoldEarned: number;
          lifetimeGoldSpent: number;
        }
      >;
      getTransactionHistory: FunctionReference<
        "query",
        "internal",
        { limit?: number; userId: string },
        Array<any>
      >;
      getTransactionHistoryPaginated: FunctionReference<
        "query",
        "internal",
        {
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          userId: string;
        },
        any
      >;
      initializePlayerCurrency: FunctionReference<
        "mutation",
        "internal",
        { userId: string; welcomeBonus: { gems: number; gold: number } },
        null
      >;
    };
    promoCodes: {
      createPromoCode: FunctionReference<
        "mutation",
        "internal",
        {
          code: string;
          description: string;
          expiresAt?: number;
          isActive: boolean;
          maxRedemptions?: number;
          rewardAmount: number;
          rewardPackId?: string;
          rewardType: "gold" | "gems" | "pack";
        },
        string
      >;
      getPromoCode: FunctionReference<
        "query",
        "internal",
        { code: string },
        any
      >;
      getUserRedemptions: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any
      >;
      redeemPromoCode: FunctionReference<
        "mutation",
        "internal",
        { code: string; userId: string },
        {
          rewardAmount: number;
          rewardPackId?: string;
          rewardType: "gold" | "gems" | "pack";
        }
      >;
    };
    rewards: {
      getDailyRewardStatus: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any
      >;
      getRewardHistory: FunctionReference<
        "query",
        "internal",
        { limit?: number; userId: string },
        any
      >;
      recordRewardClaim: FunctionReference<
        "mutation",
        "internal",
        {
          jackpotResult?: {
            prizeType?: string;
            rollValue?: number;
            won: boolean;
          };
          reward: {
            amount?: number;
            cardId?: string;
            packId?: string;
            serialNumber?: number;
            type: "pack" | "gold" | "gems" | "card" | "lottery_ticket";
            variant?: string;
          };
          rewardType:
            | "daily_pack"
            | "weekly_jackpot"
            | "login_streak"
            | "season_end"
            | "event";
          userId: string;
        },
        string
      >;
    };
    rngConfig: {
      getRngConfig: FunctionReference<
        "query",
        "internal",
        {},
        {
          pityThresholds: { epic: number; fullArt: number; legendary: number };
          rarityWeights: {
            common: number;
            epic: number;
            legendary: number;
            rare: number;
            uncommon: number;
          };
          variantRates: {
            altArt: number;
            foil: number;
            fullArt: number;
            standard: number;
          };
        } | null
      >;
      setRngConfig: FunctionReference<
        "mutation",
        "internal",
        {
          pityThresholds?: { epic: number; fullArt: number; legendary: number };
          rarityWeights?: {
            common: number;
            epic: number;
            legendary: number;
            rare: number;
            uncommon: number;
          };
          variantRates?: {
            altArt: number;
            foil: number;
            fullArt: number;
            standard: number;
          };
        },
        null
      >;
    };
    sales: {
      createSale: FunctionReference<
        "mutation",
        "internal",
        {
          applicableProductTypes?: Array<
            "pack" | "box" | "currency" | "gem_package"
          >;
          applicableProducts: Array<string>;
          bonusCards?: number;
          bonusGems?: number;
          conditions?: {
            maxUsesPerUser?: number;
            maxUsesTotal?: number;
            minPlayerLevel?: number;
            minPurchaseAmount?: number;
            newPlayerOnly?: boolean;
            returningPlayerOnly?: boolean;
          };
          createdBy: string;
          description: string;
          discountPercent?: number;
          endsAt: number;
          isActive: boolean;
          name: string;
          priority: number;
          saleId: string;
          saleType:
            | "flash"
            | "weekend"
            | "launch"
            | "holiday"
            | "anniversary"
            | "returning";
          startsAt: number;
        },
        string
      >;
      getActiveSales: FunctionReference<"query", "internal", {}, any>;
      getDiscountedPrice: FunctionReference<
        "query",
        "internal",
        { productId: string; userId: string },
        any
      >;
      getSalesForProduct: FunctionReference<
        "query",
        "internal",
        { productId: string },
        any
      >;
      recordSaleUsage: FunctionReference<
        "mutation",
        "internal",
        {
          discountedPrice: number;
          originalPrice: number;
          productId: string;
          saleId: string;
          userId: string;
        },
        null
      >;
    };
    seeds: {
      seedShopProducts: FunctionReference<
        "mutation",
        "internal",
        {
          products: Array<{
            boxConfig?: {
              bonusCards?: number;
              packCount: number;
              packProductId: string;
            };
            currencyConfig?: { amount: number; currencyType: "gold" | "gems" };
            description: string;
            gemPrice?: number;
            goldPrice?: number;
            isActive: boolean;
            name: string;
            packConfig?: {
              allRareOrBetter?: boolean;
              archetype?: string;
              cardCount: number;
              guaranteedCount?: number;
              guaranteedRarity?: string;
              variantMultipliers?: {
                altArt: number;
                foil: number;
                fullArt: number;
              };
            };
            productId: string;
            productType: "pack" | "box" | "currency";
            sortOrder: number;
          }>;
        },
        { inserted: number; skipped: number }
      >;
    };
    shop: {
      createProduct: FunctionReference<
        "mutation",
        "internal",
        {
          boxConfig?: {
            bonusCards?: number;
            packCount: number;
            packProductId: string;
          };
          currencyConfig?: { amount: number; currencyType: "gold" | "gems" };
          description: string;
          gemPrice?: number;
          goldPrice?: number;
          isActive: boolean;
          name: string;
          packConfig?: {
            allRareOrBetter?: boolean;
            archetype?: string;
            cardCount: number;
            guaranteedCount?: number;
            guaranteedRarity?: string;
            variantMultipliers?: {
              altArt: number;
              foil: number;
              fullArt: number;
            };
          };
          productId: string;
          productType: "pack" | "box" | "currency";
          sortOrder: number;
        },
        string
      >;
      getPackOpeningHistory: FunctionReference<
        "query",
        "internal",
        { limit?: number; userId: string },
        any
      >;
      getPackOpeningHistoryPaginated: FunctionReference<
        "query",
        "internal",
        {
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          userId: string;
        },
        any
      >;
      getPityState: FunctionReference<
        "query",
        "internal",
        { userId: string },
        null | {
          _creationTime: number;
          _id: any;
          lastLegendaryAt?: number;
          packsSinceLastLegendary: number;
          userId: string;
        }
      >;
      getProduct: FunctionReference<
        "query",
        "internal",
        { productId: string },
        any
      >;
      getShopProducts: FunctionReference<"query", "internal", {}, any>;
      recordPackOpening: FunctionReference<
        "mutation",
        "internal",
        {
          amountPaid: number;
          cardsReceived: Array<{
            cardDefinitionId: string;
            name: string;
            rarity: string;
            serialNumber?: number;
            variant?: string;
          }>;
          currencyUsed: "gold" | "gems" | "token" | "free";
          packType: string;
          pityTriggered?: {
            epic?: boolean;
            fullArt?: boolean;
            legendary?: boolean;
          };
          productId: string;
          userId: string;
        },
        string
      >;
      updatePityState: FunctionReference<
        "mutation",
        "internal",
        {
          lastLegendaryAt?: number;
          packsSinceLastLegendary: number;
          userId: string;
        },
        null
      >;
      updateProduct: FunctionReference<
        "mutation",
        "internal",
        {
          productId: string;
          updates: {
            description?: string;
            gemPrice?: number;
            goldPrice?: number;
            isActive?: boolean;
            name?: string;
            packConfig?: {
              allRareOrBetter?: boolean;
              archetype?: string;
              cardCount: number;
              guaranteedCount?: number;
              guaranteedRarity?: string;
              variantMultipliers?: {
                altArt: number;
                foil: number;
                fullArt: number;
              };
            };
            sortOrder?: number;
          };
        },
        null
      >;
    };
    wager: {
      getPlayerBalance: FunctionReference<
        "query",
        "internal",
        { currency?: "sol" | "usdc"; userId: string },
        any
      >;
      getPlayerTransactions: FunctionReference<
        "query",
        "internal",
        { limit?: number; userId: string },
        any
      >;
      getTransactionById: FunctionReference<
        "query",
        "internal",
        { id: string },
        any
      >;
      getTransactionsByLobby: FunctionReference<
        "query",
        "internal",
        { lobbyId: string },
        any
      >;
      recordTransaction: FunctionReference<
        "mutation",
        "internal",
        {
          amount: number;
          amountAtomic: string;
          currency: "sol" | "usdc";
          escrowPda: string;
          lobbyId: string;
          status?: "pending" | "confirmed" | "failed";
          txSignature?: string;
          type: "deposit" | "payout" | "treasury_fee";
          userId: string;
          walletAddress: string;
        },
        string
      >;
      updateTransactionStatus: FunctionReference<
        "mutation",
        "internal",
        {
          id: string;
          status: "pending" | "confirmed" | "failed";
          txSignature?: string;
        },
        null
      >;
    };
  };
  lunchtable_tcg_email: {
    history: {
      getEmailHistory: FunctionReference<
        "query",
        "internal",
        { limit?: number },
        any
      >;
      getHistoryByContent: FunctionReference<
        "query",
        "internal",
        { scheduledContentId: string },
        any
      >;
      recordEmailSend: FunctionReference<
        "mutation",
        "internal",
        {
          recipientCount: number;
          resendBatchId?: string;
          scheduledContentId?: string;
          sentBy: string;
          subject: string;
          templateId?: string;
        },
        string
      >;
      updateEmailHistory: FunctionReference<
        "mutation",
        "internal",
        { historyId: string; updates: any },
        null
      >;
    };
    lists: {
      addSubscriber: FunctionReference<
        "mutation",
        "internal",
        { email: string; listId: string; name?: string; tags?: Array<string> },
        string
      >;
      createList: FunctionReference<
        "mutation",
        "internal",
        { createdBy: string; description?: string; name: string },
        string
      >;
      getList: FunctionReference<"query", "internal", { listId: string }, any>;
      getLists: FunctionReference<"query", "internal", {}, any>;
      getSubscribers: FunctionReference<
        "query",
        "internal",
        { activeOnly?: boolean; listId: string },
        any
      >;
      removeSubscriber: FunctionReference<
        "mutation",
        "internal",
        { subscriberId: string },
        null
      >;
      updateList: FunctionReference<
        "mutation",
        "internal",
        { listId: string; updates: any },
        null
      >;
    };
    templates: {
      createTemplate: FunctionReference<
        "mutation",
        "internal",
        {
          body: string;
          category:
            | "newsletter"
            | "announcement"
            | "promotional"
            | "transactional"
            | "custom";
          createdBy: string;
          isActive: boolean;
          name: string;
          subject: string;
          variables: Array<string>;
        },
        string
      >;
      deleteTemplate: FunctionReference<
        "mutation",
        "internal",
        { templateId: string },
        null
      >;
      getTemplate: FunctionReference<
        "query",
        "internal",
        { templateId: string },
        any
      >;
      getTemplates: FunctionReference<
        "query",
        "internal",
        {
          category?:
            | "newsletter"
            | "announcement"
            | "promotional"
            | "transactional"
            | "custom";
          isActive?: boolean;
        },
        any
      >;
      updateTemplate: FunctionReference<
        "mutation",
        "internal",
        { templateId: string; updates: any },
        null
      >;
    };
  };
  lunchtable_tcg_game: {
    events: {
      getEventsForGame: FunctionReference<
        "query",
        "internal",
        { gameId: string; limit?: number },
        Array<any>
      >;
      getEventsForLobby: FunctionReference<
        "query",
        "internal",
        { limit?: number; lobbyId: string },
        Array<any>
      >;
      recordEvent: FunctionReference<
        "mutation",
        "internal",
        {
          description: string;
          eventType: string;
          gameId: string;
          lobbyId: string;
          metadata?: any;
          playerId: string;
          playerUsername: string;
          timestamp: number;
          turnNumber: number;
        },
        string
      >;
    };
    lobbies: {
      createLobby: FunctionReference<
        "mutation",
        "internal",
        {
          allowSpectators?: boolean;
          cryptoEscrowPda?: string;
          cryptoHostWallet?: string;
          cryptoWagerCurrency?: string;
          cryptoWagerTier?: number;
          deckArchetype: string;
          hostId: string;
          hostRank: string;
          hostRating: number;
          hostUsername: string;
          isPrivate: boolean;
          joinCode?: string;
          maxRatingDiff?: number;
          maxSpectators?: number;
          mode: string;
          stageId?: string;
          wagerAmount?: number;
        },
        string
      >;
      getActiveLobbies: FunctionReference<
        "query",
        "internal",
        { limit?: number; mode?: string; status?: string },
        Array<any>
      >;
      getLobbiesByHost: FunctionReference<
        "query",
        "internal",
        { hostId: string; limit?: number },
        Array<any>
      >;
      getLobby: FunctionReference<
        "query",
        "internal",
        { lobbyId: string },
        any
      >;
      getLobbyByJoinCode: FunctionReference<
        "query",
        "internal",
        { joinCode: string },
        any
      >;
      updateLobby: FunctionReference<
        "mutation",
        "internal",
        { lobbyId: string; updates: any },
        null
      >;
    };
    matchmaking: {
      getQueueEntries: FunctionReference<
        "query",
        "internal",
        { limit?: number; mode?: string },
        Array<any>
      >;
      getQueueEntry: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any
      >;
      joinQueue: FunctionReference<
        "mutation",
        "internal",
        {
          deckArchetype: string;
          mode: string;
          rating: number;
          userId: string;
          username: string;
        },
        string
      >;
      leaveQueue: FunctionReference<
        "mutation",
        "internal",
        { userId: string },
        null
      >;
    };
    states: {
      createGameState: FunctionReference<
        "mutation",
        "internal",
        { state: any },
        string
      >;
      getGameState: FunctionReference<
        "query",
        "internal",
        { stateId: string },
        any
      >;
      getGameStateByLobby: FunctionReference<
        "query",
        "internal",
        { lobbyId: string },
        any
      >;
      updateGameState: FunctionReference<
        "mutation",
        "internal",
        { stateId: string; updates: any },
        null
      >;
    };
  };
  lunchtable_tcg_guilds: {
    chat: {
      deleteMessage: FunctionReference<
        "mutation",
        "internal",
        { deletedBy: string; messageId: string },
        null
      >;
      getMessages: FunctionReference<
        "query",
        "internal",
        { before?: number; guildId: string; limit?: number },
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          guildId: string;
          isSystem: boolean;
          message: string;
          userId: string;
          username: string;
        }>
      >;
      getRecentMessages: FunctionReference<
        "query",
        "internal",
        { count?: number; guildId: string },
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          guildId: string;
          isSystem: boolean;
          message: string;
          userId: string;
          username: string;
        }>
      >;
      sendMessage: FunctionReference<
        "mutation",
        "internal",
        {
          guildId: string;
          isSystem?: boolean;
          message: string;
          userId: string;
          username: string;
        },
        string
      >;
    };
    discovery: {
      approveJoinRequest: FunctionReference<
        "mutation",
        "internal",
        { approvedBy: string; requestId: string },
        null
      >;
      getJoinRequests: FunctionReference<
        "query",
        "internal",
        { guildId: string },
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          guildId: string;
          message?: string;
          respondedAt?: number;
          respondedBy?: string;
          status: "pending" | "approved" | "rejected" | "cancelled";
          userId: string;
        }>
      >;
      getPlayerRequests: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          guildId: string;
          message?: string;
          respondedAt?: number;
          respondedBy?: string;
          status: "pending" | "approved" | "rejected" | "cancelled";
          userId: string;
        }>
      >;
      rejectJoinRequest: FunctionReference<
        "mutation",
        "internal",
        { rejectedBy: string; requestId: string },
        null
      >;
      searchGuilds: FunctionReference<
        "query",
        "internal",
        { limit?: number; searchTerm: string },
        Array<{
          _creationTime: number;
          _id: string;
          bannerImageId?: string;
          createdAt: number;
          description?: string;
          memberCount: number;
          name: string;
          ownerId: string;
          profileImageId?: string;
          updatedAt: number;
          visibility: "public" | "private";
        }>
      >;
      submitJoinRequest: FunctionReference<
        "mutation",
        "internal",
        { guildId: string; message?: string; userId: string },
        string
      >;
    };
    guilds: {
      create: FunctionReference<
        "mutation",
        "internal",
        {
          bannerImageId?: string;
          description?: string;
          name: string;
          ownerId: string;
          profileImageId?: string;
          visibility?: "public" | "private";
        },
        string
      >;
      disband: FunctionReference<
        "mutation",
        "internal",
        { id: string; ownerId: string },
        null
      >;
      getById: FunctionReference<
        "query",
        "internal",
        { id: string },
        {
          _creationTime: number;
          _id: string;
          bannerImageId?: string;
          createdAt: number;
          description?: string;
          memberCount: number;
          name: string;
          ownerId: string;
          profileImageId?: string;
          updatedAt: number;
          visibility: "public" | "private";
        } | null
      >;
      getByOwner: FunctionReference<
        "query",
        "internal",
        { ownerId: string },
        Array<{
          _creationTime: number;
          _id: string;
          bannerImageId?: string;
          createdAt: number;
          description?: string;
          memberCount: number;
          name: string;
          ownerId: string;
          profileImageId?: string;
          updatedAt: number;
          visibility: "public" | "private";
        }>
      >;
      getPublicGuilds: FunctionReference<
        "query",
        "internal",
        { limit?: number },
        Array<{
          _creationTime: number;
          _id: string;
          bannerImageId?: string;
          createdAt: number;
          description?: string;
          memberCount: number;
          name: string;
          ownerId: string;
          profileImageId?: string;
          updatedAt: number;
          visibility: "public" | "private";
        }>
      >;
      update: FunctionReference<
        "mutation",
        "internal",
        {
          bannerImageId?: string;
          description?: string;
          id: string;
          name?: string;
          ownerId: string;
          profileImageId?: string;
          visibility?: "public" | "private";
        },
        null
      >;
    };
    invites: {
      acceptInvite: FunctionReference<
        "mutation",
        "internal",
        { inviteId: string; userId: string },
        string
      >;
      cancelInvite: FunctionReference<
        "mutation",
        "internal",
        { cancelledBy: string; inviteId: string },
        null
      >;
      createInvite: FunctionReference<
        "mutation",
        "internal",
        {
          expiresIn?: number;
          guildId: string;
          invitedBy: string;
          invitedUserId: string;
        },
        string
      >;
      createInviteLink: FunctionReference<
        "mutation",
        "internal",
        {
          createdBy: string;
          expiresIn?: number;
          guildId: string;
          maxUses?: number;
        },
        string
      >;
      declineInvite: FunctionReference<
        "mutation",
        "internal",
        { inviteId: string; userId: string },
        null
      >;
      deleteInviteLink: FunctionReference<
        "mutation",
        "internal",
        { deletedBy: string; linkId: string },
        null
      >;
      getGuildInviteLinks: FunctionReference<
        "query",
        "internal",
        { activeOnly?: boolean; guildId: string },
        Array<{
          _creationTime: number;
          _id: string;
          code: string;
          createdAt: number;
          createdBy: string;
          expiresAt: number;
          guildId: string;
          isActive: boolean;
          maxUses?: number;
          uses: number;
        }>
      >;
      getGuildInvites: FunctionReference<
        "query",
        "internal",
        {
          guildId: string;
          status?: "pending" | "accepted" | "declined" | "expired";
        },
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          expiresAt: number;
          guildId: string;
          invitedBy: string;
          invitedUserId: string;
          respondedAt?: number;
          status: "pending" | "accepted" | "declined" | "expired";
        }>
      >;
      getPendingInvites: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          expiresAt: number;
          guildId: string;
          invitedBy: string;
          invitedUserId: string;
          respondedAt?: number;
          status: "pending" | "accepted" | "declined" | "expired";
        }>
      >;
      useInviteLink: FunctionReference<
        "mutation",
        "internal",
        { code: string; userId: string },
        string
      >;
    };
    members: {
      getMemberCount: FunctionReference<
        "query",
        "internal",
        { guildId: string },
        number
      >;
      getMembers: FunctionReference<
        "query",
        "internal",
        { guildId: string },
        Array<{
          _creationTime: number;
          _id: string;
          guildId: string;
          joinedAt: number;
          lastActiveAt?: number;
          role: "owner" | "member";
          userId: string;
        }>
      >;
      getPlayerGuild: FunctionReference<
        "query",
        "internal",
        { userId: string },
        {
          guild: {
            _creationTime: number;
            _id: string;
            bannerImageId?: string;
            createdAt: number;
            description?: string;
            memberCount: number;
            name: string;
            ownerId: string;
            profileImageId?: string;
            updatedAt: number;
            visibility: "public" | "private";
          };
          membership: {
            _creationTime: number;
            _id: string;
            guildId: string;
            joinedAt: number;
            lastActiveAt?: number;
            role: "owner" | "member";
            userId: string;
          };
        } | null
      >;
      join: FunctionReference<
        "mutation",
        "internal",
        { guildId: string; userId: string },
        string
      >;
      kick: FunctionReference<
        "mutation",
        "internal",
        { guildId: string; kickedBy: string; targetUserId: string },
        null
      >;
      leave: FunctionReference<
        "mutation",
        "internal",
        { guildId: string; userId: string },
        null
      >;
      transferOwnership: FunctionReference<
        "mutation",
        "internal",
        { currentOwnerId: string; guildId: string; newOwnerId: string },
        null
      >;
      updateRole: FunctionReference<
        "mutation",
        "internal",
        {
          guildId: string;
          newRole: "owner" | "member";
          targetUserId: string;
          updatedBy: string;
        },
        null
      >;
    };
  };
  lunchtable_tcg_marketplace: {
    analytics: {
      getPriceHistory: FunctionReference<
        "query",
        "internal",
        { cardDefinitionId: string; limit?: number },
        Array<{
          _creationTime: number;
          _id: string;
          cardDefinitionId: string;
          currencyType: "gold" | "token";
          listingType: "fixed" | "auction";
          sellerId: string;
          soldAt: number;
          soldFor: number;
          soldTo: string;
        }>
      >;
      getRecentTransactions: FunctionReference<
        "query",
        "internal",
        { limit?: number },
        Array<{
          _creationTime: number;
          _id: string;
          cardDefinitionId: string;
          currencyType: "gold" | "token";
          listingType: "fixed" | "auction";
          sellerId: string;
          soldAt: number;
          soldFor: number;
          soldTo: string;
        }>
      >;
      getTransactionHistory: FunctionReference<
        "query",
        "internal",
        { limit?: number; role?: "buyer" | "seller"; userId: string },
        Array<{
          _creationTime: number;
          _id: string;
          cardDefinitionId: string;
          currencyType: "gold" | "token";
          listingType: "fixed" | "auction";
          sellerId: string;
          soldAt: number;
          soldFor: number;
          soldTo: string;
        }>
      >;
    };
    bids: {
      getBidsForListing: FunctionReference<
        "query",
        "internal",
        { listingId: string },
        Array<{
          _creationTime: number;
          _id: string;
          bidAmount: number;
          bidStatus: "active" | "outbid" | "won" | "refunded" | "cancelled";
          bidderId: string;
          bidderUsername: string;
          createdAt: number;
          listingId: string;
          refunded?: boolean;
          refundedAt?: number;
        }>
      >;
      getPlayerBids: FunctionReference<
        "query",
        "internal",
        {
          bidStatus?: "active" | "outbid" | "won" | "refunded" | "cancelled";
          bidderId: string;
        },
        Array<{
          _creationTime: number;
          _id: string;
          bidAmount: number;
          bidStatus: "active" | "outbid" | "won" | "refunded" | "cancelled";
          bidderId: string;
          bidderUsername: string;
          createdAt: number;
          listingId: string;
          refunded?: boolean;
          refundedAt?: number;
        }>
      >;
      placeBid: FunctionReference<
        "mutation",
        "internal",
        {
          bidAmount: number;
          bidderId: string;
          bidderUsername: string;
          listingId: string;
        },
        string
      >;
      resolveAuction: FunctionReference<
        "mutation",
        "internal",
        { listingId: string },
        { winAmount: number; winnerId: string } | null
      >;
    };
    listings: {
      cancelListing: FunctionReference<
        "mutation",
        "internal",
        { listingId: string; sellerId: string },
        null
      >;
      createListing: FunctionReference<
        "mutation",
        "internal",
        {
          cardDefinitionId: string;
          currencyType?: "gold" | "token";
          endsAt?: number;
          listingType: "fixed" | "auction";
          price: number;
          quantity: number;
          sellerId: string;
          sellerUsername: string;
          tokenPrice?: number;
        },
        string
      >;
      expireListings: FunctionReference<"mutation", "internal", {}, number>;
      getActive: FunctionReference<
        "query",
        "internal",
        { currencyType?: "gold" | "token"; listingType?: "fixed" | "auction" },
        Array<{
          _creationTime: number;
          _id: string;
          bidCount: number;
          cardDefinitionId: string;
          claimed?: boolean;
          createdAt: number;
          currencyType?: "gold" | "token";
          currentBid?: number;
          endsAt?: number;
          highestBidderId?: string;
          highestBidderUsername?: string;
          listingType: "fixed" | "auction";
          platformFee?: number;
          price: number;
          quantity: number;
          sellerId: string;
          sellerUsername: string;
          soldAt?: number;
          soldFor?: number;
          soldTo?: string;
          status: "active" | "sold" | "cancelled" | "expired" | "suspended";
          tokenPrice?: number;
          updatedAt: number;
        }>
      >;
      getById: FunctionReference<
        "query",
        "internal",
        { id: string },
        {
          _creationTime: number;
          _id: string;
          bidCount: number;
          cardDefinitionId: string;
          claimed?: boolean;
          createdAt: number;
          currencyType?: "gold" | "token";
          currentBid?: number;
          endsAt?: number;
          highestBidderId?: string;
          highestBidderUsername?: string;
          listingType: "fixed" | "auction";
          platformFee?: number;
          price: number;
          quantity: number;
          sellerId: string;
          sellerUsername: string;
          soldAt?: number;
          soldFor?: number;
          soldTo?: string;
          status: "active" | "sold" | "cancelled" | "expired" | "suspended";
          tokenPrice?: number;
          updatedAt: number;
        } | null
      >;
      getBySeller: FunctionReference<
        "query",
        "internal",
        {
          sellerId: string;
          status?: "active" | "sold" | "cancelled" | "expired" | "suspended";
        },
        Array<{
          _creationTime: number;
          _id: string;
          bidCount: number;
          cardDefinitionId: string;
          claimed?: boolean;
          createdAt: number;
          currencyType?: "gold" | "token";
          currentBid?: number;
          endsAt?: number;
          highestBidderId?: string;
          highestBidderUsername?: string;
          listingType: "fixed" | "auction";
          platformFee?: number;
          price: number;
          quantity: number;
          sellerId: string;
          sellerUsername: string;
          soldAt?: number;
          soldFor?: number;
          soldTo?: string;
          status: "active" | "sold" | "cancelled" | "expired" | "suspended";
          tokenPrice?: number;
          updatedAt: number;
        }>
      >;
      purchaseListing: FunctionReference<
        "mutation",
        "internal",
        { buyerId: string; buyerUsername: string; listingId: string },
        null
      >;
    };
    shop: {
      createProduct: FunctionReference<
        "mutation",
        "internal",
        {
          category: string;
          currency: string;
          description: string;
          imageUrl?: string;
          metadata?: any;
          name: string;
          price: number;
          stock?: number;
        },
        string
      >;
      createSale: FunctionReference<
        "mutation",
        "internal",
        {
          discountPercent: number;
          endTime: number;
          metadata?: any;
          name: string;
          productIds?: Array<string>;
          startTime: number;
        },
        string
      >;
      getActiveSales: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          discountPercent: number;
          endTime: number;
          isActive: boolean;
          metadata?: any;
          name: string;
          productIds?: Array<string>;
          startTime: number;
        }>
      >;
      getPriceCaps: FunctionReference<
        "query",
        "internal",
        { cardDefinitionId?: string; isActive?: boolean },
        Array<{
          _creationTime: number;
          _id: string;
          cardDefinitionId: string;
          createdAt: number;
          isActive: boolean;
          maxPrice: number;
          reason: string;
          setBy: string;
          setByUsername: string;
          updatedAt: number;
        }>
      >;
      getProductById: FunctionReference<
        "query",
        "internal",
        { id: string },
        {
          _creationTime: number;
          _id: string;
          category: string;
          createdAt: number;
          currency: string;
          description: string;
          imageUrl?: string;
          isActive: boolean;
          metadata?: any;
          name: string;
          price: number;
          saleId?: string;
          stock?: number;
          updatedAt: number;
        } | null
      >;
      getProducts: FunctionReference<
        "query",
        "internal",
        { category?: string },
        Array<{
          _creationTime: number;
          _id: string;
          category: string;
          createdAt: number;
          currency: string;
          description: string;
          imageUrl?: string;
          isActive: boolean;
          metadata?: any;
          name: string;
          price: number;
          saleId?: string;
          stock?: number;
          updatedAt: number;
        }>
      >;
      purchaseProduct: FunctionReference<
        "mutation",
        "internal",
        { buyerId: string; productId: string; quantity: number },
        string
      >;
      updateProduct: FunctionReference<
        "mutation",
        "internal",
        {
          fields: {
            category?: string;
            currency?: string;
            description?: string;
            imageUrl?: string;
            isActive?: boolean;
            metadata?: any;
            name?: string;
            price?: number;
            saleId?: string;
            stock?: number;
          };
          id: string;
        },
        null
      >;
    };
  };
  lunchtable_tcg_payments: {};
  lunchtable_tcg_progression: {
    achievements: {
      checkAndGrant: FunctionReference<
        "mutation",
        "internal",
        { achievementId: string; currentValue: number; userId: string },
        string | null
      >;
      defineAchievement: FunctionReference<
        "mutation",
        "internal",
        {
          achievementId: string;
          category:
            | "wins"
            | "games_played"
            | "collection"
            | "social"
            | "story"
            | "ranked"
            | "special";
          createdAt: number;
          description: string;
          icon: string;
          isActive: boolean;
          isSecret: boolean;
          name: string;
          rarity: "common" | "rare" | "epic" | "legendary";
          requirementType: string;
          rewards?: {
            badge?: string;
            cardDefinitionId?: string;
            gems?: number;
            gold?: number;
            xp?: number;
          };
          targetValue: number;
        },
        string
      >;
      getDefinitionById: FunctionReference<
        "query",
        "internal",
        { id: string },
        {
          _creationTime: number;
          _id: string;
          achievementId: string;
          category:
            | "wins"
            | "games_played"
            | "collection"
            | "social"
            | "story"
            | "ranked"
            | "special";
          createdAt: number;
          description: string;
          icon: string;
          isActive: boolean;
          isSecret: boolean;
          name: string;
          rarity: "common" | "rare" | "epic" | "legendary";
          requirementType: string;
          rewards?: {
            badge?: string;
            cardDefinitionId?: string;
            gems?: number;
            gold?: number;
            xp?: number;
          };
          targetValue: number;
        } | null
      >;
      getDefinitions: FunctionReference<
        "query",
        "internal",
        {
          category?:
            | "wins"
            | "games_played"
            | "collection"
            | "social"
            | "story"
            | "ranked"
            | "special";
        },
        Array<{
          _creationTime: number;
          _id: string;
          achievementId: string;
          category:
            | "wins"
            | "games_played"
            | "collection"
            | "social"
            | "story"
            | "ranked"
            | "special";
          createdAt: number;
          description: string;
          icon: string;
          isActive: boolean;
          isSecret: boolean;
          name: string;
          rarity: "common" | "rare" | "epic" | "legendary";
          requirementType: string;
          rewards?: {
            badge?: string;
            cardDefinitionId?: string;
            gems?: number;
            gold?: number;
            xp?: number;
          };
          targetValue: number;
        }>
      >;
      getPlayerAchievements: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          _creationTime: number;
          _id: string;
          achievementId: string;
          currentProgress: number;
          isUnlocked: boolean;
          unlockedAt?: number;
          userId: string;
        }>
      >;
      grantAchievement: FunctionReference<
        "mutation",
        "internal",
        { achievementId: string; currentProgress?: number; userId: string },
        string
      >;
      updateProgress: FunctionReference<
        "mutation",
        "internal",
        { achievementId: string; delta: number; userId: string },
        { currentProgress: number; isUnlocked: boolean }
      >;
    };
    badges: {
      awardBadge: FunctionReference<
        "mutation",
        "internal",
        {
          archetype?: string;
          badgeId: string;
          badgeType:
            | "archetype_complete"
            | "act_complete"
            | "difficulty_complete"
            | "perfect_chapter"
            | "speed_run"
            | "milestone";
          description: string;
          displayName: string;
          iconUrl?: string;
          userId: string;
        },
        string
      >;
      getByBadgeId: FunctionReference<
        "query",
        "internal",
        { badgeId: string },
        any
      >;
      getUserBadges: FunctionReference<
        "query",
        "internal",
        {
          badgeType?:
            | "archetype_complete"
            | "act_complete"
            | "difficulty_complete"
            | "perfect_chapter"
            | "speed_run"
            | "milestone";
          userId: string;
        },
        any
      >;
      hasBadge: FunctionReference<
        "query",
        "internal",
        { badgeId: string; userId: string },
        boolean
      >;
    };
    battlepass: {
      addXP: FunctionReference<
        "mutation",
        "internal",
        { amount: number; battlePassId?: string; userId: string },
        { currentTier: number; currentXP: number; tierUps: number }
      >;
      claimTier: FunctionReference<
        "mutation",
        "internal",
        {
          battlePassId?: string;
          isPremium: boolean;
          tier: number;
          userId: string;
        },
        {
          freeReward?: {
            amount?: number;
            avatarUrl?: string;
            cardId?: string;
            packProductId?: string;
            titleName?: string;
            type: "gold" | "gems" | "xp" | "card" | "pack" | "title" | "avatar";
          };
          premiumReward?: {
            amount?: number;
            avatarUrl?: string;
            cardId?: string;
            packProductId?: string;
            titleName?: string;
            type: "gold" | "gems" | "xp" | "card" | "pack" | "title" | "avatar";
          };
          success: boolean;
        } | null
      >;
      createSeason: FunctionReference<
        "mutation",
        "internal",
        {
          createdBy: string;
          description?: string;
          endDate: number;
          name: string;
          seasonId: string;
          startDate: number;
          totalTiers: number;
          xpPerTier: number;
        },
        string
      >;
      defineTier: FunctionReference<
        "mutation",
        "internal",
        {
          battlePassId: string;
          freeReward?: {
            amount?: number;
            avatarUrl?: string;
            cardId?: string;
            packProductId?: string;
            titleName?: string;
            type: "gold" | "gems" | "xp" | "card" | "pack" | "title" | "avatar";
          };
          isMilestone: boolean;
          premiumReward?: {
            amount?: number;
            avatarUrl?: string;
            cardId?: string;
            packProductId?: string;
            titleName?: string;
            type: "gold" | "gems" | "xp" | "card" | "pack" | "title" | "avatar";
          };
          tier: number;
        },
        string
      >;
      getCurrentSeason: FunctionReference<
        "query",
        "internal",
        {},
        {
          _creationTime: number;
          _id: string;
          createdAt: number;
          createdBy: string;
          description?: string;
          endDate: number;
          name: string;
          seasonId: string;
          startDate: number;
          status: "upcoming" | "active" | "ended";
          totalTiers: number;
          updatedAt: number;
          xpPerTier: number;
        } | null
      >;
      getPlayerProgress: FunctionReference<
        "query",
        "internal",
        { battlePassId?: string; userId: string },
        {
          _creationTime: number;
          _id: string;
          battlePassId: string;
          claimedFreeTiers: Array<number>;
          claimedPremiumTiers: Array<number>;
          createdAt: number;
          currentTier: number;
          currentXP: number;
          isPremium: boolean;
          lastXPGainAt?: number;
          premiumPurchasedAt?: number;
          updatedAt: number;
          userId: string;
        } | null
      >;
      getTiers: FunctionReference<
        "query",
        "internal",
        { battlePassId: string },
        Array<{
          _creationTime: number;
          _id: string;
          battlePassId: string;
          freeReward?: {
            amount?: number;
            avatarUrl?: string;
            cardId?: string;
            packProductId?: string;
            titleName?: string;
            type: "gold" | "gems" | "xp" | "card" | "pack" | "title" | "avatar";
          };
          isMilestone: boolean;
          premiumReward?: {
            amount?: number;
            avatarUrl?: string;
            cardId?: string;
            packProductId?: string;
            titleName?: string;
            type: "gold" | "gems" | "xp" | "card" | "pack" | "title" | "avatar";
          };
          tier: number;
        }>
      >;
      upgradeToPremium: FunctionReference<
        "mutation",
        "internal",
        { battlePassId?: string; userId: string },
        null
      >;
    };
    quests: {
      abandonQuest: FunctionReference<
        "mutation",
        "internal",
        { questId: string; userId: string },
        null
      >;
      claimQuest: FunctionReference<
        "mutation",
        "internal",
        { questId: string; userId: string },
        {
          rewards: { gems?: number; gold: number; xp: number };
          success: boolean;
        } | null
      >;
      defineQuest: FunctionReference<
        "mutation",
        "internal",
        {
          createdAt: number;
          description: string;
          filters?: {
            archetype?: string;
            cardType?: string;
            gameMode?: "ranked" | "casual" | "story";
          };
          isActive: boolean;
          name: string;
          questId: string;
          questType: "daily" | "weekly" | "achievement";
          requirementType: string;
          rewards: { gems?: number; gold: number; xp: number };
          targetValue: number;
        },
        string
      >;
      getActiveQuests: FunctionReference<
        "query",
        "internal",
        { questType?: "daily" | "weekly" | "achievement" },
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          description: string;
          filters?: {
            archetype?: string;
            cardType?: string;
            gameMode?: "ranked" | "casual" | "story";
          };
          isActive: boolean;
          name: string;
          questId: string;
          questType: "daily" | "weekly" | "achievement";
          requirementType: string;
          rewards: { gems?: number; gold: number; xp: number };
          targetValue: number;
        }>
      >;
      getPlayerQuests: FunctionReference<
        "query",
        "internal",
        { includeClaimed?: boolean; userId: string },
        Array<{
          _creationTime: number;
          _id: string;
          claimedAt?: number;
          completedAt?: number;
          currentProgress: number;
          expiresAt?: number;
          questId: string;
          startedAt: number;
          status: "active" | "completed" | "claimed";
          userId: string;
        }>
      >;
      startQuest: FunctionReference<
        "mutation",
        "internal",
        { expiresAt?: number; questId: string; userId: string },
        string
      >;
      updateQuestProgress: FunctionReference<
        "mutation",
        "internal",
        { delta: number; questId: string; userId: string },
        { currentProgress: number; status: "active" | "completed" | "claimed" }
      >;
    };
    xp: {
      addXP: FunctionReference<
        "mutation",
        "internal",
        { amount: number; userId: string },
        { currentLevel: number; levelUps: number; lifetimeXP: number }
      >;
      getLeaderboard: FunctionReference<
        "query",
        "internal",
        { limit?: number },
        Array<{
          _creationTime: number;
          _id: string;
          currentLevel: number;
          currentXP: number;
          lastUpdatedAt: number;
          lifetimeXP: number;
          userId: string;
        }>
      >;
      getPlayerXP: FunctionReference<
        "query",
        "internal",
        { userId: string },
        {
          _creationTime: number;
          _id: string;
          currentLevel: number;
          currentXP: number;
          lastUpdatedAt: number;
          lifetimeXP: number;
          userId: string;
        } | null
      >;
    };
  };
  lunchtable_tcg_referrals: {
    referrals: {
      createReferralLink: FunctionReference<
        "mutation",
        "internal",
        { code: string; userId: string },
        string
      >;
      deactivateUserLinks: FunctionReference<
        "mutation",
        "internal",
        { userId: string },
        null
      >;
      getReferralCount: FunctionReference<
        "query",
        "internal",
        { referrerId: string },
        number
      >;
      getReferralLink: FunctionReference<
        "query",
        "internal",
        { userId: string },
        null | { _id: string; code: string; createdAt: number; uses: number }
      >;
      getReferralLinkByCode: FunctionReference<
        "query",
        "internal",
        { code: string },
        null | {
          _id: string;
          code: string;
          createdAt: number;
          isActive: boolean;
          userId: string;
          uses: number;
        }
      >;
      getReferralsByReferrer: FunctionReference<
        "query",
        "internal",
        { referrerId: string },
        Array<{
          createdAt: number;
          referralCode: string;
          referredUserId: string;
        }>
      >;
      incrementLinkUses: FunctionReference<
        "mutation",
        "internal",
        { linkId: string },
        null
      >;
      recordReferral: FunctionReference<
        "mutation",
        "internal",
        { referralCode: string; referredUserId: string; referrerId: string },
        string
      >;
    };
  };
  lunchtable_tcg_seasons: {
    seasons: {
      createSeason: FunctionReference<
        "mutation",
        "internal",
        {
          createdBy: string;
          description?: string;
          endDate: number;
          name: string;
          number: number;
          rankResetType: "full" | "soft" | "none";
          rewards?: Array<{
            cardPackReward?: number;
            exclusiveCardId?: string;
            gemsReward: number;
            goldReward: number;
            minElo: number;
            tier: string;
            titleReward?: string;
          }>;
          softResetPercentage?: number;
          startDate: number;
        },
        string
      >;
      createSnapshot: FunctionReference<
        "mutation",
        "internal",
        {
          finalElo: number;
          gamesPlayed: number;
          losses: number;
          rank: number;
          seasonId: string;
          seasonNumber: number;
          tier: string;
          userId: string;
          username: string;
          wins: number;
        },
        string
      >;
      deleteSeason: FunctionReference<
        "mutation",
        "internal",
        { seasonId: string },
        null
      >;
      getActiveSeason: FunctionReference<"query", "internal", {}, any>;
      getSeason: FunctionReference<
        "query",
        "internal",
        { seasonId: string },
        any
      >;
      getSeasonByNumber: FunctionReference<
        "query",
        "internal",
        { number: number },
        any
      >;
      getSeasons: FunctionReference<
        "query",
        "internal",
        { status?: "upcoming" | "active" | "ended" },
        any
      >;
      getSeasonSnapshots: FunctionReference<
        "query",
        "internal",
        { limit?: number; seasonId: string },
        any
      >;
      getUserSnapshots: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any
      >;
      markRewardsDistributed: FunctionReference<
        "mutation",
        "internal",
        { snapshotId: string },
        null
      >;
      updateSeason: FunctionReference<
        "mutation",
        "internal",
        {
          description?: string;
          endDate?: number;
          name?: string;
          rankResetType?: "full" | "soft" | "none";
          rewards?: Array<{
            cardPackReward?: number;
            exclusiveCardId?: string;
            gemsReward: number;
            goldReward: number;
            minElo: number;
            tier: string;
            titleReward?: string;
          }>;
          seasonId: string;
          softResetPercentage?: number;
          startDate?: number;
          status?: "upcoming" | "active" | "ended";
        },
        null
      >;
    };
  };
  lunchtable_tcg_social: {
    friends: {
      acceptRequest: FunctionReference<
        "mutation",
        "internal",
        { requestId: string; userId: string },
        null
      >;
      blockUser: FunctionReference<
        "mutation",
        "internal",
        { blockedUserId: string; userId: string },
        string
      >;
      declineRequest: FunctionReference<
        "mutation",
        "internal",
        { requestId: string; userId: string },
        null
      >;
      getFriends: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          friendId: string;
          lastInteraction?: number;
          requestedBy: string;
          respondedAt?: number;
          status: string;
          userId: string;
        }>
      >;
      getFriendshipStatus: FunctionReference<
        "query",
        "internal",
        { otherUserId: string; userId: string },
        {
          friendship: {
            _creationTime: number;
            _id: string;
            createdAt: number;
            friendId: string;
            lastInteraction?: number;
            requestedBy: string;
            respondedAt?: number;
            status: string;
            userId: string;
          };
          status: string;
        } | null
      >;
      getPendingRequests: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          friendId: string;
          lastInteraction?: number;
          requestedBy: string;
          respondedAt?: number;
          status: string;
          userId: string;
        }>
      >;
      removeFriend: FunctionReference<
        "mutation",
        "internal",
        { friendId: string; userId: string },
        null
      >;
      sendRequest: FunctionReference<
        "mutation",
        "internal",
        { fromUserId: string; toUserId: string },
        string
      >;
      unblockUser: FunctionReference<
        "mutation",
        "internal",
        { blockedUserId: string; userId: string },
        null
      >;
    };
    globalChat: {
      getByUser: FunctionReference<
        "query",
        "internal",
        { limit?: number; userId: string },
        any
      >;
      getRecentMessages: FunctionReference<
        "query",
        "internal",
        { before?: number; limit?: number },
        any
      >;
      sendMessage: FunctionReference<
        "mutation",
        "internal",
        {
          isSystem?: boolean;
          message: string;
          userId: string;
          username: string;
        },
        string
      >;
    };
    inbox: {
      claimReward: FunctionReference<
        "mutation",
        "internal",
        { inboxItemId: string; userId: string },
        any
      >;
      deleteItem: FunctionReference<
        "mutation",
        "internal",
        { inboxItemId: string; userId: string },
        null
      >;
      getInbox: FunctionReference<
        "query",
        "internal",
        {
          limit?: number;
          type?:
            | "reward"
            | "announcement"
            | "challenge"
            | "friend_request"
            | "guild_invite"
            | "guild_request"
            | "system"
            | "achievement";
          unreadOnly?: boolean;
          userId: string;
        },
        any
      >;
      getUnreadCount: FunctionReference<
        "query",
        "internal",
        { userId: string },
        number
      >;
      markRead: FunctionReference<
        "mutation",
        "internal",
        { inboxItemId: string; userId: string },
        null
      >;
      send: FunctionReference<
        "mutation",
        "internal",
        {
          data?: any;
          expiresAt?: number;
          message: string;
          senderId?: string;
          senderUsername?: string;
          title: string;
          type:
            | "reward"
            | "announcement"
            | "challenge"
            | "friend_request"
            | "guild_invite"
            | "guild_request"
            | "system"
            | "achievement";
          userId: string;
        },
        string
      >;
    };
    messages: {
      getConversation: FunctionReference<
        "query",
        "internal",
        { userId1: string; userId2: string },
        {
          _creationTime: number;
          _id: string;
          createdAt: number;
          lastMessageAt: number;
          messageCount: number;
          participant1Archived?: boolean;
          participant1Id: string;
          participant1LastRead?: number;
          participant2Archived?: boolean;
          participant2Id: string;
          participant2LastRead?: number;
        } | null
      >;
      getConversations: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          lastMessageAt: number;
          messageCount: number;
          participant1Archived?: boolean;
          participant1Id: string;
          participant1LastRead?: number;
          participant2Archived?: boolean;
          participant2Id: string;
          participant2LastRead?: number;
        }>
      >;
      getMessages: FunctionReference<
        "query",
        "internal",
        { before?: number; conversationId: string; limit?: number },
        Array<{
          _creationTime: number;
          _id: string;
          conversationId: string;
          createdAt: number;
          isSystem?: boolean;
          message: string;
          senderId: string;
          senderUsername: string;
        }>
      >;
      markRead: FunctionReference<
        "mutation",
        "internal",
        { conversationId: string; userId: string },
        null
      >;
      sendMessage: FunctionReference<
        "mutation",
        "internal",
        {
          isSystem?: boolean;
          message: string;
          recipientId: string;
          senderId: string;
          senderUsername: string;
        },
        string
      >;
    };
    presence: {
      clearNotifications: FunctionReference<
        "mutation",
        "internal",
        { userId: string },
        null
      >;
      createNotification: FunctionReference<
        "mutation",
        "internal",
        {
          data?: any;
          message: string;
          title: string;
          type:
            | "achievement_unlocked"
            | "level_up"
            | "quest_completed"
            | "badge_earned";
          userId: string;
        },
        string
      >;
      getNotifications: FunctionReference<
        "query",
        "internal",
        { limit?: number; unreadOnly?: boolean; userId: string },
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          data?: any;
          isRead: boolean;
          message: string;
          readAt?: number;
          title: string;
          type:
            | "achievement_unlocked"
            | "level_up"
            | "quest_completed"
            | "badge_earned";
          userId: string;
        }>
      >;
      getOnlineUsers: FunctionReference<
        "query",
        "internal",
        { limit?: number; sinceMinutes?: number },
        any
      >;
      getPresence: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any
      >;
      markNotificationRead: FunctionReference<
        "mutation",
        "internal",
        { notificationId: string; userId: string },
        null
      >;
      updatePresence: FunctionReference<
        "mutation",
        "internal",
        {
          status: "online" | "in_game" | "idle";
          userId: string;
          username: string;
        },
        string
      >;
    };
  };
  lunchtable_tcg_story: {
    chapters: {
      createChapter: FunctionReference<
        "mutation",
        "internal",
        {
          actNumber?: number;
          aiDifficulty?:
            | "easy"
            | "medium"
            | "hard"
            | "boss"
            | { hard: number; legendary: number; normal: number };
          aiOpponentDeckCode?: string;
          archetype?: string;
          archetypeImageUrl?: string;
          baseRewards?: { gems?: number; gold: number; xp: number };
          battleCount?: number;
          chapterNumber?: number;
          description: string;
          imageUrl?: string;
          isActive?: boolean;
          loreText?: string;
          number?: number;
          status?: "draft" | "published";
          storyText?: string;
          title: string;
          unlockCondition?: {
            requiredChapterId?: string;
            requiredLevel?: number;
            type: "chapter_complete" | "player_level" | "none";
          };
          unlockRequirements?: {
            minimumLevel?: number;
            previousChapter?: boolean;
          };
        },
        string
      >;
      getChapter: FunctionReference<
        "query",
        "internal",
        { chapterId: string },
        any
      >;
      getChapterByNumber: FunctionReference<
        "query",
        "internal",
        { actNumber: number; chapterNumber: number },
        any
      >;
      getChapters: FunctionReference<
        "query",
        "internal",
        { actNumber?: number; status?: "draft" | "published" },
        any
      >;
      updateChapter: FunctionReference<
        "mutation",
        "internal",
        { chapterId: string; updates: any },
        null
      >;
    };
    progress: {
      getBattleAttempts: FunctionReference<
        "query",
        "internal",
        { limit?: number; userId: string },
        any
      >;
      getChapterProgress: FunctionReference<
        "query",
        "internal",
        { actNumber: number; chapterNumber: number; userId: string },
        any
      >;
      getProgress: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any
      >;
      getStageProgress: FunctionReference<
        "query",
        "internal",
        { stageId?: string; userId: string },
        any
      >;
      recordBattleAttempt: FunctionReference<
        "mutation",
        "internal",
        {
          actNumber: number;
          chapterNumber: number;
          difficulty: "normal" | "hard" | "legendary";
          finalLP: number;
          outcome: "won" | "lost" | "abandoned";
          progressId: string;
          rewardsEarned: { cards?: Array<string>; gold: number; xp: number };
          starsEarned: number;
          userId: string;
        },
        string
      >;
      upsertProgress: FunctionReference<
        "mutation",
        "internal",
        {
          actNumber: number;
          bestScore?: number;
          chapterNumber: number;
          difficulty: "normal" | "hard" | "legendary";
          firstCompletedAt?: number;
          lastAttemptedAt?: number;
          starsEarned: number;
          status: "locked" | "available" | "in_progress" | "completed";
          timesAttempted: number;
          timesCompleted: number;
          userId: string;
        },
        string
      >;
      upsertStageProgress: FunctionReference<
        "mutation",
        "internal",
        {
          bestScore?: number;
          chapterId: string;
          firstClearClaimed: boolean;
          lastCompletedAt?: number;
          stageId: string;
          stageNumber: number;
          starsEarned: number;
          status: "locked" | "available" | "completed" | "starred";
          timesCompleted: number;
          userId: string;
        },
        string
      >;
    };
    seeds: {
      seedChapters: FunctionReference<
        "mutation",
        "internal",
        { chapters: Array<any> },
        number
      >;
      seedStages: FunctionReference<
        "mutation",
        "internal",
        { stages: Array<any> },
        number
      >;
    };
    stages: {
      createStage: FunctionReference<
        "mutation",
        "internal",
        {
          aiDifficulty?: "easy" | "medium" | "hard" | "boss";
          cardRewardId?: string;
          chapterId: string;
          description: string;
          difficulty?: "easy" | "medium" | "hard" | "boss";
          firstClearBonus?:
            | { gems?: number; gold?: number; xp?: number }
            | number;
          firstClearGems?: number;
          firstClearGold?: number;
          name?: string;
          opponentDeckArchetype?: string;
          opponentDeckId?: string;
          opponentName?: string;
          postMatchLoseDialogue?: Array<{ speaker: string; text: string }>;
          postMatchWinDialogue?: Array<{ speaker: string; text: string }>;
          preMatchDialogue?: Array<{
            imageUrl?: string;
            speaker: string;
            text: string;
          }>;
          repeatGold?: number;
          rewardGold?: number;
          rewardXp?: number;
          stageNumber: number;
          status?: "draft" | "published";
          title?: string;
        },
        string
      >;
      getStage: FunctionReference<
        "query",
        "internal",
        { stageId: string },
        any
      >;
      getStages: FunctionReference<
        "query",
        "internal",
        { chapterId: string },
        any
      >;
      updateStage: FunctionReference<
        "mutation",
        "internal",
        { stageId: string; updates: any },
        null
      >;
    };
  };
  lunchtable_tcg_token: {};
  lunchtable_tcg_treasury: {
    policies: {
      createPolicy: FunctionReference<
        "mutation",
        "internal",
        {
          createdBy: string;
          description?: string;
          isActive: boolean;
          name: string;
          privyPolicyId?: string;
          rules: {
            allowedRecipients?: Array<string>;
            dailyLimit?: number;
            maxTransactionAmount?: number;
            minApprovers?: number;
            requiresApproval: boolean;
          };
        },
        string
      >;
      getPolicies: FunctionReference<
        "query",
        "internal",
        { activeOnly?: boolean },
        any
      >;
      getPolicy: FunctionReference<
        "query",
        "internal",
        { policyId: string },
        any
      >;
      updatePolicy: FunctionReference<
        "mutation",
        "internal",
        { policyId: string; updates: any },
        null
      >;
    };
    transactions: {
      confirmTransaction: FunctionReference<
        "mutation",
        "internal",
        { signature: string; transactionId: string },
        null
      >;
      failTransaction: FunctionReference<
        "mutation",
        "internal",
        { errorMessage: string; transactionId: string },
        null
      >;
      getTransactionBySignature: FunctionReference<
        "query",
        "internal",
        { signature: string },
        any
      >;
      getTransactions: FunctionReference<
        "query",
        "internal",
        {
          limit?: number;
          status?: "pending" | "submitted" | "confirmed" | "failed";
          type?:
            | "fee_received"
            | "distribution"
            | "liquidity_add"
            | "liquidity_remove"
            | "transfer_internal"
            | "transfer_external";
          walletId?: string;
        },
        any
      >;
      recordTransaction: FunctionReference<
        "mutation",
        "internal",
        {
          amount: number;
          approvedBy?: Array<string>;
          initiatedBy?: string;
          metadata?: any;
          signature?: string;
          status?: "pending" | "submitted" | "confirmed" | "failed";
          tokenMint: string;
          type:
            | "fee_received"
            | "distribution"
            | "liquidity_add"
            | "liquidity_remove"
            | "transfer_internal"
            | "transfer_external";
          walletId: string;
        },
        string
      >;
    };
    wallets: {
      createWallet: FunctionReference<
        "mutation",
        "internal",
        {
          address: string;
          balance?: number;
          createdBy?: string;
          creationStatus?: "pending" | "creating" | "active" | "failed";
          name: string;
          policyId?: string;
          privyWalletId: string;
          purpose: "fee_collection" | "distribution" | "liquidity" | "reserves";
          status?: "active" | "frozen" | "archived";
          tokenBalance?: number;
        },
        string
      >;
      getWallet: FunctionReference<
        "query",
        "internal",
        { walletId: string },
        any
      >;
      getWalletByAddress: FunctionReference<
        "query",
        "internal",
        { address: string },
        any
      >;
      getWallets: FunctionReference<
        "query",
        "internal",
        {
          purpose?:
            | "fee_collection"
            | "distribution"
            | "liquidity"
            | "reserves";
          status?: "active" | "frozen" | "archived";
        },
        any
      >;
      updateWallet: FunctionReference<
        "mutation",
        "internal",
        { updates: any; walletId: string },
        null
      >;
    };
  };
  lunchtable_tcg_webhooks: {
    agentWebhooks: {
      createWebhook: FunctionReference<
        "mutation",
        "internal",
        {
          agentId: string;
          events: Array<string>;
          secret?: string;
          url: string;
        },
        string
      >;
      deleteWebhook: FunctionReference<
        "mutation",
        "internal",
        { webhookId: string },
        null
      >;
      getAgentWebhooks: FunctionReference<
        "query",
        "internal",
        { agentId: string },
        Array<{
          _creationTime: number;
          _id: string;
          agentId: string;
          events: Array<string>;
          failureCount: number;
          isActive: boolean;
          lastTriggered?: number;
          secret?: string;
          url: string;
        }>
      >;
      recordFailure: FunctionReference<
        "mutation",
        "internal",
        { webhookId: string },
        null
      >;
      recordTrigger: FunctionReference<
        "mutation",
        "internal",
        { webhookId: string },
        null
      >;
      updateWebhook: FunctionReference<
        "mutation",
        "internal",
        {
          updates: {
            events?: Array<string>;
            isActive?: boolean;
            secret?: string;
            url?: string;
          };
          webhookId: string;
        },
        null
      >;
    };
    webhookConfig: {
      getAllConfigs: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          errorCount?: number;
          isActive: boolean;
          lastEventAt?: number;
          provider: "helius" | "shyft" | "bitquery";
          tokenMint?: string;
          updatedAt: number;
          webhookId?: string;
          webhookSecret?: string;
          webhookUrl: string;
        }>
      >;
      getWebhookConfig: FunctionReference<
        "query",
        "internal",
        { provider?: "helius" | "shyft" | "bitquery" },
        null | {
          _creationTime: number;
          _id: string;
          createdAt: number;
          errorCount?: number;
          isActive: boolean;
          lastEventAt?: number;
          provider: "helius" | "shyft" | "bitquery";
          tokenMint?: string;
          updatedAt: number;
          webhookId?: string;
          webhookSecret?: string;
          webhookUrl: string;
        }
      >;
      recordError: FunctionReference<
        "mutation",
        "internal",
        { configId: string },
        null
      >;
      recordEvent: FunctionReference<
        "mutation",
        "internal",
        { configId: string },
        null
      >;
      updateWebhookConfig: FunctionReference<
        "mutation",
        "internal",
        {
          configId: string;
          updates: {
            isActive?: boolean;
            tokenMint?: string;
            webhookId?: string;
            webhookSecret?: string;
            webhookUrl?: string;
          };
        },
        null
      >;
      upsertWebhookConfig: FunctionReference<
        "mutation",
        "internal",
        {
          isActive: boolean;
          provider: "helius" | "shyft" | "bitquery";
          tokenMint?: string;
          webhookId?: string;
          webhookSecret?: string;
          webhookUrl: string;
        },
        string
      >;
    };
  };
};
