# Convex Backend Cleanup Plan

This document outlines identified issues and recommendations from the backend audit conducted on 2026-02-02.

## Completed Fixes

### 1. Consolidated `scheduleAuditLog` Helper (HIGH PRIORITY - DONE)

**Problem**: 6 duplicate implementations of the same audit logging helper across admin modules.

**Solution**: Created shared helper in `/convex/lib/internalHelpers.ts`:
```typescript
export async function scheduleAuditLog(ctx: MutationCtx, params: AuditLogParams) {
  await ctx.scheduler.runAfter(0, auditLogAction, params);
}
```

**Files Updated**:
- `convex/admin/admin.ts` - Now imports shared helper
- `convex/admin/roles.ts` - Now imports shared helper
- `convex/admin/mutations.ts` - Now imports shared helper
- `convex/admin/moderation.ts` - Now imports shared helper
- `convex/admin/apiKeys.ts` - Now imports shared helper
- `convex/admin/batchAdmin.ts` - Now imports shared helper

---

## Clarifications from Audit

### Re-export Wrapper Files (NOT Empty Placeholders)

The following root-level files were initially flagged as "empty placeholder files" but are actually **valid backward compatibility wrappers** that maintain the flat API structure (`api.games.*`, `api.matchmaking.*`, etc.):

- `convex/effectSystem.ts` → Re-exports from `gameplay/effectSystem/`
- `convex/gameEngine.ts` → Re-exports from `gameplay/gameEngine/`
- `convex/games.ts` → Re-exports from `gameplay/games/`
- `convex/matchmaking.ts` → Re-exports from `social/matchmaking`
- `convex/leaderboards.ts` → Re-exports from `social/leaderboards`
- `convex/friends.ts` → Re-exports from `social/friends`
- `convex/economy.ts` → Re-exports from `economy/economy`
- `convex/decks.ts` → Re-exports from `core/decks`
- `convex/marketplace.ts` → Re-exports from `economy/marketplace`
- `convex/shop.ts` → Re-exports from `economy/shop`
- `convex/story.ts` → Re-exports from `progression/story`
- `convex/cards.ts` → Re-exports from `core/cards`
- `convex/chainResolver.ts` → Re-exports from `gameplay/chainResolver`
- `convex/globalChat.ts` → Re-exports from `social/globalChat`

**Recommendation**: Keep these files. They provide API stability and allow frontend code to use simpler import paths.

### Admin Role Functions (NOT Duplicates)

The admin role functions in `admin/admin.ts` vs `admin/roles.ts` serve different purposes:

| File | Functions | Purpose |
|------|-----------|---------|
| `admin/roles.ts` | `grantRole`, `revokeRole`, `listAdminsByRole`, `getMyRole` | Low-level role operations |
| `admin/admin.ts` | `grantAdminRole`, `revokeAdminRole`, `listAdmins`, `getMyAdminRole` | Dashboard-focused wrappers with enriched data (permissions array, etc.) |

**Current Usage**:
- Frontend admin panel uses `admin/admin.ts` functions
- `admin/roles.ts` functions documented in `docs/RBAC_GUIDE.md`

**Recommendation**: Keep both, but consider having `admin/admin.ts` call `admin/roles.ts` internally to reduce code duplication while preserving the enriched API.

---

## Remaining Issues

### MEDIUM Priority

#### 1. Inconsistent Audit Log Query Pagination

**Problem**: Two different pagination approaches:
- `admin/admin.ts:getAuditLog` - Cursor-based pagination with filters
- `admin/queries.ts:getAuditLogs` - Offset-based pagination with different filters

**Recommendation**: Standardize on cursor-based pagination (more efficient for large datasets). Deprecate offset-based version.

**Affected Files**:
- `convex/admin/admin.ts` (lines 487-591) - Keep this version
- `convex/admin/queries.ts` - Remove duplicate, update frontend to use `admin.ts` version

#### 2. Mixed Auth Patterns

**Problem**: Inconsistent authentication approaches across modules:
- Some use `requireAuthMutation`/`requireAuthQuery` from `lib/convexAuth.ts`
- Some use `getCurrentUser` helper pattern
- Some have inline auth checks

**Recommendation**: Standardize on `requireAuthMutation`/`requireAuthQuery` pattern. Create migration guide.

**Files to Review**:
- All files in `convex/core/`
- All files in `convex/gameplay/`
- All files in `convex/progression/`

### LOW Priority

#### 3. Unused Index Fields

Some indexes defined in schema may not be used efficiently. Run query analysis to identify:
- Indexes that could be removed
- Queries that could benefit from additional indexes

#### 4. Type Safety Improvements

- Some files use `// biome-ignore lint/suspicious/noExplicitAny` - review if stricter typing is possible
- `TS2589` workarounds could potentially be reduced with better type architecture

---

## Implementation Order

1. **Phase 1 (Completed)**: Consolidate `scheduleAuditLog` helper
2. **Phase 2 (Next)**: Unify audit log queries - standardize on cursor-based pagination
3. **Phase 3**: Document auth patterns and begin migration to consistent approach
4. **Phase 4**: Performance audit - index usage analysis

---

## Testing Recommendations

Before deploying any cleanup changes:

1. Run full Convex test suite: `bun test convex/`
2. Verify admin panel functionality (role management, audit logs)
3. Check API compatibility - ensure frontend doesn't break
4. Test cursor-based pagination with large datasets

---

## Notes

- The codebase uses a modular structure with root-level re-exports for API stability
- Admin functions have intentional enrichment layers for dashboard needs
- Type workarounds (`any` casts, TS2589 fixes) are necessary due to Convex's deep type instantiation
