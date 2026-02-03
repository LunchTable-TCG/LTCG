# ElizaOS Plugin Integration - Task Graph

## Execution Strategy

Tasks are organized into **phases**. Within each phase, tasks can execute in **parallel** where dependencies allow.

## Phase 1: Foundation (Sequential)

### Task 1.1: HTTP Middleware Foundation ✅ STARTED
**Status**: In Progress
**Dependencies**: None
**Parallelizable**: No
**Agent Assignment**: Primary Agent

**Deliverables**:
- `/convex/http/middleware/auth.ts` ✅ COMPLETE
- `/convex/http/middleware/responses.ts` ✅ COMPLETE
- `/convex/http/middleware/rateLimit.ts` - TODO

**Estimated Time**: 30 minutes
**Actual Progress**: 60% complete

---

## Phase 2: Core API Endpoints (Parallel)

All tasks depend on Phase 1 completion. Can run in parallel.

### Task 2.1: Agent Management API
**Status**: Ready (blocked by 1.1)
**Dependencies**: Task 1.1
**Parallelizable**: Yes (with 2.2, 2.3, 2.4)
**Agent Assignment**: Agent A

**Deliverables**:
- `/convex/http/agents.ts`
  - POST `/api/agents/register`
  - GET `/api/agents/me`
  - GET `/api/agents/rate-limit`

**Estimated Time**: 45 minutes

### Task 2.2: Game State API
**Status**: Ready (blocked by 1.1)
**Dependencies**: Task 1.1
**Parallelizable**: Yes (with 2.1, 2.3, 2.4)
**Agent Assignment**: Agent B

**Deliverables**:
- `/convex/http/games.ts` (queries only)
  - GET `/api/agents/pending-turns`
  - GET `/api/agents/games/state`
  - GET `/api/agents/games/available-actions`
  - GET `/api/agents/games/history`

**Estimated Time**: 1 hour

### Task 2.3: Matchmaking API
**Status**: Ready (blocked by 1.1)
**Dependencies**: Task 1.1
**Parallelizable**: Yes (with 2.1, 2.2, 2.4)
**Agent Assignment**: Agent C

**Deliverables**:
- `/convex/http/matchmaking.ts`
  - POST `/api/agents/matchmaking/enter`
  - GET `/api/agents/matchmaking/lobbies`
  - POST `/api/agents/matchmaking/join`
  - POST `/api/agents/matchmaking/leave`

**Estimated Time**: 45 minutes

### Task 2.4: Deck & Card API
**Status**: Ready (blocked by 1.1)
**Dependencies**: Task 1.1
**Parallelizable**: Yes (with 2.1, 2.2, 2.3)
**Agent Assignment**: Agent D

**Deliverables**:
- `/convex/http/decks.ts`
  - GET `/api/agents/decks`
  - GET `/api/agents/starter-decks`
  - POST `/api/agents/decks/create`
- `/convex/http/cards.ts`
  - GET `/api/agents/cards`
  - GET `/api/agents/cards/:id`

**Estimated Time**: 30 minutes

---

## Phase 3: Game Actions API (Parallel)

Tasks depend on Phase 1. Can reference Phase 2.2 for validation patterns.

### Task 3.1: Movement Actions API
**Status**: Ready (blocked by 1.1)
**Dependencies**: Task 1.1, (Task 2.2 reference)
**Parallelizable**: Yes (with 3.2, 3.3)
**Agent Assignment**: Agent A

**Deliverables**:
- `/convex/http/games.ts` (add mutations)
  - POST `/api/agents/games/actions/summon`
  - POST `/api/agents/games/actions/set-card`
  - POST `/api/agents/games/actions/flip-summon`
  - POST `/api/agents/games/actions/change-position`

**Estimated Time**: 1 hour

### Task 3.2: Spell/Trap Actions API
**Status**: Ready (blocked by 1.1)
**Dependencies**: Task 1.1, (Task 2.2 reference)
**Parallelizable**: Yes (with 3.1, 3.3)
**Agent Assignment**: Agent B

**Deliverables**:
- `/convex/http/games.ts` (add mutations)
  - POST `/api/agents/games/actions/activate-spell`
  - POST `/api/agents/games/actions/activate-trap`
  - POST `/api/agents/games/actions/set-spell-trap`
  - POST `/api/agents/games/actions/chain-response`

**Estimated Time**: 1.5 hours

### Task 3.3: Combat & Turn Actions API
**Status**: Ready (blocked by 1.1)
**Dependencies**: Task 1.1, (Task 2.2 reference)
**Parallelizable**: Yes (with 3.1, 3.2)
**Agent Assignment**: Agent C

**Deliverables**:
- `/convex/http/games.ts` (add mutations)
  - POST `/api/agents/games/actions/attack`
  - POST `/api/agents/games/actions/end-turn`
  - POST `/api/agents/games/actions/surrender`

**Estimated Time**: 45 minutes

---

## Phase 4: Real-Time Infrastructure (Sequential)

### Task 4.1: Socket.IO Server Setup
**Status**: Blocked (needs all Phase 2-3)
**Dependencies**: All Phase 1, 2, 3 tasks
**Parallelizable**: No
**Agent Assignment**: Primary Agent

**Deliverables**:
- Socket.IO server initialization
- Authentication middleware
- Room management
- Event emitters integration

