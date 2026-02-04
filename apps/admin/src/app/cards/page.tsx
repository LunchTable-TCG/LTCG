"use client";

/**
 * Card Definitions List Page
 *
 * Browse, search, and manage card definitions.
 */

import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { RoleGuard } from "@/contexts/AdminContext";
import { typedApi, useMutation, useQuery } from "@/lib/convexHelpers";
import type { CardArchetype } from "@/lib/convexTypes";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { Badge, Card, Text, Title } from "@tremor/react";
import { PlusIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types & Constants

type CardDefinition = Doc<"cardDefinitions">;
// =============================================================================

type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
type CardType = "creature" | "spell" | "trap" | "equipment";

interface CardStats {
  totalCards: number;
  activeCards: number;
  byType: {
    creature: number;
    spell: number;
    trap: number;
    equipment?: number;
  };
  byRarity: {
    common: number;
    uncommon: number;
    rare: number;
    epic: number;
    legendary: number;
  };
}

interface CardsListResult {
  cards: CardDefinition[];
  totalCount: number;
  hasMore: boolean;
}

const RARITY_COLORS: Record<Rarity, string> = {
  common: "gray",
  uncommon: "emerald",
  rare: "blue",
  epic: "violet",
  legendary: "amber",
};

const ARCHETYPES = [
  // Primary archetypes
  { value: "infernal_dragons", label: "Infernal Dragons" },
  { value: "abyssal_depths", label: "Abyssal Depths" },
  { value: "iron_legion", label: "Iron Legion" },
  { value: "necro_empire", label: "Necro Empire" },
  // Legacy archetypes
  { value: "abyssal_horrors", label: "Abyssal Horrors" },
  { value: "nature_spirits", label: "Nature Spirits" },
  { value: "storm_elementals", label: "Storm Elementals" },
  // Future archetypes
  { value: "shadow_assassins", label: "Shadow Assassins" },
  { value: "celestial_guardians", label: "Celestial Guardians" },
  { value: "undead_legion", label: "Undead Legion" },
  { value: "divine_knights", label: "Divine Knights" },
  { value: "arcane_mages", label: "Arcane Mages" },
  { value: "mechanical_constructs", label: "Mechanical Constructs" },
  { value: "neutral", label: "Neutral" },
];

const CARD_TYPES = [
  { value: "creature", label: "Creature" },
  { value: "spell", label: "Spell" },
  { value: "trap", label: "Trap" },
  { value: "equipment", label: "Equipment" },
];

const RARITIES = [
  { value: "common", label: "Common" },
  { value: "uncommon", label: "Uncommon" },
  { value: "rare", label: "Rare" },
  { value: "epic", label: "Epic" },
  { value: "legendary", label: "Legendary" },
];

// =============================================================================
// Component
// =============================================================================

export default function CardsPage() {
  // Filters
  const [search, setSearch] = useState("");
  const [rarityFilter, setRarityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [archetypeFilter, setArchetypeFilter] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);

  // Query
  const cardsResult = useQuery(typedApi.admin.cards.listCards, {
    search: search || undefined,
    rarity: rarityFilter !== "all" ? (rarityFilter as Rarity) : undefined,
    cardType: typeFilter !== "all" ? (typeFilter as CardType) : undefined,
    archetype: archetypeFilter !== "all" ? (archetypeFilter as CardArchetype) : undefined,
    includeInactive: showInactive,
    limit: 100,
  }) as CardsListResult | undefined;

  const statsResult = useQuery(typedApi.admin.cards.getCardStats, {}) as CardStats | undefined;

  const toggleActive = useMutation(typedApi.admin.cards.toggleCardActive as any);

  const handleToggleActive = async (cardId: string, _cardName: string) => {
    try {
      const result = (await toggleActive({ cardId: cardId as Id<"cardDefinitions"> })) as {
        success: boolean;
        isActive: boolean;
        message: string;
      };
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to toggle card status");
    }
  };

  const isLoading = cardsResult === undefined;

  return (
    <PageWrapper
      title="Card Definitions"
      description="Manage game card definitions"
      actions={
        <RoleGuard permission="config.edit">
          <Button asChild>
            <Link href="/cards/new">
              <PlusIcon className="mr-2 h-4 w-4" />
              New Card
            </Link>
          </Button>
        </RoleGuard>
      }
    >
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-6 mb-6">
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold">{statsResult?.totalCards ?? "..."}</Text>
            <Text className="text-sm text-muted-foreground">Total Cards</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold text-emerald-500">
              {statsResult?.activeCards ?? "..."}
            </Text>
            <Text className="text-sm text-muted-foreground">Active</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold">{statsResult?.byType?.creature ?? "..."}</Text>
            <Text className="text-sm text-muted-foreground">Creatures</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold">{statsResult?.byType?.spell ?? "..."}</Text>
            <Text className="text-sm text-muted-foreground">Spells</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold">{statsResult?.byType?.trap ?? "..."}</Text>
            <Text className="text-sm text-muted-foreground">Traps</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold text-amber-500">
              {statsResult?.byRarity?.legendary ?? "..."}
            </Text>
            <Text className="text-sm text-muted-foreground">Legendary</Text>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Text className="text-sm text-muted-foreground mb-1">Search</Text>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="w-[150px]">
            <Text className="text-sm text-muted-foreground mb-1">Rarity</Text>
            <Select value={rarityFilter} onValueChange={setRarityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All rarities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rarities</SelectItem>
                {RARITIES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[150px]">
            <Text className="text-sm text-muted-foreground mb-1">Type</Text>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {CARD_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[180px]">
            <Text className="text-sm text-muted-foreground mb-1">Archetype</Text>
            <Select value={archetypeFilter} onValueChange={setArchetypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All archetypes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Archetypes</SelectItem>
                {ARCHETYPES.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} />
            <Text className="text-sm">Show Inactive</Text>
          </div>
        </div>
      </Card>

      {/* Card List */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <Title>Cards ({cardsResult?.totalCount ?? 0})</Title>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6", "sk-7", "sk-8", "sk-9", "sk-10"].map(
              (key) => (
                <Skeleton key={key} className="h-16 w-full" />
              )
            )}
          </div>
        ) : cardsResult?.cards.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No cards found matching your filters
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-3">Name</th>
                  <th className="text-left py-3 px-3">Rarity</th>
                  <th className="text-left py-3 px-3">Type</th>
                  <th className="text-left py-3 px-3">Archetype</th>
                  <th className="text-center py-3 px-3">Cost</th>
                  <th className="text-center py-3 px-3">ATK</th>
                  <th className="text-center py-3 px-3">DEF</th>
                  <th className="text-center py-3 px-3">Status</th>
                  <th className="text-right py-3 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cardsResult?.cards.map((card: CardDefinition) => (
                  <tr
                    key={card._id}
                    className={`border-b hover:bg-muted/30 ${!card.isActive ? "opacity-50" : ""}`}
                  >
                    <td className="py-3 px-3">
                      <Link
                        href={`/cards/${card._id}`}
                        className="font-medium hover:underline text-primary"
                      >
                        {card.name}
                      </Link>
                    </td>
                    <td className="py-3 px-3">
                      <Badge color={RARITY_COLORS[card.rarity as Rarity]} size="sm">
                        {card.rarity}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 capitalize">{card.cardType}</td>
                    <td className="py-3 px-3 text-muted-foreground">
                      {ARCHETYPES.find((a) => a.value === card.archetype)?.label ?? card.archetype}
                    </td>
                    <td className="py-3 px-3 text-center">{card.cost}</td>
                    <td className="py-3 px-3 text-center">{card.attack ?? "-"}</td>
                    <td className="py-3 px-3 text-center">{card.defense ?? "-"}</td>
                    <td className="py-3 px-3 text-center">
                      <Badge color={card.isActive ? "emerald" : "gray"} size="sm">
                        {card.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/cards/${card._id}`}>Edit</Link>
                        </Button>
                        <RoleGuard permission="config.edit">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(card._id, card.name)}
                          >
                            {card.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </RoleGuard>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {cardsResult?.hasMore && (
          <div className="mt-4 text-center">
            <Text className="text-muted-foreground">
              Showing {cardsResult.cards.length} of {cardsResult.totalCount} cards
            </Text>
          </div>
        )}
      </Card>
    </PageWrapper>
  );
}
