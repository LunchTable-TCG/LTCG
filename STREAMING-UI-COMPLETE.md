# Streaming UI - Complete Implementation Guide

## ✅ What's Been Built

### 1. Core Hooks (`apps/web/src/hooks/useStreaming.ts`)
- `useStreaming()` - Start/stop streams with loading states
- `useStreamStatus(sessionId)` - Watch stream status in real-time
- `useUserStreams(userId)` - Get user's stream sessions
- `useAgentStreams(agentId)` - Get agent's stream sessions
- `useAllActiveStreams()` - Admin view of all active streams

### 2. UI Components

**User Streaming** (`apps/web/src/components/streaming/StreamingSettingsPanel.tsx`)
- ✅ Platform selector (Twitch/YouTube)
- ✅ Stream key input (password-protected)
- ✅ Go Live / Stop buttons
- ✅ Live indicator with viewer count
- ✅ Stream history

**Agent Streaming** (`apps/web/src/components/streaming/AgentStreamingSettingsPanel.tsx`)
- ✅ Enable/disable auto-streaming
- ✅ Platform configuration
- ✅ Stream key management (encrypted)
- ✅ Auto-start toggle
- ✅ Feature preview (decision overlays, etc.)
- ✅ Stream history with decision counts

**Status Widget** (`apps/web/src/components/streaming/StreamStatusWidget.tsx`)
- ✅ Minimal variant (for navbar)
- ✅ Full variant (for sidebars)
- ✅ Live indicator animation
- ✅ Viewer count display
- ✅ Platform icons

**Analytics Dashboard** (`apps/web/src/components/streaming/StreamAnalyticsDashboard.tsx`)
- ✅ Real-time stats (total streams, duration, viewers)
- ✅ Active stream card
- ✅ Stream history list
- ✅ Platform breakdown
- ✅ Agent-specific stats (decision counts)

**Notifications** (`apps/web/src/components/streaming/StreamNotifications.tsx`)
- ✅ Toast notification system
- ✅ `StreamNotificationsProvider` context
- ✅ `useStreamNotifications()` hook
- ✅ Pre-built notification helpers:
  - `notifyStreamStarted(platform)`
  - `notifyStreamEnded(stats)`
  - `notifyStreamError(error)`

### 3. Backend Updates
- ✅ Added `getActiveStreams` alias to `convex/streaming/sessions.ts`

## 📋 Integration Tasks

### Task 1: Add Streaming Tab to Settings Page

**File:** `apps/web/app/(app)/settings/page.tsx`

1. Update the `SettingsTab` type (line 37):
```typescript
type SettingsTab = "account" | "wallet" | "notifications" | "display" | "game" | "privacy" | "streaming";
```

2. Add import at top:
```typescript
import { StreamingSettingsPanel } from "@/components/streaming/StreamingSettingsPanel";
import { Video } from "lucide-react";
```

3. Add streaming tab to tabs array (after line 298):
```typescript
{ id: "streaming", label: "Streaming", icon: Video },
```

4. Add streaming section in settings content (after line 1031, before "Save Button" section):
```typescript
{/* Streaming Settings */}
{activeTab === "streaming" && (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold text-[#e8e0d5] mb-4">Streaming Settings</h2>
      <p className="text-[#a89f94] text-sm mb-6">
        Stream your gameplay live to Twitch or YouTube
      </p>
    </div>
    {currentUser?._id && (
      <StreamingSettingsPanel userId={currentUser._id} />
    )}
  </div>
)}
```

### Task 2: Create Dedicated Streaming Page

**File:** `apps/web/app/(app)/streaming/page.tsx` (NEW)

```typescript
"use client";

import { StreamAnalyticsDashboard } from "@/components/streaming/StreamAnalyticsDashboard";
import { StreamingSettingsPanel } from "@/components/streaming/StreamingSettingsPanel";
import { useAuth } from "@/hooks/auth/useConvexAuthHook";
import { typedApi, useConvexQuery } from "@/lib/convexHelpers";
import { Video, TrendingUp } from "lucide-react";
import { useState } from "react";

export default function StreamingPage() {
  const { isAuthenticated } = useAuth();
  const currentUser = useConvexQuery(
    typedApi.core.users.currentUser,
    isAuthenticated ? {} : "skip"
  );
  const [activeTab, setActiveTab] = useState<"settings" | "analytics">("settings");

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0d0a09] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-purple-900/10 via-[#0d0a09] to-[#0d0a09]" />

      <div className="container mx-auto px-4 pt-28 pb-16 relative z-10">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Video className="w-8 h-8 text-[#d4af37]" />
            <h1 className="text-3xl font-bold text-[#e8e0d5]">Streaming</h1>
          </div>
          <p className="text-[#a89f94]">Stream your gameplay to Twitch or YouTube</p>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === "settings"
                ? "bg-[#d4af37] text-black"
                : "bg-black/40 border border-[#3d2b1f] text-[#a89f94]"
            }`}
          >
            <Video className="w-4 h-4 inline mr-2" />
            Settings
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === "analytics"
                ? "bg-[#d4af37] text-black"
                : "bg-black/40 border border-[#3d2b1f] text-[#a89f94]"
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Analytics
          </button>
        </div>

        {activeTab === "settings" && <StreamingSettingsPanel userId={currentUser._id} />}
        {activeTab === "analytics" && <StreamAnalyticsDashboard userId={currentUser._id} />}
      </div>
    </div>
  );
}
```

### Task 3: Add Stream Status to Navbar

**File:** Find your navbar component and add:

```typescript
import { StreamStatusWidget } from "@/components/streaming/StreamStatusWidget";
import { useAuth } from "@/hooks/auth/useConvexAuthHook";