**Note**: May need separate Node.js server (Convex doesn't support Socket.IO natively)

**Estimated Time**: 1.5 hours

---

## Phase 5: Integration & Testing (Mixed)

### Task 5.1: HTTP Router Integration
**Status**: Blocked (needs all Phase 2-3)
**Dependencies**: All Phase 2 and 3 tasks
**Parallelizable**: No
**Agent Assignment**: Primary Agent

**Deliverables**:
- Update `/convex/router.ts`
- Update `/convex/http.ts`
- Route organization and registration

**Estimated Time**: 30 minutes

### Task 5.2: API Testing Suite
**Status**: Blocked (needs 5.1)
**Dependencies**: Task 5.1
**Parallelizable**: Yes (with 5.3 after 5.1)
**Agent Assignment**: Agent A

**Deliverables**:
- `/convex/http/__tests__/auth.test.ts`
- `/convex/http/__tests__/games.test.ts`
- `/convex/http/__tests__/matchmaking.test.ts`
- `/convex/http/__tests__/integration.test.ts`
- Manual test scripts

**Estimated Time**: 2 hours

### Task 5.3: OpenAPI Documentation
**Status**: Blocked (needs 5.1)
**Dependencies**: Task 5.1
**Parallelizable**: Yes (with 5.2 after 5.1)
**Agent Assignment**: Agent B

**Deliverables**:
- `/convex/http/openapi.json`
- Postman collection
- API documentation markdown

**Estimated Time**: 1 hour

---

## Dependency Graph (ASCII)

```
Phase 1 (Sequential):
[1.1 Middleware] ──┐
                   │
Phase 2 (Parallel):│
                   ├──→ [2.1 Agent API]
                   ├──→ [2.2 Game State API]
                   ├──→ [2.3 Matchmaking API]
                   └──→ [2.4 Deck/Card API]

Phase 3 (Parallel):
[1.1 Middleware] ──┐
[2.2 Game State*]  ├──→ [3.1 Movement Actions]
                   ├──→ [3.2 Spell/Trap Actions]
                   └──→ [3.3 Combat/Turn Actions]

Phase 4 (Sequential):
[All Phase 1-3] ───→ [4.1 Socket.IO Server]

Phase 5 (Mixed):
[All Phase 2-3] ───→ [5.1 Router Integration]
                      │
                      ├──→ [5.2 Testing Suite]
                      └──→ [5.3 OpenAPI Docs]
```

\* = Soft dependency (reference only, not blocking)

---

## Parallel Execution Plan

### Wave 1 (1 agent - Sequential)
- **Primary Agent**: Task 1.1 (Middleware Foundation)
- **Blocker**: None
- **Duration**: ~30 minutes

### Wave 2 (4 agents - Parallel)
- **Agent A**: Task 2.1 (Agent API)
- **Agent B**: Task 2.2 (Game State API)
- **Agent C**: Task 2.3 (Matchmaking API)
- **Agent D**: Task 2.4 (Deck/Card API)
- **Blocker**: Task 1.1 must complete first
- **Duration**: ~1 hour (longest task)

### Wave 3 (3 agents - Parallel)
- **Agent A**: Task 3.1 (Movement Actions)
- **Agent B**: Task 3.2 (Spell/Trap Actions)
- **Agent C**: Task 3.3 (Combat/Turn Actions)
- **Blocker**: Task 1.1 must complete first
- **Duration**: ~1.5 hours (longest task)

### Wave 4 (1 agent - Sequential)
- **Primary Agent**: Task 4.1 (Socket.IO Server)
- **Blocker**: All Phase 1-3 tasks
- **Duration**: ~1.5 hours

### Wave 5 (1 agent - Sequential)
- **Primary Agent**: Task 5.1 (Router Integration)
- **Blocker**: All Phase 2-3 tasks
- **Duration**: ~30 minutes

### Wave 6 (2 agents - Parallel)
- **Agent A**: Task 5.2 (Testing Suite)
- **Agent B**: Task 5.3 (OpenAPI Docs)
- **Blocker**: Task 5.1 must complete first
- **Duration**: ~2 hours (longest task)

---

## Total Time Estimates

- **Sequential execution**: ~11-12 hours
- **Parallel execution (4 agents)**: ~5-6 hours
- **Parallel execution (2 agents)**: ~7-8 hours
- **Single agent (current)**: ~11-12 hours

---

## Current Progress

✅ **Completed**:
- `/convex/http/middleware/auth.ts`
- `/convex/http/middleware/responses.ts`

🔄 **In Progress**:
- Task 1.1 (60% complete)
  - Need: `/convex/http/middleware/rateLimit.ts`

⏳ **Blocked (waiting for 1.1)**:
- All Phase 2 tasks (2.1, 2.2, 2.3, 2.4)
- All Phase 3 tasks (3.1, 3.2, 3.3)

---

## Next Steps

1. ✅ Complete Task 1.1 (finish rate limiting middleware)
2. Launch Wave 2 (4 parallel agents for Phase 2 tasks)
3. Launch Wave 3 (3 parallel agents for Phase 3 tasks)
4. Complete Phase 4 (Socket.IO)
5. Complete Phase 5 (Integration & Testing)

---

## Agent Spawn Commands

When ready to launch parallel agents:

```bash
# Wave 2 - After Task 1.1 complete
claude-code task --agent=A --task=2.1 --parallel
claude-code task --agent=B --task=2.2 --parallel
claude-code task --agent=C --task=2.3 --parallel
claude-code task --agent=D --task=2.4 --parallel

# Wave 3 - After Task 1.1 complete
claude-code task --agent=A --task=3.1 --parallel
claude-code task --agent=B --task=3.2 --parallel
claude-code task --agent=C --task=3.3 --parallel

# Wave 6 - After Task 5.1 complete
claude-code task --agent=A --task=5.2 --parallel
claude-code task --agent=B --task=5.3 --parallel
```
