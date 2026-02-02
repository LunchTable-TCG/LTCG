# LTCG Panel Troubleshooting Guide

Common issues and solutions for the LTCG panel system.

## Table of Contents

1. [Panel Not Loading](#panel-not-loading)
2. [Data Not Updating](#data-not-updating)
3. [Error Messages](#error-messages)
4. [Performance Issues](#performance-issues)
5. [Mobile Issues](#mobile-issues)
6. [Build Errors](#build-errors)

---

## Panel Not Loading

### Issue: Panel shows blank screen

**Symptoms:**
- Panel loads but shows nothing
- No error message displayed
- Browser console may show errors

**Solutions:**

1. **Check agentId is provided**
   ```typescript
   // Verify window.ELIZA_CONFIG exists
   console.log(window.ELIZA_CONFIG);
   ```

2. **Verify panel is registered**
   ```typescript
   // In packages/plugin-ltcg/src/frontend/index.tsx
   export const panels: AgentPanel[] = [
     {
       name: 'My Panel',
       path: 'ltcg-my-panel',
       component: withErrorBoundary(MyPanel),
       // ...
     },
   ];
   ```

3. **Check ErrorBoundary logs**
   - Open browser console (F12)
   - Look for "Panel Error Boundary caught an error"
   - Fix the underlying rendering error

### Issue: "Agent ID not found" error

**Symptoms:**
- Error message: "Error: Agent ID not found"
- Panel shows error state immediately

**Solutions:**

1. **Check ElizaOS configuration**
   - Ensure agent is running
   - Verify `ELIZA_CONFIG` is injected by server

2. **Check browser console**
   ```javascript
   // Should return an object with agentId
   window.ELIZA_CONFIG
   ```

---

## Data Not Updating

### Issue: Panel data is stale

**Symptoms:**
- Data doesn't refresh automatically
- Manual refresh required
- Polling not working

**Solutions:**

1. **Verify React Query configuration**
   ```typescript
   // Check hook has refetchInterval
   export function useMyData(agentId: string) {
     return useQuery({
       queryKey: ['ltcg', 'my-data', agentId],
       queryFn: () => fetchData(agentId),
       refetchInterval: 5000,  // Should be set
       enabled: !!agentId,     // Must be true
     });
   }
   ```

2. **Check enabled condition**
   ```typescript
   // If enabled is false, query won't run
   enabled: !!agentId && !!gameId
   ```

3. **Verify API endpoint is responding**
   ```bash
   # Test API directly
   curl "http://localhost:3000/api/ltcg/status?agentId=YOUR_AGENT_ID"
   ```

4. **Check browser Network tab**
   - Open DevTools (F12) → Network tab
   - Look for API requests every 5-10 seconds
   - Verify responses are 200 OK

### Issue: "StateAggregator service not available"

**Symptoms:**
- Error message in API response
- 503 Service Unavailable status

**Solutions:**

1. **Verify StateAggregator is registered**
   ```typescript
   // In packages/plugin-ltcg/src/plugin.ts
   services: [
     LTCGPollingService,
     TurnOrchestrator,
     LTCGApiClient,
     StateAggregator,  // Must be included
   ],
   ```

2. **Check service initialization**
   ```typescript
   // StateAggregator should initialize on runtime start
   async initialize(runtime: IAgentRuntime) {
     this.pollingService = runtime.getService('ltcg-polling');
     this.orchestrator = runtime.getService('ltcg-turn-orchestrator');
     this.apiClient = runtime.getService('ltcg-api-client');
   }
   ```

3. **Restart ElizaOS agent**
   - Stop the agent
   - Clear any cached state
   - Restart and verify services load

---

## Error Messages

### "Failed to fetch status: 400 Bad Request"

**Cause:** Missing or invalid `agentId` parameter

**Solution:**
```typescript
// Ensure agentId is passed correctly
const { data } = useAgentStatus(agentId);

// Not this:
const { data } = useAgentStatus(undefined);
```

### "Failed to load game state"

**Cause:** Game doesn't exist or invalid gameId

**Solution:**
```typescript
// Only fetch game state if gameId exists
const gameId = agentStatus?.currentGameId ?? null;
const { data } = useGameState(agentId, gameId);

// Hook should have enabled check:
enabled: !!agentId && !!gameId
```

### "Property 'X' does not exist on type 'Y'"

**Cause:** TypeScript type mismatch with API response

**Solution:**
1. Check API response matches type definition
2. Update type definition in `types/panel.ts`
3. Handle optional properties:
   ```typescript
   const value = data?.optionalField ?? 'default';
   ```

### "Type instantiation is excessively deep"

**Cause:** Convex type complexity (TS2589)

**Solution:**
Use the `apiAny` helper:
```typescript
import { apiAny, useConvexQuery } from '@/lib/convexHelpers';

// Instead of:
const games = useQuery(api.gameplay.games.queries.listGames, {});

// Use:
const games = useConvexQuery(apiAny.gameplay.games.queries.listGames, {});
```

---

## Performance Issues

### Issue: Panel is slow to load

**Symptoms:**
- Long initial load time
- Laggy interactions
- High memory usage

**Solutions:**

1. **Reduce polling frequency**
   ```typescript
   // For less critical data
   refetchInterval: 10000,  // Poll every 10s instead of 5s
   ```

2. **Add React.memo to components**
   ```typescript
   const MyComponent = React.memo(function MyComponent({ data }) {
     return <div>{data.value}</div>;
   });
   ```

3. **Optimize re-renders**
   ```typescript
   // Use useMemo for expensive calculations
   const processedData = React.useMemo(() => {
     return expensiveOperation(data);
   }, [data]);
   ```

4. **Check for memory leaks**
   ```typescript
   // Ensure cleanup in useEffect
   React.useEffect(() => {
     const interval = setInterval(() => {}, 1000);
     return () => clearInterval(interval);  // Cleanup!
   }, []);
   ```

### Issue: Too many API requests

**Symptoms:**
- Network tab shows excessive requests
- Multiple requests to same endpoint
- Performance degradation

**Solutions:**

1. **Check React Query deduplication**
   ```typescript
   // Ensure queryKey is consistent
   queryKey: ['ltcg', 'status', agentId],  // Good
   queryKey: ['ltcg', 'status', Date.now()],  // Bad - creates new query each time
   ```

2. **Verify staleTime setting**
   ```typescript
   // Prevents refetch if data is fresh
   staleTime: 4000,  // 4 seconds
   ```

3. **Check for multiple component instances**
   - Ensure panel isn't mounted multiple times
   - Verify React Query provider wraps app correctly

---

## Mobile Issues

### Issue: Layout breaks on mobile

**Symptoms:**
- Horizontal scroll on small screens
- Text overflow
- Buttons too small

**Solutions:**

1. **Use responsive breakpoints**
   ```typescript
   // Always use sm: prefix for mobile-first
   className="p-4 sm:p-6 gap-4 sm:gap-6"
   ```

2. **Add text truncation**
   ```typescript
   // For long text
   className="truncate"          // Single line
   className="line-clamp-2"      // Two lines
   ```

3. **Ensure minimum touch targets**
   ```typescript
   // Buttons and clickable elements
   className="min-h-[44px] min-w-[44px]"
   ```

4. **Add horizontal scroll for tables**
   ```typescript
   <div className="overflow-x-auto">
     <table className="min-w-[500px]">
       {/* Table content */}
     </table>
   </div>
   ```

### Issue: Text too small on mobile

**Solution:**
```typescript
// Don't use text-xs on mobile, use responsive sizing
className="text-sm sm:text-xs"  // Larger on mobile, smaller on desktop
```

---

## Build Errors

### TypeScript Compilation Errors

**Check compilation:**
```bash
bun run tsc --noEmit --project packages/plugin-ltcg/tsconfig.json
```

**Common errors:**

1. **Cannot find module '../utils/logger'**
   - **Solution:** Use `import { logger } from '@elizaos/core'`

2. **Property 'query' is possibly 'undefined'**
   - **Solution:** Use optional chaining: `req.query?.agentId`

3. **Type 'string | null | undefined' is not assignable**
   - **Solution:** Add null coalescing: `const gameId = status?.currentGameId ?? null`

### Build Process Errors

**Full project build:**
```bash
bun run build
```

**Plugin-only type check:**
```bash
cd packages/plugin-ltcg
bun run tsc --noEmit
```

**Common issues:**

1. **Module resolution errors**
   - Clear `node_modules`: `rm -rf node_modules && bun install`
   - Check `tsconfig.json` paths

2. **Missing dependencies**
   - Run `bun install` in project root
   - Verify `package.json` includes all dependencies

---

## Debugging Tools

### Browser Console

Essential debugging commands:

```javascript
// Check agent configuration
window.ELIZA_CONFIG

// Check React Query cache
window.__REACT_QUERY_DEVTOOLS__

// Monitor API requests
// Network tab → Filter by "ltcg"

// Check for errors
// Console tab → Filter by "error"
```

### React Query DevTools

Add to development build:

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function ExampleProvider({ agentId }: { agentId: UUID }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MatchmakingPanel agentId={agentId} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### Server-Side Logging

Check ElizaOS logs for API errors:

```typescript
// In StateAggregator or API handlers
logger.info('StateAggregator: Fetching game state', { gameId });
logger.error('Error fetching game state:', error);
```

---

## Getting Help

If you encounter issues not covered here:

1. **Check browser console** for JavaScript errors
2. **Check Network tab** for failed API requests
3. **Verify TypeScript compilation** with `bun run tsc --noEmit`
4. **Review panel implementation** against [PANEL_DEVELOPMENT.md](./PANEL_DEVELOPMENT.md)
5. **Check API responses** with curl or Postman
6. **Restart ElizaOS agent** to clear any cached state

---

## See Also

- [Panel API Documentation](./PANEL_API.md)
- [Panel Development Guide](./PANEL_DEVELOPMENT.md)
- [ElizaOS Documentation](https://github.com/elizaos/eliza/wiki)
