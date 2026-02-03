"use client";

import { getAssetUrl } from "@/lib/blob";
import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// Marketing section components
import LiveStats from "@/components/marketing/LiveStats";
import GameModesSection from "@/components/marketing/GameModesSection";
import ScreenshotsGallery from "@/components/marketing/ScreenshotsGallery";
import CharacterShowcase from "@/components/marketing/CharacterShowcase";
import PlatformSection from "@/components/marketing/PlatformSection";
import NewsletterSignup from "@/components/marketing/NewsletterSignup";
import FAQSection from "@/components/marketing/FAQSection";

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-landing">
      {/* Dark tint overlay for readability */}
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      <div className="absolute inset-0 bg-vignette pointer-events-none" />

      {/* Ambient particles/lights */}
      <div className="absolute top-20 left-10 w-3 h-3 rounded-full bg-ember/60 blur-sm animate-torch" />
      <div className="absolute top-1/4 right-20 w-2 h-2 rounded-full bg-primary/40 blur-sm animate-torch-delayed" />
      <div className="absolute bottom-40 left-1/4 w-2 h-2 rounded-full bg-ember/50 blur-sm animate-torch" />

      <main className="relative z-10">
        {/* Hero Section - Full viewport with characters */}
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden">
          {/* Background character silhouettes */}
          <div className="absolute inset-0 flex items-end justify-between px-0 lg:px-12 pointer-events-none">
            {/* Left character - Infernal Dragons */}
            <motion.div
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 0.8, x: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="relative w-1/3 lg:w-1/4 h-[70vh] hidden md:block"
            >
              <Image
                src={getAssetUrl("/assets/story/infernal_dragons.png")}
                alt="Infernal Dragons"
                fill
                className="object-contain object-bottom drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]"
                sizes="25vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            </motion.div>

            {/* Right character - Celestial Guardians */}
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 0.8, x: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="relative w-1/3 lg:w-1/4 h-[70vh] hidden md:block"
            >
              <Image
                src={getAssetUrl("/assets/story/celestial_guardians.png")}
                alt="Celestial Guardians"
                fill
                className="object-contain object-bottom drop-shadow-[0_0_30px_rgba(251,191,36,0.5)]"
                sizes="25vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            </motion.div>
          </div>

          {/* Center content */}
          <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="mb-6 relative"
            >
              <div className="absolute inset-0 bg-primary/30 rounded-full blur-[100px] scale-150" />
              <Image
                src={getAssetUrl("/assets/logo-main.png")}
                alt="Lunchtable Chronicles"
                width={500}
                height={500}
                className="w-[70vw] md:w-[400px] lg:w-[500px] h-auto mx-auto drop-shadow-[0_0_50px_rgba(212,175,55,0.5)] relative z-10"
                sizes="(max-width: 768px) 70vw, 500px"
                priority
              />
            </motion.div>

            {/* Tagline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 tracking-wide"
            >
              Command Legendary Powers.{" "}
              <span className="gold-text">Forge Your Destiny.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-lg md:text-xl text-neutral-300 mb-8 max-w-2xl mx-auto"
            >
              Master 10 unique archetypes. Battle in ranked arenas.
              Build the ultimate deck in this free-to-play strategic card game.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
            >
              <Link href="/play">
                <button
                  type="button"
                  className="btn-fantasy-blue group rounded-lg"
                >
                  <Play className="w-6 h-6 fill-current" />
                  Play Free Now
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
            </motion.div>

            {/* Free to play badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
            >
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/50">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300 font-semibold text-sm">100% Free to Play • No Pay-to-Win</span>
              </div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <div className="flex flex-col items-center gap-2 text-neutral-500">
              <span className="text-sm">Discover More</span>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </motion.div>
            </div>
          </motion.div>
        </section>

        <div className="container mx-auto px-4 pb-20">

        {/* Character Showcase - Show what makes the game unique FIRST */}
        <section className="mb-20 -mx-4">
          <CharacterShowcase />
        </section>

        {/* Screenshots Gallery - Visual proof of gameplay */}
        <section className="mb-20">
          <ScreenshotsGallery />
        </section>

        {/* Game Modes Section - What you can do */}
        <section className="mb-20">
          <GameModesSection />
        </section>

        {/* Live Stats - Social proof */}
        <section className="mb-20">
          <LiveStats />
        </section>

        {/* Platform Availability */}
        <section className="mb-20">
          <PlatformSection />
        </section>

        {/* Call to Action Frame */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto mb-20"
        >
          <div className="panel-ornate rounded-xl p-12 text-center relative overflow-hidden group">
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
                  className="btn-fantasy-primary rounded-lg text-xl"
                >
                  Create Account
                </button>
              </Link>
            </div>

            {/* Decorative corners using the beautiful ornament asset */}
            <div className="corner-bl" />
            <div className="corner-br" />
          </div>
        </motion.section>

        {/* Newsletter Signup */}
        <section className="mb-20">
          <NewsletterSignup />
        </section>

        {/* FAQ Section */}
        <section className="mb-20">
          <FAQSection />
        </section>
        </div>
      </main>
    </div>
  );
}

