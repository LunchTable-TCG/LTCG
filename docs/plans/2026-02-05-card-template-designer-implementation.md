# Card Template Designer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a visual card template designer that allows admins to position text overlays on card backgrounds, save configurations, and batch-render cards with multi-size exports.

**Architecture:** Enhance `/cards/batch-render` with a template designer mode using Konva canvas for visual editing, Convex for template storage, and Vercel Blob for card backgrounds. Templates define text field positions/styles which map to card data fields (title, ATK, DEF, etc.).

**Tech Stack:** React 19, Next.js 15, Konva, React Konva, Convex, Vercel Blob, JSZip, Radix UI, shadcn/ui

---

## Phase 1: Database Schema & Upload Infrastructure

### Task 1: Create Convex schema for card backgrounds

**Files:**
- Modify: `convex/schema.ts` (add tables after cardDefinitions)

**Step 1: Add cardBackgrounds table to schema**

Add after `cardDefinitions` table (around line 1050):

```typescript
  cardBackgrounds: defineTable({
    filename: v.string(),
    blobUrl: v.string(),
    width: v.number(),
    height: v.number(),
    uploadedAt: v.number(),
    tags: v.optional(v.array(v.string())),
  }).index("by_filename", ["filename"]),
```

**Step 2: Add cardTypeTemplates table to schema**

Add after `cardBackgrounds`:

```typescript
  cardTypeTemplates: defineTable({
    cardType: v.string(), // "creature" | "spell" | "trap" | "magic" | "environment"
    name: v.string(),
    backgroundId: v.id("cardBackgrounds"),
    canvasWidth: v.number(),
    canvasHeight: v.number(),
    textFields: v.array(
      v.object({
        id: v.string(),
        dataField: v.string(), // "title" | "effect" | "cardType" | "manaCost" | "atk" | "def"
        x: v.number(),
        y: v.number(),
        width: v.number(),
        height: v.number(),
        rotation: v.number(),
        fontFamily: v.string(),
        fontSize: v.number(),
        fontWeight: v.string(),
        color: v.string(),
        align: v.string(),
        stroke: v.optional(
          v.object({
            color: v.string(),
            width: v.number(),
          })
        ),
        shadow: v.optional(
          v.object({
            color: v.string(),
            blur: v.number(),
            offsetX: v.number(),
            offsetY: v.number(),
          })
        ),
        letterSpacing: v.number(),
        lineHeight: v.number(),
        autoScale: v.boolean(),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_card_type", ["cardType"])
    .index("by_created_at", ["createdAt"]),
```

**Step 3: Run Convex dev to apply schema**

Run: `cd apps/admin && bun run convex dev`

Expected: Schema applied successfully, tables created

**Step 4: Commit schema changes**

```bash
git add convex/schema.ts
git commit -m "feat: add card backgrounds and template schemas"
```

---

### Task 2: Create Convex queries/mutations for card backgrounds

**Files:**
- Create: `convex/cardBackgrounds.ts`

**Step 1: Create cardBackgrounds.ts file**

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List all card backgrounds
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("cardBackgrounds").order("desc").collect();
  },
});

