# Card Template Designer - Design Document

**Date:** 2026-02-05
**Status:** Approved
**Author:** Design Session with User

## Overview

A visual card template designer that allows admins to position and style text overlays on card background images, save template configurations, and batch-render all cards with exported images in multiple formats and sizes.

## User Requirements

- Create templates for 5 card types: creature, environment, spell, trap, magic
- Manually position 6 data fields: title, effect/flavor text, card type, mana cost, ATK, DEF
- Advanced text styling: font family, size, color, weight, alignment, stroke, shadow, letter spacing, line height, rotation
- Effect text auto-wraps and scales to fit bounding box
- Preview templates with real card data
- Save template configurations to database
- Batch render all cards of a type
- Export in multiple sizes: thumbnail (375×525), web (750×1050), print (1500×2100)
- Export in both PNG and JPG formats
- Upload 180 card backgrounds from `/Users/home/Downloads/cards-raw` to Vercel Blob

## Architecture Overview

### Phase 0: Asset Upload
1. Scan `/Users/home/Downloads/cards-raw` directory
2. Upload all 180 backgrounds to Vercel Blob
3. Create `cardBackgrounds` table in Convex to track metadata

### High-Level Flow
1. **Asset Management** - Backgrounds uploaded to Vercel Blob, synced to Convex
2. **Template Creation** - Select card type, browse backgrounds, pick one, enter design mode
3. **Visual Editor** - Konva canvas displays background, admin adds/positions/styles text fields
4. **Live Preview** - Preview template with real card data, display card data reference
5. **Save Template** - Configuration saves to Convex `cardTypeTemplates` table
6. **Batch Render** - Select template, render all cards of that type
7. **Export** - Generate multiple sizes in PNG + JPG formats

### Tech Stack
- **Konva + React Konva** - Canvas manipulation (already in dependencies)
- **Transformer** - Konva's built-in resize/rotate tool
- **html-to-image** - Canvas export (already in dependencies)
- **JSZip** - Batch ZIP export (need to add)
- **Convex** - Store template configurations
- **Vercel Blob** - Host card background images
- **Existing UI** - Radix, Tremor, shadcn components

## Editor UI Design

### Design Mode Layout (3-column)

#### Left Panel (300px)
- **Card Type Selector** - Dropdown (creature/spell/trap/magic/environment)
- **Select Background** - Button → Opens grid dialog of backgrounds from `cardBackgrounds`
- **Add Text Field** - Button → Creates new draggable text on canvas
- **Text Field Controls** (when text selected):
  - Data field dropdown (title, effect, cardType, manaCost, atk, def)
  - Font family picker
  - Font size slider (8-72px)
  - Color picker (text color)
  - Weight toggle (normal/bold)
  - Alignment buttons (left/center/right)
  - Stroke: color picker + width slider (0-10px)
  - Shadow: color picker + blur/offset controls
  - Letter spacing slider (-5 to 20)
  - Line height slider (0.8 to 2.0)
  - Rotation dial (0-360°)
  - "Auto-scale to fit" checkbox (for effect text)
  - Delete button

#### Center Canvas (flexible)
- Konva Stage displaying selected background at 750×1050
- Text fields as draggable/transformable Konva Text elements
- Transformer handles (resize, rotate) when text selected
- Zoom controls (25%, 50%, 100%, 200%)
- Grid overlay (optional)

#### Right Panel (300px)
- **Preview Section** - Live rendered preview
- **Card Data Reference** - Collapsible panel showing:
  ```
  Card Data Reference
  ├─ Title: "Infernal Dragon" [copy]
  ├─ Card Type: "creature" [copy]
  ├─ Mana Cost: "5" [copy]
  ├─ ATK: "8" [copy]
  ├─ DEF: "6" [copy]
  └─ Effect: [full text] [copy]
  ```
- **Card Selector** - Dropdown to switch preview card
- **Actions**:
  - Save Template button
  - Switch to Render Mode button

