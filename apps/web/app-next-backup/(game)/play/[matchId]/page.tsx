
"use client";

import { MatchBoard } from "@/components/match/MatchBoard";
import { Id } from "@convex/_generated/dataModel";
import { useParams } from "next/navigation";

export default function PlayMatchPage() {
  const params = useParams();
  const matchId = params.matchId as Id<"gameLobbies">;

  return <MatchBoard matchId={matchId} />;
}
