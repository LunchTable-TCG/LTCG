"use client";

import { apiAny, useConvexQuery } from "@/lib/convexHelpers";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { Users, Gamepad2, Swords } from "lucide-react";
import { useEffect, useRef } from "react";

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  delay: number;
}

function StatCard({ icon, value, label, delay }: StatCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  });
  const displayValue = useMotionValue(0);

  useEffect(() => {
    if (isInView) {
      const timeout = setTimeout(() => {
        motionValue.set(value);
      }, delay);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [isInView, value, delay, motionValue]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      displayValue.set(Math.round(latest));
    });
    return unsubscribe;
  }, [springValue, displayValue]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M+`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K+`;
    }
    return num.toString();
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: delay / 1000 }}
      className="relative group"
    >
      <div className="relative bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-xl p-8 border border-amber-500/20 hover:border-amber-500/40 transition-all duration-300 overflow-hidden">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Pulse effect on number */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse" />

        <div className="relative flex flex-col items-center gap-4">
          {/* Icon */}
          <div className="text-amber-400 group-hover:text-amber-300 transition-colors duration-300">
            {icon}
          </div>

          {/* Animated number */}
          <motion.div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-300 via-amber-200 to-amber-300 bg-clip-text text-transparent">
            <motion.span>
              {formatNumber(Math.round(springValue.get()))}
            </motion.span>
          </motion.div>

          {/* Label */}
          <div className="text-slate-300 text-lg font-medium text-center">
            {label}
          </div>
        </div>

        {/* Corner decorations */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-500/30 rounded-tl-xl" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-500/30 rounded-br-xl" />
      </div>
    </motion.div>
  );
}

export default function LiveStats() {
  const stats = useConvexQuery(apiAny.marketing.stats.getPublicStats);

  // Show placeholder while loading
  if (!stats) {
    return (
      <section className="py-16 px-4 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-slate-900/90 rounded-xl p-8 border border-amber-500/20 animate-pulse"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 bg-slate-800 rounded-full" />
                  <div className="w-24 h-12 bg-slate-800 rounded" />
                  <div className="w-32 h-6 bg-slate-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-300 via-amber-200 to-amber-300 bg-clip-text text-transparent mb-4">
            Join the Battle
          </h2>
          <p className="text-slate-400 text-lg">
            Thousands of players are already fighting for glory
          </p>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <StatCard
            icon={<Users className="w-12 h-12" />}
            value={stats.totalPlayers}
            label="Total Players"
            delay={0}
          />
          <StatCard
            icon={<Gamepad2 className="w-12 h-12" />}
            value={stats.gamesPlayedToday}
            label="Games Today"
            delay={150}
          />
          <StatCard
            icon={<Swords className="w-12 h-12" />}
            value={stats.totalGamesPlayed}
            label="Battles Fought"
            delay={300}
          />
        </div>

        {/* Active players indicator */}
        {stats.activePlayersNow > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-8 text-center"
          >
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/30 rounded-full px-6 py-3">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-300 font-medium">
                {stats.activePlayersNow} players online now
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
