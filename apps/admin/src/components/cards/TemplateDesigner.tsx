"use client";

import { useState, useRef, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stage, Layer, Image as KonvaImage, Text, Transformer } from "react-konva";
import useImage from "use-image";
import { useMutation } from "convex/react";
import { apiAny } from "@/lib/convexHelpers";
import BackgroundPicker from "./BackgroundPicker";
import TextFieldEditor from "./TextFieldEditor";
import CardDataPanel from "./CardDataPanel";

type CardType = "creature" | "spell" | "trap" | "magic" | "environment";

interface TextField {
  id: string;
  dataField: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  align: string;
  stroke?: { color: string; width: number };
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number };
  letterSpacing: number;
  lineHeight: number;
  autoScale: boolean;
  text: string; // For preview
}

export default function TemplateDesigner() {
  const [cardType, setCardType] = useState<CardType>("creature");
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [backgroundId, setBackgroundId] = useState<string | null>(null);
  const [canvasSize] = useState({ width: 750, height: 1050 });
  const [textFields, setTextFields] = useState<TextField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [previewCard, setPreviewCard] = useState<any>(null);

  const saveTemplate = useMutation(apiAny.cardTypeTemplates.upsert);

  const handleSaveTemplate = async () => {
    if (!backgroundId) {
      alert("Please select a background first");
      return;
    }

    try {
      await saveTemplate({
        cardType,
        name: `${cardType.charAt(0).toUpperCase() + cardType.slice(1)} Template`,
        backgroundId,
        canvasWidth: canvasSize.width,
        canvasHeight: canvasSize.height,
        textFields: textFields.map(({ text, ...field }) => field), // Remove preview text
      });
      alert("Template saved successfully!");
    } catch (error) {
      console.error("Failed to save template:", error);
      alert("Failed to save template");
    }
  };

  const handleAddTextField = () => {
    const newField: TextField = {
      id: `field_${Date.now()}`,
      dataField: "title",
      x: 100,
      y: 100,
      width: 300,
      height: 50,
      rotation: 0,
      fontFamily: "Arial",
      fontSize: 24,
      fontWeight: "normal",
      color: "#FFFFFF",
      align: "center",
      letterSpacing: 0,
      lineHeight: 1.2,
      autoScale: false,
      text: "Sample Text",
    };
    setTextFields([...textFields, newField]);
    setSelectedFieldId(newField.id);
  };

  useEffect(() => {
    if (previewCard) {
      setTextFields(
        textFields.map((field) => {
          let text = "Sample Text";
          switch (field.dataField) {
            case "title":
              text = previewCard.name;
              break;
            case "cardType":
              text = previewCard.cardType;
              break;
            case "manaCost":
              text = String(previewCard.cost);
              break;
            case "atk":
              text = String(previewCard.attack || "");
              break;
            case "def":
              text = String(previewCard.defense || "");
              break;
            case "effect":
              text = previewCard.effect || previewCard.flavorText || "";
              break;
          }
          return { ...field, text };
        })
      );
    }
  }, [previewCard]);

  function DraggableText({
    field,
    isSelected,
    onSelect,
    onChange,
  }: {
    field: TextField;
    isSelected: boolean;
    onSelect: () => void;
    onChange: (newAttrs: Partial<TextField>) => void;
  }) {
    const textRef = useRef<typeof Text | null>(null);
    const trRef = useRef<typeof Transformer | null>(null);

    useEffect(() => {
      if (isSelected && trRef.current && textRef.current) {
        trRef.current.nodes([textRef.current]);
        trRef.current.getLayer()?.batchDraw();
      }
    }, [isSelected]);

    return (
      <>
        <Text
          ref={textRef}
          {...field}
          draggable
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={(e) => {
            onChange({
              x: e.target.x(),
              y: e.target.y(),
            });
          }}
          onTransformEnd={() => {
            const node = textRef.current;
            const scaleX = node.scaleX();
            const scaleY = node.scaleY();

            node.scaleX(1);
            node.scaleY(1);

            onChange({
              x: node.x(),
              y: node.y(),
              width: Math.max(5, node.width() * scaleX),
              height: Math.max(node.height() * scaleY),
              rotation: node.rotation(),
            });
          }}
        />
        {isSelected && (
          <Transformer
            ref={trRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 5 || newBox.height < 5) {
                return oldBox;
              }
              return newBox;
            }}
          />
        )}
      </>
    );
  }

  function BackgroundImage({ url }: { url: string }) {
    const [image] = useImage(url);
    return <KonvaImage image={image} width={750} height={1050} />;
  }

  return (
    <div className="h-full grid grid-cols-[300px_1fr_300px] gap-4 p-4">
      {/* Left Panel */}
      <div className="space-y-4 overflow-y-auto">
        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <label htmlFor="card-type-select" className="text-sm font-medium">Card Type</label>
            <Select value={cardType} onValueChange={(v) => setCardType(v as CardType)}>
              <SelectTrigger id="card-type-select">
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

          <Button variant="outline" className="w-full" onClick={handleAddTextField}>
            Add Text Field
          </Button>
        </Card>

        {selectedFieldId && (() => {
          const selectedField = textFields.find((f) => f.id === selectedFieldId);
          if (!selectedField) return null;

          return (
            <TextFieldEditor
              field={selectedField}
              onChange={(updates) => {
                setTextFields(
                  textFields.map((f) => (f.id === selectedFieldId ? { ...f, ...updates } : f))
                );
              }}
              onDelete={() => {
                setTextFields(textFields.filter((f) => f.id !== selectedFieldId));
                setSelectedFieldId(null);
              }}
            />
          );
        })()}
      </div>

      {/* Center Canvas */}
      <div className="flex items-center justify-center bg-muted/20 p-4">
        <Stage
          width={canvasSize.width}
          height={canvasSize.height}
          onMouseDown={(e) => {
            const clickedOnEmpty = e.target === e.target.getStage();
            if (clickedOnEmpty) {
              setSelectedFieldId(null);
            }
          }}
        >
          <Layer>
            {backgroundUrl && <BackgroundImage url={backgroundUrl} />}
            {textFields.map((field) => (
              <DraggableText
                key={field.id}
                field={field}
                isSelected={field.id === selectedFieldId}
                onSelect={() => setSelectedFieldId(field.id)}
                onChange={(newAttrs) => {
                  setTextFields(
                    textFields.map((f) =>
                      f.id === field.id ? { ...f, ...newAttrs } : f
                    )
                  );
                }}
              />
            ))}
          </Layer>
        </Stage>
      </div>

      {/* Right Panel */}
      <div className="space-y-4 overflow-y-auto">
        <CardDataPanel cardType={cardType} onCardSelect={setPreviewCard} />

        <Card className="p-4">
          <h3 className="font-semibold mb-2">Actions</h3>
          <div className="space-y-2">
            <Button className="w-full" onClick={handleSaveTemplate}>Save Template</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
