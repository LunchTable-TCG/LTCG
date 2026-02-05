"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { apiAny } from "@/lib/convexHelpers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";

interface BackgroundPickerProps {
  onSelect: (backgroundId: string, blobUrl: string) => void;
  trigger?: React.ReactNode;
}

export default function BackgroundPicker({ onSelect, trigger }: BackgroundPickerProps) {
  const [open, setOpen] = useState(false);
  const backgrounds = useQuery(apiAny.cardBackgrounds.list);

  const handleSelect = (id: string, url: string) => {
    onSelect(id, url);
    setOpen(false);
  };

  return (
    <Dialog open={open} onValueChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Select Background</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Select Card Background</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[600px]">
          <div className="grid grid-cols-3 gap-4 p-4">
            {backgrounds?.map((bg) => (
              <button
                key={bg._id}
                onClick={() => handleSelect(bg._id, bg.blobUrl)}
                className="relative aspect-[750/1050] rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-colors"
              >
                <Image
                  src={bg.blobUrl}
                  alt={bg.filename}
                  fill
                  className="object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2">
                  <p className="text-xs text-white truncate">{bg.filename}</p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
