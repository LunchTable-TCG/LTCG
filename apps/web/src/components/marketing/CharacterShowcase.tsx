"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { getAssetUrl } from "@/lib/blob";
import { useRef } from "react";

interface Archetype {
  id: string;
  name: string;
  tagline: string;
  themeColor: string;
}

const archetypes: Archetype[] = [
  {
    id: "infernal_dragons",
    name: "Infernal Dragons",
    tagline: "Masters of flame and fury",
    themeColor: "#ef4444", // red
  },
  {
    id: "abyssal_horrors",
    name: "Abyssal Horrors",
    tagline: "Terrors from the deep",
    themeColor: "#8b5cf6", // purple
  },
  {
    id: "nature_spirits",
    name: "Nature Spirits",
    tagline: "Guardians of the wild",
    themeColor: "#22c55e", // green
  },
  {
    id: "storm_elementals",
    name: "Storm Elementals",
    tagline: "Wielders of lightning",
    themeColor: "#3b82f6", // blue
  },
  {
    id: "shadow_assassins",
    name: "Shadow Assassins",
    tagline: "Dealers in darkness",
    themeColor: "#6b7280", // gray
  },
  {
    id: "celestial_guardians",
    name: "Celestial Guardians",
    tagline: "Protectors of light",
    themeColor: "#fbbf24", // amber
  },
  {
    id: "undead_legion",
    name: "Undead Legion",
    tagline: "Army of the fallen",
    themeColor: "#10b981", // emerald
  },
  {
    id: "divine_knights",
    name: "Divine Knights",
    tagline: "Champions of honor",
    themeColor: "#f59e0b", // orange
  },
  {
    id: "arcane_mages",
    name: "Arcane Mages",
    tagline: "Scholars of mystery",
    themeColor: "#a855f7", // purple
  },
  {
    id: "mechanical_constructs",
    name: "Mechanical Constructs",
    tagline: "Engines of war",
    themeColor: "#64748b", // slate
  },
];

function ArchetypeCard({ archetype }: { archetype: Archetype }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), {
    stiffness: 300,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), {
    stiffness: 300,
    damping: 30,
  });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set((e.clientX - centerX) / rect.width);
    mouseY.set((e.clientY - centerY) / rect.height);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  return (
    <motion.div
      ref={cardRef}
      className="relative flex-shrink-0 w-72 group cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
    >
      <div
        className="relative rounded-2xl overflow-hidden border border-neutral-800/50 bg-neutral-900/80 backdrop-blur-sm transition-all duration-300 group-hover:border-neutral-700"
        style={{
          boxShadow: `0 0 30px -10px ${archetype.themeColor}40`,
        }}
      >
        {/* Glow effect */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl"
          style={{
            background: `radial-gradient(circle at center, ${archetype.themeColor}30, transparent 70%)`,
          }}
        />

        {/* Image container */}
        <div className="relative aspect-[3/4] overflow-hidden">
          <motion.img
            src={getAssetUrl(`story/${archetype.id}.png`)}
            alt={archetype.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/20 to-transparent" />

          {/* Theme color accent */}
          <div
            className="absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ backgroundColor: archetype.themeColor }}
          />
        </div>

        {/* Content */}
        <div className="relative p-6 space-y-2" style={{ transform: "translateZ(20px)" }}>
          <h3 className="text-2xl font-bold text-neutral-100 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r transition-all duration-300"
            style={{
              backgroundImage: `linear-gradient(to right, ${archetype.themeColor}, #fbbf24)`,
            }}
          >
            {archetype.name}
          </h3>
          <p className="text-neutral-400 group-hover:text-neutral-300 transition-colors duration-300">
            {archetype.tagline}
          </p>
        </div>

        {/* Decorative corner accents */}
        <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 opacity-0 group-hover:opacity-50 transition-opacity duration-300"
          style={{ borderColor: archetype.themeColor }}
        />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 opacity-0 group-hover:opacity-50 transition-opacity duration-300"
          style={{ borderColor: archetype.themeColor }}
        />
      </div>
    </motion.div>
  );
}

export default function CharacterShowcase() {
  return (
    <section className="relative py-24 overflow-hidden bg-neutral-950">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-neutral-950 to-black" />
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] mix-blend-overlay" />

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
              Choose Your Path
            </h2>
            <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-amber-500 to-transparent rounded-full" />
          </motion.div>
          <p className="text-xl text-neutral-400 max-w-2xl mx-auto">
            Ten legendary archetypes await. Each path offers unique powers and strategies.
            Which will you master?
          </p>
        </motion.div>

        {/* Scrolling carousel */}
        <div className="relative">
          {/* Fade gradients on edges */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-neutral-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-neutral-950 to-transparent z-10 pointer-events-none" />

          {/* Scrollable container */}
          <div className="overflow-x-auto scrollbar-hide pb-8">
            <div className="flex gap-6 px-4 min-w-max">
              {archetypes.map((archetype) => (
                <ArchetypeCard key={archetype.id} archetype={archetype} />
              ))}
            </div>
          </div>

          {/* Scroll hint */}
          <motion.div
            className="text-center mt-8 text-sm text-neutral-500"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
          >
            <span className="inline-flex items-center gap-2">
              <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              Scroll to explore all archetypes
              <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </span>
          </motion.div>
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  );
}
