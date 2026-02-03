"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2Icon, PlusIcon, Trash2Icon, PaletteIcon, TypeIcon, MicIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { GuidelinesModalProps, ColorSpec, FontSpec, BrandVoice } from "./types";
import { BRANDING_SECTIONS, BRAND_VOICE_TONES } from "./types";

export function GuidelinesModal({
  isOpen,
  onClose,
  guidelines,
  onSave,
}: GuidelinesModalProps) {
  const [activeTab, setActiveTab] = useState("global");
  const [isSaving, setIsSaving] = useState(false);

  // Local state for current tab's data
  const [colors, setColors] = useState<ColorSpec[]>([]);
  const [fonts, setFonts] = useState<FontSpec[]>([]);
  const [brandVoice, setBrandVoice] = useState<BrandVoice>({
    tone: "Epic & Mythical",
    formality: 5,
    keywords: [],
    avoid: [],
  });
  const [richText, setRichText] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Load data when tab changes
  useEffect(() => {
    const currentGuideline = guidelines.find((g) => g.section === activeTab);
    if (currentGuideline) {
      setColors(currentGuideline.structuredData.colors || []);
      setFonts(currentGuideline.structuredData.fonts || []);
      setBrandVoice(
        currentGuideline.structuredData.brandVoice || {
          tone: "Epic & Mythical",
          formality: 5,
          keywords: [],
          avoid: [],
        }
      );
      setRichText(currentGuideline.richTextContent || "");
    } else {
      // Defaults for new section
      setColors([]);
      setFonts([]);
      setBrandVoice({ tone: "Epic & Mythical", formality: 5, keywords: [], avoid: [] });
      setRichText("");
    }
    setHasChanges(false);
  }, [activeTab, guidelines]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(activeTab, {
        structuredData: {
          colors,
          fonts,
          brandVoice,
        },
        richTextContent: richText,
      });
      setHasChanges(false);
      toast.success("Guidelines saved");
    } catch (error) {
      toast.error("Failed to save guidelines");
    } finally {
      setIsSaving(false);
    }
  };

  // Color management
  const addColor = () => {
    setColors([...colors, { name: "", hex: "#000000", usage: "" }]);
    setHasChanges(true);
  };

  const updateColor = (index: number, updates: Partial<ColorSpec>) => {
    setColors((prev) =>
      prev.map((color, i) => (i === index ? { ...color, ...updates } : color))
    );
    setHasChanges(true);
  };

  const removeColor = (index: number) => {
    setColors(colors.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  // Font management
  const addFont = () => {
    setFonts([...fonts, { name: "", weights: [400], usage: "" }]);
    setHasChanges(true);
  };

  const updateFont = (index: number, updates: Partial<FontSpec>) => {
    setFonts((prev) =>
      prev.map((font, i) => (i === index ? { ...font, ...updates } : font))
    );
    setHasChanges(true);
  };

  const removeFont = (index: number) => {
    setFonts(fonts.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const tabs = [
    { value: "global", label: "Global" },
    ...BRANDING_SECTIONS.map((s) => ({ value: s.name, label: s.name })),
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Brand Guidelines
            {hasChanges && (
              <Badge variant="outline" className="text-amber-600">
                Unsaved
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Define brand specs and guidelines that AI will use when generating content
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="flex-wrap h-auto gap-1 justify-start">
            {tabs.slice(0, 5).map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                {tab.label}
              </TabsTrigger>
            ))}
            <Select
              value={tabs.slice(5).some((t) => t.value === activeTab) ? activeTab : ""}
              onValueChange={(v) => v && setActiveTab(v)}
            >
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="More sections..." />
              </SelectTrigger>
              <SelectContent>
                {tabs.slice(5).map((tab) => (
                  <SelectItem key={tab.value} value={tab.value} className="text-xs">
                    {tab.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TabsList>

          <div className="flex-1 overflow-auto py-4">
            <TabsContent value={activeTab} className="mt-0 space-y-6">
              {/* Only show structured data for global tab */}
              {activeTab === "global" && (
                <>
                  {/* Colors Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <PaletteIcon className="h-4 w-4" />
                        Brand Colors
                      </Label>
                      <Button variant="outline" size="sm" onClick={addColor}>
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Add Color
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {colors.map((color, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={color.hex}
                            onChange={(e) =>
                              updateColor(index, { hex: e.target.value })
                            }
                            className="w-12 h-9 p-1 cursor-pointer"
                          />
                          <Input
                            placeholder="Color name"
                            value={color.name}
                            onChange={(e) =>
                              updateColor(index, { name: e.target.value })
                            }
                            className="w-32"
                          />
                          <Input
                            placeholder="Hex code"
                            value={color.hex}
                            onChange={(e) =>
                              updateColor(index, { hex: e.target.value })
                            }
                            className="w-24 font-mono text-xs"
                          />
                          <Input
                            placeholder="Usage (e.g., Primary background)"
                            value={color.usage || ""}
                            onChange={(e) =>
                              updateColor(index, { usage: e.target.value })
                            }
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeColor(index)}
                          >
                            <Trash2Icon className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      {colors.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No colors defined. Add brand colors for AI to reference.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Fonts Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <TypeIcon className="h-4 w-4" />
                        Typography
                      </Label>
                      <Button variant="outline" size="sm" onClick={addFont}>
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Add Font
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {fonts.map((font, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            placeholder="Font name"
                            value={font.name}
                            onChange={(e) =>
                              updateFont(index, { name: e.target.value })
                            }
                            className="w-40"
                          />
                          <Input
                            placeholder="Weights (comma-separated)"
                            value={font.weights.join(", ")}
                            onChange={(e) =>
                              updateFont(index, {
                                weights: e.target.value
                                  .split(",")
                                  .map((w) => parseInt(w.trim()))
                                  .filter((w) => !isNaN(w)),
                              })
                            }
                            className="w-32 text-xs"
                          />
                          <Input
                            placeholder="Usage (e.g., Headings)"
                            value={font.usage || ""}
                            onChange={(e) =>
                              updateFont(index, { usage: e.target.value })
                            }
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFont(index)}
                          >
                            <Trash2Icon className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      {fonts.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No fonts defined. Add typography specs for AI reference.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Brand Voice Section */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <MicIcon className="h-4 w-4" />
                      Brand Voice
                    </Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Tone</Label>
                        <Select
                          value={brandVoice.tone}
                          onValueChange={(v) => {
                            setBrandVoice({ ...brandVoice, tone: v });
                            setHasChanges(true);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BRAND_VOICE_TONES.map((tone) => (
                              <SelectItem key={tone} value={tone}>
                                {tone}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">
                          Formality ({brandVoice.formality}/10)
                        </Label>
                        <Slider
                          value={[brandVoice.formality]}
                          onValueChange={(values) => {
                            setBrandVoice({ ...brandVoice, formality: values[0] ?? 5 });
                            setHasChanges(true);
                          }}
                          min={1}
                          max={10}
                          step={1}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Casual</span>
                          <span>Formal</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Keywords to use</Label>
                        <Input
                          placeholder="legendary, epic, glory (comma-separated)"
                          value={brandVoice.keywords?.join(", ") || ""}
                          onChange={(e) => {
                            setBrandVoice({
                              ...brandVoice,
                              keywords: e.target.value
                                .split(",")
                                .map((k) => k.trim())
                                .filter(Boolean),
                            });
                            setHasChanges(true);
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Words to avoid</Label>
                        <Input
                          placeholder="corporate, boring (comma-separated)"
                          value={brandVoice.avoid?.join(", ") || ""}
                          onChange={(e) => {
                            setBrandVoice({
                              ...brandVoice,
                              avoid: e.target.value
                                .split(",")
                                .map((k) => k.trim())
                                .filter(Boolean),
                            });
                            setHasChanges(true);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Rich Text Guidelines (for all tabs) */}
              <div className="space-y-2">
                <Label>
                  {activeTab === "global"
                    ? "Detailed Guidelines (Markdown)"
                    : `${activeTab} Guidelines (Markdown)`}
                </Label>
                <Textarea
                  value={richText}
                  onChange={(e) => {
                    setRichText(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder={`Write detailed ${activeTab === "global" ? "brand" : activeTab.toLowerCase()} guidelines here...

Use markdown formatting:
# Headings
- Bullet points
**Bold** and *italic* text`}
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  These guidelines are embedded in AI prompts for creative tasks.
                </p>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? (
              <>
                <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Guidelines"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
