"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type CardType = "creature" | "spell" | "trap" | "magic" | "environment";

export default function TemplateDesigner() {
  const [cardType, setCardType] = useState<CardType>("creature");
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);

  return (
    <div className="h-full grid grid-cols-[300px_1fr_300px] gap-4 p-4">
      {/* Left Panel */}
      <div className="space-y-4 overflow-y-auto">
        <Card className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Card Type</label>
            <Select value={cardType} onValueChange={(v) => setCardType(v as CardType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="creature">Creature</SelectItem>
                <SelectItem value="spell">Spell</SelectItem>
                <SelectItem value="trap">Trap</SelectItem>
                <SelectItem value="magic">Magic</SelectItem>
                <SelectItem value="environment">Environment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" className="w-full">
            Select Background
          </Button>

          <Button variant="outline" className="w-full">
            Add Text Field
          </Button>
        </Card>
      </div>

      {/* Center Canvas */}
      <div className="flex items-center justify-center bg-muted/20">
        <div className="text-muted-foreground">Canvas will go here</div>
      </div>

      {/* Right Panel */}
      <div className="space-y-4 overflow-y-auto">
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Preview</h3>
          <div className="aspect-[750/1050] bg-muted/20 rounded flex items-center justify-center text-muted-foreground text-sm">
            Preview
          </div>
        </Card>
      </div>
    </div>
  );
}
