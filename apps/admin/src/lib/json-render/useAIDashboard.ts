"use client";

/**
 * AI Dashboard Generation Hook
 *
 * Uses the admin AI agent to generate dashboard JSON schemas
 * that can be rendered using the json-render catalog.
 */

import { typedApi, useConvexAction } from "@/lib/convexHelpers";
import { useCallback, useState } from "react";

// =============================================================================
// TYPES
// =============================================================================

export interface DashboardSchema {
  type: string;
  props?: Record<string, unknown>;
  children?: DashboardSchema | DashboardSchema[];
}

export interface GeneratedDashboard {
  schema: DashboardSchema;
  title: string;
  description?: string;
}

// =============================================================================
// PROMPT TEMPLATE
// =============================================================================

const DASHBOARD_PROMPT_TEMPLATE = `You are an admin dashboard generator for Lunchtable Card Game.
Generate a JSON schema for a dashboard component using ONLY these available components:

LAYOUT COMPONENTS:
- Grid: { type: "Grid", props: { columns: number (1-6), gap: "sm"|"md"|"lg" }, children: [...] }
- Stack: { type: "Stack", props: { direction: "vertical"|"horizontal", gap: "sm"|"md"|"lg"|"xl", align: "start"|"center"|"end"|"stretch" }, children: [...] }
- Section: { type: "Section", props: { title: string, description?: string }, children: [...] }
- Card: { type: "Card", props: { title?: string, description?: string }, children: [...] }
- Separator: { type: "Separator", props: { orientation: "horizontal"|"vertical" } }

DATA DISPLAY COMPONENTS:
- MetricCard: { type: "MetricCard", props: { title: string, value: string|number, change?: number, changeType?: "increase"|"decrease"|"neutral", description?: string, icon?: string (emoji) } }
- ProgressCard: { type: "ProgressCard", props: { title: string, current: number, total: number, description?: string } }
- AlertBanner: { type: "AlertBanner", props: { type: "info"|"success"|"warning"|"error", title: string, message?: string } }
- DataList: { type: "DataList", props: { items: [{ label: string, value: string|number, badge?: string }] } }
- Table: { type: "Table", props: { headers: string[], rows: (string|number)[][] } }
- Text: { type: "Text", props: { content: string, variant?: "h1"|"h2"|"h3"|"body"|"small"|"muted" } }
- Badge: { type: "Badge", props: { text: string, variant?: "default"|"secondary"|"destructive"|"outline" } }

FORM COMPONENTS (for display only):
- Button: { type: "Button", props: { label: string, variant?: "default"|"destructive"|"outline"|"secondary"|"ghost"|"link", size?: "default"|"sm"|"lg" } }

TABS:
- Tabs: { type: "Tabs", props: { tabs: [{ value: string, label: string }], defaultValue?: string }, children: [...TabContent] }
- TabContent: { type: "TabContent", props: { value: string }, children: [...] }

IMPORTANT RULES:
1. Return ONLY a valid JSON object with this structure:
   { "title": "Dashboard Title", "description": "Optional description", "schema": { ... } }
2. Use realistic placeholder data relevant to a card game admin dashboard
3. Use appropriate icons (emojis) for metric cards
4. Create visually balanced layouts with Grid and Stack
5. Group related metrics together
6. Include appropriate alerts or warnings if relevant

USER REQUEST: {prompt}

Generate the dashboard JSON now:`;

// =============================================================================
// HOOK
// =============================================================================

export function useAIDashboard() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<GeneratedDashboard | null>(null);

  // Use the admin agent API with Convex actions
  const sendMessage = useConvexAction(typedApi.ai.adminAgentApi.sendMessage);
  const getOrCreateThread = useConvexAction(typedApi.ai.adminAgentApi.getOrCreateThread);

  const generateDashboard = useCallback(
    async (userPrompt: string): Promise<GeneratedDashboard> => {
      setIsGenerating(true);
      setError(null);

      try {
        // Get or create a thread for dashboard generation
        const threadResult = (await getOrCreateThread({})) as { threadId: string };
        const threadId = threadResult.threadId;

        // Build the prompt
        const fullPrompt = DASHBOARD_PROMPT_TEMPLATE.replace("{prompt}", userPrompt);

        // Send to AI
        const result = (await sendMessage({
          threadId,
          message: fullPrompt,
        })) as { text: string; toolCalls?: unknown[] };

        // Parse the response - try to extract JSON
        const responseText = result.text;

        // Try to find JSON in the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            const dashboard: GeneratedDashboard = {
              title: parsed.title || "Generated Dashboard",
              description: parsed.description,
              schema: parsed.schema || parsed,
            };
            setLastGenerated(dashboard);
            return dashboard;
          } catch (_parseError) {
            // JSON parsing failed
            throw new Error("Failed to parse dashboard JSON from AI response");
          }
        }

        throw new Error("No valid JSON found in AI response");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to generate dashboard";
        setError(message);
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    [getOrCreateThread, sendMessage]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearLastGenerated = useCallback(() => {
    setLastGenerated(null);
  }, []);

  return {
    generateDashboard,
    isGenerating,
    error,
    lastGenerated,
    clearError,
    clearLastGenerated,
  };
}

// =============================================================================
// PRESET PROMPTS
// =============================================================================

export const DASHBOARD_PRESETS = {
  overview:
    "Create an overview dashboard showing player count, active games, daily revenue, and recent activity",
  economy:
    "Create an economy dashboard showing token prices, transaction volume, marketplace stats, and revenue breakdown",
  players:
    "Create a players dashboard showing registration stats, active users, retention metrics, and geographic distribution",
  content:
    "Create a content dashboard showing card usage stats, most played decks, win rates by archetype, and upcoming releases",
  moderation:
    "Create a moderation dashboard showing reports queue, banned players, chat violations, and recent actions taken",
  tournaments:
    "Create a tournaments dashboard showing active tournaments, prize pools, participant counts, and upcoming events",
};

export type DashboardPreset = keyof typeof DASHBOARD_PRESETS;
