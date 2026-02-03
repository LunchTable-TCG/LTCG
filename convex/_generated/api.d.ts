/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as __tests___fixtures_decks from "../__tests__/fixtures/decks.js";
import type * as __tests___fixtures_users from "../__tests__/fixtures/users.js";
import type * as __tests___helpers_index from "../__tests__/helpers/index.js";
import type * as __tests___helpers_mockPrivyJwt from "../__tests__/helpers/mockPrivyJwt.js";
import type * as __tests___helpers_testAuth from "../__tests__/helpers/testAuth.js";
import type * as admin_achievements from "../admin/achievements.js";
import type * as admin_admin from "../admin/admin.js";
import type * as admin_analytics from "../admin/analytics.js";
import type * as admin_apiKeys from "../admin/apiKeys.js";
import type * as admin_assets from "../admin/assets.js";
import type * as admin_batchAdmin from "../admin/batchAdmin.js";
import type * as admin_cards from "../admin/cards.js";
import type * as admin_chat from "../admin/chat.js";
import type * as admin_cleanupAuth from "../admin/cleanupAuth.js";
import type * as admin_config from "../admin/config.js";
import type * as admin_features from "../admin/features.js";
import type * as admin_marketplace from "../admin/marketplace.js";
import type * as admin_moderation from "../admin/moderation.js";
import type * as admin_mutations from "../admin/mutations.js";
import type * as admin_news from "../admin/news.js";
import type * as admin_promoCodes from "../admin/promoCodes.js";
import type * as admin_quests from "../admin/quests.js";
import type * as admin_reports from "../admin/reports.js";
import type * as admin_roles from "../admin/roles.js";
import type * as admin_seasons from "../admin/seasons.js";
import type * as admin_shop from "../admin/shop.js";
import type * as admin_shopSetup from "../admin/shopSetup.js";
import type * as admin_story from "../admin/story.js";
import type * as agents_agents from "../agents/agents.js";
import type * as agents_decisions from "../agents/decisions.js";
import type * as agents_webhooks from "../agents/webhooks.js";
import type * as auth_auth from "../auth/auth.js";
import type * as auth_syncUser from "../auth/syncUser.js";
import type * as cards from "../cards.js";
import type * as chainResolver from "../chainResolver.js";
import type * as core_cards from "../core/cards.js";
import type * as core_decks from "../core/decks.js";
import type * as core_index from "../core/index.js";
import type * as core_userPreferences from "../core/userPreferences.js";
import type * as core_users from "../core/users.js";
import type * as decks from "../decks.js";
import type * as economy from "../economy.js";
import type * as economy_economy from "../economy/economy.js";
import type * as economy_index from "../economy/index.js";
import type * as economy_marketplace from "../economy/marketplace.js";
import type * as economy_priceHistory from "../economy/priceHistory.js";
import type * as economy_shop from "../economy/shop.js";
import type * as economy_tokenBalance from "../economy/tokenBalance.js";
import type * as economy_tokenMaintenance from "../economy/tokenMaintenance.js";
import type * as economy_tokenMarketplace from "../economy/tokenMarketplace.js";
import type * as effectSystem from "../effectSystem.js";
import type * as friends from "../friends.js";
import type * as gameEngine from "../gameEngine.js";
import type * as gameEvents from "../gameEvents.js";
import type * as gameplay_ai_aiDifficulty from "../gameplay/ai/aiDifficulty.js";
import type * as gameplay_ai_aiEngine from "../gameplay/ai/aiEngine.js";
import type * as gameplay_ai_aiTurn from "../gameplay/ai/aiTurn.js";
import type * as gameplay_chainResolver from "../gameplay/chainResolver.js";
import type * as gameplay_combatSystem from "../gameplay/combatSystem.js";
import type * as gameplay_effectSystem_continuousEffects from "../gameplay/effectSystem/continuousEffects.js";
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
import type * as gameplay_effectSystem_executors_index from "../gameplay/effectSystem/executors/index.js";
import type * as gameplay_effectSystem_executors_summon_destroy from "../gameplay/effectSystem/executors/summon/destroy.js";
import type * as gameplay_effectSystem_executors_summon_summon from "../gameplay/effectSystem/executors/summon/summon.js";
import type * as gameplay_effectSystem_executors_utility_negate from "../gameplay/effectSystem/executors/utility/negate.js";
import type * as gameplay_effectSystem_index from "../gameplay/effectSystem/index.js";
import type * as gameplay_effectSystem_jsonEffectSchema from "../gameplay/effectSystem/jsonEffectSchema.js";
import type * as gameplay_effectSystem_jsonEffectValidators from "../gameplay/effectSystem/jsonEffectValidators.js";
import type * as gameplay_effectSystem_jsonParser from "../gameplay/effectSystem/jsonParser.js";
import type * as gameplay_effectSystem_optTracker from "../gameplay/effectSystem/optTracker.js";
import type * as gameplay_effectSystem_parser from "../gameplay/effectSystem/parser.js";
import type * as gameplay_effectSystem_selectionHandler from "../gameplay/effectSystem/selectionHandler.js";
import type * as gameplay_effectSystem_types from "../gameplay/effectSystem/types.js";
import type * as gameplay_gameEngine_index from "../gameplay/gameEngine/index.js";
import type * as gameplay_gameEngine_phases from "../gameplay/gameEngine/phases.js";
import type * as gameplay_gameEngine_positions from "../gameplay/gameEngine/positions.js";
import type * as gameplay_gameEngine_selectionEffects from "../gameplay/gameEngine/selectionEffects.js";
import type * as gameplay_gameEngine_spellsTraps from "../gameplay/gameEngine/spellsTraps.js";
import type * as gameplay_gameEngine_stateBasedActions from "../gameplay/gameEngine/stateBasedActions.js";
import type * as gameplay_gameEngine_summons from "../gameplay/gameEngine/summons.js";
import type * as gameplay_gameEngine_turns from "../gameplay/gameEngine/turns.js";
import type * as gameplay_gameEvents from "../gameplay/gameEvents.js";
import type * as gameplay_games_cleanup from "../gameplay/games/cleanup.js";
import type * as gameplay_games_index from "../gameplay/games/index.js";
import type * as gameplay_games_lifecycle from "../gameplay/games/lifecycle.js";
import type * as gameplay_games_lobby from "../gameplay/games/lobby.js";
import type * as gameplay_games_queries from "../gameplay/games/queries.js";
import type * as gameplay_games_spectator from "../gameplay/games/spectator.js";
import type * as gameplay_games_stats from "../gameplay/games/stats.js";
import type * as gameplay_phaseManager from "../gameplay/phaseManager.js";
import type * as gameplay_replaySystem from "../gameplay/replaySystem.js";
import type * as gameplay_responseWindow from "../gameplay/responseWindow.js";
import type * as gameplay_summonValidator from "../gameplay/summonValidator.js";
import type * as gameplay_timeoutSystem from "../gameplay/timeoutSystem.js";
import type * as gameplay_triggerSystem from "../gameplay/triggerSystem.js";
import type * as games from "../games.js";
import type * as globalChat from "../globalChat.js";
import type * as http from "../http.js";
import type * as http_agents from "../http/agents.js";
import type * as http_chat from "../http/chat.js";
import type * as http_decisions from "../http/decisions.js";
import type * as http_decks from "../http/decks.js";
import type * as http_games from "../http/games.js";
import type * as http_matchmaking from "../http/matchmaking.js";
import type * as http_middleware_auth from "../http/middleware/auth.js";
import type * as http_middleware_rateLimit from "../http/middleware/rateLimit.js";
import type * as http_middleware_rateLimitInternal from "../http/middleware/rateLimitInternal.js";
import type * as http_middleware_responses from "../http/middleware/responses.js";
import type * as http_story from "../http/story.js";
import type * as http_types from "../http/types.js";
import type * as infrastructure_aggregates from "../infrastructure/aggregates.js";
import type * as infrastructure_crons from "../infrastructure/crons.js";
import type * as infrastructure_emailActions from "../infrastructure/emailActions.js";
import type * as infrastructure_shardedCounters from "../infrastructure/shardedCounters.js";
import type * as infrastructure_welcomeEmails from "../infrastructure/welcomeEmails.js";
import type * as leaderboards from "../leaderboards.js";
import type * as lib_abilityHelpers from "../lib/abilityHelpers.js";
import type * as lib_adminAudit from "../lib/adminAudit.js";
import type * as lib_cardPropertyHelpers from "../lib/cardPropertyHelpers.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_convexAuth from "../lib/convexAuth.js";
import type * as lib_debug from "../lib/debug.js";
import type * as lib_debugHelpers from "../lib/debugHelpers.js";
import type * as lib_deterministicRandom from "../lib/deterministicRandom.js";
import type * as lib_errorCodes from "../lib/errorCodes.js";
import type * as lib_featureFlags from "../lib/featureFlags.js";
import type * as lib_gameHelpers from "../lib/gameHelpers.js";
import type * as lib_gameValidation from "../lib/gameValidation.js";
import type * as lib_helpers from "../lib/helpers.js";
import type * as lib_internalHelpers from "../lib/internalHelpers.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_returnValidators from "../lib/returnValidators.js";
import type * as lib_roles from "../lib/roles.js";
import type * as lib_schemaValidators from "../lib/schemaValidators.js";
import type * as lib_solana_connection from "../lib/solana/connection.js";
import type * as lib_solana_index from "../lib/solana/index.js";
import type * as lib_solana_tokenBalance from "../lib/solana/tokenBalance.js";
import type * as lib_solana_tokenTransfer from "../lib/solana/tokenTransfer.js";
import type * as lib_spellSpeedHelper from "../lib/spellSpeedHelper.js";
import type * as lib_storyConstants from "../lib/storyConstants.js";
import type * as lib_types from "../lib/types.js";
import type * as lib_validation from "../lib/validation.js";
import type * as lib_validators from "../lib/validators.js";
import type * as lib_xpHelpers from "../lib/xpHelpers.js";
import type * as marketplace from "../marketplace.js";
import type * as matchmaking from "../matchmaking.js";
import type * as migrations_addLeaderboardFields from "../migrations/addLeaderboardFields.js";
import type * as migrations_loadAllCards from "../migrations/loadAllCards.js";
import type * as migrations_manualAbilities from "../migrations/manualAbilities.js";
import type * as migrations_migrateAdminRoles from "../migrations/migrateAdminRoles.js";
import type * as migrations_updateArchetypes from "../migrations/updateArchetypes.js";
import type * as migrations_updateShopProducts from "../migrations/updateShopProducts.js";
import type * as progression_achievements from "../progression/achievements.js";
import type * as progression_index from "../progression/index.js";
import type * as progression_matchHistory from "../progression/matchHistory.js";
import type * as progression_notifications from "../progression/notifications.js";
import type * as progression_quests from "../progression/quests.js";
import type * as progression_story from "../progression/story.js";
import type * as progression_storyBattle from "../progression/storyBattle.js";
import type * as progression_storyQueries from "../progression/storyQueries.js";
import type * as progression_storyStages from "../progression/storyStages.js";
import type * as router from "../router.js";
import type * as scripts_seedStarterCards from "../scripts/seedStarterCards.js";
import type * as scripts_seedStoryChapters from "../scripts/seedStoryChapters.js";
import type * as seedStarterCards from "../seedStarterCards.js";
import type * as seeds_starterCards from "../seeds/starterCards.js";
import type * as seeds_starterDecks from "../seeds/starterDecks.js";
import type * as seeds_storyChapters from "../seeds/storyChapters.js";
import type * as seeds_storyStages from "../seeds/storyStages.js";
import type * as seeds_types from "../seeds/types.js";
import type * as setupSystem from "../setupSystem.js";
import type * as shop from "../shop.js";
import type * as social_aiChat from "../social/aiChat.js";
import type * as social_challenges from "../social/challenges.js";
import type * as social_friends from "../social/friends.js";
import type * as social_globalChat from "../social/globalChat.js";
import type * as social_inbox from "../social/inbox.js";
import type * as social_index from "../social/index.js";
import type * as social_leaderboards from "../social/leaderboards.js";
import type * as social_matchmaking from "../social/matchmaking.js";
import type * as social_reports from "../social/reports.js";
import type * as storage_cards from "../storage/cards.js";
import type * as storage_images from "../storage/images.js";
import type * as story from "../story.js";
import type * as testing_cleanup from "../testing/cleanup.js";
import type * as testing_seedTestDeck from "../testing/seedTestDeck.js";
import type * as testing_seedTestUser from "../testing/seedTestUser.js";
import type * as wallet_createAgentWallet from "../wallet/createAgentWallet.js";
import type * as wallet_index from "../wallet/index.js";
import type * as wallet_tokenTransfer from "../wallet/tokenTransfer.js";
import type * as wallet_updateAgentWallet from "../wallet/updateAgentWallet.js";
import type * as wallet_userWallet from "../wallet/userWallet.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "__tests__/fixtures/decks": typeof __tests___fixtures_decks;
  "__tests__/fixtures/users": typeof __tests___fixtures_users;
  "__tests__/helpers/index": typeof __tests___helpers_index;
  "__tests__/helpers/mockPrivyJwt": typeof __tests___helpers_mockPrivyJwt;
  "__tests__/helpers/testAuth": typeof __tests___helpers_testAuth;
  "admin/achievements": typeof admin_achievements;
  "admin/admin": typeof admin_admin;
  "admin/analytics": typeof admin_analytics;
  "admin/apiKeys": typeof admin_apiKeys;
  "admin/assets": typeof admin_assets;
  "admin/batchAdmin": typeof admin_batchAdmin;
  "admin/cards": typeof admin_cards;
  "admin/chat": typeof admin_chat;
  "admin/cleanupAuth": typeof admin_cleanupAuth;
  "admin/config": typeof admin_config;
  "admin/features": typeof admin_features;
  "admin/marketplace": typeof admin_marketplace;
  "admin/moderation": typeof admin_moderation;
  "admin/mutations": typeof admin_mutations;
  "admin/news": typeof admin_news;
  "admin/promoCodes": typeof admin_promoCodes;
  "admin/quests": typeof admin_quests;
  "admin/reports": typeof admin_reports;
  "admin/roles": typeof admin_roles;
  "admin/seasons": typeof admin_seasons;
  "admin/shop": typeof admin_shop;
  "admin/shopSetup": typeof admin_shopSetup;
  "admin/story": typeof admin_story;
  "agents/agents": typeof agents_agents;
  "agents/decisions": typeof agents_decisions;
  "agents/webhooks": typeof agents_webhooks;
  "auth/auth": typeof auth_auth;
  "auth/syncUser": typeof auth_syncUser;
  cards: typeof cards;
  chainResolver: typeof chainResolver;
  "core/cards": typeof core_cards;
  "core/decks": typeof core_decks;
  "core/index": typeof core_index;
  "core/userPreferences": typeof core_userPreferences;
  "core/users": typeof core_users;
  decks: typeof decks;
  economy: typeof economy;
  "economy/economy": typeof economy_economy;
  "economy/index": typeof economy_index;
  "economy/marketplace": typeof economy_marketplace;
  "economy/priceHistory": typeof economy_priceHistory;
  "economy/shop": typeof economy_shop;
  "economy/tokenBalance": typeof economy_tokenBalance;
  "economy/tokenMaintenance": typeof economy_tokenMaintenance;
  "economy/tokenMarketplace": typeof economy_tokenMarketplace;
  effectSystem: typeof effectSystem;
  friends: typeof friends;
  gameEngine: typeof gameEngine;
  gameEvents: typeof gameEvents;
  "gameplay/ai/aiDifficulty": typeof gameplay_ai_aiDifficulty;
  "gameplay/ai/aiEngine": typeof gameplay_ai_aiEngine;
  "gameplay/ai/aiTurn": typeof gameplay_ai_aiTurn;
  "gameplay/chainResolver": typeof gameplay_chainResolver;
  "gameplay/combatSystem": typeof gameplay_combatSystem;
  "gameplay/effectSystem/continuousEffects": typeof gameplay_effectSystem_continuousEffects;
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
  "gameplay/effectSystem/executors/index": typeof gameplay_effectSystem_executors_index;
  "gameplay/effectSystem/executors/summon/destroy": typeof gameplay_effectSystem_executors_summon_destroy;
  "gameplay/effectSystem/executors/summon/summon": typeof gameplay_effectSystem_executors_summon_summon;
  "gameplay/effectSystem/executors/utility/negate": typeof gameplay_effectSystem_executors_utility_negate;
  "gameplay/effectSystem/index": typeof gameplay_effectSystem_index;
  "gameplay/effectSystem/jsonEffectSchema": typeof gameplay_effectSystem_jsonEffectSchema;
  "gameplay/effectSystem/jsonEffectValidators": typeof gameplay_effectSystem_jsonEffectValidators;
  "gameplay/effectSystem/jsonParser": typeof gameplay_effectSystem_jsonParser;
  "gameplay/effectSystem/optTracker": typeof gameplay_effectSystem_optTracker;
  "gameplay/effectSystem/parser": typeof gameplay_effectSystem_parser;
  "gameplay/effectSystem/selectionHandler": typeof gameplay_effectSystem_selectionHandler;
  "gameplay/effectSystem/types": typeof gameplay_effectSystem_types;
  "gameplay/gameEngine/index": typeof gameplay_gameEngine_index;
  "gameplay/gameEngine/phases": typeof gameplay_gameEngine_phases;
  "gameplay/gameEngine/positions": typeof gameplay_gameEngine_positions;
  "gameplay/gameEngine/selectionEffects": typeof gameplay_gameEngine_selectionEffects;
  "gameplay/gameEngine/spellsTraps": typeof gameplay_gameEngine_spellsTraps;
  "gameplay/gameEngine/stateBasedActions": typeof gameplay_gameEngine_stateBasedActions;
  "gameplay/gameEngine/summons": typeof gameplay_gameEngine_summons;
  "gameplay/gameEngine/turns": typeof gameplay_gameEngine_turns;
  "gameplay/gameEvents": typeof gameplay_gameEvents;
  "gameplay/games/cleanup": typeof gameplay_games_cleanup;
  "gameplay/games/index": typeof gameplay_games_index;
  "gameplay/games/lifecycle": typeof gameplay_games_lifecycle;
  "gameplay/games/lobby": typeof gameplay_games_lobby;
  "gameplay/games/queries": typeof gameplay_games_queries;
  "gameplay/games/spectator": typeof gameplay_games_spectator;
  "gameplay/games/stats": typeof gameplay_games_stats;
  "gameplay/phaseManager": typeof gameplay_phaseManager;
  "gameplay/replaySystem": typeof gameplay_replaySystem;
  "gameplay/responseWindow": typeof gameplay_responseWindow;
  "gameplay/summonValidator": typeof gameplay_summonValidator;
  "gameplay/timeoutSystem": typeof gameplay_timeoutSystem;
  "gameplay/triggerSystem": typeof gameplay_triggerSystem;
  games: typeof games;
  globalChat: typeof globalChat;
  http: typeof http;
  "http/agents": typeof http_agents;
  "http/chat": typeof http_chat;
  "http/decisions": typeof http_decisions;
  "http/decks": typeof http_decks;
  "http/games": typeof http_games;
  "http/matchmaking": typeof http_matchmaking;
  "http/middleware/auth": typeof http_middleware_auth;
  "http/middleware/rateLimit": typeof http_middleware_rateLimit;
  "http/middleware/rateLimitInternal": typeof http_middleware_rateLimitInternal;
  "http/middleware/responses": typeof http_middleware_responses;
  "http/story": typeof http_story;
  "http/types": typeof http_types;
  "infrastructure/aggregates": typeof infrastructure_aggregates;
  "infrastructure/crons": typeof infrastructure_crons;
  "infrastructure/emailActions": typeof infrastructure_emailActions;
  "infrastructure/shardedCounters": typeof infrastructure_shardedCounters;
  "infrastructure/welcomeEmails": typeof infrastructure_welcomeEmails;
  leaderboards: typeof leaderboards;
  "lib/abilityHelpers": typeof lib_abilityHelpers;
  "lib/adminAudit": typeof lib_adminAudit;
  "lib/cardPropertyHelpers": typeof lib_cardPropertyHelpers;
  "lib/constants": typeof lib_constants;
  "lib/convexAuth": typeof lib_convexAuth;
  "lib/debug": typeof lib_debug;
  "lib/debugHelpers": typeof lib_debugHelpers;
  "lib/deterministicRandom": typeof lib_deterministicRandom;
  "lib/errorCodes": typeof lib_errorCodes;
  "lib/featureFlags": typeof lib_featureFlags;
  "lib/gameHelpers": typeof lib_gameHelpers;
  "lib/gameValidation": typeof lib_gameValidation;
  "lib/helpers": typeof lib_helpers;
  "lib/internalHelpers": typeof lib_internalHelpers;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/returnValidators": typeof lib_returnValidators;
  "lib/roles": typeof lib_roles;
  "lib/schemaValidators": typeof lib_schemaValidators;
  "lib/solana/connection": typeof lib_solana_connection;
  "lib/solana/index": typeof lib_solana_index;
  "lib/solana/tokenBalance": typeof lib_solana_tokenBalance;
  "lib/solana/tokenTransfer": typeof lib_solana_tokenTransfer;
  "lib/spellSpeedHelper": typeof lib_spellSpeedHelper;
  "lib/storyConstants": typeof lib_storyConstants;
  "lib/types": typeof lib_types;
  "lib/validation": typeof lib_validation;
  "lib/validators": typeof lib_validators;
  "lib/xpHelpers": typeof lib_xpHelpers;
  marketplace: typeof marketplace;
  matchmaking: typeof matchmaking;
  "migrations/addLeaderboardFields": typeof migrations_addLeaderboardFields;
  "migrations/loadAllCards": typeof migrations_loadAllCards;
  "migrations/manualAbilities": typeof migrations_manualAbilities;
  "migrations/migrateAdminRoles": typeof migrations_migrateAdminRoles;
  "migrations/updateArchetypes": typeof migrations_updateArchetypes;
  "migrations/updateShopProducts": typeof migrations_updateShopProducts;
  "progression/achievements": typeof progression_achievements;
  "progression/index": typeof progression_index;
  "progression/matchHistory": typeof progression_matchHistory;
  "progression/notifications": typeof progression_notifications;
  "progression/quests": typeof progression_quests;
  "progression/story": typeof progression_story;
  "progression/storyBattle": typeof progression_storyBattle;
  "progression/storyQueries": typeof progression_storyQueries;
  "progression/storyStages": typeof progression_storyStages;
  router: typeof router;
  "scripts/seedStarterCards": typeof scripts_seedStarterCards;
  "scripts/seedStoryChapters": typeof scripts_seedStoryChapters;
  seedStarterCards: typeof seedStarterCards;
  "seeds/starterCards": typeof seeds_starterCards;
  "seeds/starterDecks": typeof seeds_starterDecks;
  "seeds/storyChapters": typeof seeds_storyChapters;
  "seeds/storyStages": typeof seeds_storyStages;
  "seeds/types": typeof seeds_types;
  setupSystem: typeof setupSystem;
  shop: typeof shop;
  "social/aiChat": typeof social_aiChat;
  "social/challenges": typeof social_challenges;
  "social/friends": typeof social_friends;
  "social/globalChat": typeof social_globalChat;
  "social/inbox": typeof social_inbox;
  "social/index": typeof social_index;
  "social/leaderboards": typeof social_leaderboards;
  "social/matchmaking": typeof social_matchmaking;
  "social/reports": typeof social_reports;
  "storage/cards": typeof storage_cards;
  "storage/images": typeof storage_images;
  story: typeof story;
  "testing/cleanup": typeof testing_cleanup;
  "testing/seedTestDeck": typeof testing_seedTestDeck;
  "testing/seedTestUser": typeof testing_seedTestUser;
  "wallet/createAgentWallet": typeof wallet_createAgentWallet;
  "wallet/index": typeof wallet_index;
  "wallet/tokenTransfer": typeof wallet_tokenTransfer;
  "wallet/updateAgentWallet": typeof wallet_updateAgentWallet;
  "wallet/userWallet": typeof wallet_userWallet;
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
