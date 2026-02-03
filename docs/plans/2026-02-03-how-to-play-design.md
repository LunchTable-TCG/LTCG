# How to Play LunchTable - Design Document

**Date:** 2026-02-03
**Status:** Approved

## Overview

Comprehensive player education system with three interconnected components:
1. Rules documentation page
2. Interactive tutorial (Story Mode Ch1 S1)
3. Help Mode with full-app tooltip coverage

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    "How to Play" System                      │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Rules Page    │    Tutorial     │       Tooltips          │
│   /how-to-play  │  Story Ch1 S1   │    Help Mode "?"        │
├─────────────────┴─────────────────┴─────────────────────────┤
│                  Shared Content Layer                        │
│         (game-rules.ts - single source of truth)            │
└─────────────────────────────────────────────────────────────┘
```

All three systems pull from `game-rules.ts` ensuring consistency across rules page text, tutorial dialogue, and tooltip explanations.

---

## Component 1: Rules Page (`/how-to-play`)

### Layered Structure

```
/how-to-play
├── Quick Start (always visible, ~2 min read)
│   ├── Goal: Reduce opponent's LP from 8000 to 0
│   ├── Turn Overview: Draw → Main → Battle → End
│   ├── Card Types: Creatures, Spells, Traps, Equipment
│   └── Your First Turn (visual walkthrough)
│
├── Core Rules (expandable sections)
│   ├── Turn Phases (detailed breakdown)
│   ├── Summoning (Normal, Tribute, Special, Flip)
│   ├── Combat (ATK vs ATK, ATK vs DEF, direct attack)
│   ├── Spells & Traps (activation, timing, chains)
│   └── Card Zones (field layout diagram)
│
├── Advanced Rules (collapsed by default)
│   ├── Chain Resolution
│   ├── Damage Calculation
│   ├── Effect Timing (triggers, continuous)
│   └── Special Conditions (piercing, direct attack, etc.)
│
└── Glossary (searchable)
    └── ATK, DEF, Tribute, Banish, Graveyard, LP, etc.
```

### UI Features
- Sticky sidebar navigation on desktop
- Animated diagrams for combat/phases
- "Try it" links that jump into tutorial at relevant moment
- Search bar for finding specific rules
- Print-friendly version for offline reference

---

## Component 2: Interactive Tutorial

### Approach
Story Mode Chapter 1, Stage 1 becomes a guided tutorial experience. Overlay instruction panels appear at key teaching moments.

### Tutorial Flow - 5 Teaching Moments

| Moment | Trigger | Teaching Content |
|--------|---------|------------------|
| 1 | Draw Phase starts | "Each turn begins by drawing a card. This is your Draw Phase." |
| 2 | Main Phase, creature in hand | Highlight creature card, guide tap-to-summon |
| 3 | Battle Phase, creature on field | Explain ATK targeting, show damage calculation |
| 4 | Spell card drawn | Highlight spell card, explain activation |
| 5 | Opponent LP reaches 0 | Celebrate, explain LP victory condition |

### Implementation
- Add `isTutorial` flag to battle state
- Tutorial moments defined in `game-rules.ts` with trigger conditions
- Opponent (AI) has scripted deck ensuring teachable moments occur
- Overlay panels pause gameplay until dismissed

### Skip Behavior (Soft Mandatory)
- Tutorial auto-starts for new accounts
- Players can exit anytime via "Exit Tutorial" button
- "Resume Tutorial?" prompt appears on subsequent visits
- Prompt stops after: tutorial completed OR dismissed 3 times

---

## Component 3: Help Mode & Tooltips

### Help Mode Toggle
Every screen gets a floating "?" button in the top-right corner.

**Behavior:**
1. Tap "?" → Help Mode activates
2. Button glows/pulses to indicate active state
3. All interactive elements highlight
4. Tapping any element shows its tooltip
5. Tap "?" again to exit Help Mode

### Tooltip Coverage

| Area | Tooltippable Elements |
|------|----------------------|
| Game Board | Deck, Graveyard, Banished, LP counter, Phase indicator, Card zones, Mana pool |
| Cards | Card type, ATK/DEF, Keywords, Effects (plain English), Rarity, Element |
| Deck Builder | Card limits, Deck size, Archetype synergies, Invalid deck warnings |
| Collection | Rarity explanations, Duplicate count, Favorite function |
| Shop | Pack odds, Currency types, Bundle value |
| Lobby | Ranked vs Casual, Rating system, Match status |

### Tooltip Component Structure

```tsx
<Tooltip target="graveyard">
  <TooltipTitle>Graveyard</TooltipTitle>
  <TooltipBody>
    Cards sent here after being destroyed or discarded.
    Some effects can retrieve cards from the Graveyard.
  </TooltipBody>
  <TooltipLink href="/how-to-play#graveyard">Learn more</TooltipLink>
