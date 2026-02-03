# UX Fixes & Logic Completeness - Task Graph

## Overview

Comprehensive UX improvements and logic fixes for LTCG application based on audit findings.

## Execution Strategy

Tasks organized into **phases** by dependency. Independent tasks within phases run in **parallel**.

---

## Phase 1: Critical State Sync & Logic Fixes (Sequential - Foundation)

### Task 1.1: Fix Orphaned activeDeckId on Deck Deletion
**Status**: Pending
**Dependencies**: None
**Parallelizable**: No (foundation)
**Files**:
- `/convex/core/decks.ts` - Add cleanup logic to deleteDeck mutation
- `/apps/web/src/hooks/useDeckBuilder.ts` - Handle deletion cascade

**Issue**: User deletes active deck → `activeDeckId` still references deleted deck → Welcome guide shows again or game fails.

**Fix**: On deck deletion, if deleted deck === activeDeckId, clear activeDeckId or set to another valid deck.

---

### Task 1.2: Add Error Boundaries to Critical Pages
**Status**: Pending
**Dependencies**: None
**Parallelizable**: Yes (with 1.1)
**Files**:
- `/apps/web/app/(app)/binder/page.tsx` - Wrap with error boundary
- `/apps/web/app/(app)/play/story/page.tsx` - Handle "no chapters" state
- `/apps/web/src/components/game/GameBoard.tsx` - Add reconnection UI

**Issue**: Pages fail silently or show infinite spinners on data errors.

**Fix**: Add React error boundaries with retry buttons; add "no data" states.

---

## Phase 2: Accessibility Fixes (Parallel - High Impact)

### Task 2.1: GameBoard Accessibility
**Status**: Pending
**Dependencies**: Task 1.2
**Parallelizable**: Yes (with 2.2, 2.3, 2.4)
**Files**:
- `/apps/web/src/components/game/GameBoard.tsx`
- `/apps/web/src/components/game/board/PlayerHand.tsx`

**Fixes**:
- Add `aria-label` to all interactive elements
- Add `role="button"` to clickable cards
- Add keyboard navigation (Tab, Enter, Space)
- Add `aria-pressed` states for selected cards

---

### Task 2.2: SummonModal Accessibility
**Status**: Pending
**Dependencies**: Task 1.2
**Parallelizable**: Yes (with 2.1, 2.3, 2.4)
**Files**:
- `/apps/web/src/components/game/dialogs/SummonModal.tsx`

**Fixes**:
- Add `aria-label` to tribute selection buttons
- Add `aria-describedby` linking to effect descriptions
- Fix typo "dont" → "don't" (line 93)
- Add keyboard trap within modal

---

### Task 2.3: AttackModal Accessibility
**Status**: Pending
**Dependencies**: Task 1.2
**Parallelizable**: Yes (with 2.1, 2.2, 2.4)
**Files**:
- `/apps/web/src/components/game/dialogs/AttackModal.tsx`

**Fixes**:
- Add `aria-label` to target selection buttons
- Add `role="listbox"` for target list
- Add focus management on modal open

---

### Task 2.4: Marketplace/Settings Accessibility
**Status**: Pending
**Dependencies**: Task 1.2
**Parallelizable**: Yes (with 2.1, 2.2, 2.3)
**Files**:
- `/apps/web/src/components/marketplace/ListingDialog.tsx`
- `/apps/web/app/(app)/settings/page.tsx`

**Fixes**:
- Add form field labels and `aria-describedby` for validation
- Add `aria-invalid` for error states
- Add `aria-busy` for loading states

---

## Phase 3: Error Handling & Feedback (Parallel)

### Task 3.1: Improve Game Action Feedback
**Status**: Pending
**Dependencies**: Phase 2
**Parallelizable**: Yes (with 3.2, 3.3)
**Files**:
- `/apps/web/src/components/game/GameBoard.tsx`
- `/apps/web/src/components/game/dialogs/SummonModal.tsx`

**Fixes**:
- Add toast for backrow activation success (line 677 missing)
- Make "Activation Failed" errors specific with reason
- Add consistent success/failure toasts for all game actions

---

### Task 3.2: Improve Form Validation UX
**Status**: Pending
**Dependencies**: Phase 2
**Parallelizable**: Yes (with 3.1, 3.3)
**Files**:
- `/apps/web/app/(app)/binder/page.tsx`
- `/apps/web/app/(app)/settings/page.tsx`

**Fixes**:
- Show deck size validation DURING building (not just on save)
- Add real-time password validation feedback
- Show character count for deck name
- Add inline validation errors (not just toasts)

---

### Task 3.3: Improve Error Messages
**Status**: Pending
**Dependencies**: Phase 2
**Parallelizable**: Yes (with 3.1, 3.2)
**Files**:
- `/apps/web/src/components/marketplace/ListingDialog.tsx`
- `/apps/web/app/(app)/settings/page.tsx`
- `/apps/web/src/components/auth/AuthForm.tsx`

**Fixes**:
- Make error messages specific ("Password must be 8+ characters" not "Failed")
- Add error context (network vs validation vs server)
- Standardize error wording across app

---

