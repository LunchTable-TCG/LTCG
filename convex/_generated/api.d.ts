/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as __mocks___ratelimiter from "../__mocks__/ratelimiter.js";
import type * as admin_mutations from "../admin/mutations.js";
import type * as admin_shopSetup from "../admin/shopSetup.js";
import type * as agents from "../agents.js";
import type * as aggregates from "../aggregates.js";
import type * as auth from "../auth.js";
import type * as cards from "../cards.js";
import type * as chainResolver from "../chainResolver.js";
import type * as combatSystem from "../combatSystem.js";
import type * as crons from "../crons.js";
import type * as decks from "../decks.js";
import type * as economy from "../economy.js";
import type * as effectSystem from "../effectSystem.js";
import type * as effectSystem_executor from "../effectSystem/executor.js";
import type * as effectSystem_executors_banish from "../effectSystem/executors/banish.js";
import type * as effectSystem_executors_damage from "../effectSystem/executors/damage.js";
import type * as effectSystem_executors_destroy from "../effectSystem/executors/destroy.js";
import type * as effectSystem_executors_draw from "../effectSystem/executors/draw.js";
import type * as effectSystem_executors_gainLP from "../effectSystem/executors/gainLP.js";
import type * as effectSystem_executors_index from "../effectSystem/executors/index.js";
import type * as effectSystem_executors_modifyATK from "../effectSystem/executors/modifyATK.js";
import type * as effectSystem_executors_negate from "../effectSystem/executors/negate.js";
import type * as effectSystem_executors_returnToDeck from "../effectSystem/executors/returnToDeck.js";
import type * as effectSystem_executors_search from "../effectSystem/executors/search.js";
import type * as effectSystem_executors_summon from "../effectSystem/executors/summon.js";
import type * as effectSystem_executors_toGraveyard from "../effectSystem/executors/toGraveyard.js";
import type * as effectSystem_executors_toHand from "../effectSystem/executors/toHand.js";
import type * as effectSystem_index from "../effectSystem/index.js";
import type * as effectSystem_parser from "../effectSystem/parser.js";
import type * as effectSystem_types from "../effectSystem/types.js";
import type * as friends from "../friends.js";
import type * as gameEngine from "../gameEngine.js";
import type * as gameEngine_index from "../gameEngine/index.js";
import type * as gameEngine_positions from "../gameEngine/positions.js";
import type * as gameEngine_spellsTraps from "../gameEngine/spellsTraps.js";
import type * as gameEngine_summons from "../gameEngine/summons.js";
import type * as gameEngine_turns from "../gameEngine/turns.js";
import type * as gameEvents from "../gameEvents.js";
import type * as games from "../games.js";
import type * as games_cleanup from "../games/cleanup.js";
import type * as games_index from "../games/index.js";
import type * as games_lifecycle from "../games/lifecycle.js";
import type * as games_lobby from "../games/lobby.js";
import type * as games_queries from "../games/queries.js";
import type * as games_spectator from "../games/spectator.js";
import type * as games_stats from "../games/stats.js";
import type * as globalChat from "../globalChat.js";
import type * as http from "../http.js";
import type * as leaderboards from "../leaderboards.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_gameHelpers from "../lib/gameHelpers.js";
import type * as lib_helpers from "../lib/helpers.js";
import type * as lib_storyConstants from "../lib/storyConstants.js";
import type * as lib_types from "../lib/types.js";
import type * as lib_validators from "../lib/validators.js";
import type * as lib_xpHelpers from "../lib/xpHelpers.js";
import type * as marketplace from "../marketplace.js";
import type * as matchmaking from "../matchmaking.js";
import type * as migrations_addLeaderboardFields from "../migrations/addLeaderboardFields.js";
import type * as migrations_updateArchetypes from "../migrations/updateArchetypes.js";
import type * as migrations_updateShopProducts from "../migrations/updateShopProducts.js";
import type * as phaseManager from "../phaseManager.js";
import type * as seedStarterCards from "../seedStarterCards.js";
import type * as seedStoryChapters from "../seedStoryChapters.js";
import type * as seeds_starterCards from "../seeds/starterCards.js";
import type * as seeds_starterDecks from "../seeds/starterDecks.js";
import type * as seeds_storyChapters from "../seeds/storyChapters.js";
import type * as setupSystem from "../setupSystem.js";
import type * as shardedCounters from "../shardedCounters.js";
import type * as shop from "../shop.js";
import type * as storage_cards from "../storage/cards.js";
import type * as storage_images from "../storage/images.js";
import type * as story from "../story.js";
import type * as summonValidator from "../summonValidator.js";
import type * as updateShopProductsArchetypes from "../updateShopProductsArchetypes.js";
import type * as users from "../users.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "__mocks__/ratelimiter": typeof __mocks___ratelimiter;
  "admin/mutations": typeof admin_mutations;
  "admin/shopSetup": typeof admin_shopSetup;
  agents: typeof agents;
  aggregates: typeof aggregates;
  auth: typeof auth;
  cards: typeof cards;
  chainResolver: typeof chainResolver;
  combatSystem: typeof combatSystem;
  crons: typeof crons;
  decks: typeof decks;
  economy: typeof economy;
  effectSystem: typeof effectSystem;
  "effectSystem/executor": typeof effectSystem_executor;
  "effectSystem/executors/banish": typeof effectSystem_executors_banish;
  "effectSystem/executors/damage": typeof effectSystem_executors_damage;
  "effectSystem/executors/destroy": typeof effectSystem_executors_destroy;
  "effectSystem/executors/draw": typeof effectSystem_executors_draw;
  "effectSystem/executors/gainLP": typeof effectSystem_executors_gainLP;
  "effectSystem/executors/index": typeof effectSystem_executors_index;
  "effectSystem/executors/modifyATK": typeof effectSystem_executors_modifyATK;
  "effectSystem/executors/negate": typeof effectSystem_executors_negate;
  "effectSystem/executors/returnToDeck": typeof effectSystem_executors_returnToDeck;
  "effectSystem/executors/search": typeof effectSystem_executors_search;
  "effectSystem/executors/summon": typeof effectSystem_executors_summon;
  "effectSystem/executors/toGraveyard": typeof effectSystem_executors_toGraveyard;
  "effectSystem/executors/toHand": typeof effectSystem_executors_toHand;
  "effectSystem/index": typeof effectSystem_index;
  "effectSystem/parser": typeof effectSystem_parser;
  "effectSystem/types": typeof effectSystem_types;
  friends: typeof friends;
  gameEngine: typeof gameEngine;
  "gameEngine/index": typeof gameEngine_index;
  "gameEngine/positions": typeof gameEngine_positions;
  "gameEngine/spellsTraps": typeof gameEngine_spellsTraps;
  "gameEngine/summons": typeof gameEngine_summons;
  "gameEngine/turns": typeof gameEngine_turns;
  gameEvents: typeof gameEvents;
  games: typeof games;
  "games/cleanup": typeof games_cleanup;
  "games/index": typeof games_index;
  "games/lifecycle": typeof games_lifecycle;
  "games/lobby": typeof games_lobby;
  "games/queries": typeof games_queries;
  "games/spectator": typeof games_spectator;
  "games/stats": typeof games_stats;
  globalChat: typeof globalChat;
  http: typeof http;
  leaderboards: typeof leaderboards;
  "lib/auth": typeof lib_auth;
  "lib/constants": typeof lib_constants;
  "lib/gameHelpers": typeof lib_gameHelpers;
  "lib/helpers": typeof lib_helpers;
  "lib/storyConstants": typeof lib_storyConstants;
  "lib/types": typeof lib_types;
  "lib/validators": typeof lib_validators;
  "lib/xpHelpers": typeof lib_xpHelpers;
  marketplace: typeof marketplace;
  matchmaking: typeof matchmaking;
  "migrations/addLeaderboardFields": typeof migrations_addLeaderboardFields;
  "migrations/updateArchetypes": typeof migrations_updateArchetypes;
  "migrations/updateShopProducts": typeof migrations_updateShopProducts;
  phaseManager: typeof phaseManager;
  seedStarterCards: typeof seedStarterCards;
  seedStoryChapters: typeof seedStoryChapters;
  "seeds/starterCards": typeof seeds_starterCards;
  "seeds/starterDecks": typeof seeds_starterDecks;
  "seeds/storyChapters": typeof seeds_storyChapters;
  setupSystem: typeof setupSystem;
  shardedCounters: typeof shardedCounters;
  shop: typeof shop;
  "storage/cards": typeof storage_cards;
  "storage/images": typeof storage_images;
  story: typeof story;
  summonValidator: typeof summonValidator;
  updateShopProductsArchetypes: typeof updateShopProductsArchetypes;
  users: typeof users;
  validators: typeof validators;
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
};
