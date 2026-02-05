"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Coins,
  type LucideIcon,
  ShoppingBag,
  Sparkles,
  Store,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function TokenPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Hero Background */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/brand/backgrounds/ltcg-hero-1536x1024.branded.png"
          alt="Lunchtable TCG Background"
          fill
          className="object-cover hidden md:block"
          priority
          quality={90}
        />
        <Image
          src="/brand/backgrounds/ltcg-vertical-1024x1536.png"
          alt="Lunchtable TCG Background"
          fill
          className="object-cover block md:hidden"
          priority
          quality={90}
        />
      </div>

      {/* Dark tint overlay */}
      <div className="absolute inset-0 bg-black/70 pointer-events-none z-[1]" />
      <div className="absolute inset-0 bg-vignette pointer-events-none z-[1]" />

      <main className="container mx-auto px-4 relative z-10 pt-12 pb-20">
        {/* Header */}
        <section className="flex flex-col items-center text-center mb-16">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <div className="inline-flex p-6 rounded-full bg-primary/20 ring-2 ring-primary/40 mb-6">
              <Coins className="w-16 h-16 text-primary" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl md:text-5xl font-bold gold-text mb-4"
          >
            LunchTable Token
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-2xl text-lg md:text-xl text-foreground/80 leading-relaxed"
          >
            The official token for LunchTable Chronicles. Use it to purchase Gems and trade cards on
            the Marketplace.
          </motion.p>
        </section>

        {/* What You Can Do */}
        <section className="max-w-4xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-2xl font-bold text-center mb-10 text-foreground"
          >
            What You Can Do With It
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <UseCase
              title="Buy Gems"
              description="Purchase Gems directly using the LunchTable Token. Gems let you buy card packs, battle passes, and cosmetics in the shop."
              icon={Sparkles}
              delay={0.1}
            />
            <UseCase
              title="Marketplace Trading"
              description="Buy and sell cards with other players on the Marketplace. All transactions use the LunchTable Token."
              icon={Store}
              delay={0.2}
            />
            <UseCase
              title="AI Agent Purchases"
              description="AI agents can autonomously purchase packs, gems, and items using the x402 payment protocol for seamless machine-to-machine transactions."
              icon={Bot}
              delay={0.3}
            />
          </div>
        </section>

        {/* x402 Protocol - AI Agent Integration */}
        <section className="max-w-4xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mode-card rounded-xl p-8 md:p-10 border border-primary/20"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary/20">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">x402 Protocol Integration</h2>
            </div>

            <p className="text-foreground/80 mb-6 leading-relaxed">
              LunchTable Chronicles integrates the{" "}
              <span className="text-primary font-semibold">x402 payment protocol</span> — an open
              standard that enables AI agents to make autonomous purchases using cryptocurrency.
              This allows AI-powered players to seamlessly buy card packs, gems, and marketplace
              items without human intervention.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  How Agents Purchase
                </h3>
                <ol className="space-y-2 text-sm text-foreground/70">
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">1.</span>
                    Agent requests a protected resource (gems, packs)
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">2.</span>
                    Server returns HTTP 402 with payment requirements
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">3.</span>
                    Agent signs SPL token transfer automatically
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">4.</span>
                    Payment verified instantly, purchase completed
                  </li>
                </ol>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Why x402?</h3>
                <ul className="space-y-2 text-sm text-foreground/70">
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    Sub-second settlement on Solana
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    No blockchain fees for buyers
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    Standard HTTP 402 protocol
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    Secure delegated wallet signing
                  </li>
                </ul>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-secondary/30 border border-border">
              <p className="text-sm text-foreground/70">
                <span className="font-semibold text-foreground">For Developers:</span> Build AI
                agents that can play LunchTable Chronicles autonomously. Check out our{" "}
                <a
                  href="https://agents.lunchtable.cards"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Agent SDK documentation
                </a>{" "}
                to get started.
              </p>
            </div>
          </motion.div>
        </section>

        {/* How It Works */}
        <section className="max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mode-card rounded-xl p-8 md:p-10"
          >
            <h2 className="text-2xl font-bold mb-6 text-foreground">How It Works</h2>

            <div className="space-y-6 text-foreground/80">
              <Step number={1} title="Connect Your Wallet">
                Link your Solana wallet to your LunchTable account.
              </Step>

              <Step number={2} title="Get Tokens">
                Acquire LunchTable Tokens through supported exchanges or from other players.
              </Step>

              <Step number={3} title="Start Using">
                Use your tokens to buy Gems in the shop or purchase cards directly from the
                Marketplace.
              </Step>
            </div>
          </motion.div>
        </section>

        {/* CTA */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl mx-auto"
        >
          <div className="tcg-frame-gold rounded-xl p-10 text-center relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl font-bold gold-text mb-4">Ready to Play?</h2>
              <p className="text-muted-foreground mb-8">
                Create your account and start building your collection.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/signup">
                  <button
                    type="button"
                    className="tcg-button-primary px-8 py-4 rounded-lg text-lg flex items-center gap-3 group"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>

                <Link href="/shop">
                  <button
                    type="button"
                    className="tcg-button px-8 py-4 rounded-lg text-lg flex items-center gap-3"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    <span>Visit Shop</span>
                  </button>
                </Link>
              </div>
            </div>

            <div className="ornament-corner ornament-corner-tl" />
            <div className="ornament-corner ornament-corner-tr" />
            <div className="ornament-corner ornament-corner-bl" />
            <div className="ornament-corner ornament-corner-br" />
          </div>
        </motion.section>

        {/* Back Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
        >
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            &larr; Back to Home
          </Link>
        </motion.div>
      </main>
    </div>
  );
}

function UseCase({
  title,
  description,
  icon: Icon,
  delay,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className="mode-card rounded-xl p-6 relative group"
    >
      <div className="mb-4 inline-flex p-3 rounded-full bg-secondary/50 ring-1 ring-border group-hover:ring-primary/50 transition-all">
        <Icon className="w-6 h-6 text-primary" />
      </div>

      <h3 className="text-xl font-bold mb-2 text-foreground">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  );
}

function Step({
  number,
  title,
  children,
}: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 ring-1 ring-primary/40 flex items-center justify-center text-primary font-bold text-sm">
        {number}
      </div>
      <div>
        <h3 className="font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-foreground/70">{children}</p>
      </div>
    </div>
  );
}
