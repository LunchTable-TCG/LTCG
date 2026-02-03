"use client";

/**
 * TemplateCard Component
 *
 * Displays a card template preview in the gallery view.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, Text, Title } from "@tremor/react";
import { Copy, MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import type { TemplateListItem } from "./types";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./types";

interface TemplateCardProps {
  template: TemplateListItem;
  onDuplicate: (templateId: string) => void;
  onDelete: (templateId: string) => void;
  onSetDefault: (templateId: string) => void;
}

export function TemplateCard({
  template,
  onDuplicate,
  onDelete,
  onSetDefault,
}: TemplateCardProps) {
  const cardTypeColors = {
    creature: "bg-red-500/20 text-red-400 border-red-500/50",
    spell: "bg-green-500/20 text-green-400 border-green-500/50",
    trap: "bg-purple-500/20 text-purple-400 border-purple-500/50",
    equipment: "bg-orange-500/20 text-orange-400 border-orange-500/50",
    universal: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  };

  return (
    <Card className="group relative overflow-hidden card-hover">
      {/* Preview Area */}
      <Link href={`/templates/${template._id}`}>
        <div className="relative aspect-[750/1050] bg-muted/50 rounded-lg overflow-hidden mb-4">
          {/* Mini canvas preview */}
          <div
            className="absolute inset-2 rounded border border-border/50"
            style={{
              background: template.defaultFrameImageUrl
                ? `url(${template.defaultFrameImageUrl}) center/cover`
                : "linear-gradient(135deg, var(--muted) 0%, var(--card) 100%)",
            }}
          >
            {/* Artwork area indicator */}
            <div
              className="absolute border-2 border-dashed border-primary/30 rounded"
              style={{
                left: `${(template.artworkBounds.x / CANVAS_WIDTH) * 100}%`,
                top: `${(template.artworkBounds.y / CANVAS_HEIGHT) * 100}%`,
                width: `${(template.artworkBounds.width / CANVAS_WIDTH) * 100}%`,
                height: `${(template.artworkBounds.height / CANVAS_HEIGHT) * 100}%`,
              }}
            />
            {/* Block count indicator */}
            <div className="absolute bottom-2 right-2 bg-background/80 px-2 py-1 rounded text-xs">
              {template.blockCount} blocks
            </div>
          </div>

          {/* Default badge */}
          {template.isDefault && (
            <div className="absolute top-2 left-2">
              <Badge className="bg-primary text-primary-foreground gap-1">
                <Star className="h-3 w-3" />
                Default
              </Badge>
            </div>
          )}

          {/* Inactive overlay */}
          {!template.isActive && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Badge variant="secondary">Inactive</Badge>
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <Title className="truncate">{template.name}</Title>
            {template.description && (
              <Text className="text-muted-foreground text-sm line-clamp-2">
                {template.description}
              </Text>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/templates/${template._id}`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(template._id)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              {!template.isDefault && (
                <DropdownMenuItem onClick={() => onSetDefault(template._id)}>
                  <Star className="mr-2 h-4 w-4" />
                  Set as Default
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(template._id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={cardTypeColors[template.cardType]}>
            {template.cardType}
          </Badge>
          <Text className="text-xs text-muted-foreground">
            {template.width}x{template.height}
          </Text>
        </div>
      </div>
    </Card>
  );
}
