# LTCG Panel Development Guide

Guide for developing and extending LTCG panels in the ElizaOS UI system.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Creating a New Panel](#creating-a-new-panel)
3. [Component Library](#component-library)
4. [React Query Hooks](#react-query-hooks)
5. [Styling Guidelines](#styling-guidelines)
6. [Testing](#testing)

---

## Architecture Overview

### Data Flow

```
ElizaOS UI (Browser)
    ↓ HTTP Polling (5s intervals)
Panel REST API (/api/ltcg/*)
    ↓ Direct Service Access
StateAggregator Service
    ↓ Data Collection
LTCG Services (Runtime)
    ├─ LTCGPollingService
    ├─ TurnOrchestrator
    └─ LTCGApiClient
```

### Directory Structure

```
packages/plugin-ltcg/src/frontend/
├── components/          # Shared UI components
│   ├── StatusBadge.tsx
│   ├── StatCard.tsx
│   ├── LoadingState.tsx
│   ├── BoardVisualizer.tsx
│   ├── DecisionCard.tsx
│   ├── ErrorBoundary.tsx
│   └── index.ts
├── hooks/              # React Query data fetching hooks
│   ├── useAgentStatus.ts
│   ├── useMatchmakingStatus.ts
│   ├── useGameState.ts
│   ├── useDecisionHistory.ts
│   ├── useMetrics.ts
│   └── index.ts
├── panels/             # Panel components
│   ├── MatchmakingPanel.tsx
│   ├── GameDashboard.tsx
│   ├── DecisionStream.tsx
│   └── MetricsPanel.tsx
├── types/              # TypeScript type definitions
│   └── panel.ts
├── utils/              # Utility functions
│   └── cn.ts
├── index.css           # Global styles
└── index.tsx           # Panel registration
```

---

## Creating a New Panel

### Step 1: Define Types

Add type definitions in `types/panel.ts`:

```typescript
export interface MyPanelData {
  // Define your data structure
  id: string;
  value: number;
  timestamp: number;
}
```

### Step 2: Create API Endpoint

Add endpoint in `src/api/routes.ts`:

```typescript
export async function handleMyPanel(req: RouteRequest, res: RouteResponse) {
  const agentId = req.query?.agentId as string | undefined;

  if (!agentId) {
    return sendError(res, 400, 'Missing agentId parameter');
  }

  const aggregator = getAggregator(req);
  if (!aggregator) {
    return sendError(res, 503, 'StateAggregator service not available');
  }

  try {
    const data = await aggregator.getMyPanelData(agentId);
    res.json(data);
  } catch (error) {
    logger.error('Error fetching my panel data:', error);
    return sendError(res, 500, 'Failed to fetch data');
  }
}

// Register in panelRoutes array
export const panelRoutes = [
  // ... existing routes
  {
    method: 'GET',
    path: '/api/ltcg/my-panel',
    handler: handleMyPanel,
  },
];
```

### Step 3: Create React Query Hook

Add hook in `hooks/useMyPanel.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import type { MyPanelData } from '../types/panel';

async function fetchMyPanelData(agentId: string): Promise<MyPanelData> {
  const response = await fetch(
    `/api/ltcg/my-panel?agentId=${encodeURIComponent(agentId)}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`);
  }

  return response.json();
}

export function useMyPanel(agentId: string) {
  return useQuery({
    queryKey: ['ltcg', 'my-panel', agentId],
    queryFn: () => fetchMyPanelData(agentId),
    refetchInterval: 5000,    // Poll every 5 seconds
    staleTime: 4000,           // Consider data stale after 4 seconds
    enabled: !!agentId,        // Only run if agentId exists
  });
}
```

Export in `hooks/index.ts`:
```typescript
export { useMyPanel } from './useMyPanel';
```

### Step 4: Create Panel Component

Create `panels/MyPanel.tsx`:

```typescript
import React from 'react';
import { useMyPanel } from '../hooks';
import { StatCard, LoadingState, ErrorState, EmptyState } from '../components';

interface MyPanelProps {
  agentId: string;
}

export function MyPanel({ agentId }: MyPanelProps) {
  const { data, isLoading, error, refetch } = useMyPanel(agentId);

  if (isLoading) {
    return <LoadingState message="Loading data..." />;
  }

  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Failed to load data'}
        onRetry={() => refetch()}
      />
    );
  }

  if (!data) {
    return <EmptyState title="No data" description="Data not available" />;
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 max-w-5xl mx-auto">
      <h2 className="text-xl font-semibold">My Panel</h2>

      {/* Your panel content */}
      <StatCard label="Value" value={data.value} />
    </div>
  );
}
```

### Step 5: Register Panel

Add to `index.tsx`:

```typescript
import { MyPanel } from './panels/MyPanel';

export const panels: AgentPanel[] = [
  // ... existing panels
  {
    name: 'My Panel',
    path: 'ltcg-my-panel',
    component: withErrorBoundary(MyPanel),
    icon: 'Star',              // Lucide icon name
    public: false,             // Set to true for public access
    shortLabel: 'Panel',       // Short label for mobile
  },
];
```

---

## Component Library

### StatusBadge

Displays status indicators with color coding.

```typescript
import { StatusBadge } from '../components';

<StatusBadge variant="active" label="ACTIVE" />
<StatusBadge variant="idle" label="IDLE" />
<StatusBadge variant="error" label="ERROR" />
```

**Props:**
- `variant`: `'active' | 'idle' | 'error' | 'success'`
- `label`: `string`

### StatCard

Displays metrics in a card format.

```typescript
import { StatCard } from '../components';

<StatCard
  label="Games Played"
  value={42}
  variant="primary"
/>
```

**Props:**
- `label`: `string`
- `value`: `string | number`
- `icon?`: `React.ReactNode`
- `variant?`: `'default' | 'primary' | 'success' | 'warning'`

### LoadingState / ErrorState / EmptyState

Pre-built states for common UI scenarios.

```typescript
import { LoadingState, ErrorState, EmptyState } from '../components';

// Loading
<LoadingState message="Loading..." />

// Error with retry
<ErrorState
  message="Failed to load data"
  onRetry={() => refetch()}
/>

// Empty state
<EmptyState
  title="No data"
  description="Data will appear here"
/>
```

### BoardVisualizer

Visualizes game board state.

```typescript
import { BoardVisualizer } from '../components';

<BoardVisualizer gameState={gameState} />
```

### DecisionCard

Displays AI decision with collapsible reasoning.

```typescript
import { DecisionCard } from '../components';

<DecisionCard decision={decision} />
```

### ErrorBoundary

Catches rendering errors in panels.

```typescript
import { ErrorBoundary } from '../components';

<ErrorBoundary>
  <MyPanel agentId={agentId} />
</ErrorBoundary>
```

---

## React Query Hooks

### Best Practices

1. **Polling Intervals**
   - Standard data (status, game state): 5 seconds
   - Expensive metrics: 10 seconds
   - Critical real-time: 3 seconds (use sparingly)

2. **Stale Time**
   - Set to slightly less than `refetchInterval`
   - Example: `refetchInterval: 5000, staleTime: 4000`

3. **Error Handling**
   - Always provide retry mechanism
   - Display user-friendly error messages
   - Log errors for debugging

4. **Conditional Fetching**
   - Use `enabled` option to conditionally fetch
   - Example: `enabled: !!gameId` (only fetch if gameId exists)

### Example Hook Pattern

```typescript
export function useMyData(agentId: string, additionalParam?: string) {
  return useQuery({
    queryKey: ['ltcg', 'my-data', agentId, additionalParam],
    queryFn: () => fetchMyData(agentId, additionalParam),
    refetchInterval: 5000,
    staleTime: 4000,
    enabled: !!agentId && !!additionalParam,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
```

---

## Styling Guidelines

### Tailwind CSS Classes

Use the design system classes:

```typescript
// Layout
'flex flex-col gap-4 sm:gap-6'        // Responsive spacing
'p-4 sm:p-6'                          // Responsive padding
'max-w-5xl mx-auto'                   // Centered container

// Typography
'text-xl font-semibold'               // Headings
'text-sm text-muted-foreground'       // Labels
'text-xs text-muted-foreground'       // Captions

// Colors
'bg-card border-border'               // Card backgrounds
'text-foreground'                     // Primary text
'text-muted-foreground'               // Secondary text
'bg-primary text-primary-foreground'  // Primary actions

// Interactive
'hover:bg-accent/50 transition-colors' // Hover states
'cursor-pointer'                      // Clickable elements
```

### Mobile Responsiveness

Always use responsive breakpoints:

```typescript
// Padding
'p-4 sm:p-6'              // 16px mobile, 24px desktop

// Gaps
'gap-4 sm:gap-6'          // 16px mobile, 24px desktop

// Grids
'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'

// Text truncation
'truncate'                // Single line
'line-clamp-2'            // Two lines

// Touch targets
'min-h-[60px]'            // Ensure 60px minimum for touch
```

### Performance Optimization

Use React.memo for expensive components:

```typescript
const MyComponent = React.memo(function MyComponent({ data }) {
  // Component logic
  return <div>{data.value}</div>;
});
```

---

## Testing

### TypeScript Compilation

```bash
bun run tsc --noEmit --project packages/plugin-ltcg/tsconfig.json
```

### Manual Testing Checklist

- [ ] Panel loads without errors
- [ ] Loading state displays correctly
- [ ] Error state shows retry button
- [ ] Empty state displays when no data
- [ ] Data updates on polling interval
- [ ] Mobile responsive layout works
- [ ] Touch targets are accessible (minimum 44x44px)
- [ ] Text doesn't overflow on small screens
- [ ] Error boundary catches rendering errors

### Integration Testing

1. Start ElizaOS agent with LTCG plugin
2. Open ElizaOS UI
3. Navigate to panel
4. Verify data displays correctly
5. Test error scenarios (disconnect API, invalid data)
6. Test mobile viewport (Chrome DevTools)

---

## Common Patterns

### Conditional Rendering

```typescript
// Early returns for loading/error states
if (isLoading) return <LoadingState />;
if (error) return <ErrorState />;
if (!data) return <EmptyState />;

// Conditional sections
{data.hasFeature && (
  <div>Feature content</div>
)}
```

### Data Formatting

```typescript
// Relative time
function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

// Numbers
<span className="tabular-nums">{value}</span>

// Percentages
{Math.round(winRate * 100)}%
```

### Auto-scroll Lists

```typescript
const scrollRef = React.useRef<HTMLDivElement>(null);

React.useEffect(() => {
  if (autoScroll && scrollRef.current) {
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }
}, [data, autoScroll]);

<div ref={scrollRef} className="overflow-y-auto">
  {/* List content */}
</div>
```

---

## See Also

- [Panel API Documentation](./PANEL_API.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
- [ElizaOS Plugin Development Guide](https://github.com/elizaos/eliza/wiki)
