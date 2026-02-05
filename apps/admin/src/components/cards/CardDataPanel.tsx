"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useQuery } from "convex/react";
import { apiAny } from "@/lib/convexHelpers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CardData {
  _id: string;
  name: string;
  cardType: string;
  cost: number;
  attack?: number;
  defense?: number;
  effect?: string;
  flavorText?: string;
}

interface CardDataPanelProps {
  cardType: string;
  onCardSelect: (card: CardData) => void;
}

export default function CardDataPanel({ cardType, onCardSelect }: CardDataPanelProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const cards = useQuery(apiAny.cardDefinitions.list);
  const filteredCards = cards?.filter((c: any) => c.cardType === cardType) || [];

  const selectedCard = filteredCards.find((c: any) => c._id === selectedCardId);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCardChange = (cardId: string) => {
    setSelectedCardId(cardId);
    const card = filteredCards.find((c: any) => c._id === cardId);
    if (card) {
      onCardSelect(card);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Card Data Reference</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedCardId || ""} onValueChange={handleCardChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a card" />
          </SelectTrigger>
          <SelectContent>
            {filteredCards.map((card: any) => (
              <SelectItem key={card._id} value={card._id}>
                {card.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedCard && (
          <div className="space-y-3">
            <DataField
              label="Title"
              value={selectedCard.name}
              onCopy={() => copyToClipboard(selectedCard.name, "title")}
              copied={copiedField === "title"}
            />
            <DataField
              label="Card Type"
              value={selectedCard.cardType}
              onCopy={() => copyToClipboard(selectedCard.cardType, "cardType")}
              copied={copiedField === "cardType"}
            />
            <DataField
              label="Mana Cost"
              value={String(selectedCard.cost)}
              onCopy={() => copyToClipboard(String(selectedCard.cost), "manaCost")}
              copied={copiedField === "manaCost"}
            />
            {selectedCard.attack !== undefined && (
              <DataField
                label="ATK"
                value={String(selectedCard.attack)}
                onCopy={() => copyToClipboard(String(selectedCard.attack), "atk")}
                copied={copiedField === "atk"}
              />
            )}
            {selectedCard.defense !== undefined && (
              <DataField
                label="DEF"
                value={String(selectedCard.defense)}
                onCopy={() => copyToClipboard(String(selectedCard.defense), "def")}
                copied={copiedField === "def"}
              />
            )}
            {(selectedCard.effect || selectedCard.flavorText) && (
              <DataField
                label="Effect"
                value={selectedCard.effect || selectedCard.flavorText || ""}
                onCopy={() =>
                  copyToClipboard(selectedCard.effect || selectedCard.flavorText || "", "effect")
                }
                copied={copiedField === "effect"}
                multiline
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DataField({
  label,
  value,
  onCopy,
  copied,
  multiline,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Button variant="ghost" size="sm" onClick={onCopy} className="h-6 w-6 p-0">
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <div className={`text-sm ${multiline ? "max-h-24 overflow-y-auto" : ""}`}>{value}</div>
    </div>
  );
}
