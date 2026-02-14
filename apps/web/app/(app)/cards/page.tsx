
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LibraryCard } from "@/components/deck/LibraryCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Search } from "lucide-react";

export default function CardLibraryPage() {
  const cards = useQuery(api.lunchtableTcgCards.component.cards.getAllCards);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const filteredCards = cards?.filter((card: any) => {
    const matchesSearch = card.name.toLowerCase().includes(search.toLowerCase()) ||
                          card.abilityText?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || card.cardType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-black uppercase tracking-tighter">Card Catalog</h1>
        <p className="text-muted-foreground w-full max-w-2xl">
          Browse the complete collection of stereotypes, vices, and coping mechanisms.
        </p>

        {/* Controls */}
        <div className="flex gap-4 items-center bg-muted/20 p-4 rounded-lg border border-border">
          <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
             <Input
               placeholder="Search cards..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="pl-9 bg-background"
             />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="Filter by Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="stereotype">Stereotypes</SelectItem>
              <SelectItem value="spell">Spells</SelectItem>
              <SelectItem value="trap">Traps</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {!cards ? (
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="w-full h-64 bg-muted/20 animate-pulse border-2 border-dashed border-muted rounded-sm" />
          ))
        ) : filteredCards?.length === 0 ? (
           <div className="col-span-full py-12 text-center text-muted-foreground">
             No cards found matching your criteria.
           </div>
        ) : (
          filteredCards?.map((card: any) => (
            <div key={card._id} className="flex justify-center">
                <LibraryCard card={card} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