### Render Mode Layout
- **Card Type Selector** - Choose which template to render
- **Batch Render Options**:
  - Export sizes checkboxes (thumbnail, web, print)
  - Export formats checkboxes (PNG, JPG)
  - Export as ZIP button
- **Progress Indicator** - Shows rendering progress
- **Preview Grid** - Thumbnail gallery of rendered cards

## Data Model

### Convex Schema

#### `cardBackgrounds` Table
```typescript
cardBackgrounds: defineTable({
  filename: v.string(),           // "94.png"
  blobUrl: v.string(),            // Vercel Blob URL
  width: v.number(),              // 750
  height: v.number(),             // 1050
  uploadedAt: v.number(),         // timestamp
  tags: v.optional(v.array(v.string())), // ["infernal-dragons"]
})
```

#### `cardTypeTemplates` Table
```typescript
cardTypeTemplates: defineTable({
  cardType: v.string(),           // "creature" | "spell" | "trap" | "magic" | "environment"
  name: v.string(),               // "Creature Default Template"
  backgroundId: v.id("cardBackgrounds"),
  canvasWidth: v.number(),        // 750
  canvasHeight: v.number(),       // 1050
  textFields: v.array(v.object({
    id: v.string(),               // "field_1", "field_2"
    dataField: v.string(),        // "title" | "effect" | "cardType" | "manaCost" | "atk" | "def"
    x: v.number(),                // position in pixels
    y: v.number(),
    width: v.number(),            // bounding box
    height: v.number(),
    rotation: v.number(),         // degrees
    fontFamily: v.string(),       // "Arial"
    fontSize: v.number(),         // 24
    fontWeight: v.string(),       // "normal" | "bold"
    color: v.string(),            // "#FFFFFF"
    align: v.string(),            // "left" | "center" | "right"
    stroke: v.optional(v.object({
      color: v.string(),
      width: v.number(),
    })),
    shadow: v.optional(v.object({
      color: v.string(),
      blur: v.number(),
      offsetX: v.number(),
      offsetY: v.number(),
    })),
    letterSpacing: v.number(),    // 0
    lineHeight: v.number(),       // 1.2
    autoScale: v.boolean(),       // true for effect text
  })),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_card_type", ["cardType"])
```

## Rendering & Export System

### Batch Rendering Flow
1. Admin switches to "Render Mode"
2. Selects card type → loads template from `cardTypeTemplates`
3. Queries all cards of that type from `cards` table
4. For each card:
   - Creates Konva stage with background from Blob URL
   - Adds text layers with card data populated
   - Auto-scales effect text if configured
   - Generates image using `stage.toDataURL()`

### Multi-Size Export Strategy
- **Thumbnail (375×525)**: Scale stage to 0.5x, export
- **Web (750×1050)**: Export at 1x (native resolution)
- **Print (1500×2100)**: Scale stage to 2x, export

### Format Export
- **PNG**: `stage.toDataURL({ pixelRatio: scale })`
- **JPG**: `stage.toDataURL({ mimeType: 'image/jpeg', quality: 0.95, pixelRatio: scale })`

### Batch ZIP Export
- Use JSZip library to bundle all rendered cards
- Organize by: `/[cardType]/[size]/[format]/[cardName].[ext]`
- Example: `/creature/web/png/infernal-dragon.png`
- Show progress indicator during generation
- Trigger browser download when complete

## Integration with Existing System

### Leverage Existing Components
- **KonvaCanvas.tsx** - Main canvas component
- **Layer system** - BackgroundLayer, TextLayer concepts
- **AssetPickerDialog.tsx** - Pattern for background selection
- **Convex patterns** - Query/mutation structure from cards page
- **useCanvasExport.ts** - Export utilities

