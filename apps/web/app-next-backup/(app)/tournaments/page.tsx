"use client";

import { useTournamentInteraction } from "@/hooks";

export default function TournamentsPage() {
  const { tournaments, myTournaments, activeTab, createModalOpen, isLoading } =
    useTournamentInteraction();

  if (isLoading) return null;

  return (
    <div>
      <h1>Tournaments</h1>
      <pre>
        {JSON.stringify(
          {
            activeTab,
            createModalOpen,
            tournamentsCount: tournaments?.length,
            myTournamentsCount: myTournaments?.length,
          },
          null,
          2
        )}
      </pre>
    </div>
  );
}
