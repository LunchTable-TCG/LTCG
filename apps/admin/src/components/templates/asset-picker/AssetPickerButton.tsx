"use client";

/**
 * Asset Picker Button
 *
 * A button that opens the asset picker dialog.
 * Can show a preview of the currently selected asset.
 */

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Image, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { AssetPickerDialog } from "./AssetPickerDialog";

type AssetCategory =
  | "all"
  | "profile_picture"
  | "card_image"
  | "document"
  | "other"
  | "background"
  | "texture"
  | "ui_element"
  | "shop_asset"
  | "story_asset"
  | "logo";

interface AssetPickerButtonProps {
  /** Currently selected asset URL */
  value?: string;
  /** Callback when an asset is selected */
  onChange: (url: string | undefined) => void;
  /** Optional dialog title */
  dialogTitle?: string;
  /** Filter to specific categories */
  allowedCategories?: AssetCategory[];
  /** Button label when no asset is selected */
  placeholder?: string;
  /** Additional class names */
  className?: string;
  /** Show preview thumbnail */
  showPreview?: boolean;
  /** Variant of the button */
  variant?: "default" | "outline" | "ghost" | "thumbnail";
  /** Whether the picker is disabled */
  disabled?: boolean;
}

export function AssetPickerButton({
  value,
  onChange,
  dialogTitle = "Select Asset",
  allowedCategories,
  placeholder = "Select image",
  className,
  showPreview = true,
  variant = "outline",
  disabled = false,
}: AssetPickerButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSelect = useCallback(
    (asset: { url: string; id: string; name: string }) => {
      onChange(asset.url);
    },
    [onChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(undefined);
    },
    [onChange]
  );

  // Thumbnail variant - shows just the image with edit overlay
  if (variant === "thumbnail") {
    return (
      <>
        <button
          type="button"
          onClick={() => !disabled && setDialogOpen(true)}
          disabled={disabled}
          className={cn(
            "group relative aspect-square rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
        >
          {value ? (
            <>
              <img src={value} alt="Selected" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDialogOpen(true);
                  }}
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="destructive" className="h-8 w-8" onClick={handleClear}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
              <Image className="h-8 w-8 mb-1" />
              <span className="text-xs">Add Image</span>
            </div>
          )}
        </button>

        <AssetPickerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSelect={handleSelect}
          title={dialogTitle}
          allowedCategories={allowedCategories}
        />
      </>
    );
  }

  // Standard button variants
  return (
    <>
      <div className={cn("flex items-center gap-2", className)}>
        {showPreview && value && (
          <div className="relative w-10 h-10 rounded border overflow-hidden flex-shrink-0">
            <img src={value} alt="Selected" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="absolute top-0 right-0 p-0.5 bg-destructive text-destructive-foreground rounded-bl"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <Button
          type="button"
          variant={variant}
          onClick={() => setDialogOpen(true)}
          disabled={disabled}
          className={cn(!showPreview && "flex-1")}
        >
          <Image className="h-4 w-4 mr-2" />
          {value ? "Change" : placeholder}
        </Button>
      </div>

      <AssetPickerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSelect={handleSelect}
        title={dialogTitle}
        allowedCategories={allowedCategories}
      />
    </>
  );
}
