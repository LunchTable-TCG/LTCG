
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Plus, Edit, Trash, Play } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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
import { usePrivy } from "@privy-io/react-auth";

export default function DecksPage() {
  const { user } = usePrivy();
  const userId = user?.id;

  // Queries
  const decks = useQuery(api.lunchtableTcgCards.component.decks.getUserDecks, userId ? { userId } : "skip");

  // Mutations
  const createDeck = useMutation(api.lunchtableTcgCards.component.decks.createDeck);
  const deleteDeck = useMutation(api.lunchtableTcgCards.component.decks.deleteDeck);
  const setActiveDeck = useMutation(api.lunchtableTcgCards.component.decks.setActiveDeck);

  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateDeck = async () => {
    if (!userId) return;
    setIsCreating(true);
    try {
      const deckId = await createDeck({
        userId,
        name: "New Deck",
        description: "A fresh start.",
        deckArchetype: "neutral",
      });
      toast.success("Deck created!");
      router.push(`/decks/builder/${deckId}`);
    } catch (error) {
      toast.error("Failed to create deck");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteDeck = async (deckId: any) => {
    try {
        await deleteDeck({ deckId });
        toast.success("Deck deleted");
    } catch (error) {
        toast.error("Failed to delete deck");
    }
  };

  const handleSetActive = async (deckId: any) => {
      if (!userId) return;
      try {
          await setActiveDeck({ userId, deckId });
          toast.success("Active deck updated!");
      } catch (error: any) {
          toast.error(error.message || "Failed to set active deck");
      }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Decks</h1>
          <p className="text-muted-foreground">Manage your loadouts for the lunch table.</p>
        </div>
        <Button onClick={handleCreateDeck} disabled={isCreating} className="gap-2">
          <Plus className="w-4 h-4" />
          New Deck
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {!decks ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="bg-muted/50 animate-pulse h-48" />
          ))
        ) : decks.length === 0 ? (
          <Card className="col-span-full bg-muted/20 border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <Plus className="w-12 h-12 mb-4 opacity-20" />
              <p>You have no decks yet.</p>
              <Button variant="link" onClick={handleCreateDeck}>Create one?</Button>
            </CardContent>
          </Card>
        ) : (
          decks.map((deck: any) => (
            <Card key={deck.deckId} className="group relative overflow-hidden transition-all hover:border-black/50">
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" asChild>
                        <AlertDialog>
                            <AlertDialogTrigger>
                                <Trash className="w-4 h-4" />
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Deck?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete your deck "{deck.name}".
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteDeck(deck.deckId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </Button>
                </div>

                <CardHeader>
                    <CardTitle className="uppercase font-bold truncate pr-12">{deck.name}</CardTitle>
                    <CardDescription className="line-clamp-1">{deck.description || "No description"}</CardDescription>
                </CardHeader>

                <CardContent>
                    <div className="flex justify-between text-sm font-mono text-muted-foreground">
                        <span>{deck.deckArchetype || "Neutral"}</span>
                        <span>{deck.cardCount}/60 Cards</span>
                    </div>
                </CardContent>

                <CardFooter className="gap-2">
                    <Button variant="outline" className="flex-1 gap-2" asChild>
                        <Link href={`/decks/builder/${deck.deckId}`}>
                            <Edit className="w-4 h-4" /> Edit
                        </Link>
                    </Button>
                    <Button variant="secondary" className="flex-1 gap-2" onClick={() => handleSetActive(deck.deckId)}>
                        <Play className="w-4 h-4" /> Set Active
                    </Button>
                </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
