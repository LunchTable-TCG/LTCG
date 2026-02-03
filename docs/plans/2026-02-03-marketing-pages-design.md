# Marketing Pages Design

**Date:** 2026-02-03
**Status:** Approved
**Scope:** 5 new marketing pages for the web app

---

## Overview

Add five marketing/support pages to complete the public-facing site:

| Page | Route | Purpose |
|------|-------|---------|
| About Us | `/about` | Community-centric page highlighting players over team |
| Contact | `/contact` | Channel links (no form) for community engagement |
| Community Guidelines | `/community-guidelines` | Brief principles as "Duelist's Creed" |
| Roadmap | `/roadmap` | Timeline with seasonal phases and kanban status |
| Press Kit | `/press` | Asset download bundle with inline preview |

All pages follow existing fantasy aesthetic and component patterns.

---

## 1. About Us Page

**Route:** `/about`

### Structure

1. **Hero Section**
   - Headline: "The Legend Grows" or similar
   - Atmospheric background (gradient or subtle imagery)
   - Brief tagline about community focus

2. **Community Stats Block**
   - Reuse pattern from `LiveStats` component
   - Stats: Total Duelists, Battles Fought, Guilds Formed
   - Animated count-up on scroll

3. **Core Pillars (3 cards)**
   - "Strategic Depth" - The game rewards skill and planning
   - "Fair Play" - Balanced, competitive experience
   - "Player-Driven" - Community shapes the future

4. **Community Spotlight** (optional)
   - Featured players, guilds, or fan creations
   - Can be static initially, dynamic later

5. **Minimal Team Note**
   - Small footer section
   - "Built by passionate TCG enthusiasts"
   - No individual names or photos

6. **CTA**
   - "Join the Community" button → Discord or signup

### Components Needed
- `AboutHero.tsx`
- `CommunityStats.tsx` (or reuse LiveStats)
- `CorePillars.tsx`
- `CommunitySpotlight.tsx` (optional)

---

## 2. Contact Page

**Route:** `/contact`

### Structure

1. **Hero Section**
   - Headline: "Get In Touch"
   - Subtext: "Connect with us through our community channels"

2. **Channel Cards (grid of 4)**

   | Channel | Icon | Description | Link |
   |---------|------|-------------|------|
   | Discord | MessageCircle | "Join our community for support, updates, and fellow duelists" | Discord invite |
   | Twitter/X | Twitter | "Follow for announcements and news" | Twitter profile |
   | Email | Mail | "For business inquiries" | mailto:hello@ltcg.gg |
   | FAQ | HelpCircle | "Common questions answered" | FAQ section link |

3. **Visual Treatment**
   - Cards use `tcg-frame` styling
   - Hover glow effects
   - Icons from lucide-react

### Design Notes
- Single viewport height (minimal scrolling)
- No contact form - Discord is support hub
- Quick, scannable layout

### Components Needed
- `ContactHero.tsx`
- `ChannelCard.tsx`
- `ContactChannels.tsx` (grid container)

---

## 3. Community Guidelines Page

**Route:** `/community-guidelines`

### Structure

1. **Hero Section**
   - Headline: "Code of Honor" or "Duelist's Creed"
   - Subtext: "The principles that unite our community"

2. **Principles List (7 values)**

   | # | Principle | Description |
   |---|-----------|-------------|
   | 1 | Respect All Duelists | Treat others as worthy opponents |
   | 2 | Play Fair | No cheating, exploits, or unfair advantages |
   | 3 | Keep It Clean | No hate speech, harassment, or toxic behavior |
   | 4 | Protect Privacy | Don't share others' personal information |
   | 5 | Support New Players | Help the community grow |
   | 6 | Report, Don't Retaliate | Use proper channels for issues |
   | 7 | Have Fun | It's a game—enjoy the battle |

3. **Consequences Note**
   - Single paragraph
   - "Violations may result in warnings, suspensions, or permanent bans at our discretion"

4. **Help Link**
   - "Questions? Reach out on Discord"
   - Links to contact page or Discord directly

### Tone
- Warm but clear
- Dignified like a knight's code
- Not legalese, not overly playful
- Short enough to actually read

### Components Needed
- `GuidelinesHero.tsx`
- `PrincipleCard.tsx`
- `PrinciplesList.tsx`

---

## 4. Roadmap Page

**Route:** `/roadmap`

### Structure

1. **Hero Section**
   - Headline: "The Path Ahead"
   - Subtext about LTCG's journey and vision

2. **Timeline Spine**
   - Vertical timeline running down center/left
   - Seasonal phase markers along the line
   - Scroll-triggered reveal animations

3. **Phase Cards (attached to timeline)**

   Each card contains:
   - **Season name** (thematic)
   - **Status badge** (kanban-style)
   - **Feature list** (bullet points)
   - **Optional date range** (kept vague)

### Phase Examples

| Season | Status | Features |
|--------|--------|----------|
| Season of Origins | ✅ Completed | Core gameplay, card system, ranked battles |
| Season of Conquest | 🔥 In Progress | Guild system, tournaments, leaderboards |
| Season of Legends | 🔮 Coming Soon | New archetypes, legendary cards, special events |
| Beyond | ⚔️ Future | Long-term vision teaser |

