"use client";

import { motion, AnimatePresence } from "framer-motion";
import { getAssetUrl } from "@/lib/blob";
import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Swords, Layers, BookOpen, ShoppingBag } from "lucide-react";
import Image from "next/image";

interface Screenshot {
  id: string;
  title: string;
  description: string;
  imagePath: string;
  icon: React.ReactNode;
  accentColor: string;
}

const screenshots: Screenshot[] = [
  {
    id: "battle-arena",
    title: "Strategic Combat",
    description: "Deploy monsters, cast spells, and outmaneuver your opponent in intense turn-based battles. Every decision matters.",
    imagePath: "/assets/backgrounds/game_arena_background.png",
    icon: <Swords className="w-5 h-5" />,
    accentColor: "#ef4444",
  },
  {
    id: "deck-builder",
    title: "Deck Building",
    description: "Craft powerful decks from hundreds of cards across 10 unique archetypes. Find synergies and build your playstyle.",
    imagePath: "/assets/backgrounds/decks-bg.png",
    icon: <Layers className="w-5 h-5" />,
    accentColor: "#3b82f6",
  },
  {
    id: "collection",
    title: "Card Collection",
    description: "Grow your collection with common to legendary cards. Each archetype offers distinct strategies to master.",
    imagePath: "/assets/backgrounds/collection-bg.png",
    icon: <ShoppingBag className="w-5 h-5" />,
    accentColor: "#a855f7",
  },
  {
    id: "story-mode",
    title: "Campaign Mode",
    description: "Battle through an epic story campaign. Face AI opponents, unlock chapters, and earn exclusive rewards.",
    imagePath: "/assets/backgrounds/story-bg.png",
    icon: <BookOpen className="w-5 h-5" />,
    accentColor: "#22c55e",
  },
];

export default function ScreenshotsGallery() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [imageDirection, setImageDirection] = useState(0);

  function openLightbox(index: number) {
    setSelectedIndex(index);
    setImageDirection(0);
  }

  function closeLightbox() {
    setSelectedIndex(null);
  }

  const navigateImage = useCallback((direction: number) => {
    setSelectedIndex((prev) => {
      if (prev === null) return null;
      setImageDirection(direction);
      return (prev + direction + screenshots.length) % screenshots.length;
    });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (selectedIndex === null) return;
      if (e.key === "ArrowLeft") navigateImage(-1);
      if (e.key === "ArrowRight") navigateImage(1);
      if (e.key === "Escape") closeLightbox();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, navigateImage]);

  const selectedScreenshot = selectedIndex !== null ? screenshots[selectedIndex] : null;

  return (
    <section className="relative py-20 overflow-hidden">
      {/* Section header */}
      <motion.div
        className="text-center mb-12 px-4"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Experience the <span className="gold-text">Action</span>
        </h2>
        <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
          From intense battles to strategic deck building, see what awaits you
        </p>
      </motion.div>

      {/* Screenshots grid - 2x2 layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl mx-auto px-4">
        {screenshots.map((screenshot, index) => (
          <ScreenshotCard
            key={screenshot.id}
            screenshot={screenshot}
            index={index}
            onClick={() => openLightbox(index)}
          />
        ))}
      </div>

      {/* Lightbox modal */}
      <Dialog open={selectedIndex !== null} onOpenChange={closeLightbox}>
        <DialogContent
          className="max-w-7xl w-[95vw] h-[90vh] p-0 bg-black/95 border-neutral-800"
          showCloseButton={false}
        >
          <AnimatePresence mode="wait" custom={imageDirection}>
            {selectedScreenshot && (
              <motion.div
                key={selectedIndex}
                custom={imageDirection}
                initial={{ opacity: 0, x: imageDirection > 0 ? 100 : -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: imageDirection > 0 ? -100 : 100 }}
                transition={{ duration: 0.3 }}
                className="relative w-full h-full flex flex-col"
              >
                {/* Image container */}
                <div className="flex-1 relative flex items-center justify-center p-8">
                  <div className="relative w-full h-full">
                    <Image
                      src={getAssetUrl(selectedScreenshot.imagePath)}
                      alt={selectedScreenshot.title}
                      fill
                      className="object-contain"
                      sizes="95vw"
                      priority
                    />
                  </div>
                </div>

                {/* Caption */}
                <div className="bg-gradient-to-t from-black via-black/90 to-transparent p-8 text-center">
                  <div
                    className="inline-flex items-center gap-2 px-4 py-1 rounded-full mb-3"
                    style={{ backgroundColor: `${selectedScreenshot.accentColor}20`, borderColor: `${selectedScreenshot.accentColor}50` }}
                  >
                    <span style={{ color: selectedScreenshot.accentColor }}>{selectedScreenshot.icon}</span>
                    <span className="text-sm font-medium" style={{ color: selectedScreenshot.accentColor }}>
                      {selectedScreenshot.title}
                    </span>
                  </div>
                  <p className="text-neutral-300 max-w-2xl mx-auto">
                    {selectedScreenshot.description}
                  </p>
                </div>

                {/* Navigation arrows */}
                <button
                  type="button"
                  onClick={() => navigateImage(-1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 border border-neutral-700 hover:border-amber-500/50 text-white/80 hover:text-white transition-all group"
                  aria-label="Previous screenshot"
                >
                  <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <button
                  type="button"
                  onClick={() => navigateImage(1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 border border-neutral-700 hover:border-amber-500/50 text-white/80 hover:text-white transition-all group"
                  aria-label="Next screenshot"
                >
                  <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Close button */}
                <button
                  type="button"
                  onClick={closeLightbox}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/80 border border-neutral-700 hover:border-red-500/50 text-white/80 hover:text-white transition-all"
                  aria-label="Close lightbox"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Image counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/60 border border-neutral-700">
                  <span className="text-sm text-neutral-300">
                    {(selectedIndex ?? 0) + 1} / {screenshots.length}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ScreenshotCard({
  screenshot,
  index,
  onClick,
}: {
  screenshot: Screenshot;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.div
      className="relative group cursor-pointer overflow-hidden rounded-xl"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
    >
      {/* Image container */}
      <div className="relative aspect-video overflow-hidden rounded-xl border-2 border-neutral-800/50 group-hover:border-amber-500/50 transition-colors duration-300">
        <Image
          src={getAssetUrl(screenshot.imagePath)}
          alt={screenshot.title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, 50vw"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

        {/* Hover glow */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-300"
          style={{ background: `radial-gradient(circle at center, ${screenshot.accentColor}, transparent 70%)` }}
        />

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-6">
          {/* Icon badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full w-fit mb-3 backdrop-blur-sm"
            style={{
              backgroundColor: `${screenshot.accentColor}20`,
              border: `1px solid ${screenshot.accentColor}40`
            }}
          >
            <span style={{ color: screenshot.accentColor }}>{screenshot.icon}</span>
            <span className="text-sm font-semibold text-white">{screenshot.title}</span>
          </div>

          {/* Description */}
          <p className="text-neutral-300 text-sm line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {screenshot.description}
          </p>
        </div>

        {/* View indicator */}
        <div className="absolute top-4 right-4 p-2 rounded-full bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </div>
      </div>
    </motion.div>
  );
}
