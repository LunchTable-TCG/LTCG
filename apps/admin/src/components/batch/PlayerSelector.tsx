"use client";

/**
 * PlayerSelector Component
 *
 * Multi-select player picker for batch operations.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { typedApi, useConvexQuery } from "@/lib/convexHelpers";
import type { Id } from "@convex/_generated/dataModel";
import { useMemo, useState } from "react";

// =============================================================================
// Types
// =============================================================================

interface PlayerSelectorProps {
  selectedIds: Id<"users">[];
  onSelectionChange: (ids: Id<"users">[]) => void;
  maxSelection?: number;
}

interface PlayerOption {
  playerId: Id<"users">;
  name: string;
  type: "human" | "ai";
  eloRating: number;
  rank: number;
}

// =============================================================================
// Component
// =============================================================================

export function PlayerSelector({
  selectedIds,
  onSelectionChange,
  maxSelection,
}: PlayerSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch player list from backend
  const players = useConvexQuery(typedApi.admin.admin.listPlayers, { limit: 200 }) as
    | PlayerOption[]
    | undefined;
  const isLoading = players === undefined;

  // Filter players by search
  const filteredPlayers = useMemo(() => {
    if (!players) return [];
    if (!searchQuery.trim()) return players;

    const query = searchQuery.toLowerCase();
    return players.filter((p: PlayerOption) => p.name.toLowerCase().includes(query));
  }, [players, searchQuery]);

  // Toggle selection
  const togglePlayer = (playerId: Id<"users">) => {
    if (selectedIds.includes(playerId)) {
      onSelectionChange(selectedIds.filter((id) => id !== playerId));
    } else {
      if (maxSelection && selectedIds.length >= maxSelection) {
        return; // Limit reached
      }
      onSelectionChange([...selectedIds, playerId]);
    }
  };

  // Select all visible
  const selectAllVisible = () => {
    const visibleIds = filteredPlayers.map((p: PlayerOption) => p.playerId);
    const newIds = [...new Set([...selectedIds, ...visibleIds])];
    if (maxSelection) {
      onSelectionChange(newIds.slice(0, maxSelection));
    } else {
      onSelectionChange(newIds);
    }
  };

  // Clear selection
  const clearSelection = () => {
    onSelectionChange([]);
  };

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search players..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="outline" size="sm" onClick={selectAllVisible}>
          Select Visible
        </Button>
        <Button variant="outline" size="sm" onClick={clearSelection}>
          Clear
        </Button>
      </div>

      {/* Selected Count */}
      <div className="text-sm text-muted-foreground">
        {selectedIds.length} player{selectedIds.length !== 1 ? "s" : ""} selected
        {maxSelection && ` (max ${maxSelection})`}
      </div>

      {/* Player List */}
      <ScrollArea className="h-[300px] rounded-md border">
        <div className="p-4 space-y-2">
          {isLoading ? (
            Array.from({ length: 5  }, (_, i) => i).map((i) => <Skeleton key={i} className="h-10 w-full" />)
          ) : filteredPlayers.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No players found</div>
          ) : (
            filteredPlayers.map((player: PlayerOption) => {
              const isSelected = selectedIds.includes(player.playerId);
              return (
                <div
                  key={player.playerId}
                  role="button"
                  tabIndex={0}
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                    isSelected ? "bg-primary/10 border border-primary" : "hover:bg-muted"
                  }`}
                  onClick={() => togglePlayer(player.playerId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      togglePlayer(player.playerId);
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded border ${
                        isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="w-4 h-4 text-primary-foreground"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <div>
                      <span className="font-medium">{player.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">#{player.rank}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={player.type === "human" ? "default" : "secondary"}>
                      {player.type === "human" ? "👤" : "🤖"}
                    </Badge>
                    <Badge variant="outline">{player.eloRating}</Badge>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Selected Players Preview */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedIds.slice(0, 10).map((id) => {
            const player = players?.find((p: PlayerOption) => p.playerId === id);
            return (
              <Badge
                key={id}
                variant="secondary"
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => togglePlayer(id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    togglePlayer(id);
                  }
                }}
              >
                {player?.name ?? "Unknown"} ×
              </Badge>
            );
          })}
          {selectedIds.length > 10 && (
            <Badge variant="outline">+{selectedIds.length - 10} more</Badge>
          )}
        </div>
      )}
    </div>
  );
}
