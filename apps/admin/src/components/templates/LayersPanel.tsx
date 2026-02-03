"use client";

/**
 * LayersPanel Component
 *
 * Left sidebar showing list of text blocks with reorder and visibility controls.
 */

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Type,
  Image,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  BLOCK_CONFIGS,
  type BlockId,
  type BlockType,
  type CardTemplateBlock,
  type CardType,
  isImageBlockType,
} from "./types";

interface LayersPanelProps {
  blocks: CardTemplateBlock[];
  selectedBlockId: BlockId | null;
  templateCardType: CardType;
  onSelectBlock: (blockId: BlockId | null) => void;
  onAddBlock: (blockType: BlockType, label: string) => void;
  onDeleteBlock: (blockId: BlockId) => void;
  onReorderBlocks: (blockIds: BlockId[]) => void;
}

export function LayersPanel({
  blocks,
  selectedBlockId,
  templateCardType,
  onSelectBlock,
  onAddBlock,
  onDeleteBlock,
  onReorderBlocks,
}: LayersPanelProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newBlockType, setNewBlockType] = useState<BlockType>("custom");
  const [newBlockLabel, setNewBlockLabel] = useState("");

  // Filter block types based on template card type
  const availableBlockTypes = Object.entries(BLOCK_CONFIGS).filter(
    ([, config]) =>
      config.applicableTypes === null ||
      config.applicableTypes.includes(templateCardType) ||
      templateCardType === "universal"
  );

  // Check if block type already exists (except custom, image, icon which can have multiple)
  const multipleAllowedTypes = new Set(["custom", "image", "icon"]);
  const existingBlockTypes = new Set(
    blocks.filter((b) => !multipleAllowedTypes.has(b.blockType)).map((b) => b.blockType)
  );

  // Get icon for block type
  const getBlockIcon = (blockType: string) => {
    if (isImageBlockType(blockType as BlockType)) {
      return blockType === "icon" ? (
        <Sparkles className="h-4 w-4 text-amber-500" />
      ) : (
        <Image className="h-4 w-4 text-blue-500" />
      );
    }
    return <Type className="h-4 w-4 text-muted-foreground" />;
  };

  const handleAddBlock = () => {
    const config = BLOCK_CONFIGS[newBlockType];
    onAddBlock(newBlockType, newBlockLabel || config.label);
    setShowAddDialog(false);
    setNewBlockType("custom");
    setNewBlockLabel("");
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    const newOrder = [...blocks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    const temp = newOrder[index];
    const target = newOrder[targetIndex];
    if (temp && target) {
      newOrder[index] = target;
      newOrder[targetIndex] = temp;
    }
    onReorderBlocks(newOrder.map((b) => b._id));
  };

  return (
    <div className="w-64 border-r bg-card flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Layers</h3>
          <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {blocks.length} block{blocks.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Block List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {blocks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Type className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No text blocks</p>
              <p className="text-xs">Click + to add one</p>
            </div>
          ) : (
            blocks.map((block, index) => (
              <div
                key={block._id}
                className={cn(
                  "group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                  selectedBlockId === block._id
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-muted"
                )}
                onClick={() => onSelectBlock(block._id)}
              >
                {/* Block type icon */}
                {getBlockIcon(block.blockType)}

                {/* Block info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{block.label}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {block.blockType}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveBlock(index, "up");
                    }}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveBlock(index, "down");
                    }}
                    disabled={index === blocks.length - 1}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteBlock(block._id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Add Block Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Block</DialogTitle>
            <DialogDescription>
              Choose a text or image block type to add to your template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Block Type</Label>
              <Select
                value={newBlockType}
                onValueChange={(v) => {
                  setNewBlockType(v as BlockType);
                  setNewBlockLabel(BLOCK_CONFIGS[v as BlockType].label);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableBlockTypes.map(([type, config]) => {
                    const isDisabled =
                      !multipleAllowedTypes.has(type) && existingBlockTypes.has(type as BlockType);
                    return (
                      <SelectItem key={type} value={type} disabled={isDisabled}>
                        <div className="flex items-center gap-2">
                          <span>{config.label}</span>
                          {isDisabled && (
                            <span className="text-xs text-muted-foreground">
                              (already added)
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {BLOCK_CONFIGS[newBlockType] && (
                <p className="text-xs text-muted-foreground">
                  {BLOCK_CONFIGS[newBlockType].description}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={newBlockLabel}
                onChange={(e) => setNewBlockLabel(e.target.value)}
                placeholder="Block label"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddBlock}>Add Block</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
