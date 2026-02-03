# Lunchtable TCG Brand Assets

This directory contains official brand assets for Lunchtable TCG. All assets are optimized and production-ready.

## Directory Structure

```
brand/
├── backgrounds/        # Hero backgrounds and banners
├── icons/
│   └── archetypes/    # Archetype faction icons
├── social/            # Social media formats
├── textures/          # Seamless textures for UI
└── ui/                # UI components with alpha channels
```

## Social Media Assets

### OpenGraph / Link Previews
- **og-1200x630.png** - Standard OpenGraph image (1200×630px)
  - Use for: Website meta tags, Discord embeds, Twitter cards, Facebook shares
  - Currently used in: `apps/web/app/layout.tsx`

### Instagram / Social Posts
- **reels-1080x1920.png** - Instagram Reels / Stories format (1080×1920px, 9:16)
  - Use for: Instagram Reels, Instagram Stories, TikTok, YouTube Shorts
  - Vertical mobile-optimized format

- **square-1024.png** - Instagram square post format (1024×1024px, 1:1)
  - Use for: Instagram feed posts, Twitter media, LinkedIn posts
  - Universal square format for most social platforms

## Hero Backgrounds

- **ltcg-hero-1536x1024.branded.png** - Desktop hero background (1536×1024px, 3:2)
  - Use for: Desktop marketing page hero section
  - Currently used in: `apps/web/app/(marketing)/page.tsx` (desktop)

- **ltcg-vertical-1024x1536.png** - Mobile hero background (1024×1536px, 2:3)
  - Use for: Mobile marketing page hero section
  - Currently used in: `apps/web/app/(marketing)/page.tsx` (mobile)

## Archetype Icons

Location: `icons/archetypes/`

10 faction icons (256×256px PNG with transparency):

- **infernal_dragons.png** - Fire archetype
- **abyssal_horrors.png** - Deep water archetype
- **arcane_mages.png** - Magic archetype
- **celestial_guardians.png** - Light/neutral archetype
- **divine_knights.png** - Holy archetype
- **mechanical_constructs.png** - Tech archetype
- **nature_spirits.png** - Earth/nature archetype
- **shadow_assassins.png** - Dark archetype
- **storm_elementals.png** - Wind/storm archetype
- **undead_legion.png** - Undead archetype

**Usage**: Card displays, deck builder, tooltips, chapter headers
**Helper**: `src/lib/archetypeIcons.ts` provides `getArchetypeIcon()` function with legacy element mapping

## Textures

Location: `textures/`

All textures are seamless 1024×1024px PNG for tiling:

- **parchment-seamless-1024.png** - Aged parchment texture
  - Use for: General backgrounds, panels

- **leather-seamless-1024.png** - Dark leather texture
  - Use for: Premium panels, dialog backgrounds

- **arcane-stone-seamless-1024.png** - Mystical stone texture
  - Use for: Premium UI, arcane-themed components
  - Currently used in: `FantasyFrame` component (arcane variant)

- **gold-metal-seamless-1024.png** - Metallic gold texture
  - Use for: Achievements, badges, special rewards, premium elements
  - Currently used in: Badge displays, special reward dialogs

## UI Components

Location: `ui/`

All UI elements are PNG with alpha channels for proper transparency:

- **fantasy_panel_bg.alpha.png** - Panel background
- **fantasy_wood_btn.alpha.png** - Wooden button texture
- **button-bg.alpha.png** - Generic button background
- **buttons_fantasy.alpha.png** - Fantasy-themed button set
- **corner_ornament.alpha.png** - Decorative corner element
- **header_banner.alpha.png** - Header banner decoration
- **panel_grimoire.alpha.png** - Grimoire-style panel

**Note**: All UI assets use `.alpha.png` naming to indicate proper alpha channel handling.

## Asset Guidelines

### For Developers

1. **In-App Usage**: Import via relative paths from `/brand/` directory
   ```tsx
   import Image from "next/image";
   <Image src="/brand/icons/archetypes/infernal_dragons.png" ... />
   ```

2. **Textures**: Use as CSS backgrounds with proper sizing
   ```tsx
   style={{
     backgroundImage: "url(/brand/textures/gold-metal.png)",
     backgroundSize: "512px 512px",
     backgroundRepeat: "repeat",
   }}
   ```

3. **Responsive Images**: Use Next.js Image component with proper dimensions

### For Marketing

1. **Social Posts**: Use format-specific assets from `/social/` directory
   - Reels/Stories: Use vertical 1080×1920
   - Feed posts: Use square 1024×1024
   - Link shares: Automatic via OpenGraph meta tags

2. **Print/High-Res**: Source files available at higher resolutions if needed

## Quality Standards

- All images optimized for web delivery
- Textures are seamless for tiling
- Icons maintain clarity at multiple sizes
- Alpha channels properly preserved
- Consistent color palette across assets

## Updates

To update brand assets:
1. Replace files in appropriate directory
2. Maintain same dimensions and format
3. Update this documentation if usage changes
4. Clear CDN cache if using Vercel Blob storage

---

**Last Updated**: 2026-02-03
**Maintained By**: Lunchtable TCG Development Team
