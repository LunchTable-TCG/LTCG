"use client";

import { FantasyFrame } from "@/components/ui/FantasyFrame";
import { getAssetUrl } from "@/lib/blob";
import { motion } from "framer-motion";
import { BookOpen, Trophy, Calendar } from "lucide-react";
import Image from "next/image";

interface GameMode {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  backgroundImage: string;
}

const gameModes: GameMode[] = [
  {
    id: "story",
    title: "Story Mode",
    description: "Campaign against AI opponents, unlock chapters, and earn rewards as you progress through an epic narrative.",
    icon: <BookOpen className="w-8 h-8" />,
    backgroundImage: "/assets/backgrounds/story-bg.png",
  },
  {
    id: "ranked",
    title: "Ranked Battles",
    description: "Competitive PvP ladder where you climb the ranks, test your skills against other players, and earn seasonal rewards.",
    icon: <Trophy className="w-8 h-8" />,
    backgroundImage: "/assets/backgrounds/game_arena_background.png",
  },
  {
    id: "events",
    title: "Events",
    description: "Limited-time challenges with special rewards and unique rules. Prove your mastery in ever-changing scenarios.",
    icon: <Calendar className="w-8 h-8" />,
    backgroundImage: "/assets/backgrounds/quests-bg.png",
  },
];

export default function GameModesSection() {
  return (
    <section className="w-full py-20 px-4 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Ways to <span className="gold-text">Play</span>
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            From solo campaigns to competitive ranked battles, find your arena
          </p>
        </motion.div>

        {/* Game Modes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gameModes.map((mode, index) => (
            <motion.div
              key={mode.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
            >
              <GameModeCard mode={mode} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GameModeCard({ mode }: { mode: GameMode }) {
  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="h-full group cursor-pointer"
    >
      <FantasyFrame
        variant="obsidian"
        className="h-full overflow-hidden hover:shadow-[0_0_30px_rgba(251,191,36,0.3)] transition-shadow duration-300"
        noPadding
      >
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <Image
            src={getAssetUrl(mode.backgroundImage)}
            alt={mode.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {/* Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />
        </div>

        {/* Content */}
        <div className="relative h-full min-h-[320px] flex flex-col justify-between p-6 z-10">
          {/* Icon */}
          <div className="flex justify-start">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-600/20 backdrop-blur-sm border border-yellow-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.2)] group-hover:shadow-[0_0_30px_rgba(234,179,8,0.4)] transition-shadow duration-300">
              <div className="text-yellow-400 group-hover:text-yellow-300 transition-colors">
                {mode.icon}
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-white group-hover:text-yellow-200 transition-colors duration-300">
              {mode.title}
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              {mode.description}
            </p>

            {/* Decorative Bottom Border */}
            <div className="pt-4">
              <div className="h-1 w-full bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </div>
        </div>

        {/* Glow Effect on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/0 via-yellow-500/0 to-yellow-500/0 group-hover:from-yellow-500/5 group-hover:via-yellow-500/0 group-hover:to-yellow-500/0 transition-all duration-300 pointer-events-none rounded-xl" />
      </FantasyFrame>
    </motion.div>
  );
}
