# Debugging Guide

Comprehensive debugging and logging system for the LTCG application.

## Table of Contents

- [Overview](#overview)
- [Backend Debugging (Convex)](#backend-debugging-convex)
- [Frontend Debugging (React/Next.js)](#frontend-debugging-reactnextjs)
- [Error Tracking](#error-tracking)
- [Performance Monitoring](#performance-monitoring)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

The LTCG application has a comprehensive debugging system with:

- ✅ **Structured logging** with multiple log levels (debug, info, warn, error)
- ✅ **Performance monitoring** for slow operations
- ✅ **Request tracing** with correlation IDs across functions
- ✅ **Error boundaries** for React components
- ✅ **Environment-aware logging** (verbose in dev, production-safe)
- ✅ **Game-specific debug helpers** for matchmaking, card effects, etc.

---

## Backend Debugging (Convex)

### Basic Usage

```typescript
import { logger, performance, createTraceContext } from "../lib/debug";

export const myMutation = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Log function entry
    logger.mutation("myMutation", args.userId);

    // Create trace context for request correlation
    const traceCtx = createTraceContext("myMutation", { userId: args.userId });

    // Log important events
    logger.info("Processing user request", traceCtx);

    // Log debug info (only in development)
    logger.debug("Detailed state information", { ...traceCtx, someState: value });

    // Your logic here
    const result = await doSomething();

    return result;
  },
});
```

### Using Debug Wrappers

For automatic logging, use the debug wrappers:

```typescript
import { withMutationDebug } from "../lib/debugHelpers";

export const myMutation = mutation({
  args: { userId: v.id("users") },
  handler: withMutationDebug(
    "myMutation",
    async (ctx, args) => {
      // Your logic here - logging is automatic
      return result;
    }
  ),
});
```

### Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| **debug** | Detailed debugging info (dev only) | `logger.debug("Checking cache", { cacheKey })` |
| **info** | Important business events | `logger.info("User logged in", { userId })` |
| **warn** | Potential issues | `logger.warn("Rate limit approaching", { remaining })` |
| **error** | Errors with full context | `logger.error("Payment failed", error, { userId })` |

### Performance Monitoring

```typescript
// Manual timing
const opId = "expensiveOperation";
performance.start(opId);

await expensiveOperation();

performance.end(opId, { userId }); // Logs duration automatically

// Automatic timing with wrapper
const result = await performance.measure(
  "databaseQuery",
  async () => {
    return await ctx.db.query("users").collect();
  },
  { table: "users" }
);
```

### Database Operation Logging

```typescript
import { withDbQuery } from "../lib/debugHelpers";

const user = await withDbQuery(
  ctx,
  "get",
  "users",
  async () => ctx.db.get(userId),
  { userId }
);
```

### Game-Specific Helpers

```typescript
import {
  logGameState,
  logCardEffect,
  logMatchmaking,
} from "../lib/debug";

// Log game state changes
logGameState(lobbyId, "main_phase", { turnNumber, activePlayer });

// Log card effects
logCardEffect("Lightning Bolt", "damage", true, { damage: 3, target });

// Log matchmaking events
logMatchmaking("queue_joined", playerId, { mode: "ranked" });
```

### Batch Operations

```typescript
import { withBatchOperation } from "../lib/debugHelpers";

const results = await withBatchOperation(
  "grantGoldToPlayers",
  playerIds,
  async (playerId, index) => {
    return await ctx.db.patch(playerId, { gold: newAmount });
  },
  { adminId, amount: 1000 }
);
```

### Request Tracing

```typescript
// Create a trace context to correlate logs across function calls
const traceCtx = createTraceContext("createLobby", {
  userId,
  mode: "ranked",
});

logger.info("Starting lobby creation", traceCtx);

// Pass traceCtx to other functions
await initializeGameState(ctx, gameId, traceCtx);

// All logs with the same traceId can be filtered together
logger.info("Lobby created", { ...traceCtx, lobbyId });
```

### Environment Configuration

Set log level via environment variable:

```env
# In .env.local or production
LOG_LEVEL=info  # Options: debug, info, warn, error
```

---

## Frontend Debugging (React/Next.js)

### Basic Usage

```typescript
import { logger, componentLogger } from "@/lib/debug";

function MyComponent({ userId }: Props) {
  // Create scoped logger for this component
  const log = componentLogger("MyComponent");

  useEffect(() => {
    log.info("Component mounted", { userId });

    return () => {
      log.debug("Component unmounting");
    };
  }, [userId]);

  const handleClick = () => {
    log.userAction("button_clicked", { userId, buttonId: "submit" });
  };

  return <button onClick={handleClick}>Submit</button>;
}
```

### Lifecycle Debugging

```typescript
import { useDebugLifecycle, useWhyDidYouUpdate } from "@/lib/debug";

function MyComponent(props: Props) {
  // Log mount, unmount, and re-renders
  useDebugLifecycle("MyComponent", props);

  // Track why component re-rendered
  useWhyDidYouUpdate("MyComponent", props);

  return <div>Content</div>;
}
```

### Error Boundaries

Wrap components in error boundaries to catch and log errors:

```typescript
import { ErrorBoundary, GameErrorBoundary } from "@/components/ErrorBoundary";

// Generic error boundary
<ErrorBoundary fallback={<ErrorFallback />}>
  <MyComponent />
</ErrorBoundary>

// Game-specific error boundary with recovery
<GameErrorBoundary>
  <GameBoard />
</GameErrorBoundary>
```

### API Call Logging

```typescript
import { logger, perf } from "@/lib/debug";

async function fetchUserData(userId: string) {
  logger.apiCall("/api/user", "GET", { userId });

  const result = await perf.time(
    "fetchUserData",
    async () => {
      const response = await fetch(`/api/user/${userId}`);
      return response.json();
    }
  );

  logger.info("User data fetched", { userId, dataSize: result.length });

  return result;
}
```

### Performance Monitoring

```typescript
import { perf } from "@/lib/debug";

// Mark performance points
perf.mark("render-start");

// ... rendering logic ...

perf.mark("render-end");

// Measure between marks
perf.measure("total-render", "render-start", "render-end");
```

### Debug Mode

Enable verbose logging in browser console:

```javascript
// In browser console
enableDebugMode()  // Enable all logs
disableDebugMode() // Restore default log level

// Or via localStorage
localStorage.setItem("debug", "true")  // Enable
localStorage.removeItem("debug")       // Disable
```

### Error Tracking

```typescript
import { trackError } from "@/lib/debug";

try {
  await riskyOperation();
} catch (error) {
  trackError(error as Error, {
    component: "MyComponent",
    operation: "riskyOperation",
    userId,
  });

  // Handle error
}
```

---

## Error Tracking

### Backend Error Handling

```typescript
import { logAndSanitizeError } from "../lib/debug";

try {
  await sensitiveOperation();
} catch (error) {
  // Log full error internally, return safe error to client
  const clientError = logAndSanitizeError(
    error,
    "sensitiveOperation",
    { userId }
  );

  throw clientError; // Generic message in production
}
```

### Frontend Error Handling

```typescript
import { useErrorHandler } from "@/components/ErrorBoundary";

function MyComponent() {
  const handleError = useErrorHandler();

  const handleAsyncOperation = async () => {
    try {
      await asyncOperation();
    } catch (error) {
      handleError(error as Error); // Will be caught by error boundary
    }
  };

  return <button onClick={handleAsyncOperation}>Do Something</button>;
}
```

---

## Performance Monitoring

### Identifying Slow Operations

The system automatically warns about operations taking over 1 second:

```typescript
// Convex Backend
performance.start("slowOperation");
await slowOperation();
performance.end("slowOperation"); // Logs warning if > 1000ms

// Frontend
perf.time("slowRender", async () => {
  await expensiveRender();
}); // Logs warning if > 1000ms
```

### Finding Performance Bottlenecks

1. **Check Convex Logs**: Look for `⏱️` emoji and warnings about slow operations
2. **Browser DevTools**: Performance tab shows marked operations
3. **Filter by Duration**: Search logs for operations over 1000ms

```bash
# In Convex logs
grep "Slow operation" convex.log

# In browser console
logger.perf // Access performance entries
```

---

## Best Practices

### What to Log

✅ **DO LOG:**
- User actions and mutations
- Errors with full context
- State changes in game logic
- Performance metrics for critical paths
- Validation failures
- External API calls

❌ **DON'T LOG:**
- Passwords or sensitive data
- Full request/response bodies (use IDs instead)
- Excessive debug info in tight loops
- Personally identifiable information (PII) in production

### Logging Patterns

```typescript
// ✅ Good: Contextual, searchable
logger.info("User authenticated", { userId, method: "email" });

// ❌ Bad: No context
logger.info("User authenticated");

// ✅ Good: Structured error logging
logger.error("Payment failed", error, { userId, amount, paymentId });

// ❌ Bad: Just the error
console.error(error);
```

### Performance Considerations

- Debug logs are **automatically disabled** in production (unless `LOG_LEVEL=debug`)
- Use `logger.debug()` for verbose logging that you don't need in production
- Performance monitoring adds **minimal overhead** (<1ms per operation)
- Trace IDs are **generated once** per request and reused

---

## Troubleshooting

### Logs Not Appearing

**Convex:**
1. Check `LOG_LEVEL` environment variable
2. Verify you're looking at the right deployment (dev vs prod)
3. Check Convex dashboard logs

**Frontend:**
1. Check browser console
2. Try `enableDebugMode()` in console
3. Verify `NEXT_PUBLIC_LOG_LEVEL` env variable

### Performance Impact

The logging system is designed for minimal performance impact:

- **Debug logs**: 0ms overhead in production (completely skipped)
- **Info/Warn/Error logs**: ~0.5ms per log
- **Performance tracking**: ~1ms per operation
- **Trace ID generation**: ~0.1ms per request

### Common Issues

| Issue | Solution |
|-------|----------|
| Too many logs | Increase `LOG_LEVEL` to `info` or `warn` |
| Missing context | Use `createTraceContext()` and pass to functions |
| Slow performance | Check for logs in tight loops, use `logger.debug()` |
| Errors not caught | Wrap components in `<ErrorBoundary>` |

---

## Examples

### Complete Backend Example

```typescript
import {
  logger,
  performance,
  createTraceContext,
  logMatchmaking,
} from "../lib/debug";
import { withMutationDebug } from "../lib/debugHelpers";

export const createGame = mutation({
  args: { mode: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    const opId = `createGame_${Date.now()}`;
    performance.start(opId);

    logger.mutation("createGame", args.userId, { mode: args.mode });

    const traceCtx = createTraceContext("createGame", {
      userId: args.userId,
      mode: args.mode,
    });

    logMatchmaking("game_create_start", args.userId, traceCtx);

    try {
      // Validate user
      logger.debug("Validating user", traceCtx);
      const user = await ctx.db.get(args.userId);

      if (!user) {
        logger.warn("User not found", traceCtx);
        throw new Error("User not found");
      }

      // Create game
      logger.dbOperation("insert", "games", traceCtx);
      const gameId = await ctx.db.insert("games", {
        hostId: args.userId,
        mode: args.mode,
        status: "waiting",
        createdAt: Date.now(),
      });

      logger.info("Game created successfully", { ...traceCtx, gameId });
      logMatchmaking("game_create_complete", args.userId, { ...traceCtx, gameId });

      performance.end(opId, { ...traceCtx, gameId });

      return { gameId };
    } catch (error) {
      logger.error("Failed to create game", error as Error, traceCtx);
      logMatchmaking("game_create_failed", args.userId, traceCtx);
      performance.end(opId, { ...traceCtx, error: true });
      throw error;
    }
  },
});
```

### Complete Frontend Example

```typescript
"use client";

import { useEffect, useState } from "react";
import { logger, componentLogger, perf } from "@/lib/debug";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { trackError } from "@/lib/debug";

function GameLobby({ userId }: Props) {
  const log = componentLogger("GameLobby");
  const [lobbies, setLobbies] = useState([]);

  useEffect(() => {
    log.info("GameLobby mounted", { userId });

    const loadLobbies = async () => {
      try {
        log.debug("Fetching lobbies");

        const result = await perf.time(
          "fetchLobbies",
          async () => {
            const response = await fetch("/api/lobbies");
            return response.json();
          }
        );

        setLobbies(result);
        log.info("Lobbies loaded", { count: result.length });
      } catch (error) {
        log.error("Failed to load lobbies", error as Error);
        trackError(error as Error, { component: "GameLobby", userId });
      }
    };

    loadLobbies();

    return () => {
      log.debug("GameLobby unmounting");
    };
  }, [userId]);

  const handleJoinLobby = (lobbyId: string) => {
    log.userAction("join_lobby", { userId, lobbyId });
    // Join logic
  };

  return (
    <div>
      {lobbies.map((lobby) => (
        <LobbyCard
          key={lobby.id}
          lobby={lobby}
          onJoin={() => handleJoinLobby(lobby.id)}
        />
      ))}
    </div>
  );
}

// Wrap with error boundary
export default function GameLobbyWithErrorBoundary(props: Props) {
  return (
    <ErrorBoundary boundaryName="GameLobby">
      <GameLobby {...props} />
    </ErrorBoundary>
  );
}
```

---

## Configuration Reference

### Environment Variables

**Backend (Convex):**
```env
LOG_LEVEL=debug          # debug, info, warn, error
CONVEX_CLOUD_URL=...     # Auto-detected for production mode
```

**Frontend (Next.js):**
```env
NODE_ENV=development              # Auto-detected
NEXT_PUBLIC_LOG_LEVEL=debug      # Override log level
```

### localStorage Flags

```javascript
// Enable all debug logs (frontend only)
localStorage.setItem("debug", "true")

// Disable
localStorage.removeItem("debug")
```

---

## Support

For issues or questions:
1. Check this guide first
2. Search logs using trace IDs
3. Check Convex dashboard for backend logs
4. Check browser console for frontend logs

---

**Last Updated:** January 2026
**Version:** 1.0.0
