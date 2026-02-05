"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stage, Layer, Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import BackgroundPicker from "./BackgroundPicker";

type CardType = "creature" | "spell" | "trap" | "magic" | "environment";

export default function TemplateDesigner() {
  const [cardType, setCardType] = useState<CardType>("creature");
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [backgroundId, setBackgroundId] = useState<string | null>(null);
  const [canvasSize] = useState({ width: 750, height: 1050 });
  const [zoom, setZoom] = useState(1);

  function BackgroundImage({ url }: { url: string }) {
    const [image] = useImage(url);
    return <KonvaImage image={image} width={750} height={1050} />;
  }

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

          <BackgroundPicker
            onSelect={(id, url) => {
              setBackgroundId(id);
              setBackgroundUrl(url);
            }}
          />

          <Button variant="outline" className="w-full">
            Add Text Field
          </Button>
        </Card>
      </div>

      {/* Center Canvas */}
      <div className="flex items-center justify-center bg-muted/20 p-4">
        <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
          <Stage width={canvasSize.width} height={canvasSize.height}>
            <Layer>
              {backgroundUrl && <BackgroundImage url={backgroundUrl} />}
            </Layer>
          </Stage>
        </div>
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