### Status Badge Styles
- **Completed** - Green, checkmark icon
- **In Progress** - Gold, animated glow/pulse
- **Coming Soon** - Muted, clock or crystal ball icon
- **Future** - Faded, sword icon

### Interactivity
- Cards expand on click/hover for more detail
- Scroll-triggered animations reveal each phase
- Mobile: stacked cards without center spine

### Components Needed
- `RoadmapHero.tsx`
- `TimelineSpine.tsx`
- `PhaseCard.tsx`
- `StatusBadge.tsx`
- `RoadmapTimeline.tsx` (container)

---

## 5. Press Kit Page

**Route:** `/press`

### Structure

1. **Hero Section**
   - Headline: "Press Kit"
   - Subtext: "Everything you need to cover LTCG"

2. **Quick Facts Card**
   - Game name: LTCG
   - Genre: Strategic Trading Card Game
   - Platforms: Web, Mobile (planned)
   - Status: Open Beta (or current status)
   - Description: 1-2 sentences
   - Website URL

3. **Download Bundle CTA**
   - Prominent button: "Download Full Press Kit (ZIP)"
   - ZIP structure:
     ```
     LTCG-Press-Kit/
     ├── logos/          # PNG, SVG, light/dark variants
     ├── screenshots/    # High-res gameplay images
     ├── banners/        # Social media banners
     └── fact-sheet.pdf  # One-pager with key info
     ```

4. **Online Preview Gallery**

   **Logos Section**
   - Logo variants displayed in grid
   - Individual download buttons per asset
   - Light/dark backgrounds for preview

   **Screenshots Section**
   - Gallery grid of gameplay images
   - Click to enlarge (lightbox)
   - Individual download option

   **Banners Section**
   - Social media / promotional banners
   - Various sizes displayed

5. **Press Contact**
   - "Media inquiries: press@ltcg.gg"

### UX Flow
1. Journalist lands on page
2. Scans quick facts for basic info
3. Previews assets inline without downloading
4. Downloads individual assets OR full ZIP bundle

### Components Needed
- `PressHero.tsx`
- `QuickFacts.tsx`
- `DownloadBundle.tsx`
- `AssetPreview.tsx`
- `AssetGallery.tsx`
- `PressContact.tsx`

---

## Shared Patterns

### Styling
- All pages use existing CSS classes: `tcg-frame`, `tcg-panel`, `gold-text`, `btn-fantasy-primary`
- Dark leather background (#1a1614)
- Gold accents (#d4af37)
- Cinzel font for headings

### Animations
- Framer-motion for all animations
- Scroll-triggered reveals: `whileInView={{ opacity: 1, y: 0 }}`
- Consistent with landing page patterns

### Layout
- Responsive (mobile-first)
- Max-width container for content
- Consistent spacing with landing page sections

### Navigation Updates
- Add links to Footer component
- Consider adding to Navbar if needed

---

## File Structure

```
apps/web/app/
├── (marketing)/
│   ├── about/
│   │   └── page.tsx
│   ├── contact/
│   │   └── page.tsx
│   ├── community-guidelines/
│   │   └── page.tsx
│   ├── roadmap/
│   │   └── page.tsx
│   └── press/
│       └── page.tsx

apps/web/src/components/marketing/
├── about/
│   ├── AboutHero.tsx
│   ├── CommunityStats.tsx
│   ├── CorePillars.tsx
│   └── CommunitySpotlight.tsx
├── contact/
│   ├── ContactHero.tsx
│   ├── ChannelCard.tsx
│   └── ContactChannels.tsx
├── guidelines/
│   ├── GuidelinesHero.tsx
│   ├── PrincipleCard.tsx
│   └── PrinciplesList.tsx
├── roadmap/
│   ├── RoadmapHero.tsx
│   ├── TimelineSpine.tsx
│   ├── PhaseCard.tsx
│   ├── StatusBadge.tsx
│   └── RoadmapTimeline.tsx
└── press/
    ├── PressHero.tsx
    ├── QuickFacts.tsx
    ├── DownloadBundle.tsx
    ├── AssetPreview.tsx
    ├── AssetGallery.tsx
    └── PressContact.tsx

public/
└── press/
    ├── LTCG-Press-Kit.zip
    ├── logos/
    ├── screenshots/
    └── banners/
```

---

## Implementation Order

1. **About Us** - Foundation page, establishes community-first messaging
2. **Contact** - Simple, quick win
3. **Community Guidelines** - Simple content page
4. **Roadmap** - More complex timeline UI
5. **Press Kit** - Requires asset preparation and download infrastructure

---

## Open Questions

- [ ] Actual Discord invite link
- [ ] Twitter/X profile URL
- [ ] Email addresses (hello@, press@)
- [ ] Press kit assets (logos, screenshots) - need to be prepared
- [ ] Specific roadmap content (actual features per phase)
- [ ] Community stats - real data or placeholder?

---

## Dependencies

- No new packages required
- Uses existing: framer-motion, lucide-react, Tailwind
- Press Kit ZIP: Can be static file in `/public` or generated

---

## Success Criteria

- [ ] All 5 pages accessible and responsive
- [ ] Consistent fantasy aesthetic with existing pages
- [ ] Footer navigation updated with new links
- [ ] Press Kit download functional
- [ ] Mobile experience polished
