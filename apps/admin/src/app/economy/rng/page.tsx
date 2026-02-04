"use client";

/**
 * RNG Configuration Page
 *
 * Admin interface to view and adjust pack opening RNG rates.
 * Includes rarity weights, variant rates, pack multipliers, and pity thresholds.
 */

import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleGuard } from "@/contexts/AdminContext";
import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { Badge, Text } from "@tremor/react";
import { AlertTriangleIcon, RefreshCwIcon, SaveIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

interface RarityWeights {
  [key: string]: number;
  common: number;
  uncommon: number;
  rare: number;
  epic: number;
  legendary: number;
}

interface VariantRates {
  [key: string]: number;
  standard: number;
  foil: number;
  altArt: number;
  fullArt: number;
}

interface PityThresholds {
  [key: string]: number;
  epic: number;
  legendary: number;
  fullArt: number;
}

interface RngConfigHistoryLog {
  _id: string;
  action: string;
  adminName: string;
  timestamp: number;
  metadata?: {
    config?: unknown;
  };
}

// =============================================================================
// Components
// =============================================================================

function RarityWeightsEditor({
  weights,
  onSave,
  isSaving,
}: {
  weights: RarityWeights;
  onSave: (weights: RarityWeights) => Promise<void>;
  isSaving: boolean;
}) {
  const [local, setLocal] = useState(weights);

  useEffect(() => {
    setLocal(weights);
  }, [weights]);

  const total = Object.values(local).reduce((a, b) => a + b, 0);
  const isValid = total === 1000;

  const handleChange = (key: keyof RarityWeights, value: number) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  const rarities = [
    { key: "common" as const, label: "Common", color: "text-gray-400" },
    { key: "uncommon" as const, label: "Uncommon", color: "text-green-500" },
    { key: "rare" as const, label: "Rare", color: "text-blue-500" },
    { key: "epic" as const, label: "Epic", color: "text-purple-500" },
    { key: "legendary" as const, label: "Legendary", color: "text-amber-500" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rarity Weights</CardTitle>
        <CardDescription>
          Distribution of card rarities in packs. Values must sum to 1000 (e.g., 550 = 55%).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {rarities.map(({ key, label, color }) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className={color}>{label}</Label>
              <span className="text-sm text-muted-foreground">{(local[key] / 10).toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-4">
              <Slider
                value={[local[key]]}
                min={0}
                max={1000}
                step={1}
                onValueChange={([v]) => handleChange(key, v ?? 0)}
                className="flex-1"
              />
              <Input
                type="number"
                value={local[key]}
                onChange={(e) => handleChange(key, Number.parseInt(e.target.value) || 0)}
                className="w-24"
              />
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            {!isValid && (
              <>
                <AlertTriangleIcon className="h-4 w-4 text-destructive" />
                <Text className="text-destructive">
                  Total: {total}/1000 ({total > 1000 ? `+${total - 1000}` : total - 1000})
                </Text>
              </>
            )}
            {isValid && <Badge color="emerald">Valid (1000/1000)</Badge>}
          </div>
          <RoleGuard permission="config.edit">
            <Button onClick={() => onSave(local)} disabled={!isValid || isSaving}>
              <SaveIcon className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </RoleGuard>
        </div>
      </CardContent>
    </Card>
  );
}

function VariantRatesEditor({
  rates,
  onSave,
  isSaving,
}: {
  rates: VariantRates;
  onSave: (rates: VariantRates) => Promise<void>;
  isSaving: boolean;
}) {
  const [local, setLocal] = useState(rates);

  useEffect(() => {
    setLocal(rates);
  }, [rates]);

  const total = Object.values(local).reduce((a, b) => a + b, 0);
  const isValid = total >= 9900 && total <= 10100;

  const handleChange = (key: keyof VariantRates, value: number) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  const variants = [
    { key: "standard" as const, label: "Standard", color: "text-gray-400" },
    { key: "foil" as const, label: "Foil", color: "text-cyan-500" },
    { key: "altArt" as const, label: "Alt Art", color: "text-pink-500" },
    { key: "fullArt" as const, label: "Full Art", color: "text-amber-500" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Variant Rates</CardTitle>
        <CardDescription>
          Base drop rates for card variants. Values out of 10,000 (e.g., 1000 = 10%).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {variants.map(({ key, label, color }) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className={color}>{label}</Label>
              <span className="text-sm text-muted-foreground">
                {(local[key] / 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Slider
                value={[local[key]]}
                min={0}
                max={10000}
                step={1}
                onValueChange={([v]) => handleChange(key, v ?? 0)}
                className="flex-1"
              />
              <Input
                type="number"
                value={local[key]}
                onChange={(e) => handleChange(key, Number.parseInt(e.target.value) || 0)}
                className="w-24"
              />
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            {!isValid && (
              <>
                <AlertTriangleIcon className="h-4 w-4 text-destructive" />
                <Text className="text-destructive">Total: {total}/10000</Text>
              </>
            )}
            {isValid && <Badge color="emerald">Valid (~10000)</Badge>}
          </div>
          <RoleGuard permission="config.edit">
            <Button onClick={() => onSave(local)} disabled={!isValid || isSaving}>
              <SaveIcon className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </RoleGuard>
        </div>
      </CardContent>
    </Card>
  );
}

function PityThresholdsEditor({
  thresholds,
  onSave,
  isSaving,
}: {
  thresholds: PityThresholds;
  onSave: (thresholds: PityThresholds) => Promise<void>;
  isSaving: boolean;
}) {
  const [local, setLocal] = useState(thresholds);

  useEffect(() => {
    setLocal(thresholds);
  }, [thresholds]);

  const isValid =
    local.epic > 0 && local.legendary > 0 && local.fullArt > 0 && local.epic < local.legendary;

  const handleChange = (key: keyof PityThresholds, value: number) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  const pityTypes = [
    {
      key: "epic" as const,
      label: "Epic Pity",
      description: "Guaranteed epic after X packs",
      color: "text-purple-500",
    },
    {
      key: "legendary" as const,
      label: "Legendary Pity",
      description: "Guaranteed legendary after X packs",
      color: "text-amber-500",
    },
    {
      key: "fullArt" as const,
      label: "Full Art Pity",
      description: "Guaranteed full art variant after X packs",
      color: "text-cyan-500",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pity Thresholds</CardTitle>
        <CardDescription>
          Guaranteed drops after X packs without pulling the rarity. Resets when pulled.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {pityTypes.map(({ key, label, description, color }) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className={color}>{label}</Label>
                <Text className="text-xs text-muted-foreground">{description}</Text>
              </div>
              <span className="text-lg font-bold">{local[key]} packs</span>
            </div>
            <div className="flex items-center gap-4">
              <Slider
                value={[local[key]]}
                min={1}
                max={2000}
                step={1}
                onValueChange={([v]) => handleChange(key, v ?? 0)}
                className="flex-1"
              />
              <Input
                type="number"
                value={local[key]}
                onChange={(e) => handleChange(key, Number.parseInt(e.target.value) || 1)}
                className="w-24"
                min={1}
              />
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            {!isValid && (
              <>
                <AlertTriangleIcon className="h-4 w-4 text-destructive" />
                <Text className="text-destructive">Epic threshold must be less than Legendary</Text>
              </>
            )}
            {isValid && <Badge color="emerald">Valid</Badge>}
          </div>
          <RoleGuard permission="config.edit">
            <Button onClick={() => onSave(local)} disabled={!isValid || isSaving}>
              <SaveIcon className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </RoleGuard>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export default function RngConfigPage() {
  const [saving, setSaving] = useState<string | null>(null);

  const configResult = useConvexQuery(typedApi.economy.rngConfig.getRngConfig, {});
  const historyResult = useConvexQuery(typedApi.admin.rngConfig.getRngConfigHistory, { limit: 20 });

  const updateRarityWeights = useConvexMutation(typedApi.admin.rngConfig.updateRarityWeights);
  const updateVariantRates = useConvexMutation(typedApi.admin.rngConfig.updateVariantRates);
  const updatePityThresholds = useConvexMutation(typedApi.admin.rngConfig.updatePityThresholds);
  const resetToDefaults = useConvexMutation(typedApi.admin.rngConfig.resetRngConfigToDefaults);

  const handleSaveRarityWeights = async (weights: RarityWeights) => {
    setSaving("rarity");
    try {
      await updateRarityWeights({ weights });
      toast.success("Rarity weights updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update rarity weights");
    } finally {
      setSaving(null);
    }
  };

  const handleSaveVariantRates = async (rates: VariantRates) => {
    setSaving("variant");
    try {
      await updateVariantRates({ rates });
      toast.success("Variant rates updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update variant rates");
    } finally {
      setSaving(null);
    }
  };

  const handleSavePityThresholds = async (thresholds: PityThresholds) => {
    setSaving("pity");
    try {
      await updatePityThresholds({ thresholds });
      toast.success("Pity thresholds updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update pity thresholds");
    } finally {
      setSaving(null);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset all RNG config to default values? This cannot be undone.")) return;
    setSaving("reset");
    try {
      await resetToDefaults({});
      toast.success("RNG config reset to defaults");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset config");
    } finally {
      setSaving(null);
    }
  };

  const isLoading = configResult === undefined;
  const config = configResult?.current;
  const defaults = configResult?.defaults;

  return (
    <PageWrapper
      title="RNG Configuration"
      description="Configure pack opening rates and pity system"
      actions={
        <RoleGuard permission="config.edit">
          <Button variant="outline" onClick={handleReset} disabled={saving === "reset"}>
            <RefreshCwIcon className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
        </RoleGuard>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Text>Loading configuration...</Text>
        </div>
      ) : (
        <Tabs defaultValue="rarity" className="space-y-6">
          <TabsList>
            <TabsTrigger value="rarity">Rarity Weights</TabsTrigger>
            <TabsTrigger value="variants">Variant Rates</TabsTrigger>
            <TabsTrigger value="pity">Pity System</TabsTrigger>
            <TabsTrigger value="history">Change History</TabsTrigger>
          </TabsList>

          <TabsContent value="rarity">
            {config && (
              <RarityWeightsEditor
                weights={config.rarityWeights as RarityWeights}
                onSave={handleSaveRarityWeights}
                isSaving={saving === "rarity"}
              />
            )}
            {defaults && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-sm">Default Values</CardTitle>
                </CardHeader>
                <CardContent>
                  <Text className="text-sm text-muted-foreground">
                    Common: {defaults.rarityWeights.common / 10}% | Uncommon:{" "}
                    {defaults.rarityWeights.uncommon / 10}% | Rare:{" "}
                    {defaults.rarityWeights.rare / 10}% | Epic: {defaults.rarityWeights.epic / 10}%
                    | Legendary: {defaults.rarityWeights.legendary / 10}%
                  </Text>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="variants">
            {config && (
              <VariantRatesEditor
                rates={config.variantRates as VariantRates}
                onSave={handleSaveVariantRates}
                isSaving={saving === "variant"}
              />
            )}
          </TabsContent>

          <TabsContent value="pity">
            {config && (
              <PityThresholdsEditor
                thresholds={config.pityThresholds as PityThresholds}
                onSave={handleSavePityThresholds}
                isSaving={saving === "pity"}
              />
            )}
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Recent Changes</CardTitle>
                <CardDescription>History of RNG configuration changes</CardDescription>
              </CardHeader>
              <CardContent>
                {historyResult && historyResult.length > 0 ? (
                  <div className="space-y-4">
                    {historyResult.map((log: RngConfigHistoryLog) => (
                      <div key={log._id} className="flex items-start justify-between border-b pb-4">
                        <div>
                          <Text className="font-medium">{log.action.replace(/_/g, " ")}</Text>
                          <Text className="text-sm text-muted-foreground">
                            by {log.adminName} at {new Date(log.timestamp).toLocaleString()}
                          </Text>
                        </div>
                        {"config" in (log.metadata ?? {}) && (
                          <Badge color="gray" className="text-xs">
                            Config updated
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <Text className="text-muted-foreground">No changes recorded yet</Text>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </PageWrapper>
  );
}