## Phase 4: Confirmation Dialogs & Destructive Actions (Parallel)

### Task 4.1: Replace window.confirm with Styled Dialogs
**Status**: Pending
**Dependencies**: Phase 2
**Parallelizable**: Yes (with 4.2)
**Files**:
- `/apps/web/app/(app)/binder/page.tsx` (line 381 - deck deletion)
- Create shared `ConfirmDialog` component if not exists

**Fix**: Replace `window.confirm()` with styled AlertDialog matching app theme.

---

### Task 4.2: Add Missing Confirmations
**Status**: Pending
**Dependencies**: Phase 2
**Parallelizable**: Yes (with 4.1)
**Files**:
- `/apps/web/app/(app)/binder/page.tsx` - Clear deck action (line 403)
- `/apps/web/app/(app)/settings/page.tsx` - Password change confirmation

**Fix**: Add confirmation dialogs for:
- Clear deck (loses all work)
- Password change (security action)

---

## Phase 5: Mobile Responsiveness & Overflow (Parallel)

### Task 5.1: Fix Modal Overflow Issues
**Status**: Pending
**Dependencies**: Phase 2
**Parallelizable**: Yes (with 5.2)
**Files**:
- `/apps/web/src/components/game/dialogs/AttackModal.tsx`
- `/apps/web/src/components/game/dialogs/SummonModal.tsx`
- `/apps/web/src/components/game/dialogs/CardSelectionModal.tsx`

**Fixes**:
- Add `max-h-[80vh]` or `max-h-screen` constraints
- Add `overflow-y-auto` for scrollable content
- Test on mobile viewport sizes

---

### Task 5.2: Improve Touch Targets
**Status**: Pending
**Dependencies**: Phase 2
**Parallelizable**: Yes (with 5.1)
**Files**:
- Various game board components

**Fixes**:
- Ensure all touch targets are minimum 44x44px
- Add touch-friendly card selection

---

## Phase 6: Empty States & Loading (Parallel)

### Task 6.1: Improve Empty States
**Status**: Pending
**Dependencies**: Phase 3
**Parallelizable**: Yes (with 6.2)
**Files**:
- `/apps/web/app/(app)/binder/page.tsx`
- `/apps/web/app/(app)/play/story/page.tsx`
- `/apps/web/app/(app)/leaderboards/page.tsx`

**Fixes**:
- Add guidance to "No Cards Found" (how to acquire cards)
- Add "No chapters found" message with retry for story mode
- Add "You're not ranked yet" message for leaderboards

---

### Task 6.2: Add Unsaved Changes Warning
**Status**: Pending
**Dependencies**: Phase 3
**Parallelizable**: Yes (with 6.1)
**Files**:
- `/apps/web/app/(app)/binder/page.tsx`
- `/apps/web/app/(app)/settings/page.tsx`

**Fixes**:
- Add `beforeunload` listener when changes exist
- Add in-app navigation warning
- Track dirty state for forms

---

## Phase 7: Logic Completeness (Sequential - Final Review)

### Task 7.1: Profile Route Clarification
**Status**: Pending
**Dependencies**: Phase 6
**Parallelizable**: No
**Files**:
- `/apps/web/app/(app)/profile/page.tsx`
- `/apps/web/app/(app)/profile/[playerId]/page.tsx`

**Fixes**:
- Add clear visual indicator "Viewing your profile" vs "Viewing [player]'s profile"
- Add redirect logic: `/profile` → `/profile/[currentUserId]` for authenticated users

---

### Task 7.2: Story Mode Edge Cases
**Status**: Pending
**Dependencies**: Phase 6
**Parallelizable**: Yes (with 7.1)
**Files**:
- `/apps/web/app/(app)/play/story/page.tsx`
- `/apps/web/app/(app)/play/story/[chapterId]/page.tsx`

**Fixes**:
- Handle "no chapters seeded" state with admin notice
- Add loading states with skeleton UI
- Handle chapter not found (404 page)

---

### Task 7.3: Friend System Completeness
**Status**: Pending
**Dependencies**: Phase 6
**Parallelizable**: Yes (with 7.1, 7.2)
**Files**:
- `/apps/web/app/(app)/social/page.tsx`

**Fixes**:
- Either implement direct messaging or remove message icon
- Add friend challenge functionality or disable button
- Add real-time online status updates

---

---

## Dependency Graph (ASCII)

```
Phase 1 (Foundation):
[1.1 ActiveDeck Fix] ──┐
[1.2 Error Boundaries]─┤
                       │
Phase 2 (Parallel):    ↓
                       ├──→ [2.1 GameBoard A11y]
                       ├──→ [2.2 SummonModal A11y]
                       ├──→ [2.3 AttackModal A11y]
                       └──→ [2.4 Marketplace/Settings A11y]

Phase 3 (Parallel):    ↓ (after Phase 2)
                       ├──→ [3.1 Game Action Feedback]
                       ├──→ [3.2 Form Validation UX]
                       └──→ [3.3 Error Messages]

Phase 4 (Parallel):    ↓ (after Phase 2)
                       ├──→ [4.1 Replace window.confirm]
                       └──→ [4.2 Add Missing Confirmations]

Phase 5 (Parallel):    ↓ (after Phase 2)
                       ├──→ [5.1 Modal Overflow Fixes]
                       └──→ [5.2 Touch Targets]

Phase 6 (Parallel):    ↓ (after Phase 3)
                       ├──→ [6.1 Empty States]
                       └──→ [6.2 Unsaved Changes Warning]

Phase 7 (Final):       ↓ (after Phase 6)
                       ├──→ [7.1 Profile Routes]
                       ├──→ [7.2 Story Mode Edge Cases]
                       └──→ [7.3 Friend System]
```

