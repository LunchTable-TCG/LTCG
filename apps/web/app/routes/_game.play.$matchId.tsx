import { MatchBoard } from "@/components/match/MatchBoard";
import { Id } from "@convex/_generated/dataModel";
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_game/play/$matchId')({
  component: PlayMatchPage,
})

function PlayMatchPage() {
  const { matchId } = Route.useParams() as { matchId: Id<"gameLobbies"> };
  return <MatchBoard matchId={matchId} />;
}
