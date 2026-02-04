# Mutation Import Migration - Progress Checklist

Track migration progress by marking files as complete.

## Summary

- **Total files**: ~99
- **Sample files completed**: 6
- **Remaining**: ~93

## Sample Files (Completed)

- [x] `convex/presence.ts`
- [x] `convex/stripe/portal.ts`
- [x] `convex/stripe/checkout.ts`
- [x] `convex/stripe/webhooks.ts`
- [x] `convex/gameplay/games/spectator.ts`
- [x] `convex/gameplay/games/lifecycle.ts`

## Root Level (`convex/*.ts`)

- [x] `presence.ts`
- [ ] `setup.ts`
- [ ] `setupSystem.ts`

## Admin (`convex/admin/*.ts`)

- [ ] `achievements.ts`
- [ ] `admin.ts`
- [ ] `aiConfig.ts`
- [ ] `aiProviders.ts`
- [ ] `aiUsage.ts`
- [ ] `analytics.ts`
- [ ] `apiKeys.ts`
- [ ] `assets.ts`
- [ ] `batchAdmin.ts`
- [ ] `battlePass.ts`
- [ ] `branding.ts`
- [ ] `cards.ts`
- [ ] `chat.ts`
- [ ] `cleanupAuth.ts`
- [ ] `config.ts`
- [ ] `features.ts`
- [ ] `marketplace.ts`
- [ ] `moderation.ts`
- [ ] `mutations.ts`
- [ ] `news.ts`
- [ ] `promoCodes.ts`
- [ ] `quests.ts`
- [ ] `reports.ts`
- [ ] `roles.ts`
- [ ] `seasons.ts`
- [ ] `shop.ts`
- [ ] `shopSetup.ts`
- [ ] `story.ts`
- [ ] `templates.ts`
- [ ] `tournaments.ts`

## Agents (`convex/agents/*.ts`)

- [ ] `agents.ts`
- [ ] `decisions.ts`
- [ ] `webhooks.ts`

## AI (`convex/ai/*.ts`)

- [ ] `adminAgentApi.ts`
- [ ] `adminAgentAudit.ts`

## Alerts (`convex/alerts/*.ts`)

- [ ] `channels.ts`
- [ ] `history.ts`
- [ ] `notifications.ts`
- [ ] `rules.ts`
- [ ] `webhooks.ts`

## Auth (`convex/auth/*.ts`)

- [ ] `syncUser.ts`

## Core (`convex/core/*.ts`)

- [ ] `cards.ts`
- [ ] `decks.ts`
- [ ] `tutorial.ts`
- [ ] `userPreferences.ts`
- [ ] `users.ts`

## Economy (`convex/economy/*.ts`)

- [ ] `economy.ts`
- [ ] `marketplace.ts`
- [ ] `shop.ts`
- [ ] `tokenBalance.ts`
- [ ] `tokenMaintenance.ts`
- [ ] `tokenMarketplace.ts`

## Feedback (`convex/feedback/*.ts`)

- [ ] `feedback.ts`

## Gameplay (`convex/gameplay/*.ts` and subdirectories)

### Root
- [ ] `chainResolver.ts`
- [ ] `combatSystem.ts`
- [ ] `gameEvents.ts`
- [ ] `phaseManager.ts`
- [ ] `replaySystem.ts`
- [ ] `responseWindow.ts`
- [ ] `timeoutSystem.ts`
- [ ] `triggerSystem.ts`

### AI (`convex/gameplay/ai/*.ts`)
- [ ] `aiTurn.ts`

### Games (`convex/gameplay/games/*.ts`)
- [ ] `cleanup.ts`
- [x] `lifecycle.ts`
- [ ] `lobby.ts`
- [x] `spectator.ts`

### Game Engine (`convex/gameplay/gameEngine/*.ts`)
- [ ] `phases.ts`
- [ ] `positions.ts`
- [ ] `selectionEffects.ts`

## HTTP (`convex/http/*.ts` and subdirectories)

- [ ] `agents.ts`
- [ ] `chat.ts`

### Middleware (`convex/http/middleware/*.ts`)
- [ ] `rateLimitInternal.ts`

## Infrastructure (`convex/infrastructure/*.ts`)

- [ ] `auditLog.ts`
- [ ] `emailActions.ts`
- [ ] `welcomeEmails.ts`

## Migrations (`convex/migrations/*.ts`)

- [ ] `addLeaderboardFields.ts`
- [ ] `loadAllCards.ts`
- [ ] `manualAbilities.ts`
- [ ] `migrateAdminRoles.ts`
- [ ] `updateArchetypes.ts`
- [ ] `updateShopProducts.ts`

## Progression (`convex/progression/*.ts`)

- [ ] `achievements.ts`
- [ ] `battlePass.ts`
- [ ] `matchHistory.ts`
- [ ] `notifications.ts`
- [ ] `quests.ts`
- [ ] `story.ts`
- [ ] `storyBattle.ts`
- [ ] `storyStages.ts`

## Scripts (`convex/scripts/*.ts`)

- [ ] `seedStarterCards.ts`
- [ ] `seedStoryChapters.ts`

## Social (`convex/social/*.ts`)

- [ ] `aiChat.ts`
- [ ] `challenges.ts`
- [ ] `friends.ts`
- [ ] `globalChat.ts`
- [ ] `inbox.ts`
- [ ] `leaderboards.ts`
- [ ] `matchmaking.ts`
- [ ] `reports.ts`
- [ ] `tournaments.ts`
- [ ] `tournamentCron.ts`

## Storage (`convex/storage/*.ts`)

- [ ] `cards.ts`
- [ ] `images.ts`

## Stripe (`convex/stripe/*.ts`)

- [x] `checkout.ts`
- [x] `portal.ts`
- [x] `webhooks.ts`

## Testing (`convex/testing/*.ts`)

- [ ] `cleanup.ts`
- [ ] `seedTestDeck.ts`
- [ ] `seedTestUser.ts`

## Token Analytics (`convex/tokenAnalytics/*.ts`)

- [ ] `holders.ts`
- [ ] `metrics.ts`
- [ ] `rollup.ts`
- [ ] `trades.ts`

## Token Launch (`convex/tokenLaunch/*.ts`)

- [ ] `approvals.ts`
- [ ] `checklist.ts`
- [ ] `config.ts`
- [ ] `schedule.ts`

## Treasury (`convex/treasury/*.ts`)

- [ ] `policies.ts`
- [ ] `transactions.ts`
- [ ] `wallets.ts`

## Wallet (`convex/wallet/*.ts`)

- [ ] `createAgentWallet.ts`
- [ ] `tokenTransfer.ts`
- [ ] `updateAgentWallet.ts`
- [ ] `userWallet.ts`

## Webhooks (`convex/webhooks/*.ts`)

- [ ] `helius.ts`

---

## Testing Checklist

After migrating each batch:

- [ ] Type checking passes (`npm run typecheck`)
- [ ] Convex build succeeds (`npx convex dev`)
- [ ] Sample mutations tested
- [ ] Audit logs verified
- [ ] No runtime errors

## Final Verification

Before marking migration complete:

- [ ] All files migrated
- [ ] Full test suite passes
- [ ] Audit logging confirmed working
- [ ] Documentation updated
- [ ] Team notified of changes
