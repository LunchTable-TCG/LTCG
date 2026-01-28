"use client";

/**
 * Player Management Page
 *
 * Lists all players with search, filtering, and quick moderation actions.
 */

import { DataTable } from "@/components/data";
import { PageWrapper } from "@/components/layout";
import { PlayerTypeBadge, RatingBadge } from "@/components/players";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ColumnDef, PlayerType } from "@/types";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// =============================================================================
// Types
// =============================================================================

interface LeaderboardPlayer {
  playerId: any; // Id type
  name: string;
  type: PlayerType;
  eloRating: number;
  rank: number;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  avatar?: string;
  seasonRating?: number;
  peakRating?: number;
}

interface PlayerListItem extends LeaderboardPlayer {
  _id: any; // Id type
}

// =============================================================================
// Column Definitions
// =============================================================================

const columns: ColumnDef<PlayerListItem>[] = [
  {
    id: "rank",
    header: "#",
    accessorKey: "rank",
    width: 60,
    sortable: true,
  },
  {
    id: "name",
    header: "Player",
    accessorKey: "name",
    sortable: true,
    cell: (row) => <div className="font-medium">{row.name}</div>,
  },
  {
    id: "type",
    header: "Type",
    accessorKey: "type",
    cell: (row) => <PlayerTypeBadge type={row.type} />,
  },
  {
    id: "rating",
    header: "Rating",
    accessorKey: "eloRating",
    sortable: true,
    cell: (row) => <RatingBadge rating={row.eloRating} />,
  },
  {
    id: "games",
    header: "Games",
    accessorKey: "gamesPlayed",
    sortable: true,
    cell: (row) => (
      <span className="text-muted-foreground">
        {row.gamesPlayed} ({row.gamesWon}W)
      </span>
    ),
  },
  {
    id: "winRate",
    header: "Win Rate",
    accessorFn: (row) => row.winRate,
    sortable: true,
    cell: (row) => (
      <span className={row.winRate >= 0.5 ? "text-green-500" : "text-red-500"}>
        {(row.winRate * 100).toFixed(1)}%
      </span>
    ),
  },
];

// =============================================================================
// Component
// =============================================================================

export default function PlayersPage() {
  const router = useRouter();
  const [playerTypeFilter, setPlayerTypeFilter] = useState<"all" | "human" | "ai">("all");

  // Fetch player leaderboard
  const leaderboardData = useQuery(api.social.leaderboards.getLeaderboard, {
    type: "ranked",
    segment: "all",
    limit: 100,
  });

  // Transform data for table
  const tableData: PlayerListItem[] | undefined = leaderboardData?.map((entry: any) => ({
    _id: entry.userId,
    playerId: entry.userId,
    name: entry.username || "Unknown",
    type: (entry.isAiAgent ? "ai" : "human") as PlayerType,
    eloRating: entry.rating,
    rank: entry.rank,
    gamesPlayed: entry.wins + entry.losses,
    gamesWon: entry.wins,
    winRate: entry.winRate,
  }));

  const isLoading = leaderboardData === undefined;

  return (
    <PageWrapper title="Players" description="Manage and moderate player accounts">
      <DataTable<PlayerListItem>
        data={tableData}
        columns={columns}
        rowKey="_id"
        isLoading={isLoading}
        searchable
        searchPlaceholder="Search players by name..."
        searchColumns={["name"]}
        pageSize={20}
        emptyMessage="No players found"
        onRowClick={(row) => router.push(`/players/${row.playerId}`)}
        headerActions={
          <div className="flex items-center gap-4">
            <Select
              value={playerTypeFilter}
              onValueChange={(v) => setPlayerTypeFilter(v as "all" | "human" | "ai")}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Players</SelectItem>
                <SelectItem value="human">Human Only</SelectItem>
                <SelectItem value="ai">AI Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        rowActions={(row) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/players/${row.playerId}`);
            }}
          >
            View
          </Button>
        )}
      />
    </PageWrapper>
  );
}
