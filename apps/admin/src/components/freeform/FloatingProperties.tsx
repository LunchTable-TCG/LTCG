"use client";

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
import type { FreeformElement, ElementId } from "./types";
import { FONT_FAMILIES, FONT_SIZES } from "./types";

interface FloatingPropertiesProps {
  element: FreeformElement;
  onUpdate: (id: ElementId, updates: Record<string, unknown>) => void;
}

export function FloatingProperties({ element, onUpdate }: FloatingPropertiesProps) {
  const update = (key: string, value: unknown) => {
    onUpdate(element._id, { [key]: value });
  };

  return (
    <div className="absolute right-4 top-16 z-50 w-56 bg-card/95 backdrop-blur border border-border rounded-lg p-3 shadow-lg space-y-3 max-h-[calc(100vh-8rem)] overflow-y-auto">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {element.type === "image" ? "Image" : "Text"} Properties
      </div>

      {/* Position */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">X</Label>
          <Input
            type="number"
            value={Math.round(element.x)}
            onChange={(e) => update("x", Number(e.target.value))}
            className="h-7 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Y</Label>
          <Input
            type="number"
            value={Math.round(element.y)}
            onChange={(e) => update("y", Number(e.target.value))}
            className="h-7 text-xs"
          />
        </div>
      </div>

      {/* Size */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">W</Label>
          <Input
            type="number"
            value={Math.round(element.width)}
            onChange={(e) => update("width", Number(e.target.value))}
            className="h-7 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">H</Label>
          <Input
            type="number"
            value={Math.round(element.height)}
            onChange={(e) => update("height", Number(e.target.value))}
            className="h-7 text-xs"
          />
        </div>
      </div>

      {/* Rotation */}
      <div>
        <Label className="text-xs">Rotation</Label>
        <Input
          type="number"
          value={Math.round(element.rotation)}
          onChange={(e) => update("rotation", Number(e.target.value))}
          className="h-7 text-xs"
          min={-360}
          max={360}
        />
      </div>

      {/* Opacity */}
      <div>
        <Label className="text-xs">Opacity</Label>
        <div className="flex items-center gap-2">
          <Slider
            value={[element.opacity * 100]}
            onValueChange={([v]) => update("opacity", v / 100)}
            min={0}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-8 text-right">
            {Math.round(element.opacity * 100)}%
          </span>
        </div>
      </div>

      {/* Text-specific properties */}
      {element.type === "text" && (
        <>
          <div className="border-t border-border pt-3 mt-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Typography
            </div>
          </div>

          {/* Font Family */}
          <div>
            <Label className="text-xs">Font</Label>
            <Select
              value={element.fontFamily || "Arial"}
              onValueChange={(v) => update("fontFamily", v)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map((font) => (
                  <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font Size */}
          <div>
            <Label className="text-xs">Size</Label>
            <Select
              value={String(element.fontSize || 24)}
              onValueChange={(v) => update("fontSize", Number(v))}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}px
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font Weight & Style */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Weight</Label>
              <Select
                value={element.fontWeight || "normal"}
                onValueChange={(v) => update("fontWeight", v)}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Style</Label>
              <Select
                value={element.fontStyle || "normal"}
                onValueChange={(v) => update("fontStyle", v)}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="italic">Italic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Text Color */}
          <div>
            <Label className="text-xs">Color</Label>
            <div className="flex gap-1.5">
              <Input
                type="color"
                value={element.fill || "#ffffff"}
                onChange={(e) => update("fill", e.target.value)}
                className="h-7 w-9 p-0.5 cursor-pointer"
              />
              <Input
                value={element.fill || "#ffffff"}
                onChange={(e) => update("fill", e.target.value)}
                className="h-7 text-xs flex-1"
              />
            </div>
          </div>

          {/* Text Align */}
          <div>
            <Label className="text-xs">Align</Label>
            <Select
              value={element.align || "left"}
              onValueChange={(v) => update("align", v)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}