</Tooltip>
```

---

## Data Model

### Schema Additions

```typescript
// In convex/schema.ts - add to players table
tutorialProgress: v.optional(v.object({
  completed: v.boolean(),              // Finished all 5 moments
  lastMoment: v.number(),              // 0-5, resume point
  dismissCount: v.number(),            // Times clicked "Exit Tutorial"
  completedAt: v.optional(v.number()), // Timestamp
})),
helpModeEnabled: v.optional(v.boolean()), // Persists user preference
```

### Resume Tutorial Logic

```
On app load, check:
1. tutorialProgress.completed === true → No prompt
2. dismissCount >= 3 → No prompt (respected their choice)
3. Otherwise → Show "Resume Tutorial?" toast
   ├── [Resume] → Jump to Story Ch1 S1 at lastMoment
   └── [Not Now] → Increment dismissCount
```

### New Convex Functions

| Function | Purpose |
|----------|---------|
| `updateTutorialProgress` | Save moment completion |
| `dismissTutorial` | Increment dismiss count |
| `completeTutorial` | Mark finished, set timestamp |
| `getTutorialStatus` | Check if should show prompt |

---

## File Structure

### New Files

```
apps/web/
├── app/(app)/how-to-play/
│   ├── page.tsx                    # Main rules page
│   ├── components/
│   │   ├── QuickStart.tsx          # Quick start section
│   │   ├── CoreRules.tsx           # Expandable core rules
│   │   ├── AdvancedRules.tsx       # Advanced rules section
│   │   ├── Glossary.tsx            # Searchable glossary
│   │   ├── RulesSidebar.tsx        # Navigation sidebar
│   │   └── AnimatedDiagram.tsx     # Combat/phase diagrams
├── lib/
│   └── game-rules.ts               # Shared content definitions
├── components/help/
│   ├── HelpModeProvider.tsx        # Context provider
│   ├── HelpModeToggle.tsx          # The "?" button
│   ├── Tooltip.tsx                 # Reusable tooltip component
│   ├── TooltipTarget.tsx           # Wrapper for tooltippable elements
│   └── TutorialOverlay.tsx         # Teaching moment panels
```

### Files to Modify

| File | Changes |
|------|---------|
| `convex/schema.ts` | Add `tutorialProgress`, `helpModeEnabled` to players |
| `convex/players.ts` | Add tutorial mutation functions |
| `apps/web/app/(app)/layout.tsx` | Wrap with HelpModeProvider, add toggle |
| `apps/web/app/(app)/lunchtable/` | Add tutorial overlay logic to battle |
| Story battle component | Add `isTutorial` flag and moment triggers |
| All major screen components | Wrap elements with TooltipTarget |

---

## Implementation Phases

### Phase 1: Foundation
- Create `game-rules.ts` shared content file
- Add schema fields and Convex functions
- Create HelpModeProvider and toggle button

### Phase 2: Rules Page
- Build `/how-to-play` page with all sections
- Create animated diagrams
- Add search and navigation

### Phase 3: Help Mode Tooltips
- Create Tooltip and TooltipTarget components
- Add tooltips to game board
- Add tooltips to deck builder, collection, shop, lobby

### Phase 4: Interactive Tutorial
- Add tutorial logic to Story Ch1 S1
- Create TutorialOverlay component
- Script AI opponent deck for teachable moments
- Implement resume prompt system

### Phase 5: Polish
- Add "Try it" links from rules page to tutorial
- Cross-link tooltips to relevant rules sections
- Test full player journey from new account

---

## Success Criteria

- [ ] New player can learn game basics without external resources
- [ ] Rules page answers common gameplay questions
- [ ] Tutorial teaches 5 core concepts through guided play
- [ ] Help Mode provides context anywhere in the app
- [ ] Experienced players can skip/disable educational features
