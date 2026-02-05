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
