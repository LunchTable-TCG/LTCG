"use client";

import { cn } from "@/lib/utils";
import { getAssetUrl } from "@/lib/blob";
import { motion } from "framer-motion";
import { ArrowRight, Flame, type LucideIcon, Play, Scroll, Sparkles, Trophy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Hero Background Image - Responsive */}
      <div className="fixed inset-0 z-0">
        {/* Desktop/Landscape - 1536x1024 */}
        <Image
          src="/brand/backgrounds/ltcg-hero-1536x1024.branded.png"
          alt="Lunchtable TCG Background"
          fill
          className="object-cover hidden md:block"
          priority
          quality={90}
        />
        {/* Mobile/Portrait - 1024x1536 */}
        <Image
          src="/brand/backgrounds/ltcg-vertical-1024x1536.png"
          alt="Lunchtable TCG Background"
          fill
          className="object-cover block md:hidden"
          priority
          quality={90}
        />
      </div>

      {/* Dark tint overlay for readability */}
      <div className="absolute inset-0 bg-black/60 pointer-events-none z-[1]" />
      <div className="absolute inset-0 bg-vignette pointer-events-none z-[1]" />

      {/* Ambient particles/lights */}
      <div className="absolute top-20 left-10 w-3 h-3 rounded-full bg-ember/60 blur-sm animate-torch" />
      <div className="absolute top-1/4 right-20 w-2 h-2 rounded-full bg-primary/40 blur-sm animate-torch-delayed" />
      <div className="absolute bottom-40 left-1/4 w-2 h-2 rounded-full bg-ember/50 blur-sm animate-torch" />

      <main className="container mx-auto px-4 relative z-10 pt-8 pb-20">
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center mb-24">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mb-4 relative"
          >
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl opacity-50" />
            <Image
              src={getAssetUrl("/assets/logo-main.png")}
              alt="Lunchtable Chronicles"
              width={600}
              height={600}
              className="w-[85vw] md:w-[600px] h-auto mx-auto drop-shadow-2xl animate-float-subtle relative z-10"
              sizes="(max-width: 768px) 85vw, 600px"
              priority
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="max-w-2xl text-lg md:text-xl text-foreground/80 mb-6 leading-relaxed drop-shadow-sm font-medium"
          >
            Enter a world of ancient spells and legendary artifacts. Build your deck, challenge
            rivals, and etch your name into the{" "}
            <span className="gold-text font-bold">Grimoire of Legends</span>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Link href="/play">
              <button
                type="button"
                className="tcg-button-primary px-8 py-4 rounded-lg text-lg flex items-center gap-3 group"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Play Now</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>

            <Link href="/about">
              <button
                type="button"
                className="tcg-button px-8 py-4 rounded-lg text-lg flex items-center gap-3"
              >
                <Scroll className="w-5 h-5" />
                <span>Read the Lore</span>
              </button>
            </Link>
          </motion.div>
        </section>

        {/* Features Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-32">
          <FeatureCard
            title="Strategic Combat"
            description="Master the elements. Combine spells and artifacts to unleash devastating combos."
            icon={Flame}
            delay={0.2}
          />
          <FeatureCard
            title="Ranked Leagues"
            description="Climb the competitive ladder. Earn exclusive rewards and seasoning for your victories."
            icon={Trophy}
            delay={0.4}
            featured
          />
          <FeatureCard
            title="Living World"
            description="A constantly evolving meta with new cards, events, and stories unfolding every season."
            icon={Sparkles}
            delay={0.6}
          />
        </section>

        {/* Call to Action Frame */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          <div className="tcg-frame-gold rounded-xl p-12 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-10 transition-opacity duration-700" />

            <div className="relative z-10">
              <h2 className="text-4xl font-bold gold-text mb-4">Ready to Duel?</h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Join thousands of players in the ultimate card battling experience. Your first deck
                is waiting.
              </p>

              <Link href="/signup">
                <button
                  type="button"
                  className="tcg-button px-10 py-5 rounded-lg text-xl font-bold hover:scale-105 transition-transform"
                >
                  Create Account
                </button>
              </Link>
            </div>

            {/* Decorative corners for the CTA */}
            <div className="ornament-corner ornament-corner-tl" />
            <div className="ornament-corner ornament-corner-tr" />
            <div className="ornament-corner ornament-corner-bl" />
            <div className="ornament-corner ornament-corner-br" />
          </div>
        </motion.section>
      </main>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon: Icon,
  delay,
  featured,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  delay: number;
  featured?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -5 }}
      className={cn("mode-card rounded-xl p-8 relative group", featured && "tcg-frame-gold")}
    >
      <div className="ornament-corner ornament-corner-tl opacity-50" />
      <div className="ornament-corner ornament-corner-br opacity-50" />

      <div className="mb-6 inline-flex p-4 rounded-full bg-secondary/50 ring-1 ring-border group-hover:ring-primary/50 transition-all shadow-inner">
        <Icon
          className={cn(
            "w-8 h-8",
            featured ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
          )}
        />
      </div>

      <h3 className={cn("text-2xl font-bold mb-3", featured ? "gold-text" : "text-foreground")}>
        {title}
      </h3>

      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  );
}
