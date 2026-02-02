# Vercel Services Integration

This document describes how the LTCG project uses Vercel's platform services for static assets, feature flags, and configuration.

## Services Overview

| Service | Purpose | Status |
|---------|---------|--------|
| **Vercel Blob** | Static asset hosting (images, videos) | Active |
| **Edge Config** | Runtime configuration & maintenance mode | Active |
| **Hypertune** | Type-safe feature flags (via Flags SDK) | Ready for setup |

## Vercel Blob Storage

### Overview

All static assets (images, videos, audio) are hosted on Vercel Blob Storage for:
- Global CDN distribution
- Automatic optimization
- Reduced bundle size

### Configuration

**Environment Variables:**
```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxx
NEXT_PUBLIC_BLOB_BASE_URL=https://xxxxx.public.blob.vercel-storage.com
```

**Next.js Config** (`apps/web/next.config.ts`):
```typescript
images: {
  remotePatterns: [
    { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }
  ]
}
```

### Usage

**In Components (JavaScript):**
```typescript
import { getAssetUrl } from "@/lib/blob";

// Converts /assets/logo.png to blob URL
const logoUrl = getAssetUrl("/assets/logo.png");
```

**In CSS:**
CSS backgrounds use hardcoded blob URLs (CSS can't read environment variables):
```css
.bg-landing {
  background-image: url("https://xxxxx.public.blob.vercel-storage.com/dashboard-bg.jpg");
}
```

### Uploading Assets

```bash
# Upload all assets from public/assets
bun run scripts/upload-assets-to-blob.ts

# Preview without uploading
bun run scripts/upload-assets-to-blob.ts --dry-run

# List existing blobs
bun run scripts/upload-assets-to-blob.ts list
```

### Key Files

- `apps/web/src/lib/blob.ts` - Asset URL helper and upload utilities
- `scripts/upload-assets-to-blob.ts` - Bulk upload script

---

## Vercel Edge Config

### Overview

Edge Config provides ultra-fast (<1ms) configuration reads at the edge for:
- Maintenance mode
- Feature flags
- Rate limits
- Game configuration
- Blocked users
- Announcements

### Configuration

**Environment Variable:**
```bash
EDGE_CONFIG=https://edge-config.vercel.com/ecfg_xxxxx?token=xxxxx
```

### Usage

**Server-side:**
```typescript
import { getFeatureFlags, getAnnouncement } from "@/lib/edge-config";

const flags = await getFeatureFlags();
if (flags.maintenanceMode) {
  // Redirect to maintenance page
}
```

**Middleware (maintenance mode):**
The middleware automatically checks Edge Config for `featureFlags.maintenanceMode` and redirects users to `/maintenance` when enabled.

### Edge Config Schema

```json
{
  "featureFlags": {
    "maintenanceMode": false,
    "maintenanceMessage": "We'll be back soon!",
    "storyModeEnabled": true,
    "marketplaceEnabled": true,
    "rankedEnabled": true,
    "aiOpponentsEnabled": true,
    "maxConcurrentGames": 3
  },
  "rateLimits": {
    "apiRequestsPerMinute": 60,
    "packOpensPerHour": 100,
    "marketplaceListingsPerDay": 50
  },
  "gameConfig": {
    "startingGold": 1000,
    "startingGems": 100,
    "xpMultiplier": 1.0,
    "goldMultiplier": 1.0
  },
  "blockedUsers": [],
  "announcement": "Welcome to LTCG!"
}
```

### Key Files

- `apps/web/src/lib/edge-config.ts` - Type-safe Edge Config utilities
- `apps/web/middleware.ts` - Maintenance mode check

---

## Feature Flags

### Overview

Feature flags use a hybrid approach:
1. **Edge Config** - Current implementation, simple and fast
2. **Hypertune** - Type-safe flags with visual dashboard (ready for setup)

### Client-side Usage

```typescript
import { useFeatureFlags, useFeatureFlag } from "@/hooks/useFeatureFlags";

// Get all flags
function MyComponent() {
  const { flags, isLoading } = useFeatureFlags();

  if (isLoading) return <Loading />;
  if (!flags.storyModeEnabled) return <Disabled />;

  return <Content />;
}

// Get single flag
function StoryMode() {
  const { enabled, isLoading } = useFeatureFlag("storyModeEnabled");

  if (!enabled) return null;
  return <StoryContent />;
}
```

### Server-side Usage

```typescript
import { getFlags, getFlag } from "@/lib/flags";

// Get all flags
const flags = await getFlags();

// Get single flag
const storyEnabled = await getFlag("storyModeEnabled");
```

### Available Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `maintenanceMode` | boolean | false | Enable maintenance mode |
| `storyModeEnabled` | boolean | true | Enable story mode |
| `marketplaceEnabled` | boolean | true | Enable marketplace |
| `rankedEnabled` | boolean | true | Enable ranked matches |
| `aiOpponentsEnabled` | boolean | true | Enable AI opponents |
| `maxConcurrentGames` | number | 3 | Max games per user |
| `newPackAnimation` | boolean | false | New pack opening animation |

### Vercel Flags Explorer

The app exposes a Flags Explorer endpoint at `/.well-known/vercel/flags` for integration with Vercel Toolbar.

### Hypertune Setup (Future)

When ready to use Hypertune for advanced feature management:

1. Create flags in [Hypertune Dashboard](https://app.hypertune.com)
2. Run `npx hypertune` to generate types
3. Update `apps/web/src/lib/flags.ts` with generated code
4. Hypertune syncs to Edge Config for sub-millisecond reads

---

## Announcement Banner

### Overview

System-wide announcements display at the top of the app, fetched from Edge Config.

### Configuration

Set the `announcement` key in Edge Config:
```json
{
  "announcement": "Server maintenance tonight at 10 PM PST"
}
```

### Features

- Auto-fetches from `/api/announcement`
- Dismissible (persists to localStorage)
- Shows only when announcement is set

### Usage

Already included in the app layout (`apps/web/app/(app)/layout.tsx`).

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/flags` | GET | Returns current feature flags (cached 60s) |
| `/api/announcement` | GET | Returns current announcement (cached 5m) |
| `/.well-known/vercel/flags` | GET | Flags Explorer endpoint for Vercel Toolbar |

---

## Setup Checklist

### Initial Setup

- [ ] Create Vercel Blob store in dashboard
- [ ] Create Edge Config store in dashboard
- [ ] Add environment variables to Vercel project:
  - `BLOB_READ_WRITE_TOKEN`
  - `NEXT_PUBLIC_BLOB_BASE_URL`
  - `EDGE_CONFIG`

### Asset Migration

- [ ] Run upload script: `bun run scripts/upload-assets-to-blob.ts`
- [ ] Verify all assets accessible
- [ ] Update any hardcoded URLs

### Feature Flags

- [ ] Set initial Edge Config values
- [ ] Test maintenance mode
- [ ] Test feature flag gates in UI

### Optional: Hypertune

- [ ] Create Hypertune project
- [ ] Add `NEXT_PUBLIC_HYPERTUNE_TOKEN` to env
- [ ] Define flags in Hypertune dashboard
- [ ] Run `npx hypertune` to generate types
- [ ] Update `apps/web/src/lib/flags.ts`

---

## Troubleshooting

### Assets not loading

1. Check `NEXT_PUBLIC_BLOB_BASE_URL` is set
2. Verify blob storage contains the assets
3. Check Next.js remote patterns include blob domain

### Feature flags not updating

1. Client caches flags for 60 seconds
2. API route caches for 60 seconds
3. Use `refetch()` from hook for immediate update

### Maintenance mode not working

1. Check Edge Config `featureFlags.maintenanceMode` is `true`
2. Verify `EDGE_CONFIG` environment variable is set
3. Middleware only runs on non-static routes

### Announcement not showing

1. Check Edge Config `announcement` is set (non-empty string)
2. Clear localStorage `announcement-dismissed` key
3. Check browser console for fetch errors