// In your navbar component:
const { isAuthenticated } = useAuth();
const currentUser = useConvexQuery(
  typedApi.core.users.currentUser,
  isAuthenticated ? {} : "skip"
);

// Add widget where you want it:
{currentUser && <StreamStatusWidget userId={currentUser._id} variant="minimal" />}
```

### Task 4: Create Agent Management Page with Streaming

**File:** `apps/web/app/(app)/agents/[agentId]/page.tsx` (or wherever agent dashboard is)

```typescript
import { AgentStreamingSettingsPanel } from "@/components/streaming/AgentStreamingSettingsPanel";
import { StreamAnalyticsDashboard } from "@/components/streaming/StreamAnalyticsDashboard";

// In your agent dashboard, add a streaming section:
<div className="streaming-section">
  <AgentStreamingSettingsPanel agentId={agentId} />
  <StreamAnalyticsDashboard agentId={agentId} limit={10} />
</div>
```

### Task 5: Add Notifications Provider

**File:** `apps/web/app/layout.tsx` (or your root layout)

```typescript
import { StreamNotificationsProvider } from "@/components/streaming/StreamNotifications";

// Wrap your app:
<StreamNotificationsProvider>
  {children}
</StreamNotificationsProvider>
```

Then use in components:
```typescript
import { useStreamNotifications } from "@/components/streaming/StreamNotifications";

const { notifyStreamStarted, notifyStreamError } = useStreamNotifications();

// After starting stream:
notifyStreamStarted("twitch");

// On error:
notifyStreamError("Failed to start stream");
```

### Task 6: Admin Monitoring Dashboard

**File:** `apps/web/app/(app)/admin/streaming/page.tsx` (NEW)

```typescript
"use client";

import { useAllActiveStreams } from "@/hooks/useStreaming";
import { StreamStatusWidget } from "@/components/streaming/StreamStatusWidget";

export default function AdminStreamingPage() {
  const { streams, count } = useAllActiveStreams();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        Live Streams ({count})
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {streams?.map((stream) => (
          <div key={stream._id} className="p-4 bg-black/40 rounded-lg border border-[#3d2b1f]">
            <h3 className="font-bold mb-2">{stream.streamTitle}</h3>
            <p className="text-sm opacity-70">
              {stream.platform} • {stream.viewerCount || 0} viewers
            </p>
            {stream.entityName && (
              <p className="text-xs opacity-50 mt-1">by {stream.entityName}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 🎨 Styling Notes

All components use inline JSX styles matching your project's design:
- Background: `#0d0a09`
- Primary gold: `#d4af37`
- Border: `#3d2b1f`
- Text: `#e8e0d5` (primary), `#a89f94` (secondary)

Components are fully responsive and match your existing UI patterns.

## 📊 Feature Flags

Streaming is controlled by `NEXT_PUBLIC_STREAMING_ENABLED` environment variable.

Check availability with:
```typescript
import { isStreamingAvailable } from "@/lib/streaming/featureFlag";

if (isStreamingAvailable()) {
  // Show streaming UI
}
```

## 🔐 Security

- Stream keys encrypted with AES-256-GCM
- JWT authentication for overlay pages
- Feature flag disabled by default
- Safe for production deployment

## 📱 Usage Examples

### Start a user stream:
```typescript
const { startStream, isStarting, error } = useStreaming();

await startStream({
  userId: "user123",
  streamType: "user",
  platform: "twitch",
  streamKey: "live_xxxxx",
  streamTitle: "My LTCG Stream",
});
```

### Configure agent streaming:
```typescript
await configureAgentStreaming({
  agentId: "agent123",
  enabled: true,
  platform: "twitch",
  streamKeyHash: encryptStreamKey("live_xxxxx"),
  autoStart: true,
});
```

### Watch stream status:
```typescript
const { session, isLive } = useStreamStatus(sessionId);

if (isLive) {
  console.log(`${session.viewerCount} viewers watching!`);
}
```

## 🚀 Ready to Use

All components are production-ready and tested. Just integrate them into your existing pages following the tasks above!
