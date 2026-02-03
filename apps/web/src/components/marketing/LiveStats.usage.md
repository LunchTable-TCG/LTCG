# LiveStats Component Usage

## Overview
Real-time statistics display component for marketing pages showing live player counts, games played, and activity metrics.

## Import
```tsx
import LiveStats from "@/components/marketing/LiveStats";
```

## Usage
```tsx
export default function LandingPage() {
  return (
    <div>
      <HeroSection />
      <LiveStats />
      <GameModesSection />
    </div>
  );
}
```

## Features

### Animated Counters
- Smooth count-up animation when component enters viewport
- Spring physics for natural motion
- Staggered delays for visual appeal

### Number Formatting
- Automatically formats large numbers:
  - 1,000+ → "1.0K+"
  - 50,000+ → "50.0K+"
  - 1,000,000+ → "1.0M+"

### Stats Displayed
1. **Total Players** - Total registered user count
2. **Games Today** - Games started in the current day (midnight to midnight)
3. **Battles Fought** - Total games played across all time
4. **Active Players** (bonus indicator) - Users active in the last 15 minutes

### Visual Design
- Dark fantasy theme with gold accents
- Hover effects with glow/pulse animations
- Gradient backgrounds and borders
- Corner decorations for fantasy aesthetic
- Loading skeleton states

## Backend Query
Located at: `convex/marketing/stats.ts`

### Query Details
```typescript
api.marketing.stats.getPublicStats()
// Returns:
{
  totalPlayers: number;
  gamesPlayedToday: number;
  totalGamesPlayed: number;
  activePlayersNow: number;
}
```

### Performance
- Uses Convex real-time queries (auto-updates)
- Efficient filtering with indexes
- No authentication required (public data)

## Customization

### Modify Stats Order
Edit the `StatCard` components in the grid:
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
  <StatCard icon={<YourIcon />} value={stats.yourStat} label="Your Label" delay={0} />
</div>
```

### Adjust Animation Timing
Change delays in the `StatCard` components:
```tsx
delay={0}    // First card (immediate)
delay={150}  // Second card (150ms delay)
delay={300}  // Third card (300ms delay)
```

### Change Color Theme
Replace amber colors with your preference:
```tsx
// Gold/amber theme (current)
border-amber-500/20
text-amber-400
from-amber-300 via-amber-200 to-amber-300

// Example: Blue theme
border-blue-500/20
text-blue-400
from-blue-300 via-blue-200 to-blue-300
```

## Dependencies
- `framer-motion` - Animation library
- `lucide-react` - Icons
- `@/lib/convexHelpers` - Convex query helpers (apiAny pattern)

## Notes
- Component is client-side only (`"use client"`)
- Responsive design (1 column mobile, 3 columns desktop)
- Viewport-based animation triggers (animates once when scrolled into view)
- Active players indicator only shows if count > 0
