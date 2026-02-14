"use client";

import { BinderCard } from "@/components/collection/BinderCard";
import { StatCard } from "@/components/shared/StatCard";
import { ToolGrid } from "@/components/shared/ToolGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBinderInteraction } from "@/hooks";
import { cn } from "@/lib/utils";
import { Authenticated } from "convex/react";
import type { Id } from "@convex/_generated/dataModel";
import { Filter, Loader2, Plus, Search, Trophy } from "lucide-react";

export default function BinderPage() {
  return (
    <div className="container mx-auto px-4 py-8 pb-24 space-y-8">
      <Authenticated>
        <BinderContent />
      </Authenticated>
    </div>
  );
}

function BinderContent() {
  const {
    activeTab,
    setActiveTab,
    filteredCards,
    stats,
    isLoading,
    searchQuery,
    setSearchQuery,
    showFilters,
    setShowFilters,
    handleCreateDeck,
    toggleFavorite,
  } = useBinderInteraction();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="font-black uppercase tracking-widest ink-bleed animate-pulse">
          Opening Binder...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
        <div className="space-y-2">
          <h1 className="text-6xl font-black italic uppercase tracking-tighter ink-bleed">
            Binder
          </h1>
          <p className="font-bold text-muted-foreground uppercase text-sm">
            Manage your weapons of social destruction.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full md:w-auto">
          <StatCard
            label="Total Cards"
            value={stats?.totalCards ?? 0}
            icon={Trophy}
            delay={0.1}
          />
          <StatCard
            label="Unique Types"
            value={stats?.uniqueCards ?? 0}
            delay={0.2}
          />
          <StatCard
            label="Favorites"
            value={stats?.favoriteCount ?? 0}
            className="hidden sm:block"
            delay={0.3}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b-4 border-primary pb-6">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Filter names/archetypes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-2 border-primary shadow-[2px_2px_0px_0px_rgba(18,18,18,1)] text-xs font-bold uppercase rounded-none focus-visible:ring-0"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "border-2 border-primary shadow-[2px_2px_0px_0px_rgba(18,18,18,1)] rounded-none h-10",
              showFilters && "bg-primary text-white"
            )}
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="bg-transparent border-2 border-primary p-1 h-auto rounded-none">
              <TabsTrigger
                value="collection"
                className="rounded-none data-[state=active]:bg-primary data-[state=active]:text-white font-black uppercase text-[10px] px-4 py-2"
              >
                Collection
              </TabsTrigger>
              <TabsTrigger
                value="decks"
                className="rounded-none data-[state=active]:bg-primary data-[state=active]:text-white font-black uppercase text-[10px] px-4 py-2"
              >
                Decks
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            onClick={() => handleCreateDeck("New Deck")}
            className="tcg-button-primary px-6 h-10 flex items-center gap-2 group"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            <span>New Deck</span>
          </Button>
        </div>
      </div>

      {/* Grid View */}
      <div className="relative">
        {filteredCards.length > 0 ? (
          <ToolGrid columns={5} className="pb-12">
            {filteredCards.map((card, idx) => (
              <BinderCard
                key={card.id}
                card={card}
                delay={idx * 0.02}
                onFavoriteToggle={() => toggleFavorite(card.id as Id<"playerCards">)}
              />
            ))}
          </ToolGrid>
        ) : (
          <div className="paper-panel py-32 text-center rotate-[-1deg] border-dashed border-4">
            <div className="max-w-xs mx-auto space-y-4">
              <div className="text-6xl text-primary/20 font-black uppercase italic ink-bleed">
                Empty
              </div>
              <p className="font-bold uppercase text-muted-foreground text-sm">
                No cards found matching your search. Try broadening your hierarchy.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