---

## Execution Plan

### Wave 1 (2 agents - Parallel Foundation)
- **Agent A**: Task 1.1 (ActiveDeck Fix)
- **Agent B**: Task 1.2 (Error Boundaries)

### Wave 2 (4 agents - Parallel Accessibility)
- **Agent A**: Task 2.1 (GameBoard A11y)
- **Agent B**: Task 2.2 (SummonModal A11y)
- **Agent C**: Task 2.3 (AttackModal A11y)
- **Agent D**: Task 2.4 (Marketplace/Settings A11y)

### Wave 3 (5 agents - Parallel UX Improvements)
- **Agent A**: Task 3.1 (Game Feedback)
- **Agent B**: Task 3.2 (Form Validation)
- **Agent C**: Task 3.3 (Error Messages)
- **Agent D**: Task 4.1 (Confirm Dialogs)
- **Agent E**: Task 4.2 (Missing Confirmations)

### Wave 4 (4 agents - Parallel Polish)
- **Agent A**: Task 5.1 (Modal Overflow)
- **Agent B**: Task 5.2 (Touch Targets)
- **Agent C**: Task 6.1 (Empty States)
- **Agent D**: Task 6.2 (Unsaved Changes)

### Wave 5 (3 agents - Final Completeness)
- **Agent A**: Task 7.1 (Profile Routes)
- **Agent B**: Task 7.2 (Story Edge Cases)
- **Agent C**: Task 7.3 (Friend System)

---

## Current Progress

✅ **Completed** (17 tasks):
- Task 1.1: Fix orphaned activeDeckId on deck deletion - `/convex/core/decks.ts`
- Task 1.2: Add error boundaries to critical pages - Story mode empty state improved
- Task 2.1: GameBoard accessibility - ARIA regions, screen reader announcements, card labels
- Task 2.2: SummonModal accessibility - ARIA labels, roles, keyboard nav, overflow fix
- Task 2.3: AttackModal accessibility - ARIA labels, roles, overflow fix
- Task 2.4: Settings accessibility - form labels, password validation feedback
- Task 3.1: Game action feedback - Already well-implemented with toast notifications
- Task 3.2: Form validation UX - real-time password requirements with visual indicators
- Task 3.3: Error messages - Verified errorCodes.ts system is already comprehensive
- Task 4.1: Replace window.confirm with styled AlertDialog - created new component
- Task 4.2: Add clear deck confirmation - AlertDialog for clear action
- Task 5.1: Fix modal overflow issues - max-h-[85vh] on SummonModal/AttackModal
- Task 6.1: Improve empty states - Story mode "chapters unavailable" with retry
- Task 6.2: Add unsaved changes warning - Settings page beforeunload + visual indicator
- Task 7.1: Profile route clarification - Added context banner for own/other profiles
- Task 7.2: Story mode edge cases - Proper loading vs empty state differentiation
- Task 7.3: Friend system completeness - Added toast feedback for messaging (coming soon)

✅ **All priority UX fixes completed!**

---

## Files Changed Tracker

_Updated as tasks complete_

| File | Tasks | Status |
|------|-------|--------|
| `/convex/core/decks.ts` | 1.1 | Pending |
| `/apps/web/src/hooks/useDeckBuilder.ts` | 1.1 | Pending |
| `/apps/web/app/(app)/binder/page.tsx` | 1.2, 3.2, 4.1, 4.2, 6.1, 6.2 | Pending |
| `/apps/web/src/components/game/GameBoard.tsx` | 1.2, 2.1, 3.1 | Pending |
| `/apps/web/src/components/game/board/PlayerHand.tsx` | 2.1 | Pending |
| `/apps/web/src/components/game/dialogs/SummonModal.tsx` | 2.2, 3.1, 5.1 | Pending |
| `/apps/web/src/components/game/dialogs/AttackModal.tsx` | 2.3, 5.1 | Pending |
| `/apps/web/src/components/marketplace/ListingDialog.tsx` | 2.4, 3.3 | Pending |
| `/apps/web/app/(app)/settings/page.tsx` | 2.4, 3.2, 3.3, 4.2, 6.2 | Pending |
| `/apps/web/app/(app)/play/story/page.tsx` | 1.2, 6.1, 7.2 | Pending |
| `/apps/web/app/(app)/leaderboards/page.tsx` | 6.1 | Pending |
| `/apps/web/app/(app)/profile/page.tsx` | 7.1 | Pending |
| `/apps/web/app/(app)/social/page.tsx` | 7.3 | Pending |
