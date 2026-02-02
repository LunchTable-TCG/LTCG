# Admin Asset Manager Design

Upload and manage Vercel Blob assets from the admin UI.

## Overview

Add a dedicated `/assets` page to the admin app for uploading, browsing, and managing files in Vercel Blob storage. Assets are labeled with categories matching the existing asset types used in the web app.

## Data Model

Extend the existing `fileMetadata` table in `convex/schema.ts`:

```typescript
fileMetadata: defineTable({
  userId: v.id("users"),
  storageId: v.string(),
  fileName: v.string(),
  contentType: v.string(),
  size: v.number(),
  category: v.union(
    // Existing
    v.literal("profile_picture"),
    v.literal("card_image"),
    v.literal("document"),
    v.literal("other"),
    // New asset categories
    v.literal("background"),
    v.literal("texture"),
    v.literal("ui_element"),
    v.literal("shop_asset"),
    v.literal("story_asset"),
    v.literal("logo"),
  ),
  // New fields
  blobUrl: v.optional(v.string()),
  blobPathname: v.optional(v.string()),
  description: v.optional(v.string()),
  uploadedAt: v.number(),
})
```

## Backend API

### Convex Functions (`convex/admin/assets.ts`)

1. **`getUploadUrl`** (action)
   - Generates presigned upload URL via web app API
   - Args: `{ fileName, contentType, category, description? }`
   - Returns: `{ uploadUrl, blobPathname }`

2. **`saveAssetMetadata`** (mutation)
   - Saves metadata after successful upload
   - Args: `{ fileName, contentType, size, category, description?, blobUrl, blobPathname }`

3. **`listAssets`** (query)
   - Paginated list with filters
   - Args: `{ category?, search?, limit?, cursor? }`
   - Returns: `{ assets, nextCursor, totalCount }`

4. **`deleteAsset`** (mutation)
   - Removes from Blob storage and metadata
   - Args: `{ assetId }`

5. **`updateAsset`** (mutation)
   - Update category/description
   - Args: `{ assetId, category?, description? }`

### Web App API Route (`apps/web/app/api/admin/upload/route.ts`)

- POST: Generate Vercel Blob presigned upload URL
- DELETE: Delete file from Vercel Blob
- Validates admin status via Convex

### Upload Flow

1. Admin selects file in UI
2. UI calls `getUploadUrl` action
3. Action calls web app API to get presigned URL
4. Browser uploads directly to Vercel Blob
5. On success, UI calls `saveAssetMetadata` mutation

## Admin UI

### Page Layout (`apps/admin/src/app/assets/page.tsx`)

```
┌─────────────────────────────────────────────────────────────┐
│ Assets                                          [Upload]    │
├─────────────────────────────────────────────────────────────┤
│ [All ▼] [Search...                    ] [Grid │ List]      │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │  thumb   │ │  thumb   │ │  thumb   │ │  thumb   │        │
│ │          │ │          │ │          │ │          │        │
│ ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤        │
│ │ name.png │ │ bg.jpg   │ │ logo.svg │ │ pack.png │        │
│ │ [badge]  │ │ [badge]  │ │ [badge]  │ │ [badge]  │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                             │
│ ← 1 2 3 ... →                                              │
└─────────────────────────────────────────────────────────────┘
```

### Components

1. **UploadDialog** - Drag-drop zone, file picker, category dropdown, description field
2. **AssetGrid** - Grid/list view of assets with thumbnails
3. **AssetCard** - Individual asset card with preview, name, category badge
4. **AssetDetailSheet** - Side panel for full preview, edit, copy URL, delete
5. **CategoryBadge** - Styled badge for category display

### Permissions

Requires `admin` or `superadmin` role.

## File Structure

### New Files

```
convex/admin/assets.ts
apps/web/app/api/admin/upload/route.ts
apps/admin/src/app/assets/page.tsx
apps/admin/src/components/assets/AssetGrid.tsx
apps/admin/src/components/assets/AssetCard.tsx
apps/admin/src/components/assets/UploadDialog.tsx
apps/admin/src/components/assets/AssetDetailSheet.tsx
apps/admin/src/components/assets/CategoryBadge.tsx
```

### Modified Files

```
convex/schema.ts
apps/admin/src/components/layout/AdminSidebar.tsx
```

## Implementation Order

1. Schema changes (extend fileMetadata categories and fields)
2. Convex backend functions (assets.ts)
3. Web app API route (presigned URL generation)
4. Admin UI components
5. Add Assets link to sidebar navigation
