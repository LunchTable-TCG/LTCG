"use client";

/**
 * AI Dashboard Builder Page
 *
 * Allows admins to generate custom dashboards using AI.
 * Uses the json-render catalog to create dynamic, responsive dashboards.
 */

import { AIDashboardGenerator } from "@/components/json-render";
import { JsonView, exampleSchemas } from "@/components/json-render/JsonView";
import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleGuard } from "@/contexts/AdminContext";
import type { DashboardSchema } from "@/lib/json-render";
import { Code, Eye, LayoutDashboard, SparklesIcon } from "lucide-react";
import { useCallback, useState } from "react";

// =============================================================================
// COMPONENT
// =============================================================================

export default function AIDashboardPage() {
  const [generatedSchema, setGeneratedSchema] = useState<DashboardSchema | null>(null);
  const [viewMode, setViewMode] = useState<"preview" | "json">("preview");

  const handleGenerated = useCallback((schema: DashboardSchema, _title: string) => {
    setGeneratedSchema(schema);
  }, []);

  const handleLoadExample = useCallback((example: keyof typeof exampleSchemas) => {
    setGeneratedSchema(exampleSchemas[example] as unknown as DashboardSchema);
  }, []);

  return (
    <RoleGuard minRole="admin">
      <PageWrapper
        title="AI Dashboard Builder"
        description="Generate custom dashboards using AI-powered components"
      >
        <div className="admin-grid-2">
          {/* Generator Panel */}
          <div className="space-y-6">
            <AIDashboardGenerator onGenerated={handleGenerated} showPreview={false} />

            {/* Example Dashboards */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutDashboard className="h-5 w-5" />
                  Example Dashboards
                </CardTitle>
                <CardDescription>
                  Load example dashboards to see what&apos;s possible
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="admin-grid-stats">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadExample("simpleMetrics")}
                    className="justify-start"
                  >
                    Metrics Grid
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadExample("dashboard")}
                    className="justify-start"
                  >
                    Full Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <Card className="h-fit">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {viewMode === "preview" ? (
                    <Eye className="h-5 w-5" />
                  ) : (
                    <Code className="h-5 w-5" />
                  )}
                  {viewMode === "preview" ? "Preview" : "JSON Schema"}
                </CardTitle>
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "preview" | "json")}>
                  <TabsList>
                    <TabsTrigger value="preview" className="gap-1.5">
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </TabsTrigger>
                    <TabsTrigger value="json" className="gap-1.5">
                      <Code className="h-3.5 w-3.5" />
                      JSON
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {generatedSchema ? (
                viewMode === "preview" ? (
                  <JsonView schema={generatedSchema} />
                ) : (
                  <pre className="admin-scroll-area rounded-lg bg-muted/50 p-4 text-sm overflow-auto max-h-[600px]">
                    <code>{JSON.stringify(generatedSchema, null, 2)}</code>
                  </pre>
                )
              ) : (
                <div className="admin-empty-state">
                  <SparklesIcon className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Dashboard Yet</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                    Use the generator on the left to create a custom dashboard, or load an example
                    to see what&apos;s possible.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    </RoleGuard>
  );
}
