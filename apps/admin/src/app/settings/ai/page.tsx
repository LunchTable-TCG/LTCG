"use client";

/**
 * AI Provider Settings Page
 *
 * Configure AI providers (OpenRouter, Vercel AI Gateway, Anthropic, OpenAI),
 * select models, and manage AI feature settings.
 */

import { PageWrapper } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// Dialog components available for future use if needed
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleGuard, useAdmin } from "@/contexts/AdminContext";
import { apiAny, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { Text, Title } from "@tremor/react";
import { useAction } from "convex/react";
import {
  AlertCircleIcon,
  BarChart3Icon,
  CheckCircleIcon,
  DollarSignIcon,
  ExternalLinkIcon,
  FilterIcon,
  ImageIcon,
  KeyIcon,
  Loader2Icon,
  MessageSquareIcon,
  RefreshCwIcon,
  SaveIcon,
  SearchIcon,
  SettingsIcon,
  TrendingUpIcon,
  WifiIcon,
  WifiOffIcon,
  ZapIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

interface AIConfigItem {
  _id: string;
  key: string;
  value: number | string | boolean | string[];
  category: string;
  displayName: string;
  description: string;
  valueType: "number" | "string" | "boolean" | "json";
  minValue?: number;
  maxValue?: number;
  updatedAt: number;
  updatedByUsername: string;
}

interface NormalizedModel {
  id: string;
  name: string;
  description?: string;
  provider: "openrouter" | "vercel";
  type: "language" | "embedding" | "image";
  contextLength: number;
  maxOutputTokens?: number;
  pricing: {
    inputPerToken?: string;
    outputPerToken?: string;
    perImage?: string;
    perRequest?: string;
  };
  tags?: string[];
  capabilities?: string[];
}

interface TopModelData {
  modelId: string;
  requests: number;
  tokens: number;
  cost: number;
  provider: string;
}

interface FeatureUsageData {
  feature: string;
  requests: number;
  tokens: number;
  cost: number;
  successRate: number;
}

interface RecentUsageData {
  _id: string;
  modelId: string;
  feature: string;
  totalTokens: number;
  estimatedCost: number;
  latencyMs: number;
  success: boolean;
  createdAtFormatted: string;
}

interface ProviderStatus {
  openrouter: boolean;
  anthropic: boolean;
  openai: boolean;
  vercel: boolean;
}

type ProviderKey = keyof ProviderStatus;

const PROVIDER_INFO: Record<
  ProviderKey,
  {
    name: string;
    description: string;
    icon: string;
    docsUrl: string;
  }
> = {
  vercel: {
    name: "Vercel AI Gateway",
    description: "Low-latency proxy with built-in observability and ZDR support",
    icon: "V",
    docsUrl: "https://vercel.com/docs/ai-gateway",
  },
  openrouter: {
    name: "OpenRouter",
    description: "Unified API access to 400+ AI models with automatic fallback",
    icon: "OR",
    docsUrl: "https://openrouter.ai/docs",
  },
  anthropic: {
    name: "Anthropic",
    description: "Direct access to Claude models",
    icon: "A",
    docsUrl: "https://docs.anthropic.com/",
  },
  openai: {
    name: "OpenAI",
    description: "Direct access to GPT and embedding models",
    icon: "OA",
    docsUrl: "https://platform.openai.com/docs",
  },
};

// Popular models for OpenRouter
const OPENROUTER_MODELS = [
  { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "anthropic/claude-3-opus", label: "Claude 3 Opus" },
  { value: "anthropic/claude-3-haiku", label: "Claude 3 Haiku" },
  { value: "openai/gpt-4o", label: "GPT-4o" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "openai/gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "google/gemini-pro", label: "Gemini Pro" },
  { value: "google/gemini-pro-1.5", label: "Gemini Pro 1.5" },
  { value: "meta-llama/llama-3.1-405b-instruct", label: "Llama 3.1 405B" },
  { value: "meta-llama/llama-3.1-70b-instruct", label: "Llama 3.1 70B" },
  { value: "mistralai/mistral-large", label: "Mistral Large" },
  { value: "mistralai/mixtral-8x7b-instruct", label: "Mixtral 8x7B" },
  { value: "cohere/command-r-plus", label: "Command R+" },
  { value: "perplexity/llama-3.1-sonar-large-128k-online", label: "Sonar Large (Online)" },
];

// Vercel AI Gateway models (typically OpenAI)
const VERCEL_MODELS = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-4", label: "GPT-4" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
];

// Embedding models
const EMBEDDING_MODELS = [
  { value: "text-embedding-3-small", label: "text-embedding-3-small (OpenAI)" },
  { value: "text-embedding-3-large", label: "text-embedding-3-large (OpenAI)" },
  { value: "text-embedding-ada-002", label: "text-embedding-ada-002 (OpenAI)" },
];

// =============================================================================
// Helper Components
// =============================================================================

function ProviderStatusCard({
  provider,
  isConfigured,
  isTesting,
  testResult,
  onTest,
}: {
  provider: ProviderKey;
  isConfigured: boolean;
  isTesting: boolean;
  testResult?: { success: boolean; latencyMs?: number; error?: string } | null;
  onTest: () => void;
}) {
  const info = PROVIDER_INFO[provider];

  return (
    <Card className={isConfigured ? "border-green-500/50" : "border-muted"}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg font-bold text-sm ${
                isConfigured
                  ? "bg-green-500/10 text-green-600"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {info.icon}
            </div>
            <div>
              <CardTitle className="text-base">{info.name}</CardTitle>
              <CardDescription className="text-xs">{info.description}</CardDescription>
            </div>
          </div>
          {isConfigured ? (
            <WifiIcon className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOffIcon className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Badge variant={isConfigured ? "default" : "secondary"}>
            {isConfigured ? "API Key Configured" : "Not Configured"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={onTest}
            disabled={!isConfigured || isTesting}
          >
            {isTesting ? (
              <>
                <Loader2Icon className="mr-2 h-3 w-3 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <ZapIcon className="mr-2 h-3 w-3" />
                Test
              </>
            )}
          </Button>
        </div>

        {testResult && (
          <div
            className={`mt-3 flex items-center gap-2 rounded-md p-2 text-sm ${
              testResult.success
                ? "bg-green-500/10 text-green-600"
                : "bg-red-500/10 text-red-600"
            }`}
          >
            {testResult.success ? (
              <>
                <CheckCircleIcon className="h-4 w-4" />
                Connected ({testResult.latencyMs}ms)
              </>
            ) : (
              <>
                <AlertCircleIcon className="h-4 w-4" />
                {testResult.error}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConfigSlider({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step,
  formatValue,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  formatValue?: (value: number) => string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          <Text className="text-xs text-muted-foreground">{description}</Text>
        </div>
        <Badge variant="outline" className="font-mono">
          {formatValue ? formatValue(value) : value}
        </Badge>
      </div>
      <Slider
        value={[value]}
        onValueChange={(values) => {
          const v = values[0];
          if (typeof v === "number") onChange(v);
        }}
        min={min}
        max={max}
        step={step ?? 1}
        className="py-2"
      />
    </div>
  );
}

function FeatureToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b last:border-b-0">
      <div className="space-y-1">
        <Label className="text-base font-medium">{label}</Label>
        <Text className="text-sm text-muted-foreground">{description}</Text>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-48" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// Model type icons
function ModelTypeIcon({ type }: { type: "language" | "embedding" | "image" }) {
  switch (type) {
    case "language":
      return <MessageSquareIcon className="h-4 w-4" />;
    case "embedding":
      return <SearchIcon className="h-4 w-4" />;
    case "image":
      return <ImageIcon className="h-4 w-4" />;
    default:
      return <MessageSquareIcon className="h-4 w-4" />;
  }
}

// Format pricing to human readable
function formatPrice(price: string | undefined) {
  if (!price) return "N/A";
  const num = parseFloat(price);
  if (isNaN(num)) return price;
  if (num === 0) return "Free";
  if (num < 0.000001) return `$${(num * 1000000).toFixed(4)}/1M`;
  if (num < 0.001) return `$${(num * 1000).toFixed(4)}/1K`;
  return `$${num.toFixed(6)}`;
}

// Format context length
function formatContextLength(length: number) {
  if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M`;
  if (length >= 1000) return `${(length / 1000).toFixed(0)}K`;
  return length.toString();
}

// Model browser component
function ModelBrowser({
  models,
  isLoading,
  onRefresh,
  providerFilter,
  typeFilter,
  searchQuery,
  onProviderFilterChange,
  onTypeFilterChange,
  onSearchChange,
}: {
  models: NormalizedModel[];
  isLoading: boolean;
  onRefresh: () => void;
  providerFilter: "all" | "openrouter" | "vercel";
  typeFilter: "all" | "language" | "embedding" | "image";
  searchQuery: string;
  onProviderFilterChange: (v: "all" | "openrouter" | "vercel") => void;
  onTypeFilterChange: (v: "all" | "language" | "embedding" | "image") => void;
  onSearchChange: (v: string) => void;
}) {
  // Filter models
  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      if (providerFilter !== "all" && m.provider !== providerFilter) return false;
      if (typeFilter !== "all" && m.type !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          m.id.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [models, providerFilter, typeFilter, searchQuery]);

  // Count by type
  const counts = useMemo(() => {
    const byType = { language: 0, embedding: 0, image: 0 };
    const byProvider = { openrouter: 0, vercel: 0 };
    for (const m of models) {
      byType[m.type]++;
      byProvider[m.provider]++;
    }
    return { byType, byProvider, total: models.length };
  }, [models]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex gap-2 items-center">
          <FilterIcon className="h-4 w-4 text-muted-foreground" />
          <Select value={providerFilter} onValueChange={onProviderFilterChange as any}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
              <SelectItem value="openrouter">OpenRouter ({counts.byProvider.openrouter})</SelectItem>
              <SelectItem value="vercel">Vercel ({counts.byProvider.vercel})</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={onTypeFilterChange as any}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="language">Language ({counts.byType.language})</SelectItem>
              <SelectItem value="embedding">Embedding ({counts.byType.embedding})</SelectItem>
              <SelectItem value="image">Image ({counts.byType.image})</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={onRefresh} disabled={isLoading}>
            <RefreshCwIcon className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>
          Showing {filteredModels.length} of {counts.total} models
        </span>
        {searchQuery && <span>• Filtered by: &quot;{searchQuery}&quot;</span>}
      </div>

      {/* Model list */}
      {isLoading && models.length === 0 ? (
        <div className="py-12 text-center">
          <Loader2Icon className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <Text>Fetching models from providers...</Text>
        </div>
      ) : filteredModels.length === 0 ? (
        <div className="py-12 text-center">
          <Text className="text-muted-foreground">No models found matching your filters</Text>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Model</th>
                  <th className="px-4 py-3 text-left font-medium">Provider</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Context</th>
                  <th className="px-4 py-3 text-left font-medium">Input Price</th>
                  <th className="px-4 py-3 text-left font-medium">Output Price</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredModels.slice(0, 100).map((model) => (
                  <tr key={`${model.provider}-${model.id}`} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium">{model.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{model.id}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={model.provider === "openrouter" ? "default" : "secondary"}>
                        {model.provider === "openrouter" ? "OR" : "Vercel"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ModelTypeIcon type={model.type} />
                        <span className="capitalize">{model.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {model.contextLength > 0 ? formatContextLength(model.contextLength) : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {formatPrice(model.pricing.inputPerToken)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {formatPrice(model.pricing.outputPerToken)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredModels.length > 100 && (
            <div className="px-4 py-3 bg-muted text-center text-sm text-muted-foreground">
              Showing first 100 of {filteredModels.length} models
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function AIProvidersPage() {
  useAdmin(); // Auth check

  // Queries
  const configsResult = useConvexQuery(apiAny.admin.aiConfig.getAIConfigs, {});

  // Mutations
  const updateConfig = useConvexMutation(apiAny.admin.aiConfig.updateAIConfig);
  const initializeDefaults = useConvexMutation(apiAny.admin.aiConfig.initializeAIDefaults);
  const testProvider = useAction(apiAny.admin.aiConfig.testProviderConnection);

  // Model fetching actions
  const fetchAllModels = useAction(apiAny.admin.aiProviders.fetchAllModels);

  // Usage tracking queries
  const usageSummary = useConvexQuery(apiAny.admin.aiUsage.getUsageSummary, { days: 30 });
  const topModels = useConvexQuery(apiAny.admin.aiUsage.getTopModels, { days: 30, limit: 5 });
  const usageByFeature = useConvexQuery(apiAny.admin.aiUsage.getUsageByFeature, { days: 30 });
  const recentUsage = useConvexQuery(apiAny.admin.aiUsage.getRecentUsage, { limit: 20 });

  // Local state
  const [localValues, setLocalValues] = useState<Record<string, any>>({});
  const [originalValues, setOriginalValues] = useState<Record<string, any>>({});
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [testResults, setTestResults] = useState<Record<ProviderKey, any>>({} as any);
  const [testingProvider, setTestingProvider] = useState<ProviderKey | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // savingKey reserved for per-field saving indicator (if needed)

  // Model browser state
  const [allModels, setAllModels] = useState<NormalizedModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [providerFilter, setProviderFilter] = useState<"all" | "openrouter" | "vercel">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "language" | "embedding" | "image">("all");
  const [modelSearchQuery, setModelSearchQuery] = useState("");

  // Fetch provider status on mount
  const fetchProviderStatus = useCallback(async () => {
    try {
      const result = await testProvider({});
      if (result.providerStatus) {
        setProviderStatus(result.providerStatus);
      }
    } catch (error) {
      console.error("Failed to fetch provider status:", error);
    }
  }, [testProvider]);

  useEffect(() => {
    fetchProviderStatus();
  }, [fetchProviderStatus]);

  // Initialize local values when configs load
  useEffect(() => {
    if (configsResult?.configs) {
      const values: Record<string, any> = {};
      for (const config of configsResult.configs as AIConfigItem[]) {
        values[config.key] = config.value;
      }
      setLocalValues(values);
      setOriginalValues(values);
    }
  }, [configsResult?.configs]);

  // Fetch all models from providers
  const handleFetchModels = useCallback(async () => {
    setIsLoadingModels(true);
    setModelsError(null);
    try {
      const result = await fetchAllModels({});
      if (result.success) {
        setAllModels(result.models as NormalizedModel[]);
        toast.success(
          `Loaded ${result.totalCount} models (OpenRouter: ${result.byProvider.openrouter}, Vercel: ${result.byProvider.vercel})`
        );
      } else {
        const errors = [];
        if (result.errors?.openrouter) errors.push(`OpenRouter: ${result.errors.openrouter}`);
        if (result.errors?.vercel) errors.push(`Vercel: ${result.errors.vercel}`);
        if (errors.length > 0) {
          setModelsError(errors.join("; "));
          toast.error("Some providers failed: " + errors.join("; "));
        }
        // Still set whatever models we got
        if (result.models?.length > 0) {
          setAllModels(result.models as NormalizedModel[]);
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      setModelsError(msg);
      toast.error("Failed to fetch models: " + msg);
    } finally {
      setIsLoadingModels(false);
    }
  }, [fetchAllModels]);

  // Get config value helper
  const getConfigValue = (key: string, defaultValue: any = null) => {
    return localValues[key] ?? defaultValue;
  };

  // Update local value
  const setConfigValue = (key: string, value: any) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }));
  };

  // Check if value has changed
  const hasChanged = (key: string) => {
    return localValues[key] !== originalValues[key];
  };

  // Save all changed configs
  const saveAllChanges = async () => {
    const changedKeys = Object.keys(localValues).filter(
      (key) => localValues[key] !== originalValues[key]
    );

    if (changedKeys.length === 0) {
      toast.info("No changes to save");
      return;
    }

    setIsSaving(true);
    try {
      for (const key of changedKeys) {
        await updateConfig({
          key,
          value: localValues[key],
        });
      }
      setOriginalValues({ ...localValues });
      toast.success(`Saved ${changedKeys.length} settings`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  // Test provider connection
  const handleTestProvider = async (provider: ProviderKey) => {
    setTestingProvider(provider);
    setTestResults((prev) => ({ ...prev, [provider]: null }));

    try {
      const result = await testProvider({ provider });
      setTestResults((prev) => ({
        ...prev,
        [provider]: {
          success: result.success,
          latencyMs: result.latencyMs,
          error: result.error,
        },
      }));

      if (result.success) {
        toast.success(`${PROVIDER_INFO[provider].name} connected successfully`);
      } else {
        toast.error(result.error || "Connection failed");
      }
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [provider]: {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      }));
      toast.error("Failed to test connection");
    } finally {
      setTestingProvider(null);
    }
  };

  // Initialize defaults
  const handleInitializeDefaults = async () => {
    setIsInitializing(true);
    try {
      const result = await initializeDefaults({});
      if (result.createdCount > 0) {
        toast.success(result.message);
      } else {
        toast.info(result.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to initialize");
    } finally {
      setIsInitializing(false);
    }
  };

  const isLoading = configsResult === undefined;
  const configs = (configsResult?.configs ?? []) as AIConfigItem[];
  const hasConfigs = configs.length > 0;

  // Count total changes
  const totalChanges = Object.keys(localValues).filter(
    (key) => localValues[key] !== originalValues[key]
  ).length;

  return (
    <PageWrapper
      title="AI Provider Settings"
      description="Configure AI providers, models, and feature settings"
      actions={
        <div className="flex items-center gap-2">
          <RoleGuard permission="admin.manage">
            <Button
              variant="outline"
              onClick={handleInitializeDefaults}
              disabled={isInitializing}
            >
              {isInitializing ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Initialize Defaults
                </>
              )}
            </Button>
          </RoleGuard>
          <RoleGuard permission="admin.manage">
            <Button
              onClick={saveAllChanges}
              disabled={totalChanges === 0 || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <SaveIcon className="mr-2 h-4 w-4" />
                  Save All Changes
                  {totalChanges > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {totalChanges}
                    </Badge>
                  )}
                </>
              )}
            </Button>
          </RoleGuard>
        </div>
      }
    >
      {isLoading ? (
        <LoadingSkeleton />
      ) : !hasConfigs ? (
        <Card className="py-12">
          <div className="text-center">
            <AlertCircleIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <Title>No AI Configuration Found</Title>
            <Text className="text-muted-foreground mt-2 mb-6">
              Initialize the default AI configuration values to get started.
            </Text>
            <RoleGuard permission="admin.manage">
              <Button onClick={handleInitializeDefaults} disabled={isInitializing}>
                {isInitializing ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="mr-2 h-4 w-4" />
                    Initialize AI Defaults
                  </>
                )}
              </Button>
            </RoleGuard>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Provider Status Cards */}
          <div>
            <Title className="mb-4">Provider Status</Title>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {(["vercel", "openrouter", "anthropic", "openai"] as ProviderKey[]).map(
                (provider) => (
                  <ProviderStatusCard
                    key={provider}
                    provider={provider}
                    isConfigured={providerStatus?.[provider] ?? false}
                    isTesting={testingProvider === provider}
                    testResult={testResults[provider]}
                    onTest={() => handleTestProvider(provider)}
                  />
                )
              )}
            </div>
          </div>

          {/* Configuration Tabs */}
          <Tabs defaultValue="providers" className="space-y-4">
            <TabsList className="flex-wrap">
              <TabsTrigger value="providers">Provider Selection</TabsTrigger>
              <TabsTrigger value="apikeys">API Keys</TabsTrigger>
              <TabsTrigger value="models">Browse Models</TabsTrigger>
              <TabsTrigger value="usage">Usage & Analytics</TabsTrigger>
              <TabsTrigger value="openrouter">OpenRouter</TabsTrigger>
              <TabsTrigger value="vercel">Vercel AI</TabsTrigger>
              <TabsTrigger value="general">General Settings</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
            </TabsList>

            {/* Provider Selection Tab */}
            <TabsContent value="providers">
              <Card>
                <CardHeader>
                  <CardTitle>Provider Selection</CardTitle>
                  <CardDescription>
                    Choose your primary and fallback AI providers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Primary Provider</Label>
                      <Text className="text-xs text-muted-foreground mb-2">
                        Main provider for AI requests
                      </Text>
                      <Select
                        value={getConfigValue("ai.provider", "vercel")}
                        onValueChange={(value) => setConfigValue("ai.provider", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vercel">Vercel AI Gateway</SelectItem>
                          <SelectItem value="openrouter">OpenRouter</SelectItem>
                          <SelectItem value="anthropic">Anthropic (Direct)</SelectItem>
                          <SelectItem value="openai">OpenAI (Direct)</SelectItem>
                        </SelectContent>
                      </Select>
                      {hasChanged("ai.provider") && (
                        <Badge variant="outline" className="text-xs text-amber-600">
                          Modified
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Fallback Provider</Label>
                      <Text className="text-xs text-muted-foreground mb-2">
                        Used when primary provider fails
                      </Text>
                      <Select
                        value={getConfigValue("ai.fallback_provider", "openrouter")}
                        onValueChange={(value) => setConfigValue("ai.fallback_provider", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select fallback" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openrouter">OpenRouter</SelectItem>
                          <SelectItem value="vercel">Vercel AI Gateway</SelectItem>
                          <SelectItem value="anthropic">Anthropic (Direct)</SelectItem>
                          <SelectItem value="openai">OpenAI (Direct)</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                      {hasChanged("ai.fallback_provider") && (
                        <Badge variant="outline" className="text-xs text-amber-600">
                          Modified
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="rounded-md bg-muted p-4">
                    <Text className="text-sm">
                      <strong>Current Setup:</strong> Primary requests go to{" "}
                      <Badge variant="secondary">
                        {PROVIDER_INFO[getConfigValue("ai.provider", "vercel") as ProviderKey]?.name ?? "Vercel AI"}
                      </Badge>
                      , with{" "}
                      {getConfigValue("ai.fallback_provider", "openrouter") !== "none" ? (
                        <>
                          fallback to{" "}
                          <Badge variant="secondary">
                            {PROVIDER_INFO[getConfigValue("ai.fallback_provider", "openrouter") as ProviderKey]?.name ?? "OpenRouter"}
                          </Badge>
                        </>
                      ) : (
                        "no fallback configured"
                      )}
                      .
                    </Text>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* API Keys Tab */}
            <TabsContent value="apikeys">
              <div className="grid gap-6 md:grid-cols-2">
                {/* OpenRouter API Key */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 font-bold text-blue-600">
                          OR
                        </div>
                        <div>
                          <CardTitle className="text-base">OpenRouter API Key</CardTitle>
                          <CardDescription>Access 400+ AI models</CardDescription>
                        </div>
                      </div>
                      <Badge variant={providerStatus?.openrouter ? "default" : "secondary"}>
                        {providerStatus?.openrouter ? "Configured" : "Not Set"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Text className="text-sm text-muted-foreground">
                      OpenRouter provides unified access to Claude, GPT-4, Llama, Gemini, and 400+ other models
                      through a single API with automatic fallback and competitive pricing.
                    </Text>
                    <div className="flex flex-col gap-2">
                      <a
                        href="https://openrouter.ai/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        <KeyIcon className="h-4 w-4" />
                        Generate API Key
                        <ExternalLinkIcon className="h-3 w-3" />
                      </a>
                      <a
                        href="https://openrouter.ai/activity"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        <BarChart3Icon className="h-4 w-4" />
                        View Usage & Billing
                        <ExternalLinkIcon className="h-3 w-3" />
                      </a>
                      <a
                        href="https://openrouter.ai/credits"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        <DollarSignIcon className="h-4 w-4" />
                        Add Credits
                        <ExternalLinkIcon className="h-3 w-3" />
                      </a>
                      <a
                        href="https://openrouter.ai/docs"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline"
                      >
                        Documentation
                        <ExternalLinkIcon className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-600">
                      <strong>Note:</strong> Set the <code className="font-mono">OPENROUTER_API_KEY</code> environment
                      variable in your Convex deployment settings.
                    </div>
                  </CardContent>
                </Card>

                {/* Vercel AI Gateway API Key */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 font-bold text-purple-600">
                          V
                        </div>
                        <div>
                          <CardTitle className="text-base">Vercel AI Gateway</CardTitle>
                          <CardDescription>Low-latency AI proxy</CardDescription>
                        </div>
                      </div>
                      <Badge variant={providerStatus?.vercel ? "default" : "secondary"}>
                        {providerStatus?.vercel ? "Configured" : "Not Set"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Text className="text-sm text-muted-foreground">
                      Vercel AI Gateway provides edge-optimized access to AI models with built-in observability,
                      caching, and Zero Data Retention (ZDR) mode for privacy-sensitive applications.
                    </Text>
                    <div className="flex flex-col gap-2">
                      <a
                        href="https://vercel.com/account/tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-purple-600 hover:underline"
                      >
                        <KeyIcon className="h-4 w-4" />
                        Generate API Token
                        <ExternalLinkIcon className="h-3 w-3" />
                      </a>
                      <a
                        href="https://vercel.com/dashboard"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-purple-600 hover:underline"
                      >
                        <BarChart3Icon className="h-4 w-4" />
                        View Dashboard
                        <ExternalLinkIcon className="h-3 w-3" />
                      </a>
                      <a
                        href="https://vercel.com/docs/ai-gateway"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline"
                      >
                        Documentation
                        <ExternalLinkIcon className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-600">
                      <strong>Note:</strong> Set the <code className="font-mono">VERCEL_API_TOKEN</code> environment
                      variable in your Convex deployment settings.
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Setup Guide */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Quick Setup Guide</CardTitle>
                  <CardDescription>How to configure your AI provider API keys</CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="list-decimal list-inside space-y-3 text-sm">
                    <li>
                      <strong>Generate API keys</strong> from the provider dashboards above
                    </li>
                    <li>
                      <strong>Add to Convex</strong>: Go to your{" "}
                      <a
                        href="https://dashboard.convex.dev"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Convex Dashboard
                      </a>{" "}
                      → Settings → Environment Variables
                    </li>
                    <li>
                      <strong>Set the variables</strong>:
                      <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                        <li>
                          <code className="font-mono text-xs">OPENROUTER_API_KEY</code> - Your OpenRouter key
                        </li>
                        <li>
                          <code className="font-mono text-xs">VERCEL_API_TOKEN</code> - Your Vercel token
                        </li>
                      </ul>
                    </li>
                    <li>
                      <strong>Test connections</strong> using the &quot;Test&quot; buttons on the provider cards above
                    </li>
                  </ol>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Usage & Analytics Tab */}
            <TabsContent value="usage">
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total Requests (30d)</CardDescription>
                      <CardTitle className="text-2xl">
                        {usageSummary?.total.requests.toLocaleString() ?? "—"}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total Tokens (30d)</CardDescription>
                      <CardTitle className="text-2xl">
                        {usageSummary?.total.tokens
                          ? `${(usageSummary.total.tokens / 1000000).toFixed(2)}M`
                          : "—"}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Estimated Cost (30d)</CardDescription>
                      <CardTitle className="text-2xl">
                        {usageSummary?.total.cost !== undefined
                          ? `$${usageSummary.total.cost.toFixed(2)}`
                          : "—"}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Avg Latency</CardDescription>
                      <CardTitle className="text-2xl">
                        {usageSummary?.byProvider.openrouter.avgLatency ||
                        usageSummary?.byProvider.vercel.avgLatency
                          ? `${Math.round(
                              (usageSummary.byProvider.openrouter.avgLatency +
                                usageSummary.byProvider.vercel.avgLatency) /
                                2
                            )}ms`
                          : "—"}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                {/* Provider Breakdown */}
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-500/10 text-xs font-bold text-blue-600">
                          OR
                        </div>
                        OpenRouter Usage
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Requests</span>
                          <span className="font-mono">
                            {usageSummary?.byProvider.openrouter.requests.toLocaleString() ?? "0"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tokens</span>
                          <span className="font-mono">
                            {usageSummary?.byProvider.openrouter.tokens.toLocaleString() ?? "0"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cost</span>
                          <span className="font-mono">
                            ${usageSummary?.byProvider.openrouter.cost.toFixed(4) ?? "0.00"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Success Rate</span>
                          <span className="font-mono">
                            {usageSummary?.byProvider.openrouter.successRate.toFixed(1) ?? "0"}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Latency</span>
                          <span className="font-mono">
                            {Math.round(usageSummary?.byProvider.openrouter.avgLatency ?? 0)}ms
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-purple-500/10 text-xs font-bold text-purple-600">
                          V
                        </div>
                        Vercel AI Gateway Usage
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Requests</span>
                          <span className="font-mono">
                            {usageSummary?.byProvider.vercel.requests.toLocaleString() ?? "0"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tokens</span>
                          <span className="font-mono">
                            {usageSummary?.byProvider.vercel.tokens.toLocaleString() ?? "0"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cost</span>
                          <span className="font-mono">
                            ${usageSummary?.byProvider.vercel.cost.toFixed(4) ?? "0.00"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Success Rate</span>
                          <span className="font-mono">
                            {usageSummary?.byProvider.vercel.successRate.toFixed(1) ?? "0"}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Latency</span>
                          <span className="font-mono">
                            {Math.round(usageSummary?.byProvider.vercel.avgLatency ?? 0)}ms
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Models */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUpIcon className="h-5 w-5" />
                      Top Models (30 days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {topModels && topModels.length > 0 ? (
                      <div className="space-y-3">
                        {(topModels as TopModelData[]).map((model, i) => (
                          <div
                            key={model.modelId}
                            className="flex items-center justify-between py-2 border-b last:border-0"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground w-6">{i + 1}.</span>
                              <div>
                                <div className="font-medium">{model.modelId}</div>
                                <div className="text-xs text-muted-foreground">
                                  {model.requests.toLocaleString()} requests
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-sm">
                                {(model.tokens / 1000).toFixed(1)}K tokens
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ${model.cost.toFixed(4)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Text className="text-muted-foreground">No usage data yet</Text>
                    )}
                  </CardContent>
                </Card>

                {/* Usage by Feature */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3Icon className="h-5 w-5" />
                      Usage by Feature (30 days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {usageByFeature && usageByFeature.length > 0 ? (
                      <div className="space-y-3">
                        {(usageByFeature as FeatureUsageData[]).map((feature) => (
                          <div
                            key={feature.feature}
                            className="flex items-center justify-between py-2 border-b last:border-0"
                          >
                            <div>
                              <div className="font-medium capitalize">
                                {feature.feature.replace(/_/g, " ")}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {feature.requests.toLocaleString()} requests •{" "}
                                {feature.successRate.toFixed(0)}% success
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-sm">
                                {(feature.tokens / 1000).toFixed(1)}K tokens
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ${feature.cost.toFixed(4)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Text className="text-muted-foreground">No usage data yet</Text>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Last 20 AI requests</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentUsage && recentUsage.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-3 py-2 text-left">Time</th>
                              <th className="px-3 py-2 text-left">Model</th>
                              <th className="px-3 py-2 text-left">Feature</th>
                              <th className="px-3 py-2 text-right">Tokens</th>
                              <th className="px-3 py-2 text-right">Cost</th>
                              <th className="px-3 py-2 text-right">Latency</th>
                              <th className="px-3 py-2 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {(recentUsage as RecentUsageData[]).map((usage) => (
                              <tr key={usage._id} className="hover:bg-muted/50">
                                <td className="px-3 py-2 text-xs text-muted-foreground">
                                  {usage.createdAtFormatted}
                                </td>
                                <td className="px-3 py-2 font-mono text-xs">{usage.modelId}</td>
                                <td className="px-3 py-2 capitalize text-xs">
                                  {usage.feature.replace(/_/g, " ")}
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-xs">
                                  {usage.totalTokens.toLocaleString()}
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-xs">
                                  ${usage.estimatedCost.toFixed(6)}
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-xs">
                                  {usage.latencyMs}ms
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {usage.success ? (
                                    <CheckCircleIcon className="h-4 w-4 text-green-500 inline" />
                                  ) : (
                                    <AlertCircleIcon className="h-4 w-4 text-red-500 inline" />
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <Text className="text-muted-foreground">No recent activity</Text>
                    )}
                  </CardContent>
                </Card>

                {/* External Analytics Links */}
                <Card>
                  <CardHeader>
                    <CardTitle>External Analytics</CardTitle>
                    <CardDescription>View detailed analytics on provider dashboards</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <a
                        href="https://openrouter.ai/activity"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted transition-colors"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 font-bold text-blue-600">
                          OR
                        </div>
                        <div>
                          <div className="font-medium">OpenRouter Activity</div>
                          <div className="text-sm text-muted-foreground">
                            View detailed usage, billing, and model analytics
                          </div>
                        </div>
                        <ExternalLinkIcon className="h-4 w-4 ml-auto text-muted-foreground" />
                      </a>
                      <a
                        href="https://vercel.com/dashboard"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted transition-colors"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 font-bold text-purple-600">
                          V
                        </div>
                        <div>
                          <div className="font-medium">Vercel Dashboard</div>
                          <div className="text-sm text-muted-foreground">
                            View AI Gateway metrics and observability
                          </div>
                        </div>
                        <ExternalLinkIcon className="h-4 w-4 ml-auto text-muted-foreground" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Browse Models Tab */}
            <TabsContent value="models">
              <Card>
                <CardHeader>
                  <CardTitle>Available AI Models</CardTitle>
                  <CardDescription>
                    Browse all available models from OpenRouter and Vercel AI Gateway.
                    Filter by provider or model type (language, embedding, image generation).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {allModels.length === 0 && !isLoadingModels ? (
                    <div className="py-12 text-center">
                      <SearchIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <Title className="mb-2">No Models Loaded</Title>
                      <Text className="text-muted-foreground mb-6">
                        Click the button below to fetch available models from your configured providers.
                      </Text>
                      <Button onClick={handleFetchModels} disabled={isLoadingModels}>
                        {isLoadingModels ? (
                          <>
                            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                            Fetching Models...
                          </>
                        ) : (
                          <>
                            <RefreshCwIcon className="mr-2 h-4 w-4" />
                            Fetch All Models
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <>
                      {modelsError && (
                        <div className="mb-4 p-3 rounded-md bg-amber-500/10 text-amber-600 text-sm flex items-center gap-2">
                          <AlertCircleIcon className="h-4 w-4" />
                          {modelsError}
                        </div>
                      )}
                      <ModelBrowser
                        models={allModels}
                        isLoading={isLoadingModels}
                        onRefresh={handleFetchModels}
                        providerFilter={providerFilter}
                        typeFilter={typeFilter}
                        searchQuery={modelSearchQuery}
                        onProviderFilterChange={setProviderFilter}
                        onTypeFilterChange={setTypeFilter}
                        onSearchChange={setModelSearchQuery}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* OpenRouter Tab */}
            <TabsContent value="openrouter">
              <Card>
                <CardHeader>
                  <CardTitle>OpenRouter Settings</CardTitle>
                  <CardDescription>
                    Configure OpenRouter model selection and fallback chain
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Default Model</Label>
                    <Text className="text-xs text-muted-foreground mb-2">
                      Primary model for OpenRouter requests
                    </Text>
                    <Select
                      value={getConfigValue("ai.openrouter.model", "anthropic/claude-3.5-sonnet")}
                      onValueChange={(value) => setConfigValue("ai.openrouter.model", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {OPENROUTER_MODELS.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasChanged("ai.openrouter.model") && (
                      <Badge variant="outline" className="text-xs text-amber-600">
                        Modified
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Fallback Models</Label>
                    <Text className="text-xs text-muted-foreground mb-2">
                      Models to try if the primary model fails (JSON array)
                    </Text>
                    <Input
                      value={JSON.stringify(getConfigValue("ai.openrouter.fallback_models", []))}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          if (Array.isArray(parsed)) {
                            setConfigValue("ai.openrouter.fallback_models", parsed);
                          }
                        } catch {
                          // Invalid JSON, keep current value
                        }
                      }}
                      placeholder='["openai/gpt-4o-mini", "google/gemini-pro"]'
                      className="font-mono text-sm"
                    />
                    {hasChanged("ai.openrouter.fallback_models") && (
                      <Badge variant="outline" className="text-xs text-amber-600">
                        Modified
                      </Badge>
                    )}
                  </div>

                  <div className="rounded-md bg-blue-500/10 p-4">
                    <Text className="text-sm text-blue-600">
                      OpenRouter provides access to 400+ models through a unified API.
                      Model pricing and availability may vary.{" "}
                      <a
                        href="https://openrouter.ai/models"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        View all models
                      </a>
                    </Text>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Vercel AI Tab */}
            <TabsContent value="vercel">
              <Card>
                <CardHeader>
                  <CardTitle>Vercel AI Gateway Settings</CardTitle>
                  <CardDescription>
                    Configure Vercel AI Gateway model and privacy settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Default Model</Label>
                    <Text className="text-xs text-muted-foreground mb-2">
                      Model to use with Vercel AI Gateway
                    </Text>
                    <Select
                      value={getConfigValue("ai.vercel.model", "gpt-4o")}
                      onValueChange={(value) => setConfigValue("ai.vercel.model", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {VERCEL_MODELS.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasChanged("ai.vercel.model") && (
                      <Badge variant="outline" className="text-xs text-amber-600">
                        Modified
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-4 border rounded-md px-4">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">Zero Data Retention (ZDR)</Label>
                      <Text className="text-sm text-muted-foreground">
                        Enable ZDR mode to prevent data from being stored by providers
                      </Text>
                    </div>
                    <Switch
                      checked={getConfigValue("ai.vercel.zdr_enabled", true)}
                      onCheckedChange={(checked) => setConfigValue("ai.vercel.zdr_enabled", checked)}
                    />
                  </div>
                  {hasChanged("ai.vercel.zdr_enabled") && (
                    <Badge variant="outline" className="text-xs text-amber-600">
                      ZDR setting modified
                    </Badge>
                  )}

                  <div className="rounded-md bg-purple-500/10 p-4">
                    <Text className="text-sm text-purple-600">
                      Vercel AI Gateway provides low-latency access with built-in observability,
                      caching, and Zero Data Retention mode for privacy-sensitive applications.
                    </Text>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* General Settings Tab */}
            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>General AI Settings</CardTitle>
                  <CardDescription>
                    Configure response parameters and embedding model
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="space-y-2">
                    <Label>Embedding Model</Label>
                    <Text className="text-xs text-muted-foreground mb-2">
                      Model used for RAG and semantic search
                    </Text>
                    <Select
                      value={getConfigValue("ai.embedding_model", "text-embedding-3-small")}
                      onValueChange={(value) => setConfigValue("ai.embedding_model", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select embedding model" />
                      </SelectTrigger>
                      <SelectContent>
                        {EMBEDDING_MODELS.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasChanged("ai.embedding_model") && (
                      <Badge variant="outline" className="text-xs text-amber-600">
                        Modified
                      </Badge>
                    )}
                  </div>

                  <ConfigSlider
                    label="Max Tokens"
                    description="Maximum tokens per response (100-8000)"
                    value={getConfigValue("ai.max_tokens", 2000)}
                    onChange={(value) => setConfigValue("ai.max_tokens", value)}
                    min={100}
                    max={8000}
                    step={100}
                  />
                  {hasChanged("ai.max_tokens") && (
                    <Badge variant="outline" className="text-xs text-amber-600">
                      Max tokens modified
                    </Badge>
                  )}

                  <ConfigSlider
                    label="Temperature"
                    description="Response creativity (0 = deterministic, 1 = creative)"
                    value={getConfigValue("ai.temperature", 0.7)}
                    onChange={(value) => setConfigValue("ai.temperature", value)}
                    min={0}
                    max={1}
                    step={0.1}
                    formatValue={(v) => v.toFixed(1)}
                  />
                  {hasChanged("ai.temperature") && (
                    <Badge variant="outline" className="text-xs text-amber-600">
                      Temperature modified
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Features Tab */}
            <TabsContent value="features">
              <Card>
                <CardHeader>
                  <CardTitle>AI Features</CardTitle>
                  <CardDescription>Enable or disable AI-powered features</CardDescription>
                </CardHeader>
                <CardContent>
                  <FeatureToggle
                    label="Admin Assistant"
                    description="Enable the AI assistant in the admin dashboard for moderation support, content generation, and analytics help"
                    checked={getConfigValue("ai.admin_assistant_enabled", true)}
                    onChange={(checked) => setConfigValue("ai.admin_assistant_enabled", checked)}
                  />
                  {hasChanged("ai.admin_assistant_enabled") && (
                    <Badge variant="outline" className="text-xs text-amber-600 mb-4">
                      Admin Assistant setting modified
                    </Badge>
                  )}

                  <FeatureToggle
                    label="Game Guide Chat"
                    description="Enable the Lunchtable Guide AI in the web app to help players learn the game"
                    checked={getConfigValue("ai.game_guide_enabled", true)}
                    onChange={(checked) => setConfigValue("ai.game_guide_enabled", checked)}
                  />
                  {hasChanged("ai.game_guide_enabled") && (
                    <Badge variant="outline" className="text-xs text-amber-600">
                      Game Guide setting modified
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </PageWrapper>
  );
}
