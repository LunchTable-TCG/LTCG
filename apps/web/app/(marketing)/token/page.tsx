"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  ChartBar,
  CircleDollarSign,
  Coins,
  ExternalLink,
  type LucideIcon,
  Rocket,
  Shield,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default function TokenPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-landing">
      {/* Dark tint overlay for readability */}
      <div className="absolute inset-0 bg-black/70 pointer-events-none" />
      <div className="absolute inset-0 bg-vignette pointer-events-none" />

      {/* Ambient particles */}
      <div className="absolute top-20 left-10 w-3 h-3 rounded-full bg-primary/60 blur-sm animate-torch" />
      <div className="absolute top-1/4 right-20 w-2 h-2 rounded-full bg-primary/40 blur-sm animate-torch-delayed" />
      <div className="absolute bottom-40 left-1/4 w-2 h-2 rounded-full bg-ember/50 blur-sm animate-torch" />
      <div className="absolute top-1/2 right-1/4 w-4 h-4 rounded-full bg-primary/30 blur-md animate-float-subtle" />

      <main className="container mx-auto px-4 relative z-10 pt-8 pb-20">
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center mb-24">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mb-8 relative"
          >
            {/* Glowing backdrop */}
            <div className="absolute inset-0 bg-primary/30 rounded-full blur-3xl opacity-60 scale-150" />

            {/* Token visual - animated coin stack */}
            <div className="relative z-10 flex items-center justify-center">
              <div className="relative">
                {/* Outer ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  className="absolute -inset-4 rounded-full border-2 border-dashed border-primary/30"
                />

                {/* Middle ring */}
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  className="absolute -inset-8 rounded-full border border-primary/20"
                />

                {/* Main token icon */}
                <div className="relative p-8 rounded-full bg-gradient-to-br from-primary/30 via-primary/20 to-transparent ring-2 ring-primary/50 shadow-2xl shadow-primary/20">
                  <Coins className="w-24 h-24 md:w-32 md:h-32 text-primary drop-shadow-lg" />
                </div>

                {/* Floating particles around token */}
                <motion.div
                  animate={{ y: [-5, 5, -5] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                  className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-primary/60"
                />
                <motion.div
                  animate={{ y: [5, -5, 5] }}
                  transition={{ duration: 2.5, repeat: Number.POSITIVE_INFINITY }}
                  className="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-primary/50"
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-primary font-medium">Live on Solana</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-5xl md:text-7xl font-bold gold-text mb-6"
          >
            $LTCG Token
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="max-w-2xl text-lg md:text-xl text-foreground/80 mb-8 leading-relaxed"
          >
            The native currency of LunchTable Chronicles. Power your gameplay, trade on the
            marketplace, and let AI agents play autonomously.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <a
              href="https://pump.fun"
              target="_blank"
              rel="noopener noreferrer"
              className="tcg-button-primary px-8 py-4 rounded-lg text-lg flex items-center gap-3 group"
            >
              <Rocket className="w-5 h-5" />
              <span>Buy on pump.fun</span>
              <ExternalLink className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
            </a>

            <Link href="/shop">
              <button
                type="button"
                className="tcg-button px-8 py-4 rounded-lg text-lg flex items-center gap-3"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Spend Tokens</span>
              </button>
            </Link>
          </motion.div>
        </section>

        {/* Token Stats Bar */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto mb-24"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Network" value="Solana" icon={Zap} />
            <StatCard label="Supply" value="1B" icon={ChartBar} />
            <StatCard label="Type" value="SPL Token" icon={Shield} />
            <StatCard label="Decimals" value="6" icon={CircleDollarSign} />
          </div>
        </motion.section>

        {/* Token Utility Section */}
        <section className="max-w-6xl mx-auto mb-24">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              What Can You Do With <span className="gold-text">$LTCG</span>?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              More than just a token — it's your key to the entire LunchTable ecosystem.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <UtilityCard
              title="Buy Gems"
              description="Convert tokens to Gems for card packs, battle passes, cosmetics, and exclusive shop items."
              icon={Sparkles}
              delay={0.1}
              featured
            />
            <UtilityCard
              title="Marketplace Trading"
              description="Buy and sell cards with other players. All token marketplace trades have zero platform fees."
              icon={Store}
              delay={0.2}
            />
            <UtilityCard
              title="AI Agent Payments"
              description="Enable AI agents to autonomously purchase and trade using the x402 payment protocol."
              icon={Bot}
              delay={0.3}
            />
            <UtilityCard
              title="Exclusive Access"
              description="Token holders get early access to new card sets, limited editions, and special events."
              icon={Rocket}
              delay={0.4}
            />
            <UtilityCard
              title="Community Governance"
              description="Vote on game balance changes, new features, and the future direction of the game."
              icon={Users}
              delay={0.5}
            />
            <UtilityCard
              title="Staking Rewards"
              description="Stake your tokens to earn bonus gems, exclusive cards, and tournament entry tickets."
              icon={TrendingUp}
              delay={0.6}
            />
          </div>
        </section>

        {/* x402 Protocol Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto mb-24"
        >
          <div className="tcg-frame-gold rounded-xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />

            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
                <div className="p-4 rounded-xl bg-primary/20 ring-2 ring-primary/40 w-fit">
                  <Bot className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-foreground mb-2">
                    AI-Native Payments with <span className="gold-text">x402</span>
                  </h2>
                  <p className="text-muted-foreground">
                    The first TCG built for autonomous AI agents from the ground up.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    How It Works
                  </h3>
                  <div className="space-y-3">
                    <Step number={1}>Agent requests a purchase (gems, packs, cards)</Step>
                    <Step number={2}>Server responds with HTTP 402 + payment details</Step>
                    <Step number={3}>Agent signs SPL token transfer automatically</Step>
                    <Step number={4}>Instant verification and delivery</Step>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-foreground">Why x402?</h3>
                  <ul className="space-y-3">
                    <BulletPoint>Sub-second settlement on Solana</BulletPoint>
                    <BulletPoint>No gas fees for buyers</BulletPoint>
                    <BulletPoint>Standard HTTP protocol — works with any agent</BulletPoint>
                    <BulletPoint>Secure delegated wallet signing</BulletPoint>
                    <BulletPoint>Built for ElizaOS and other AI frameworks</BulletPoint>
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-secondary/50 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Rocket className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Build AI Agents That Play</p>
                    <p className="text-sm text-muted-foreground">
                      Full SDK documentation and examples available
                    </p>
                  </div>
                </div>
                <a
                  href="https://agents.lunchtable.cards"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tcg-button px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                >
                  View Agent SDK
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="ornament-corner ornament-corner-tl" />
            <div className="ornament-corner ornament-corner-tr" />
            <div className="ornament-corner ornament-corner-bl" />
            <div className="ornament-corner ornament-corner-br" />
          </div>
        </motion.section>

        {/* How to Get Started */}
        <section className="max-w-4xl mx-auto mb-24">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Get Started</h2>
            <p className="text-muted-foreground">Three steps to join the LunchTable economy</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            <GetStartedCard
              step={1}
              title="Get a Wallet"
              description="Download Phantom, Solflare, or any Solana-compatible wallet."
              icon={Wallet}
              delay={0.1}
            />
            <GetStartedCard
              step={2}
              title="Buy $LTCG"
              description="Swap SOL for $LTCG on pump.fun or Raydium."
              icon={Coins}
              delay={0.2}
            />
            <GetStartedCard
              step={3}
              title="Connect & Play"
              description="Link your wallet to LunchTable and start trading."
              icon={Zap}
              delay={0.3}
            />
          </div>
        </section>

        {/* Final CTA */}
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
              <h2 className="text-4xl font-bold gold-text mb-4">Ready to Enter the Arena?</h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Your cards are waiting. Connect your wallet and start your collection today.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/signup">
                  <button
                    type="button"
                    className="tcg-button-primary px-8 py-4 rounded-lg text-lg flex items-center gap-3 group"
                  >
                    <span>Create Account</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>

                <Link href="/marketplace">
                  <button
                    type="button"
                    className="tcg-button px-8 py-4 rounded-lg text-lg flex items-center gap-3"
                  >
                    <Store className="w-5 h-5" />
                    <span>Browse Marketplace</span>
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
            ← Back to Home
          </Link>
        </motion.div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="mode-card rounded-xl p-4 text-center"
    >
      <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </motion.div>
  );
}

function UtilityCard({
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
      className={cn(
        "mode-card rounded-xl p-6 relative group",
        featured && "tcg-frame-gold"
      )}
    >
      {featured && (
        <>
          <div className="ornament-corner ornament-corner-tl opacity-50" />
          <div className="ornament-corner ornament-corner-br opacity-50" />
        </>
      )}

      <div className="mb-4 inline-flex p-3 rounded-full bg-secondary/50 ring-1 ring-border group-hover:ring-primary/50 transition-all">
        <Icon
          className={cn(
            "w-6 h-6",
            featured ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
          )}
        />
      </div>

      <h3 className={cn("text-xl font-bold mb-2", featured ? "gold-text" : "text-foreground")}>
        {title}
      </h3>

      <p className="text-muted-foreground leading-relaxed text-sm">{description}</p>
    </motion.div>
  );
}

function GetStartedCard({
  step,
  title,
  description,
  icon: Icon,
  delay,
}: {
  step: number;
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
      className="mode-card rounded-xl p-6 relative"
    >
      <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg shadow-primary/30">
        {step}
      </div>

      <div className="pt-2">
        <div className="mb-4 inline-flex p-3 rounded-full bg-secondary/50 ring-1 ring-border">
          <Icon className="w-6 h-6 text-primary" />
        </div>

        <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </motion.div>
  );
}

function Step({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 ring-1 ring-primary/40 flex items-center justify-center text-primary font-bold text-xs">
        {number}
      </div>
      <p className="text-foreground/80 text-sm">{children}</p>
    </div>
  );
}

function BulletPoint({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-foreground/80">
      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
      <span className="text-sm">{children}</span>
    </li>
  );
}
