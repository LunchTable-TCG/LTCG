"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FolderIcon } from "lucide-react";
import type { FolderCardProps } from "./types";

export function FolderCard({ folder, onClick, onContextMenu }: FolderCardProps) {
  return (
    <Card
      className={cn(
        "group cursor-pointer p-4 hover:bg-accent/50 transition-colors",
        "flex flex-col items-center gap-2 text-center"
      )}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <FolderIcon className="w-8 h-8 text-primary" />
      </div>
      <div className="w-full">
        <p className="font-medium text-sm truncate">{folder.name}</p>
        {folder.description && (
          <p className="text-xs text-muted-foreground truncate">{folder.description}</p>
        )}
      </div>
    </Card>
  );
}
