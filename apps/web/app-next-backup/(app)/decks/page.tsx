"use client";

import { useDeckBuilder } from "@/hooks/collection/useDeckBuilder";
import { StatCard } from "@/components/shared/StatCard";
import { ToolGrid } from "@/components/shared/ToolGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash, Play, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function DecksPage() {
  const { decks, isLoading, createDeck, deleteDeck, setActiveDeck } = useDeckBuilder();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateDeck = async () => {
    setIsCreating(true);
    try {
      const deckId = await createDeck("New Deck");
      router.push(`/decks/builder/${deckId}`);
    } catch (error) {
      // Error handled by hook toast
    } finally {
      setIsCreating(false);
    }
  };

  const activeDeck = decks?.find((d: any) => d.isActive);

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 scanner-noise min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b-4 border-primary">
        <div className="space-y-1">
          <div className="inline-block px-3 py-1 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest mb-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
            Loadout Registry
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase italic leading-none tracking-tighter ink-bleed">
            Decks
          </h1>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-tight max-w-md">
            Manage your card configurations for the hierarchy battles.
          </p>
        </div>

        <Button
          onClick={handleCreateDeck}
          disabled={isCreating || isLoading}
          className="tcg-button-primary px-8 h-14 text-lg gap-3"
        >
          <Plus className="w-6 h-6" />
          Assemble New
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Loadouts"
          value={decks?.length ?? 0}
          delay={0.1}
        />
        <StatCard
          label="Active Status"
          value={activeDeck ? "DEPLOYED" : "NONE"}
          className={activeDeck ? "text-destructive" : "text-muted-foreground"}
          delay={0.2}
        />
        <StatCard
          label="Active Deck"
          value={activeDeck?.name ?? "---"}
          className="hidden lg:block truncate"
          delay={0.3}
        />
        <StatCard
          label="Total Cards"
          value={decks?.reduce((sum: number, d: any) => sum + (d.cardCount || 0), 0) ?? 0}
          className="hidden xl:block"
          delay={0.4}
        />
      </div>

      {/* Decks Grid */}
      <ToolGrid isLoading={isLoading} isEmpty={!decks || decks.length === 0} emptyMessage="No decks found in the registry. Assemble one to begin.">
        {decks?.map((deck: any, index: number) => (
          <motion.div
            key={deck.deckId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "paper-panel group relative flex flex-col p-6 min-h-[220px] transition-all border-2 border-primary",
              "hover:shadow-[8px_8px_0px_0px_rgba(18,18,18,1)] hover:-translate-y-1",
              deck.isActive && "bg-secondary/20 ring-4 ring-primary ring-offset-4 ring-offset-background"
            )}
          >
            {/* Delete Option */}
            <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-10 w-10 text-destructive border-2 border-transparent hover:border-destructive hover:bg-destructive/10 rounded-none shadow-none">
                    <Trash className="w-5 h-5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="paper-panel border-4 border-primary rounded-none shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-3xl font-black uppercase italic ink-bleed">Destroy Deck?</AlertDialogTitle>
                    <AlertDialogDescription className="text-foreground font-bold uppercase text-sm">
                      This action is irreversible. The deck config "{deck.name}" will be wiped from the registry.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-4">
                    <AlertDialogCancel className="tcg-button-outline px-6">Abort</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteDeck(deck.deckId)}
                      className="tcg-button-destructive px-6"
                    >
                      Confirm Destruction
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Active Status Badge */}
            {deck.isActive && (
              <div className="absolute -top-3 -left-3 bg-destructive text-destructive-foreground px-3 py-1 font-black text-xs uppercase italic border-2 border-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-10 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Deployed
              </div>
            )}

            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none ink-bleed truncate pr-10">
                  {deck.name}
                </h3>
                <p className="text-xs font-bold text-muted-foreground uppercase mt-2 line-clamp-2">
                  {deck.description || "No registry description provided."}
                </p>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <Badge variant="outline" className="text-[10px] font-black uppercase rounded-none border-2 border-primary bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] px-2">
                  {deck.deckArchetype || "Neutral"}
                </Badge>
                <div className="text-[10px] font-black uppercase opacity-60">
                  {deck.cardCount}/60 Loaded
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <Button asChild variant="outline" className="tcg-button-outline flex-1 gap-2 border-2 px-0 h-11">
                <Link href={`/decks/builder/${deck.deckId}`}>
                  <Edit className="w-4 h-4" /> Edit
                </Link>
              </Button>
              {!deck.isActive && (
                <Button
                  onClick={() => setActiveDeck(deck.deckId)}
                  className="tcg-button-primary flex-1 gap-2 border-2 px-0 h-11"
                >
                   <Play className="w-4 h-4" /> Deploy
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </ToolGrid>
    </div>
  );
}
