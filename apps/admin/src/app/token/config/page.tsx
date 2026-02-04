"use client";

/**
 * Token Configuration Page
 *
 * Form for configuring the LunchTable Token (LTCG) metadata,
 * social links, and launch parameters.
 */

import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {  useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { Badge } from "@tremor/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

interface TokenConfigForm {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  twitter: string;
  telegram: string;
  website: string;
  discord: string;
  initialSupply: string;
  decimals: string;
  targetMarketCap: string;
}

// =============================================================================
// Component
// =============================================================================

export default function TokenConfigPage() {
  // Fetch current config
  const config = useConvexQuery(api.tokenLaunch.config.getConfig);
  const readiness = useConvexQuery(api.tokenLaunch.config.getReadiness);

  // Mutations
  const upsertConfig = useConvexMutation(api.tokenLaunch.config.upsertConfig);
  const markReady = useConvexMutation(api.tokenLaunch.config.markReady);

  // Form state
  const [form, setForm] = useState<TokenConfigForm>({
    name: "",
    symbol: "",
    description: "",
    imageUrl: "",
    twitter: "",
    telegram: "",
    website: "",
    discord: "",
    initialSupply: "1000000000",
    decimals: "6",
    targetMarketCap: "90000",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Load config into form
  useEffect(() => {
    if (config) {
      setForm({
        name: config.name ?? "",
        symbol: config.symbol ?? "",
        description: config.description ?? "",
        imageUrl: config.imageUrl ?? "",
        twitter: config.twitter ?? "",
        telegram: config.telegram ?? "",
        website: config.website ?? "",
        discord: config.discord ?? "",
        initialSupply: config.initialSupply?.toString() ?? "1000000000",
        decimals: config.decimals?.toString() ?? "6",
        targetMarketCap: config.targetMarketCap?.toString() ?? "90000",
      });
    }
  }, [config]);

  const isLoading = config === undefined;

  function updateField(field: keyof TokenConfigForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.name || !form.symbol || !form.description) {
      toast.error("Name, symbol, and description are required");
      return;
    }

    setIsSaving(true);
    try {
      await upsertConfig({
        name: form.name,
        symbol: form.symbol.toUpperCase(),
        description: form.description,
        imageUrl: form.imageUrl || undefined,
        twitter: form.twitter || undefined,
        telegram: form.telegram || undefined,
        website: form.website || undefined,
        discord: form.discord || undefined,
        initialSupply: Number.parseInt(form.initialSupply) || undefined,
        decimals: Number.parseInt(form.decimals) || undefined,
        targetMarketCap: Number.parseInt(form.targetMarketCap) || undefined,
      });
      toast.success("Token configuration saved");
    } catch (error) {
      toast.error("Failed to save configuration");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMarkReady() {
    if (!confirm("Are you sure you want to mark the token as ready for launch?")) {
      return;
    }

    try {
      await markReady({});
      toast.success("Token marked as ready for launch");
    } catch (error: any) {
      toast.error(error.message || "Failed to mark token as ready");
    }
  }

  return (
    <PageWrapper
      title="Token Configuration"
      description="Configure LunchTable Token (LTCG) for pump.fun launch"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/token">Back to Launch Control</Link>
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Configuration"}
          </Button>
          {config?.status === "draft" && readiness?.ready && (
            <Button onClick={handleMarkReady} className="bg-emerald-600 hover:bg-emerald-700">
              Mark Ready
            </Button>
          )}
        </div>
      }
    >
      {/* Status Banner */}
      <Card className="mb-6">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <span className="text-2xl">🪙</span>
            <div>
              <p className="font-medium">Token Status</p>
              <Badge
                color={
                  config?.status === "launched"
                    ? "green"
                    : config?.status === "ready"
                      ? "emerald"
                      : "amber"
                }
              >
                {config?.status ?? "draft"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Configuration</p>
              <Badge color={readiness?.ready ? "emerald" : "amber"}>
                {readiness?.ready ? "Complete" : "Incomplete"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Readiness Checklist */}
      {readiness && !readiness.ready && (
        <Card className="mb-6 border-amber-500">
          <CardHeader>
            <CardTitle className="text-amber-600">Configuration Incomplete</CardTitle>
            <CardDescription>Please address the following issues:</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm">
              {readiness.issues.map((issue: string, i: number) => (
                <li key={i} className="text-amber-600">
                  {issue}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Token name, symbol, and description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Token Name *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="LunchTable Token"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="symbol">Symbol *</Label>
                  <Input
                    id="symbol"
                    value={form.symbol}
                    onChange={(e) => updateField("symbol", e.target.value.toUpperCase())}
                    placeholder="LTCG"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="The official token of the LunchTable ecosystem..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Token Image URL</Label>
                  <Input
                    id="imageUrl"
                    value={form.imageUrl}
                    onChange={(e) => updateField("imageUrl", e.target.value)}
                    placeholder="https://example.com/token-image.png"
                  />
                  {form.imageUrl && (
                    <div className="mt-2 flex items-center gap-2">
                      <img
                        src={form.imageUrl}
                        alt="Token preview"
                        className="h-16 w-16 rounded-full object-cover"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                      <span className="text-sm text-muted-foreground">Preview</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card>
          <CardHeader>
            <CardTitle>Social Links</CardTitle>
            <CardDescription>Community and social media links</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={form.website}
                    onChange={(e) => updateField("website", e.target.value)}
                    placeholder="https://lunchtable.io"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter / X</Label>
                  <Input
                    id="twitter"
                    value={form.twitter}
                    onChange={(e) => updateField("twitter", e.target.value)}
                    placeholder="https://twitter.com/lunchtable"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telegram">Telegram</Label>
                  <Input
                    id="telegram"
                    value={form.telegram}
                    onChange={(e) => updateField("telegram", e.target.value)}
                    placeholder="https://t.me/lunchtable"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discord">Discord</Label>
                  <Input
                    id="discord"
                    value={form.discord}
                    onChange={(e) => updateField("discord", e.target.value)}
                    placeholder="https://discord.gg/lunchtable"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Token Parameters */}
        <Card>
          <CardHeader>
            <CardTitle>Token Parameters</CardTitle>
            <CardDescription>Supply and decimal configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="initialSupply">Initial Supply</Label>
                  <Input
                    id="initialSupply"
                    type="number"
                    value={form.initialSupply}
                    onChange={(e) => updateField("initialSupply", e.target.value)}
                    placeholder="1000000000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Total tokens to mint (pump.fun uses 1B by default)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="decimals">Decimals</Label>
                  <Input
                    id="decimals"
                    type="number"
                    value={form.decimals}
                    onChange={(e) => updateField("decimals", e.target.value)}
                    placeholder="6"
                    min="0"
                    max="9"
                  />
                  <p className="text-xs text-muted-foreground">
                    Standard is 6 decimals for Solana tokens
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetMarketCap">Target Market Cap (USD)</Label>
                  <Input
                    id="targetMarketCap"
                    type="number"
                    value={form.targetMarketCap}
                    onChange={(e) => updateField("targetMarketCap", e.target.value)}
                    placeholder="90000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Graduation threshold ($90k for pump.fun)
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Launch Info */}
        <Card>
          <CardHeader>
            <CardTitle>Launch Information</CardTitle>
            <CardDescription>Post-launch details (read-only)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : config?.status === "launched" || config?.status === "graduated" ? (
              <>
                <div className="space-y-2">
                  <Label>Mint Address</Label>
                  <Input value={config.mintAddress ?? "N/A"} readOnly className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Bonding Curve</Label>
                  <Input
                    value={config.bondingCurveAddress ?? "N/A"}
                    readOnly
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pump.fun URL</Label>
                  {config.pumpfunUrl ? (
                    <a
                      href={config.pumpfunUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-blue-600 hover:underline"
                    >
                      {config.pumpfunUrl}
                    </a>
                  ) : (
                    <Input value="N/A" readOnly />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Launched At</Label>
                  <Input
                    value={config.launchedAt ? new Date(config.launchedAt).toLocaleString() : "N/A"}
                    readOnly
                  />
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p>Launch information will appear here after the token is launched</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Actions */}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href="/token">Cancel</Link>
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </PageWrapper>
  );
}
