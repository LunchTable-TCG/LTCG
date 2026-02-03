"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { getAssetUrl } from "@/lib/blob";
import { useRef, useState } from "react";
import Image from "next/image";

type Archetype = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  themeColor: string;
  glowColor: string;
};

const archetypes: Archetype[] = [
  {
    id: "infernal_dragons",
    name: "Infernal Dragons",
    tagline: "Masters of flame and fury",
    description: "Unleash devastating fire attacks and dominate with raw power. Burn through defenses with relentless aggression.",
    themeColor: "#ef4444",
    glowColor: "rgba(239, 68, 68, 0.5)",
  },
  {
    id: "celestial_guardians",
    name: "Celestial Guardians",
    tagline: "Protectors of light",
    description: "Shield your allies and outlast your enemies. Divine protection and healing keep your forces standing.",
    themeColor: "#fbbf24",
    glowColor: "rgba(251, 191, 36, 0.5)",
  },
  {
    id: "abyssal_horrors",
    name: "Abyssal Horrors",
    tagline: "Terrors from the deep",
    description: "Summon nightmares from the abyss. Control the board with fear and devastating area effects.",
    themeColor: "#8b5cf6",
    glowColor: "rgba(139, 92, 246, 0.5)",
  },
  {
    id: "nature_spirits",
    name: "Nature Spirits",
    tagline: "Guardians of the wild",
    description: "Grow your forces over time. Patient strategy rewards you with overwhelming numbers and regeneration.",
    themeColor: "#22c55e",
    glowColor: "rgba(34, 197, 94, 0.5)",
  },
  {
    id: "storm_elementals",
    name: "Storm Elementals",
    tagline: "Wielders of lightning",
    description: "Strike fast and unpredictably. Chain lightning through enemies and control the tempo of battle.",
    themeColor: "#3b82f6",
    glowColor: "rgba(59, 130, 246, 0.5)",
  },
  {
    id: "shadow_assassins",
    name: "Shadow Assassins",
    tagline: "Dealers in darkness",
    description: "Strike from the shadows. Eliminate key targets and vanish before the enemy can react.",
    themeColor: "#64748b",
    glowColor: "rgba(100, 116, 139, 0.5)",
  },
  {
    id: "undead_legion",
    name: "Undead Legion",
    tagline: "Army of the fallen",
    description: "Death is just the beginning. Fallen units rise again, creating an endless tide of undead warriors.",
    themeColor: "#10b981",
    glowColor: "rgba(16, 185, 129, 0.5)",
  },
  {
    id: "divine_knights",
    name: "Divine Knights",
    tagline: "Champions of honor",
    description: "Lead with valor and inspire your troops. Powerful buffs and heroic charges break enemy lines.",
    themeColor: "#f59e0b",
    glowColor: "rgba(245, 158, 11, 0.5)",
  },
  {
    id: "arcane_mages",
    name: "Arcane Mages",
    tagline: "Scholars of mystery",
    description: "Master forbidden knowledge. Manipulate spells and bend reality with arcane mastery.",
    themeColor: "#ec4899",
    glowColor: "rgba(236, 72, 153, 0.5)",
  },
  {
    id: "mechanical_constructs",
    name: "Mechanical Constructs",
    tagline: "Engines of war",
    description: "Build an army of machines. Upgrade and combine constructs into unstoppable war engines.",
    themeColor: "#78716c",
    glowColor: "rgba(120, 113, 108, 0.5)",
  },
];

function ArchetypeCard({ archetype, isActive, onClick }: { archetype: Archetype; isActive: boolean; onClick: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), {
    stiffness: 300,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), {
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
      className="relative flex-shrink-0 cursor-pointer"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        width: isActive ? 320 : 200,
        transition: "width 0.3s ease",
      }}
    >
      <div
        className="relative rounded-2xl overflow-hidden transition-all duration-300"
        style={{
          boxShadow: isActive
            ? `0 0 60px -10px ${archetype.glowColor}, 0 25px 50px -12px rgba(0, 0, 0, 0.5)`
            : "0 10px 30px -10px rgba(0, 0, 0, 0.3)",
          border: isActive ? `3px solid ${archetype.themeColor}` : "2px solid rgba(255,255,255,0.1)",
        }}
      >
        {/* Image */}
        <div className={`relative overflow-hidden ${isActive ? "aspect-[3/4]" : "aspect-[2/3]"}`}>
          <Image
            src={getAssetUrl(`/assets/story/${archetype.id}.png`)}
            alt={archetype.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes={isActive ? "320px" : "200px"}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

          {/* Active indicator bar */}
          {isActive && (
            <motion.div
              layoutId="activeIndicator"
              className="absolute top-0 left-0 right-0 h-1"
              style={{ backgroundColor: archetype.themeColor }}
            />
          )}
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
          <h3
            className="font-bold text-white transition-all duration-300"
            style={{
              fontSize: isActive ? "1.25rem" : "0.875rem",
              color: isActive ? archetype.themeColor : "white",
            }}
          >
            {archetype.name}
          </h3>
          {isActive && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-neutral-400 text-sm mt-1"
            >
              {archetype.tagline}
            </motion.p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function CharacterShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeArchetype = archetypes[activeIndex];

  return (
    <section className="relative py-24 overflow-hidden bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950">
      {/* Background glow based on active archetype */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: `radial-gradient(ellipse at center, ${activeArchetype?.glowColor ?? 'transparent'}20 0%, transparent 60%)`,
        }}
        transition={{ duration: 0.5 }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Master Your <span className="gold-text">Archetype</span>
          </h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            Ten legendary paths to power. Each with unique strategies, abilities, and playstyles.
          </p>
        </motion.div>

        {/* Active archetype description */}
        <motion.div
          key={activeArchetype?.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 max-w-2xl mx-auto"
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
            style={{
              backgroundColor: `${activeArchetype?.themeColor ?? '#fff'}20`,
              border: `1px solid ${activeArchetype?.themeColor ?? '#fff'}50`,
            }}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: activeArchetype?.themeColor }}
            />
            <span
              className="font-semibold"
              style={{ color: activeArchetype?.themeColor }}
            >
              {activeArchetype?.name}
            </span>
          </div>
          <p className="text-neutral-300 text-lg">
            {activeArchetype?.description}
          </p>
        </motion.div>

        {/* Carousel */}
        <div className="relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-neutral-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-neutral-950 to-transparent z-10 pointer-events-none" />

          {/* Scrollable cards */}
          <div className="overflow-x-auto scrollbar-hide pb-4">
            <div className="flex gap-4 px-8 justify-center items-end min-w-max">
              {archetypes.map((archetype, index) => (
                <ArchetypeCard
                  key={archetype.id}
                  archetype={archetype}
                  isActive={index === activeIndex}
                  onClick={() => setActiveIndex(index)}
                />
              ))}
            </div>
          </div>

          {/* Navigation dots */}
          <div className="flex justify-center gap-2 mt-6">
            {archetypes.map((archetype, index) => (
              <button
                key={archetype.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className="w-2 h-2 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: index === activeIndex ? archetype.themeColor : "#525252",
                  transform: index === activeIndex ? "scale(1.5)" : "scale(1)",
                }}
                aria-label={`Select ${archetype.name}`}
              />
            ))}
          </div>
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
