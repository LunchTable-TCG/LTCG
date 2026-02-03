# Branding Page Design

**Date:** 2026-02-03
**Status:** Approved
**Route:** `/settings/branding`

## Overview

A branding management page for the admin dashboard that enables:
- Folder-based organization of brand assets
- Rich metadata for AI agent consumption
- Core brand guidelines embedded in AI prompts
- RAG-style asset search for creative tasks

## Organization Model

**Hybrid approach:** 9 predefined top-level sections with unlimited nested subfolders.

### Predefined Sections
1. Brand Identity - Logos, wordmarks, icons, favicon variations
2. Color System - Color palettes, swatches, gradient examples
3. Typography - Font files, type specimens, usage examples
4. Visual Elements - Patterns, textures, decorative graphics, dividers
5. Marketing - Social media templates, banners, promotional materials
6. Content - Newsletter headers, email signatures, announcement templates
7. Photography Style - Photo treatment guidelines, example images
8. Mascot/Characters - Character assets, poses, expressions
9. Audio/Sound - Sound effects, jingles, background music

---

## Data Architecture

### Table: `brandingFolders`

```typescript
{
  _id: Id<"brandingFolders">,
  name: string,                    // folder name
  parentId: Id<"brandingFolders"> | null, // null for root sections
  section: string,                 // one of 9 predefined sections
  path: string,                    // full path "Brand Identity/Logos/Dark Mode"
  description?: string,
  sortOrder: number,
  createdAt: number,
  updatedAt: number,
  createdBy: Id<"users">,
}
```

**Indexes:** `by_parent`, `by_section`, `by_path`

### Table: `brandingAssets`

```typescript
{
  _id: Id<"brandingAssets">,
  folderId: Id<"brandingFolders">,
  fileMetadataId: Id<"fileMetadata">, // links to existing storage
  name: string,                    // display name
  tags: string[],                  // quick filter tags
  usageContext: string[],          // ["newsletter", "social", "print", "website", "email", "merch"]
  variants?: {                     // flexible key-value
    theme?: "light" | "dark",
    orientation?: "horizontal" | "vertical",
    [key: string]: string,
  },
  fileSpecs?: {                    // flexible key-value
    minWidth?: number,
    minHeight?: number,
    transparent?: boolean,
    [key: string]: any,
  },
  aiDescription: string,           // guidance for AI usage
  sortOrder: number,
  createdAt: number,
  updatedAt: number,
}
```

**Indexes:** `by_folder`, `by_tags`, `by_usage_context`

### Table: `brandingGuidelines`

```typescript
{
  _id: Id<"brandingGuidelines">,
  section: string,                 // "global" or section name
  structuredData: {
    colors?: Array<{ name: string, hex: string }>,
    fonts?: Array<{ name: string, weights: number[], usage: string }>,
    brandVoice?: {
      tone: string,                // "epic", "playful", "professional", etc.
      formality: number,           // 1-10 scale
    },
    customFields?: Record<string, any>,
  },
  richTextContent: string,         // markdown guidelines
  updatedAt: number,
  updatedBy: Id<"users">,
}
```

**Indexes:** `by_section`

---

## Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Branding & Assets                              [Edit Guidelines] │
├─────────────┬───────────────────────────────────────────────────┤
│             │                                                    │
│  SECTIONS   │  CONTENT AREA                                     │
│  ─────────  │  ─────────────                                    │
│  ▼ Brand    │  Breadcrumb: Brand Identity / Logos / Dark Mode   │
│    Identity │                                                    │
│    ├─Logos  │  [+ New Folder]  [↑ Upload Assets]  [Search...]   │
│    │ └─Dark │  ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│    └─Icons  │  │  folder │ │  asset  │ │  asset  │              │
│  ▶ Color    │  │   📁    │ │   🖼️    │ │   🖼️    │              │
│    System   │  └─────────┘ └─────────┘ └─────────┘              │
│  ▶ Typog... │                                                    │
│  ...        │                                                    │
└─────────────┴───────────────────────────────────────────────────┘
```

### Components
- **Left sidebar:** Collapsible tree view of all 9 sections with nested folders
- **Breadcrumb nav:** Shows current path, clickable to navigate up
- **Content grid:** Shows folders and assets (folders first)
- **Action bar:** New folder, upload, search, view toggle (grid/list)
- **"Edit Guidelines" button:** Opens modal for core brand guidelines

### Interactions
- Click folder to navigate into it
- Click asset to open detail sheet
- Drag-drop to move assets/folders
- Right-click context menu for rename/move/delete

---

## Asset Detail Sheet

Slides in from right when clicking an asset:

- **Preview:** Image/video/audio player with zoom
- **General:** Display name, tags (with autocomplete)
- **Usage Context:** Checkboxes for newsletter, social, print, website, email, merch
- **Variants:** Dynamic key-value fields (theme, orientation, custom)
- **File Specs:** Dynamic key-value fields (minWidth, transparent, custom)
- **AI Guidelines:** Rich text area for usage instructions
- **Actions:** Copy URL, Download, Move to...

Auto-saves on field changes (debounced).

---

## Brand Guidelines Editor

Modal with tabbed interface:

### Tabs
- **Global** - Applies to all AI creative work
- **Per-section tabs** - Section-specific guidelines

### Global Tab Structure

**Structured Specs:**
- Colors: Primary, Secondary, Accent, Background, + custom (with color picker)
- Typography: Font families with weights array
- Brand Voice: Tone selector + formality slider (1-10)
- Custom fields: Key-value for anything else

**Rich Text Area:**
- Markdown editor for detailed guidelines
- Embedded in AI prompts for creative tasks

---

## AI Integration Architecture

### Flow

```
AI Creative Request
        │
        ▼
