"use client";

/**
 * AI Dashboard Generator Component
 *
 * Allows admins to generate custom dashboards using AI.
 * Renders the generated dashboards using the json-render catalog.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DASHBOARD_PRESETS,
  type DashboardPreset,
  type DashboardSchema,
  useAIDashboard,
} from "@/lib/json-render/useAIDashboard";
import { AlertCircle, Loader2, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { JsonView } from "./JsonView";

// =============================================================================
// TYPES
// =============================================================================

interface AIDashboardGeneratorProps {
  /** Callback when a dashboard is generated */
  onGenerated?: (schema: DashboardSchema, title: string) => void;
  /** Initial prompt */
  initialPrompt?: string;
  /** Show the rendered preview */
  showPreview?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AIDashboardGenerator({
  onGenerated,
  initialPrompt = "",
  showPreview = true,
}: AIDashboardGeneratorProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const { generateDashboard, isGenerating, error, lastGenerated } = useAIDashboard();

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    try {
      const result = await generateDashboard(prompt);
      toast.success("Dashboard generated successfully!");
      onGenerated?.(result.schema, result.title);
    } catch (err) {
      toast.error("Failed to generate dashboard", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, [prompt, generateDashboard, onGenerated]);

  const handlePresetClick = useCallback((preset: DashboardPreset) => {
    setPrompt(DASHBOARD_PRESETS[preset]);
  }, []);

  return (
    <div className="space-y-6">
      {/* Generator Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Dashboard Generator
          </CardTitle>
          <CardDescription>
            Describe the dashboard you want to create and AI will generate it for you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preset Buttons */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Quick Presets</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(DASHBOARD_PRESETS) as DashboardPreset[]).map((preset) => (
                <Button
                  key={preset}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetClick(preset)}
                  className="capitalize"
                >
                  {preset}
                </Button>
              ))}
            </div>
          </div>

          {/* Prompt Input */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Describe your dashboard</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Create a dashboard showing player statistics, active games, and revenue metrics..."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Generate Button */}
          <div className="flex items-center gap-2">
            <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Dashboard
                </>
              )}
            </Button>
            {lastGenerated && (
              <Button variant="outline" onClick={() => handleGenerate()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Generation failed</p>
                <p className="text-destructive/80">{error}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      {showPreview && lastGenerated && (
        <Card>
          <CardHeader>
            <CardTitle>{lastGenerated.title}</CardTitle>
            {lastGenerated.description && (
              <CardDescription>{lastGenerated.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <JsonView schema={lastGenerated.schema} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// =============================================================================
// SIMPLIFIED INLINE GENERATOR
// =============================================================================

interface InlineGeneratorProps {
  onGenerated: (schema: DashboardSchema) => void;
  placeholder?: string;
}

export function InlineAIDashboardGenerator({
  onGenerated,
  placeholder = "Describe what you want to see...",
}: InlineGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const { generateDashboard, isGenerating } = useAIDashboard();

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    try {
      const result = await generateDashboard(prompt);
      onGenerated(result.schema);
      setPrompt("");
    } catch {
      // Error is handled by the hook
    }
  }, [prompt, generateDashboard, onGenerated]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleGenerate();
      }
    },
    [handleGenerate]
  );

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2">
      <Sparkles className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <Input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
        disabled={isGenerating}
      />
      <Button
        size="sm"
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        className="flex-shrink-0"
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wand2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
