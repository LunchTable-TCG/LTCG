"use client";

/**
 * Batch Card Renderer Page
 *
 * Allows batch rendering of cards with templates.
 * Shows card data status and enables exporting rendered cards.
 */

import { Badge, Card, Text, Title } from "@tremor/react";
import {
  AlertTriangle,
  CheckCircle,
  FileDown,
  Image as ImageIcon,
  Loader2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {  useConvexQuery } from "@/lib/convexHelpers";

// Import card data directly from the data package
import {
  ABYSSAL_DEPTHS_CARDS,
  ALL_CARDS,
  INFERNAL_DRAGONS_CARDS,
  IRON_LEGION_CARDS,
  NECRO_EMPIRE_CARDS,
  STORM_ELEMENTALS_CARDS,
} from "@data/cards";

// =============================================================================
// Types & Constants
// =============================================================================

type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

const RARITY_COLORS: Record<Rarity, string> = {
  common: "gray",
  uncommon: "emerald",
  rare: "blue",
  epic: "violet",
  legendary: "amber",
};

const ARCHETYPES = [
  { value: "all", label: "All Archetypes" },
  { value: "infernal_dragons", label: "Infernal Dragons", count: INFERNAL_DRAGONS_CARDS.length },
  { value: "abyssal_depths", label: "Abyssal Depths", count: ABYSSAL_DEPTHS_CARDS.length },
  { value: "iron_legion", label: "Iron Legion", count: IRON_LEGION_CARDS.length },
  { value: "necro_empire", label: "Necro Empire", count: NECRO_EMPIRE_CARDS.length },
  { value: "storm_elementals", label: "Storm Elementals", count: STORM_ELEMENTALS_CARDS.length },
];

const CARD_TYPES = [
  { value: "all", label: "All Types" },
  { value: "creature", label: "Creature" },
  { value: "spell", label: "Spell" },
  { value: "trap", label: "Trap" },
  { value: "equipment", label: "Equipment" },
];

const RARITIES = [
  { value: "all", label: "All Rarities" },
  { value: "common", label: "Common" },
  { value: "uncommon", label: "Uncommon" },
  { value: "rare", label: "Rare" },
  { value: "epic", label: "Epic" },
  { value: "legendary", label: "Legendary" },
];

interface RenderJob {
  cardName: string;
  status: "pending" | "rendering" | "complete" | "error";
  error?: string;
}

// =============================================================================
// Component
// =============================================================================

export default function BatchRenderPage() {
  // Filters
  const [archetypeFilter, setArchetypeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");

  // Selection state
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Render state
  const [isRendering, setIsRendering] = useState(false);
  const [renderJobs, setRenderJobs] = useState<RenderJob[]>([]);
  const [renderProgress, setRenderProgress] = useState(0);

  // Template selection
  const [selectedTemplate, setSelectedTemplate] = useState<string>("default");

  // Queries
  const templates = useConvexQuery(api.admin.templates.listTemplates, {});

  // Filter cards based on selection
  const filteredCards = useMemo(() => {
    return ALL_CARDS.filter((card) => {
      if (archetypeFilter !== "all" && card.archetype !== archetypeFilter) return false;
      if (typeFilter !== "all" && card.cardType !== typeFilter) return false;
      if (rarityFilter !== "all" && card.rarity !== rarityFilter) return false;
      return true;
    });
  }, [archetypeFilter, typeFilter, rarityFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = ALL_CARDS.length;
    const withImages = 0; // TODO: Check actual image availability
    const creatures = ALL_CARDS.filter((c) => c.cardType === "creature").length;
    const spells = ALL_CARDS.filter((c) => c.cardType === "spell").length;
    const traps = ALL_CARDS.filter((c) => c.cardType === "trap").length;

    return {
      total,
      withImages,
      missingImages: total - withImages,
      creatures,
      spells,
      traps,
      byArchetype: {
        infernal_dragons: INFERNAL_DRAGONS_CARDS.length,
        abyssal_depths: ABYSSAL_DEPTHS_CARDS.length,
        iron_legion: IRON_LEGION_CARDS.length,
        necro_empire: NECRO_EMPIRE_CARDS.length,
        storm_elementals: STORM_ELEMENTALS_CARDS.length,
      },
    };
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectAll(checked);
      if (checked) {
        setSelectedCards(new Set(filteredCards.map((c) => c.name)));
      } else {
        setSelectedCards(new Set());
      }
    },
    [filteredCards]
  );

  // Handle individual selection
  const handleSelectCard = useCallback((cardName: string, checked: boolean) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(cardName);
      } else {
        next.delete(cardName);
      }
      return next;
    });
    setSelectAll(false);
  }, []);

  // Handle batch render (placeholder - actual rendering would use Konva export)
  const handleBatchRender = async () => {
    if (selectedCards.size === 0) {
      toast.error("Please select at least one card to render");
      return;
    }

    setIsRendering(true);
    setRenderProgress(0);

    const jobs: RenderJob[] = Array.from(selectedCards).map((name) => ({
      cardName: name,
      status: "pending",
    }));
    setRenderJobs(jobs);

    // Simulate rendering process
    for (let i = 0; i < jobs.length; i++) {
      setRenderJobs((prev) =>
        prev.map((j, idx) => (idx === i ? { ...j, status: "rendering" } : j))
      );

      // Simulate render delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      setRenderJobs((prev) => prev.map((j, idx) => (idx === i ? { ...j, status: "complete" } : j)));

      setRenderProgress(Math.round(((i + 1) / jobs.length) * 100));
    }

    setIsRendering(false);
    toast.success(`Rendered ${jobs.length} cards successfully`);
  };

  // Handle export (placeholder)
  const handleExport = () => {
    toast.info("Export functionality coming soon - will export as ZIP of PNG files");
  };

  return (
    <PageWrapper
      title="Batch Card Renderer"
      description="Render multiple cards at once with templates"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/cards">← Back to Cards</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/templates">Manage Templates</Link>
          </Button>
        </div>
      }
    >
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-6 mb-6">
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold">{stats.total}</Text>
            <Text className="text-sm text-muted-foreground">Total Cards</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold text-amber-500">{stats.missingImages}</Text>
            <Text className="text-sm text-muted-foreground">Missing Images</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold">{stats.creatures}</Text>
            <Text className="text-sm text-muted-foreground">Creatures</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold">{stats.spells}</Text>
            <Text className="text-sm text-muted-foreground">Spells</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold">{stats.traps}</Text>
            <Text className="text-sm text-muted-foreground">Traps</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold text-emerald-500">{selectedCards.size}</Text>
            <Text className="text-sm text-muted-foreground">Selected</Text>
          </div>
        </Card>
      </div>

      {/* Archetype Breakdown */}
      <Card className="mb-6">
        <Title className="mb-4">Cards by Archetype</Title>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {ARCHETYPES.filter((a) => a.value !== "all").map((archetype) => (
            <div
              key={archetype.value}
              className="p-4 rounded-lg bg-muted/30 border text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setArchetypeFilter(archetype.value)}
            >
              <Text className="text-lg font-bold">{archetype.count}</Text>
              <Text className="text-sm text-muted-foreground">{archetype.label}</Text>
            </div>
          ))}
        </div>
      </Card>

      {/* Render Controls */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Template Selection */}
          <div className="w-[200px]">
            <Text className="text-sm text-muted-foreground mb-1">Template</Text>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default Template</SelectItem>
                {templates?.map((t: any) => (
                  <SelectItem key={t._id} value={t._id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filters */}
          <div className="w-[180px]">
            <Text className="text-sm text-muted-foreground mb-1">Archetype</Text>
            <Select value={archetypeFilter} onValueChange={setArchetypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ARCHETYPES.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[150px]">
            <Text className="text-sm text-muted-foreground mb-1">Type</Text>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CARD_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[150px]">
            <Text className="text-sm text-muted-foreground mb-1">Rarity</Text>
            <Select value={rarityFilter} onValueChange={setRarityFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RARITIES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1" />

          {/* Action Buttons */}
          <Button
            onClick={handleBatchRender}
            disabled={isRendering || selectedCards.size === 0}
            className="min-w-[140px]"
          >
            {isRendering ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rendering...
              </>
            ) : (
              <>
                <ImageIcon className="mr-2 h-4 w-4" />
                Render ({selectedCards.size})
              </>
            )}
          </Button>

          <Button variant="outline" onClick={handleExport} disabled={renderJobs.length === 0}>
            <FileDown className="mr-2 h-4 w-4" />
            Export ZIP
          </Button>
        </div>

        {/* Progress Bar */}
        {isRendering && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>Rendering cards...</span>
              <span>{renderProgress}%</span>
            </div>
            <Progress value={renderProgress} />
          </div>
        )}
      </Card>

      {/* Card List */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <Title>Cards ({filteredCards.length})</Title>
          <div className="flex items-center gap-2">
            <Checkbox
              id="selectAll"
              checked={selectAll}
              onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
            />
            <label htmlFor="selectAll" className="text-sm cursor-pointer">
              Select All ({filteredCards.length})
            </label>
          </div>
        </div>

        {filteredCards.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No cards found matching your filters
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-3 w-12">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="text-left py-3 px-3">Name</th>
                  <th className="text-left py-3 px-3">Rarity</th>
                  <th className="text-left py-3 px-3">Type</th>
                  <th className="text-left py-3 px-3">Archetype</th>
                  <th className="text-center py-3 px-3">Cost</th>
                  <th className="text-center py-3 px-3">ATK</th>
                  <th className="text-center py-3 px-3">DEF</th>
                  <th className="text-center py-3 px-3">Image</th>
                  <th className="text-center py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCards.map((card) => {
                  const job = renderJobs.find((j) => j.cardName === card.name);
                  const hasImage = false; // TODO: Check actual image availability

                  return (
                    <tr key={card.name} className="border-b hover:bg-muted/30">
                      <td className="py-3 px-3">
                        <Checkbox
                          checked={selectedCards.has(card.name)}
                          onCheckedChange={(checked) =>
                            handleSelectCard(card.name, checked as boolean)
                          }
                        />
                      </td>
                      <td className="py-3 px-3 font-medium">{card.name}</td>
                      <td className="py-3 px-3">
                        <Badge color={RARITY_COLORS[card.rarity as Rarity]} size="sm">
                          {card.rarity}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 capitalize">{card.cardType}</td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {card.archetype.replace(/_/g, " ")}
                      </td>
                      <td className="py-3 px-3 text-center">{card.cost}</td>
                      <td className="py-3 px-3 text-center">{card.attack ?? "-"}</td>
                      <td className="py-3 px-3 text-center">{card.defense ?? "-"}</td>
                      <td className="py-3 px-3 text-center">
                        {hasImage ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500 mx-auto" />
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {job ? (
                          job.status === "complete" ? (
                            <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" />
                          ) : job.status === "rendering" ? (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500 mx-auto" />
                          ) : job.status === "error" ? (
                            <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageWrapper>
  );
}