1. LOAD CORE GUIDELINES (always embedded)
   - Global structuredData (colors, fonts, voice)
   - Global richTextContent (tone, rules)
   → Injected into system prompt
        │
        ▼
2. RAG SEARCH FOR RELEVANT ASSETS
   - Query by tags, usageContext, aiDescription
   - Returns matching assets with URLs + guidelines
   → Provided as context to AI
        │
        ▼
3. AI GENERATES CONTENT
   - Follows brand voice
   - References assets by URL
   - Applies color codes, font specs
```

### New Convex Functions

```typescript
// Get core guidelines for AI prompt injection
getBrandGuidelinesForAI(): {
  structured: StructuredData,
  richText: string,
  lastUpdated: number
}

// Search assets by context (RAG-style)
searchBrandingAssets(args: {
  query: string,
  usageContext?: string[],
  section?: string,
  limit?: number
}): BrandingAsset[]

// Get all assets for a specific use case
getAssetsForContext(args: {
  context: "newsletter" | "social" | "print" | "website" | "email" | "merch"
}): BrandingAsset[]
```

### Integration Points
- Admin AI Assistant - inject guidelines when helping with content
- Newsletter generation - search Content section
- News/announcements - use Marketing assets
- Any future AI features - same pattern

---

## Implementation Files

### New Files

```
convex/
├── schema.ts                          # Add 3 new tables
├── admin/
│   └── branding.ts                    # CRUD for folders, assets, guidelines

apps/admin/src/
├── app/settings/branding/
│   └── page.tsx                       # Main branding page
│
├── components/branding/
│   ├── BrandingSidebar.tsx            # Collapsible tree navigation
│   ├── BrandingContentGrid.tsx        # Folders + assets grid
│   ├── BrandingBreadcrumb.tsx         # Path navigation
│   ├── FolderCard.tsx                 # Folder display card
│   ├── BrandingAssetCard.tsx          # Asset thumbnail card
│   ├── AssetDetailSheet.tsx           # Right slide-out for editing
│   ├── GuidelinesModal.tsx            # Brand guidelines editor
│   ├── GuidelinesStructuredForm.tsx   # Colors, fonts, voice fields
│   ├── GuidelinesRichText.tsx         # Markdown editor section
│   ├── CreateFolderDialog.tsx         # New folder modal
│   ├── UploadAssetsDialog.tsx         # Upload with metadata
│   ├── MoveItemDialog.tsx             # Move folder/asset picker
│   └── types.ts                       # TypeScript types
```

### Reuses Existing
- `@vercel/blob/client` upload pattern
- `fileMetadata` table for file storage
- Existing asset components as reference
- UI component library (Card, Sheet, Dialog, etc.)

---

## Seed Data

On first load, create root folders for each predefined section:

```typescript
const BRANDING_SECTIONS = [
  { name: "Brand Identity", description: "Logos, wordmarks, icons, favicons" },
  { name: "Color System", description: "Palettes, swatches, gradients" },
  { name: "Typography", description: "Fonts, type specimens, usage" },
  { name: "Visual Elements", description: "Patterns, textures, graphics" },
  { name: "Marketing", description: "Social templates, banners, promos" },
  { name: "Content", description: "Newsletter headers, email signatures" },
  { name: "Photography Style", description: "Photo guidelines, examples" },
  { name: "Mascot/Characters", description: "Character assets, poses" },
  { name: "Audio/Sound", description: "Sound effects, jingles, music" },
];
```

Initialize global guidelines with empty structured data and placeholder rich text.