### New Files to Create
```
/apps/admin/src/
├── app/cards/template-designer/
│   └── page.tsx                    # Main template designer page
├── components/cards/
│   ├── TemplateDesigner.tsx        # Design mode UI
│   ├── TextFieldEditor.tsx         # Text styling controls
│   ├── CardDataPanel.tsx           # Card data reference display
│   ├── BatchRenderer.tsx           # Render mode UI
│   └── BackgroundPicker.tsx        # Background selection dialog
├── lib/utils/
│   ├── uploadBackgrounds.ts        # Script to upload 180 images
│   └── cardRenderer.ts             # Card rendering utilities
└── convex/
    ├── cardBackgrounds.ts          # Background queries/mutations
    └── cardTypeTemplates.ts        # Template queries/mutations
```

### Route Structure
- **New Route**: `/cards/template-designer`
  - Query param `?mode=design|render` for mode switching
  - Query param `?cardType=creature|spell|trap|magic|environment` for type selection

## Implementation Phases

### Phase 1: Asset Upload & Management
1. Create `cardBackgrounds` Convex schema
2. Write upload script to scan `/Users/home/Downloads/cards-raw`
3. Upload images to Vercel Blob
4. Populate `cardBackgrounds` table
5. Create background picker UI component

### Phase 2: Template Designer - Core Canvas
1. Create `cardTypeTemplates` Convex schema
2. Build basic template designer page layout
3. Implement Konva canvas with background image
4. Add text field creation (basic dragging)
5. Add Transformer for resize/rotate

### Phase 3: Template Designer - Styling Controls
1. Build left panel with text field controls
2. Implement all text styling options:
   - Font family, size, color, weight, alignment
   - Stroke (color, width)
   - Shadow (color, blur, offset)
   - Letter spacing, line height, rotation
3. Implement auto-scale for effect text
4. Add save template functionality

### Phase 4: Live Preview & Card Data
1. Build right panel with preview
2. Add card selector dropdown
3. Implement live preview rendering
4. Build card data reference panel with copy buttons
5. Wire up preview to update on template changes

### Phase 5: Batch Rendering & Export
1. Build render mode UI
2. Implement batch card rendering
3. Add multi-size export (thumbnail, web, print)
4. Add multi-format export (PNG, JPG)
5. Implement ZIP download with JSZip
6. Add progress indicator

### Phase 6: Polish & Testing
1. Add loading states
2. Error handling for missing backgrounds/templates
3. Validation for template completeness
4. Test with all 5 card types
5. Performance optimization for batch rendering

## Success Criteria

- ✅ All 180 backgrounds uploaded to Vercel Blob
- ✅ Can create templates for all 5 card types
- ✅ All 6 data fields can be positioned and styled
- ✅ Advanced text styling works (stroke, shadow, rotation, etc.)
- ✅ Effect text auto-scales to fit bounding box
- ✅ Live preview shows template with real card data
- ✅ Card data reference panel displays all fields with copy buttons
- ✅ Templates save to Convex successfully
- ✅ Batch render generates cards for selected type
- ✅ Export produces all sizes (thumbnail, web, print)
- ✅ Export produces both PNG and JPG formats
- ✅ ZIP download contains all cards organized by type/size/format

## Technical Considerations

### Text Auto-Scaling Algorithm
```typescript
function autoScaleText(text: Konva.Text, maxWidth: number, maxHeight: number) {
  let fontSize = text.fontSize();
  text.width(maxWidth);

  while (text.height() > maxHeight && fontSize > 8) {
    fontSize -= 1;
    text.fontSize(fontSize);
  }

  return fontSize;
}
```

### Performance Optimization
- Render cards in batches of 10 to avoid browser freezing
- Use `requestAnimationFrame` for smooth UI updates during batch rendering
- Cache background images to avoid repeated downloads
- Debounce template updates during editing

### Error Handling
- Missing background image → show placeholder
- Missing template for card type → prompt to create
- Export failure → retry mechanism
- Invalid text field data → validation warnings

## Future Enhancements (Out of Scope)

- Multi-background support per template (e.g., different frames by rarity)
- Custom fonts upload
- Gradient text fills
- Text effects (glow, bevel, etc.)
- Template versioning
- Bulk template editing
- Template import/export (JSON)
- Integration with card creation workflow

---

**End of Design Document**
