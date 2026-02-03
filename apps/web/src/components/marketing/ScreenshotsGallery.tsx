"use client";

import { motion, AnimatePresence } from "framer-motion";
import { getAssetUrl } from "@/lib/blob";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

interface Screenshot {
  id: string;
  title: string;
  description: string;
  imagePath: string;
  category: string;
}

const screenshots: Screenshot[] = [
  {
    id: "battle-arena",
    title: "Battle Arena",
    description: "Engage in strategic card battles where every move counts. Master the elements and outwit your opponents.",
    imagePath: "/assets/backgrounds/game_arena_background.png",
    category: "Combat",
  },
  {
    id: "deck-builder",
    title: "Deck Builder",
    description: "Craft the perfect deck from hundreds of unique cards. Experiment with synergies and build your winning strategy.",
    imagePath: "/assets/backgrounds/decks-bg.png",
    category: "Strategy",
  },
  {
    id: "collection",
    title: "Card Collection",
    description: "Collect rare and legendary cards. Build your collection and unlock powerful combinations.",
    imagePath: "/assets/backgrounds/collection-bg.png",
    category: "Collection",
  },
  {
    id: "story-mode",
    title: "Story Mode",
    description: "Embark on an epic journey through the realm. Uncover ancient secrets and face legendary foes.",
    imagePath: "/assets/backgrounds/story-bg.png",
    category: "Adventure",
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

  function navigateImage(direction: number) {
    if (selectedIndex === null) return;
    setImageDirection(direction);
    const newIndex = (selectedIndex + direction + screenshots.length) % screenshots.length;
    setSelectedIndex(newIndex);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (selectedIndex === null) return;
    if (e.key === "ArrowLeft") navigateImage(-1);
    if (e.key === "ArrowRight") navigateImage(1);
    if (e.key === "Escape") closeLightbox();
  }

  return (
    <section className="relative py-24 overflow-hidden bg-neutral-950">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-neutral-900 via-neutral-950 to-black" />
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] mix-blend-overlay" />

      {/* Ambient particles */}
      <div className="absolute top-20 left-10 w-2 h-2 rounded-full bg-primary/40 blur-sm animate-pulse" />
      <div className="absolute top-1/3 right-20 w-3 h-3 rounded-full bg-amber-500/30 blur-sm animate-pulse delay-300" />
      <div className="absolute bottom-32 left-1/4 w-2 h-2 rounded-full bg-primary/50 blur-sm animate-pulse delay-700" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          className="text-center mb-16 space-y-4"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="inline-block"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 mb-2">
              See It In Action
            </h2>
            <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-amber-500 to-transparent rounded-full" />
          </motion.div>
          <p className="text-xl text-neutral-400 max-w-2xl mx-auto">
            Explore the world of Lunchtable Chronicles. From intense battles to strategic deck building.
          </p>
        </motion.div>

        {/* Screenshots grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {screenshots.map((screenshot, index) => (
            <ScreenshotCard
              key={screenshot.id}
              screenshot={screenshot}
              index={index}
              onClick={() => openLightbox(index)}
            />
          ))}
        </div>
      </div>

      {/* Lightbox modal */}
      <Dialog open={selectedIndex !== null} onOpenChange={closeLightbox}>
        <DialogContent
          className="max-w-7xl w-[95vw] h-[90vh] p-0 bg-black/95 border-neutral-800"
          showCloseButton={false}
        >
          <AnimatePresence mode="wait" custom={imageDirection}>
            {selectedIndex !== null && (
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
                      src={getAssetUrl(screenshots[selectedIndex].imagePath)}
                      alt={screenshots[selectedIndex].title}
                      fill
                      className="object-contain"
                      sizes="95vw"
                      priority
                    />
                  </div>
                </div>

                {/* Caption */}
                <div className="bg-gradient-to-t from-black via-black/90 to-transparent p-8 text-center">
                  <div className="inline-block px-4 py-1 rounded-full bg-primary/20 border border-primary/50 mb-3">
                    <span className="text-sm text-primary font-medium">
                      {screenshots[selectedIndex].category}
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-amber-400 mb-2">
                    {screenshots[selectedIndex].title}
                  </h3>
                  <p className="text-neutral-300 max-w-2xl mx-auto">
                    {screenshots[selectedIndex].description}
                  </p>
                </div>

                {/* Navigation arrows */}
                <button
                  type="button"
                  onClick={() => navigateImage(-1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 border border-neutral-700 hover:border-primary/50 text-white/80 hover:text-white transition-all group"
                  aria-label="Previous screenshot"
                >
                  <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <button
                  type="button"
                  onClick={() => navigateImage(1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 border border-neutral-700 hover:border-primary/50 text-white/80 hover:text-white transition-all group"
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
                    {selectedIndex + 1} / {screenshots.length}
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
    >
      {/* Decorative frame */}
      <div className="relative rounded-xl overflow-hidden border-2 border-neutral-800/50 bg-neutral-900/50 backdrop-blur-sm transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-[0_0_30px_-5px_rgba(212,175,55,0.3)]">
        {/* Image container */}
        <div className="relative aspect-video overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <Image
            src={getAssetUrl(screenshot.imagePath)}
            alt={screenshot.title}
            fill
            className="object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
            sizes="(max-width: 768px) 100vw, 50vw"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/30 to-transparent" />

          {/* Category badge */}
          <div className="absolute top-4 left-4 z-20">
            <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-primary/30">
              <span className="text-xs font-medium text-primary">{screenshot.category}</span>
            </div>
          </div>

          {/* View indicator */}
          <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="p-4 rounded-full bg-black/80 backdrop-blur-sm border border-primary/50 shadow-lg">
              <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative p-6 space-y-2 bg-gradient-to-b from-neutral-900/80 to-neutral-900/95 backdrop-blur-sm">
          <h3 className="text-xl font-bold text-neutral-100 group-hover:text-primary transition-colors duration-300">
            {screenshot.title}
          </h3>
          <p className="text-sm text-neutral-400 group-hover:text-neutral-300 transition-colors duration-300 line-clamp-2">
            {screenshot.description}
          </p>
        </div>

        {/* Decorative corner accents */}
        <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-primary/0 group-hover:border-primary/50 transition-all duration-300" />
        <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-primary/0 group-hover:border-primary/50 transition-all duration-300" />
      </div>
    </motion.div>
  );
}