// Get single background by ID
export const get = query({
  args: { id: v.id("cardBackgrounds") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create new background
export const create = mutation({
  args: {
    filename: v.string(),
    blobUrl: v.string(),
    width: v.number(),
    height: v.number(),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("cardBackgrounds", {
      filename: args.filename,
      blobUrl: args.blobUrl,
      width: args.width,
      height: args.height,
      uploadedAt: Date.now(),
      tags: args.tags,
    });
  },
});

// Delete background
export const remove = mutation({
  args: { id: v.id("cardBackgrounds") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
```

**Step 2: Commit**

```bash
git add convex/cardBackgrounds.ts
git commit -m "feat: add card backgrounds queries/mutations"
```

---

### Task 3: Create Convex queries/mutations for card type templates

**Files:**
- Create: `convex/cardTypeTemplates.ts`

**Step 1: Create cardTypeTemplates.ts file**

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const textFieldValidator = v.object({
  id: v.string(),
  dataField: v.string(),
  x: v.number(),
  y: v.number(),
  width: v.number(),
  height: v.number(),
  rotation: v.number(),
  fontFamily: v.string(),
  fontSize: v.number(),
  fontWeight: v.string(),
  color: v.string(),
  align: v.string(),
  stroke: v.optional(v.object({ color: v.string(), width: v.number() })),
  shadow: v.optional(v.object({
    color: v.string(),
    blur: v.number(),
    offsetX: v.number(),
    offsetY: v.number(),
  })),
  letterSpacing: v.number(),
  lineHeight: v.number(),
  autoScale: v.boolean(),
});

// List all templates
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("cardTypeTemplates").order("desc").collect();
  },
});

// Get templates by card type
export const getByCardType = query({
  args: { cardType: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cardTypeTemplates")
      .withIndex("by_card_type", (q) => q.eq("cardType", args.cardType))
      .first();
  },
});

// Get single template by ID
export const get = query({
  args: { id: v.id("cardTypeTemplates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create or update template
export const upsert = mutation({
  args: {
    id: v.optional(v.id("cardTypeTemplates")),
    cardType: v.string(),
    name: v.string(),
    backgroundId: v.id("cardBackgrounds"),
    canvasWidth: v.number(),
    canvasHeight: v.number(),
    textFields: v.array(textFieldValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    if (args.id) {
      await ctx.db.patch(args.id, {
        name: args.name,
        backgroundId: args.backgroundId,
        canvasWidth: args.canvasWidth,
        canvasHeight: args.canvasHeight,
        textFields: args.textFields,
        updatedAt: now,
      });
      return args.id;
    } else {
      return await ctx.db.insert("cardTypeTemplates", {
        cardType: args.cardType,
        name: args.name,
        backgroundId: args.backgroundId,
        canvasWidth: args.canvasWidth,
        canvasHeight: args.canvasHeight,
        textFields: args.textFields,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Delete template
export const remove = mutation({
  args: { id: v.id("cardTypeTemplates") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
```

**Step 2: Commit**

```bash
git add convex/cardTypeTemplates.ts
git commit -m "feat: add card type templates queries/mutations"
```

---

### Task 4: Create background upload utility script

**Files:**
- Create: `apps/admin/src/lib/utils/uploadCardBackgrounds.ts`

**Step 1: Install @vercel/blob if not present**

Run: `cd apps/admin && bun add @vercel/blob`

**Step 2: Create upload script**

```typescript
import { put } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";

interface UploadResult {
  filename: string;
  blobUrl: string;
  width: number;
  height: number;
  success: boolean;
  error?: string;
}

export async function uploadCardBackgrounds(
  sourcePath: string,
  onProgress?: (current: number, total: number, filename: string) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  try {
    // Read all files from source directory
    const files = await fs.readdir(sourcePath);
    const imageFiles = files.filter((f) =>
      /\.(png|jpg|jpeg|webp)$/i.test(f)
    );

    for (let i = 0; i < imageFiles.length; i++) {
      const filename = imageFiles[i];
      onProgress?.(i + 1, imageFiles.length, filename);

      try {
        const filePath = path.join(sourcePath, filename);
        const fileBuffer = await fs.readFile(filePath);

        // Upload to Vercel Blob
        const blob = await put(`card-backgrounds/${filename}`, fileBuffer, {
          access: "public",
          contentType: getContentType(filename),
        });

        // Get image dimensions (simplified - you may want to use sharp or similar)
        const dimensions = await getImageDimensions(fileBuffer);

        results.push({
          filename,
          blobUrl: blob.url,
          width: dimensions.width,
          height: dimensions.height,
          success: true,
        });
      } catch (error) {
        results.push({
          filename,
          blobUrl: "",
          width: 0,
          height: 0,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Failed to upload backgrounds: ${error}`);
  }
}

function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

async function getImageDimensions(
  buffer: Buffer
): Promise<{ width: number; height: number }> {
  // Simplified - assumes PNG format
  // For production, use sharp: const metadata = await sharp(buffer).metadata();
  // For now, return default card dimensions
  return { width: 750, height: 1050 };
}
```

**Step 3: Add sharp for proper image dimensions**

Run: `cd apps/admin && bun add sharp`

**Step 4: Update getImageDimensions to use sharp**

Replace the getImageDimensions function:

```typescript
import sharp from "sharp";

async function getImageDimensions(
  buffer: Buffer
): Promise<{ width: number; height: number }> {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width || 750,
    height: metadata.height || 1050,
  };
}
```

**Step 5: Commit**

```bash
git add apps/admin/src/lib/utils/uploadCardBackgrounds.ts apps/admin/package.json apps/admin/bun.lock
git commit -m "feat: add card background upload utility with sharp"
```

---

## Phase 2: Upload UI & Background Management

### Task 5: Create background upload page

**Files:**
- Create: `apps/admin/src/app/cards/upload-backgrounds/page.tsx`

**Step 1: Create upload page**

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { uploadCardBackgrounds } from "@/lib/utils/uploadCardBackgrounds";
import { useMutation } from "convex/react";
import { apiAny } from "@/lib/convexHelpers";

export default function UploadBackgroundsPage() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, filename: "" });
  const [results, setResults] = useState<any[]>([]);

  const createBackground = useMutation(apiAny.cardBackgrounds.create);

  const handleUpload = async () => {
    setUploading(true);
    setResults([]);

    try {
      const uploadResults = await uploadCardBackgrounds(
        "/Users/home/Downloads/cards-raw",
        (current, total, filename) => {
          setProgress({ current, total, filename });
        }
      );

      // Save to Convex
      for (const result of uploadResults) {
        if (result.success) {
          await createBackground({
            filename: result.filename,
            blobUrl: result.blobUrl,
            width: result.width,
            height: result.height,
            tags: ["infernal-dragons"],
          });
        }
      }

      setResults(uploadResults);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Card Backgrounds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload all card backgrounds from /Users/home/Downloads/cards-raw to Vercel Blob
          </p>

          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? "Uploading..." : "Start Upload"}
          </Button>

          {uploading && (
            <div className="space-y-2">
              <Progress
                value={(progress.current / progress.total) * 100}
              />
              <p className="text-sm">
                {progress.current} / {progress.total}: {progress.filename}
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Results:</h3>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className={`text-sm ${r.success ? "text-green-600" : "text-red-600"}`}
                  >
                    {r.filename}: {r.success ? "✓ Success" : `✗ ${r.error}`}
                  </div>
                ))}
              </div>
              <p className="text-sm font-semibold mt-4">
                Uploaded: {results.filter((r) => r.success).length} / {results.length}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Test upload page**

Run: Navigate to http://localhost:3000/cards/upload-backgrounds

Expected: Page loads with upload button

**Step 3: Commit**

```bash
git add apps/admin/src/app/cards/upload-backgrounds/page.tsx
git commit -m "feat: add background upload UI page"
```

---

## Phase 3: Template Designer - Core Canvas

### Task 6: Create template designer page structure

**Files:**
- Create: `apps/admin/src/app/cards/template-designer/page.tsx`

**Step 1: Create page with mode toggle**

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TemplateDesigner from "@/components/cards/TemplateDesigner";
import BatchRenderer from "@/components/cards/BatchRenderer";

export default function TemplateDesignerPage() {
  const [mode, setMode] = useState<"design" | "render">("design");

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Card Template Designer</h1>
        <Tabs value={mode} onValueChange={(v) => setMode(v as "design" | "render")}>
          <TabsList>
            <TabsTrigger value="design">Design Mode</TabsTrigger>
            <TabsTrigger value="render">Render Mode</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-hidden">
        {mode === "design" ? <TemplateDesigner /> : <BatchRenderer />}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/admin/src/app/cards/template-designer/page.tsx
git commit -m "feat: create template designer page with mode toggle"
```

---

### Task 7: Create TemplateDesigner component scaffold

**Files:**
- Create: `apps/admin/src/components/cards/TemplateDesigner.tsx`

**Step 1: Create component with 3-column layout**

```typescript
"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type CardType = "creature" | "spell" | "trap" | "magic" | "environment";

export default function TemplateDesigner() {
  const [cardType, setCardType] = useState<CardType>("creature");
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);

  return (
    <div className="h-full grid grid-cols-[300px_1fr_300px] gap-4 p-4">
      {/* Left Panel */}
      <div className="space-y-4 overflow-y-auto">
        <Card className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Card Type</label>
            <Select value={cardType} onValueChange={(v) => setCardType(v as CardType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="creature">Creature</SelectItem>
                <SelectItem value="spell">Spell</SelectItem>
                <SelectItem value="trap">Trap</SelectItem>
                <SelectItem value="magic">Magic</SelectItem>
                <SelectItem value="environment">Environment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" className="w-full">
            Select Background
          </Button>

          <Button variant="outline" className="w-full">
            Add Text Field
          </Button>
        </Card>
      </div>

      {/* Center Canvas */}
      <div className="flex items-center justify-center bg-muted/20">
        <div className="text-muted-foreground">Canvas will go here</div>
      </div>

      {/* Right Panel */}
      <div className="space-y-4 overflow-y-auto">
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Preview</h3>
          <div className="aspect-[750/1050] bg-muted/20 rounded flex items-center justify-center text-muted-foreground text-sm">
            Preview
          </div>
        </Card>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/admin/src/components/cards/TemplateDesigner.tsx
git commit -m "feat: create template designer 3-column layout"
```

---

### Task 8: Create BatchRenderer component scaffold

**Files:**
- Create: `apps/admin/src/components/cards/BatchRenderer.tsx`

**Step 1: Create component**

```typescript
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function BatchRenderer() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Batch Render Cards</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Batch rendering interface coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/admin/src/components/cards/BatchRenderer.tsx
git commit -m "feat: create batch renderer scaffold"
```

---

## Phase 4: Background Picker & Konva Canvas

### Task 9: Create BackgroundPicker component

**Files:**
- Create: `apps/admin/src/components/cards/BackgroundPicker.tsx`

**Step 1: Create background picker dialog**

```typescript
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { apiAny } from "@/lib/convexHelpers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";

interface BackgroundPickerProps {
  onSelect: (backgroundId: string, blobUrl: string) => void;
  trigger?: React.ReactNode;
}

export default function BackgroundPicker({ onSelect, trigger }: BackgroundPickerProps) {
  const [open, setOpen] = useState(false);
  const backgrounds = useQuery(apiAny.cardBackgrounds.list);

  const handleSelect = (id: string, url: string) => {
    onSelect(id, url);
    setOpen(false);
  };

  return (
    <Dialog open={open} onValueChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Select Background</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Select Card Background</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[600px]">
          <div className="grid grid-cols-3 gap-4 p-4">
            {backgrounds?.map((bg) => (
              <button
                key={bg._id}
                onClick={() => handleSelect(bg._id, bg.blobUrl)}
                className="relative aspect-[750/1050] rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-colors"
              >
                <Image
                  src={bg.blobUrl}
                  alt={bg.filename}
                  fill
                  className="object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2">
                  <p className="text-xs text-white truncate">{bg.filename}</p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Commit**

```bash
git add apps/admin/src/components/cards/BackgroundPicker.tsx
git commit -m "feat: create background picker dialog"
```

---

### Task 10: Integrate Konva canvas into TemplateDesigner

**Files:**
- Modify: `apps/admin/src/components/cards/TemplateDesigner.tsx`

**Step 1: Add BackgroundPicker and Konva imports**

```typescript
import { Stage, Layer, Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import BackgroundPicker from "./BackgroundPicker";
```

**Step 2: Add state for background and canvas**

```typescript
const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
const [backgroundId, setBackgroundId] = useState<string | null>(null);
const [canvasSize] = useState({ width: 750, height: 1050 });
const [zoom, setZoom] = useState(1);
```

**Step 3: Create BackgroundImage sub-component**

Add inside TemplateDesigner before return:

```typescript
function BackgroundImage({ url }: { url: string }) {
  const [image] = useImage(url);
  return <KonvaImage image={image} width={750} height={1050} />;
}
```

**Step 4: Replace canvas placeholder with Konva Stage**

Replace the center canvas div:

```typescript
{/* Center Canvas */}
<div className="flex items-center justify-center bg-muted/20 p-4">
  <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
    <Stage width={canvasSize.width} height={canvasSize.height}>
      <Layer>
        {backgroundUrl && <BackgroundImage url={backgroundUrl} />}
      </Layer>
    </Stage>
  </div>
</div>
```

**Step 5: Update BackgroundPicker button**

Replace "Select Background" button:

```typescript
<BackgroundPicker
  onSelect={(id, url) => {
    setBackgroundId(id);
    setBackgroundUrl(url);
  }}
/>
```

**Step 6: Test canvas renders background**

Run: Navigate to template designer, click "Select Background", pick image

Expected: Background image displays on Konva canvas

**Step 7: Commit**

```bash
git add apps/admin/src/components/cards/TemplateDesigner.tsx
git commit -m "feat: integrate Konva canvas with background picker"
```

---

## Phase 5: Text Field Creation & Manipulation

### Task 11: Add text field creation to TemplateDesigner

**Files:**
- Modify: `apps/admin/src/components/cards/TemplateDesigner.tsx`

**Step 1: Add text field state**

```typescript
import { Text, Transformer } from "react-konva";
import { useRef, useEffect } from "react";

interface TextField {
  id: string;
  dataField: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  align: string;
  stroke?: { color: string; width: number };
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number };
  letterSpacing: number;
  lineHeight: number;
  autoScale: boolean;
  text: string; // For preview
}

const [textFields, setTextFields] = useState<TextField[]>([]);
const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
```

**Step 2: Add handleAddTextField function**

```typescript
const handleAddTextField = () => {
  const newField: TextField = {
    id: `field_${Date.now()}`,
    dataField: "title",
    x: 100,
    y: 100,
    width: 300,
    height: 50,
    rotation: 0,
    fontFamily: "Arial",
    fontSize: 24,
    fontWeight: "normal",
    color: "#FFFFFF",
    align: "center",
    letterSpacing: 0,
    lineHeight: 1.2,
    autoScale: false,
    text: "Sample Text",
  };
  setTextFields([...textFields, newField]);
  setSelectedFieldId(newField.id);
};
```

**Step 3: Create DraggableText sub-component**

Add before return:

```typescript
function DraggableText({
  field,
  isSelected,
  onSelect,
  onChange,
}: {
  field: TextField;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (newAttrs: Partial<TextField>) => void;
}) {
  const textRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && trRef.current && textRef.current) {
      trRef.current.nodes([textRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Text
        ref={textRef}
        {...field}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={() => {
          const node = textRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          node.scaleX(1);
          node.scaleY(1);

          onChange({
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(node.height() * scaleY),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}
```

**Step 4: Add text layer to Stage**

Update Stage to include text fields:

```typescript
<Stage
  width={canvasSize.width}
  height={canvasSize.height}
  onMouseDown={(e) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedFieldId(null);
    }
  }}
>
  <Layer>
    {backgroundUrl && <BackgroundImage url={backgroundUrl} />}
    {textFields.map((field) => (
      <DraggableText
        key={field.id}
        field={field}
        isSelected={field.id === selectedFieldId}
        onSelect={() => setSelectedFieldId(field.id)}
        onChange={(newAttrs) => {
          setTextFields(
            textFields.map((f) =>
              f.id === field.id ? { ...f, ...newAttrs } : f
            )
          );
        }}
      />
    ))}
  </Layer>
</Stage>
```

**Step 5: Update "Add Text Field" button**

```typescript
<Button variant="outline" className="w-full" onClick={handleAddTextField}>
  Add Text Field
</Button>
```

**Step 6: Test text field creation**

Run: Click "Add Text Field", drag text, resize with transformer

Expected: Text field appears, can be dragged, resized, rotated

**Step 7: Commit**

```bash
git add apps/admin/src/components/cards/TemplateDesigner.tsx
git commit -m "feat: add draggable text fields with transformer"
```

---

## Phase 6: Text Styling Controls

### Task 12: Create TextFieldEditor component

**Files:**
- Create: `apps/admin/src/components/cards/TextFieldEditor.tsx`

**Step 1: Create comprehensive text editor**

```typescript
"use client";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AlignLeft, AlignCenter, AlignRight, Trash2 } from "lucide-react";

interface TextField {
  id: string;
  dataField: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  align: string;
  stroke?: { color: string; width: number };
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number };
  letterSpacing: number;
  lineHeight: number;
  autoScale: boolean;
}

interface TextFieldEditorProps {
  field: TextField;
  onChange: (updates: Partial<TextField>) => void;
  onDelete: () => void;
}

export default function TextFieldEditor({ field, onChange, onDelete }: TextFieldEditorProps) {
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Text Field Properties</h3>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {/* Data Field */}
      <div className="space-y-2">
        <Label>Data Field</Label>
        <Select value={field.dataField} onValueChange={(v) => onChange({ dataField: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="title">Title</SelectItem>
            <SelectItem value="effect">Effect/Flavor Text</SelectItem>
            <SelectItem value="cardType">Card Type</SelectItem>
            <SelectItem value="manaCost">Mana Cost</SelectItem>
            <SelectItem value="atk">ATK</SelectItem>
            <SelectItem value="def">DEF</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Font Family */}
      <div className="space-y-2">
        <Label>Font Family</Label>
        <Select value={field.fontFamily} onValueChange={(v) => onChange({ fontFamily: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Arial">Arial</SelectItem>
            <SelectItem value="Times New Roman">Times New Roman</SelectItem>
            <SelectItem value="Courier New">Courier New</SelectItem>
            <SelectItem value="Georgia">Georgia</SelectItem>
            <SelectItem value="Verdana">Verdana</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <Label>Font Size: {field.fontSize}px</Label>
        <Slider
          value={[field.fontSize]}
          onValueChange={([v]) => onChange({ fontSize: v })}
          min={8}
          max={72}
          step={1}
        />
      </div>

      {/* Color */}
      <div className="space-y-2">
        <Label>Color</Label>
        <Input
          type="color"
          value={field.color}
          onChange={(e) => onChange({ color: e.target.value })}
        />
      </div>

      {/* Weight */}
      <div className="space-y-2">
        <Label>Weight</Label>
        <Select value={field.fontWeight} onValueChange={(v) => onChange({ fontWeight: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="bold">Bold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alignment */}
      <div className="space-y-2">
        <Label>Alignment</Label>
        <div className="flex gap-2">
          <Button
            variant={field.align === "left" ? "default" : "outline"}
            size="sm"
            onClick={() => onChange({ align: "left" })}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={field.align === "center" ? "default" : "outline"}
            size="sm"
            onClick={() => onChange({ align: "center" })}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant={field.align === "right" ? "default" : "outline"}
            size="sm"
            onClick={() => onChange({ align: "right" })}
          >
            <AlignRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stroke */}
      <div className="space-y-2">
        <Label>Stroke</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={field.stroke?.color || "#000000"}
            onChange={(e) =>
              onChange({ stroke: { color: e.target.value, width: field.stroke?.width || 0 } })
            }
          />
          <Slider
            value={[field.stroke?.width || 0]}
            onValueChange={([v]) =>
              onChange({ stroke: { color: field.stroke?.color || "#000000", width: v } })
            }
            min={0}
            max={10}
            step={0.5}
            className="flex-1"
          />
        </div>
      </div>

      {/* Shadow */}
      <div className="space-y-2">
        <Label>Shadow</Label>
        <Input
          type="color"
          value={field.shadow?.color || "#000000"}
          onChange={(e) =>
            onChange({
              shadow: {
                color: e.target.value,
                blur: field.shadow?.blur || 0,
                offsetX: field.shadow?.offsetX || 0,
                offsetY: field.shadow?.offsetY || 0,
              },
            })
          }
        />
        <div className="space-y-1">
          <Label className="text-xs">Blur: {field.shadow?.blur || 0}</Label>
          <Slider
            value={[field.shadow?.blur || 0]}
            onValueChange={([v]) =>
              onChange({
                shadow: { ...field.shadow, blur: v, color: field.shadow?.color || "#000000" },
              })
            }
            min={0}
            max={20}
            step={1}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Offset X: {field.shadow?.offsetX || 0}</Label>
            <Slider
              value={[field.shadow?.offsetX || 0]}
              onValueChange={([v]) =>
                onChange({
                  shadow: { ...field.shadow, offsetX: v, color: field.shadow?.color || "#000000" },
                })
              }
              min={-20}
              max={20}
              step={1}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Offset Y: {field.shadow?.offsetY || 0}</Label>
            <Slider
              value={[field.shadow?.offsetY || 0]}
              onValueChange={([v]) =>
                onChange({
                  shadow: { ...field.shadow, offsetY: v, color: field.shadow?.color || "#000000" },
                })
              }
              min={-20}
              max={20}
              step={1}
            />
          </div>
        </div>
      </div>

      {/* Letter Spacing */}
      <div className="space-y-2">
        <Label>Letter Spacing: {field.letterSpacing}</Label>
        <Slider
          value={[field.letterSpacing]}
          onValueChange={([v]) => onChange({ letterSpacing: v })}
          min={-5}
          max={20}
          step={0.5}
        />
      </div>

      {/* Line Height */}
      <div className="space-y-2">
        <Label>Line Height: {field.lineHeight}</Label>
        <Slider
          value={[field.lineHeight]}
          onValueChange={([v]) => onChange({ lineHeight: v })}
          min={0.8}
          max={2.0}
          step={0.1}
        />
      </div>

      {/* Auto Scale */}
      <div className="flex items-center justify-between">
        <Label>Auto-scale to fit</Label>
        <Switch checked={field.autoScale} onCheckedChange={(v) => onChange({ autoScale: v })} />
      </div>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add apps/admin/src/components/cards/TextFieldEditor.tsx
git commit -m "feat: create text field editor with full styling controls"
```

---

### Task 13: Integrate TextFieldEditor into TemplateDesigner

**Files:**
- Modify: `apps/admin/src/components/cards/TemplateDesigner.tsx`

**Step 1: Import TextFieldEditor**

```typescript
import TextFieldEditor from "./TextFieldEditor";
```

**Step 2: Update left panel to show editor when field selected**

Replace left panel content:

```typescript
{/* Left Panel */}
<div className="space-y-4 overflow-y-auto">
  <Card className="p-4 space-y-4">
    <div>
      <label className="text-sm font-medium">Card Type</label>
      <Select value={cardType} onValueChange={(v) => setCardType(v as CardType)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="creature">Creature</SelectItem>
          <SelectItem value="spell">Spell</SelectItem>
          <SelectItem value="trap">Trap</SelectItem>
          <SelectItem value="magic">Magic</SelectItem>
          <SelectItem value="environment">Environment</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <BackgroundPicker
      onSelect={(id, url) => {
        setBackgroundId(id);
        setBackgroundUrl(url);
      }}
    />

    <Button variant="outline" className="w-full" onClick={handleAddTextField}>
      Add Text Field
    </Button>
  </Card>

  {selectedFieldId && (
    <TextFieldEditor
      field={textFields.find((f) => f.id === selectedFieldId)!}
      onChange={(updates) => {
        setTextFields(
          textFields.map((f) => (f.id === selectedFieldId ? { ...f, ...updates } : f))
        );
      }}
      onDelete={() => {
        setTextFields(textFields.filter((f) => f.id !== selectedFieldId));
        setSelectedFieldId(null);
      }}
    />
  )}
</div>
```

**Step 3: Test styling controls**

Run: Add text field, select it, adjust font size/color/stroke/shadow

Expected: Text updates in real-time on canvas

**Step 4: Commit**

```bash
git add apps/admin/src/components/cards/TemplateDesigner.tsx
git commit -m "feat: integrate text field editor into designer"
```

---

## Phase 7: Card Data Preview & Save Template

### Task 14: Create CardDataPanel component

**Files:**
- Create: `apps/admin/src/components/cards/CardDataPanel.tsx`

**Step 1: Create card data display with copy buttons**

```typescript
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useQuery } from "convex/react";
import { apiAny } from "@/lib/convexHelpers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CardData {
  _id: string;
  name: string;
  cardType: string;
  cost: number;
  attack?: number;
  defense?: number;
  effect?: string;
  flavorText?: string;
}

interface CardDataPanelProps {
  cardType: string;
  onCardSelect: (card: CardData) => void;
}

export default function CardDataPanel({ cardType, onCardSelect }: CardDataPanelProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const cards = useQuery(apiAny.cardDefinitions.list);
  const filteredCards = cards?.filter((c: any) => c.cardType === cardType) || [];

  const selectedCard = filteredCards.find((c: any) => c._id === selectedCardId);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCardChange = (cardId: string) => {
    setSelectedCardId(cardId);
    const card = filteredCards.find((c: any) => c._id === cardId);
    if (card) {
      onCardSelect(card);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Card Data Reference</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedCardId || ""} onValueChange={handleCardChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a card" />
          </SelectTrigger>
          <SelectContent>
            {filteredCards.map((card: any) => (
              <SelectItem key={card._id} value={card._id}>
                {card.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedCard && (
          <div className="space-y-3">
            <DataField
              label="Title"
              value={selectedCard.name}
              onCopy={() => copyToClipboard(selectedCard.name, "title")}
              copied={copiedField === "title"}
            />
            <DataField
              label="Card Type"
              value={selectedCard.cardType}
              onCopy={() => copyToClipboard(selectedCard.cardType, "cardType")}
              copied={copiedField === "cardType"}
            />
            <DataField
              label="Mana Cost"
              value={String(selectedCard.cost)}
              onCopy={() => copyToClipboard(String(selectedCard.cost), "manaCost")}
              copied={copiedField === "manaCost"}
            />
            {selectedCard.attack !== undefined && (
              <DataField
                label="ATK"
                value={String(selectedCard.attack)}
                onCopy={() => copyToClipboard(String(selectedCard.attack), "atk")}
                copied={copiedField === "atk"}
              />
            )}
            {selectedCard.defense !== undefined && (
              <DataField
                label="DEF"
                value={String(selectedCard.defense)}
                onCopy={() => copyToClipboard(String(selectedCard.defense), "def")}
                copied={copiedField === "def"}
              />
            )}
            {(selectedCard.effect || selectedCard.flavorText) && (
              <DataField
                label="Effect"
                value={selectedCard.effect || selectedCard.flavorText || ""}
                onCopy={() =>
                  copyToClipboard(selectedCard.effect || selectedCard.flavorText || "", "effect")
                }
                copied={copiedField === "effect"}
                multiline
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DataField({
  label,
  value,
  onCopy,
  copied,
  multiline,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Button variant="ghost" size="sm" onClick={onCopy} className="h-6 w-6 p-0">
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <div className={`text-sm ${multiline ? "max-h-24 overflow-y-auto" : ""}`}>{value}</div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/admin/src/components/cards/CardDataPanel.tsx
git commit -m "feat: create card data panel with copy buttons"
```

---

### Task 15: Integrate live preview with card data

**Files:**
- Modify: `apps/admin/src/components/cards/TemplateDesigner.tsx`

**Step 1: Import CardDataPanel**

```typescript
import CardDataPanel from "./CardDataPanel";
```

**Step 2: Add preview card state**

```typescript
const [previewCard, setPreviewCard] = useState<any>(null);
```

**Step 3: Update text fields when preview card changes**

Add effect to populate text field preview:

```typescript
useEffect(() => {
  if (previewCard) {
    setTextFields(
      textFields.map((field) => {
        let text = "Sample Text";
        switch (field.dataField) {
          case "title":
            text = previewCard.name;
            break;
          case "cardType":
            text = previewCard.cardType;
            break;
          case "manaCost":
            text = String(previewCard.cost);
            break;
          case "atk":
            text = String(previewCard.attack || "");
            break;
          case "def":
            text = String(previewCard.defense || "");
            break;
          case "effect":
            text = previewCard.effect || previewCard.flavorText || "";
            break;
        }
        return { ...field, text };
      })
    );
  }
}, [previewCard]);
```

**Step 4: Update right panel with CardDataPanel**

Replace right panel content:

```typescript
{/* Right Panel */}
<div className="space-y-4 overflow-y-auto">
  <CardDataPanel cardType={cardType} onCardSelect={setPreviewCard} />

  <Card className="p-4">
    <h3 className="font-semibold mb-2">Actions</h3>
    <div className="space-y-2">
      <Button className="w-full">Save Template</Button>
    </div>
  </Card>
</div>
```

**Step 5: Test live preview**

Run: Select a card from dropdown, verify text fields update with card data

Expected: Text on canvas shows actual card values

**Step 6: Commit**

```bash
git add apps/admin/src/components/cards/TemplateDesigner.tsx
git commit -m "feat: integrate live preview with card data"
```

---

### Task 16: Implement save template functionality

**Files:**
- Modify: `apps/admin/src/components/cards/TemplateDesigner.tsx`

**Step 1: Import Convex mutation**

```typescript
import { useMutation } from "convex/react";
```

**Step 2: Add save mutation**

```typescript
const saveTemplate = useMutation(apiAny.cardTypeTemplates.upsert);
```

**Step 3: Add handleSaveTemplate function**

```typescript
const handleSaveTemplate = async () => {
  if (!backgroundId) {
    alert("Please select a background first");
    return;
  }

  try {
    await saveTemplate({
      cardType,
      name: `${cardType.charAt(0).toUpperCase() + cardType.slice(1)} Template`,
      backgroundId,
      canvasWidth: canvasSize.width,
      canvasHeight: canvasSize.height,
      textFields: textFields.map(({ text, ...field }) => field), // Remove preview text
    });
    alert("Template saved successfully!");
  } catch (error) {
    console.error("Failed to save template:", error);
    alert("Failed to save template");
  }
};
```

**Step 4: Wire up Save button**

```typescript
<Button className="w-full" onClick={handleSaveTemplate}>
  Save Template
</Button>
```

**Step 5: Test save functionality**

Run: Create template, click Save, verify data in Convex dashboard

Expected: Template appears in cardTypeTemplates table

**Step 6: Commit**

```bash
git add apps/admin/src/components/cards/TemplateDesigner.tsx
git commit -m "feat: implement save template functionality"
```

---

## Phase 8: Batch Rendering & Export

(Continuing in next message due to length constraints - this plan is already comprehensive with 16 detailed tasks covering Phases 1-7. Would you like me to continue with Phases 8-9 for batch rendering and export?)

---

**Total Tasks: 16+ (more in remaining phases)**
**Estimated Time: Multiple sessions**
**Dependencies: @vercel/blob, sharp, jszip, react-konva, konva, use-image**
