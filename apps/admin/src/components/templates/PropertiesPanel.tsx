"use client";

/**
 * PropertiesPanel Component
 *
 * Right sidebar for editing selected block properties.
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Move,
  Palette,
  Type,
  Image,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FONT_FAMILIES,
  type CardTemplateBlock,
  type ImageFit,
  isImageBlockType,
} from "./types";
import { AssetPickerButton } from "./asset-picker";

interface PropertiesPanelProps {
  block: CardTemplateBlock | null;
  onChange: (updates: Partial<CardTemplateBlock>) => void;
}

export function PropertiesPanel({ block, onChange }: PropertiesPanelProps) {
  if (!block) {
    return (
      <div className="w-80 border-l bg-card flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-sm">Properties</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-4">
          <div className="text-center">
            <Move className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Select a block to edit</p>
            <p className="text-xs mt-1">Click on a text block in the canvas</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-l bg-card flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">Properties</h3>
        <p className="text-xs text-muted-foreground capitalize">
          {block.blockType} block
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Label */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Label</Label>
            <Input
              value={block.label}
              onChange={(e) => onChange({ label: e.target.value })}
              placeholder="Block label"
            />
          </div>

          {/* Custom Content (for custom blocks) */}
          {block.blockType === "custom" && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Content
              </Label>
              <Textarea
                value={block.customContent || ""}
                onChange={(e) => onChange({ customContent: e.target.value })}
                placeholder="Custom text content"
                rows={3}
              />
            </div>
          )}

          <Separator />

          {/* Position */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Move className="h-3 w-3" />
              Position (%)
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">X</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={block.x}
                  onChange={(e) => onChange({ x: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Y</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={block.y}
                  onChange={(e) => onChange({ y: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Width</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  step={0.5}
                  value={block.width}
                  onChange={(e) => onChange({ width: parseFloat(e.target.value) || 10 })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Height</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  step={0.5}
                  value={block.height}
                  onChange={(e) => onChange({ height: parseFloat(e.target.value) || 5 })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Image Properties (for image blocks only) */}
          {isImageBlockType(block.blockType) && (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Image className="h-3 w-3" />
                  Image
                </div>

                {/* Image Source */}
                <div className="space-y-2">
                  <Label className="text-xs">Image Source</Label>
                  <AssetPickerButton
                    value={block.imageUrl}
                    onChange={(url) => onChange({ imageUrl: url })}
                    dialogTitle="Select Image"
                    allowedCategories={["ui_element", "texture", "background", "logo", "other"]}
                    showPreview
                    variant="outline"
                  />
                </div>

                {/* Image Fit */}
                <div className="space-y-1">
                  <Label className="text-xs">Image Fit</Label>
                  <Select
                    value={block.imageFit ?? "contain"}
                    onValueChange={(v) => onChange({ imageFit: v as ImageFit })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fill">Fill (stretch)</SelectItem>
                      <SelectItem value="contain">Contain (fit inside)</SelectItem>
                      <SelectItem value="cover">Cover (may crop)</SelectItem>
                      <SelectItem value="none">None (original size)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Opacity */}
                <div className="space-y-1">
                  <Label className="text-xs">Opacity</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[(block.opacity ?? 1) * 100]}
                      onValueChange={([v]) => v !== undefined && onChange({ opacity: v / 100 })}
                      min={0}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      {Math.round((block.opacity ?? 1) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Rotation */}
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <RotateCw className="h-3 w-3" />
                    Rotation
                  </Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[block.rotation ?? 0]}
                      onValueChange={([v]) => v !== undefined && onChange({ rotation: v })}
                      min={-180}
                      max={180}
                      step={1}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min={-360}
                      max={360}
                      value={block.rotation ?? 0}
                      onChange={(e) =>
                        onChange({ rotation: parseInt(e.target.value) || 0 })
                      }
                      className="w-16"
                    />
                  </div>
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Typography (for text blocks only) */}
          {!isImageBlockType(block.blockType) && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Type className="h-3 w-3" />
              Typography
            </div>

            {/* Font Family */}
            <div className="space-y-1">
              <Label className="text-xs">Font Family</Label>
              <Select
                value={block.fontFamily}
                onValueChange={(v) => onChange({ fontFamily: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILIES.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Font Size */}
            <div className="space-y-1">
              <Label className="text-xs">Font Size</Label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[block.fontSize]}
                  onValueChange={([v]) => v !== undefined && onChange({ fontSize: v })}
                  min={8}
                  max={48}
                  step={1}
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={8}
                  max={72}
                  value={block.fontSize}
                  onChange={(e) =>
                    onChange({ fontSize: parseInt(e.target.value) || 12 })
                  }
                  className="w-16"
                />
              </div>
            </div>

            {/* Font Style */}
            <div className="space-y-1">
              <Label className="text-xs">Style</Label>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={block.fontWeight === "bold" ? "default" : "outline"}
                  onClick={() =>
                    onChange({
                      fontWeight: block.fontWeight === "bold" ? "normal" : "bold",
                    })
                  }
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={block.fontStyle === "italic" ? "default" : "outline"}
                  onClick={() =>
                    onChange({
                      fontStyle: block.fontStyle === "italic" ? "normal" : "italic",
                    })
                  }
                >
                  <Italic className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Text Align */}
            <div className="space-y-1">
              <Label className="text-xs">Alignment</Label>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={block.textAlign === "left" ? "default" : "outline"}
                  onClick={() => onChange({ textAlign: "left" })}
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={block.textAlign === "center" ? "default" : "outline"}
                  onClick={() => onChange({ textAlign: "center" })}
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={block.textAlign === "right" ? "default" : "outline"}
                  onClick={() => onChange({ textAlign: "right" })}
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          )}

          <Separator />

          {/* Colors */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Palette className="h-3 w-3" />
              Colors
            </div>

            {/* Text Color (for text blocks only) */}
            {!isImageBlockType(block.blockType) && (
              <div className="space-y-1">
                <Label className="text-xs">Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={block.color}
                    onChange={(e) => onChange({ color: e.target.value })}
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    value={block.color}
                    onChange={(e) => onChange({ color: e.target.value })}
                    placeholder="#FFFFFF"
                    className="flex-1"
                  />
                </div>
              </div>
            )}

            {/* Background Color */}
            <div className="space-y-1">
              <Label className="text-xs">Background Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={block.backgroundColor || "#000000"}
                  onChange={(e) => onChange({ backgroundColor: e.target.value })}
                  className="w-12 h-9 p-1 cursor-pointer"
                />
                <Input
                  value={block.backgroundColor || ""}
                  onChange={(e) =>
                    onChange({ backgroundColor: e.target.value || undefined })
                  }
                  placeholder="None"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Border */}
          <div className="space-y-4">
            <Label className="text-xs font-medium text-muted-foreground">Border</Label>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Width</Label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={block.borderWidth || 0}
                  onChange={(e) =>
                    onChange({
                      borderWidth: parseInt(e.target.value) || undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Radius</Label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={block.borderRadius || 0}
                  onChange={(e) =>
                    onChange({
                      borderRadius: parseInt(e.target.value) || undefined,
                    })
                  }
                />
              </div>
            </div>

            {/* Border Color */}
            <div className="space-y-1">
              <Label className="text-xs">Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={block.borderColor || "#000000"}
                  onChange={(e) => onChange({ borderColor: e.target.value })}
                  className="w-12 h-9 p-1 cursor-pointer"
                />
                <Input
                  value={block.borderColor || ""}
                  onChange={(e) =>
                    onChange({ borderColor: e.target.value || undefined })
                  }
                  placeholder="None"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Padding */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Padding (px)
            </Label>
            <Slider
              value={[block.padding || 0]}
              onValueChange={([v]) => v !== undefined && onChange({ padding: v || undefined })}
              min={0}
              max={20}
              step={1}
            />
            <div className="text-xs text-muted-foreground text-right">
              {block.padding || 0}px
            </div>
          </div>

          {/* Z-Index */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Layer Order
            </Label>
            <Input
              type="number"
              min={0}
              value={block.zIndex}
              onChange={(e) => onChange({ zIndex: parseInt(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground">
              Higher values appear on top
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
