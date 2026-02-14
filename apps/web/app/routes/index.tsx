import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from "framer-motion";
import { ArrowRight, Flame, type LucideIcon, Sparkles, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-background scanner-noise">
      {/* Full Screen Comic Overlays */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-20 mix-blend-overlay" style={{ backgroundImage: 'url(/assets/overlays/comic-noise.png)', backgroundSize: '512px' }} />
      <div className="absolute inset-0 pointer-events-none z-50 opacity-10 mix-blend-multiply" style={{ backgroundImage: 'url(/assets/overlays/paper-texture.png)', backgroundSize: '256px' }} />
      <div className="absolute inset-0 pointer-events-none z-50 opacity-30 mix-blend-multiply" style={{ backgroundImage: 'url(/assets/overlays/vignette.png)', backgroundSize: 'cover' }} />

      {/* Paper texture and noise are handled by globals.css and scanner-noise class */}

      <main className="container mx-auto px-4 relative z-10 pt-16 pb-20">
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center mb-24">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mb-8 relative"
          >
            <div className="zine-border p-2 bg-white inline-block relative">
              <img
                src="/lunchtable/hero-illustration.png"
                alt="LunchTable"
                width={800}
                height={400}
                className="w-full max-w-3xl h-auto mx-auto grayscale contrast-125"
              />
              {/* Decorative "Fuckup" assets */}
              <motion.div
                initial={{ opacity: 0, rotate: -10 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="absolute -bottom-10 -left-10 w-32 h-32 z-20 pointer-events-none"
              >
                <img src="/lunchtable/overdue-notice.png" alt="Overdue" width={128} height={128} className="drop-shadow-lg rotate-[-15deg]" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, rotate: 15 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="absolute -top-10 -right-10 w-24 h-24 z-20 pointer-events-none"
              >
                <img src="/lunchtable/crushed-cigarette.png" alt="Bad Decisions" width={96} height={96} className="drop-shadow-lg rotate-[20deg]" />
              </motion.div>
            </div>
            <h1 className="mt-8 text-6xl md:text-8xl font-black italic uppercase tracking-tighter ink-bleed">
              LunchTable
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="max-w-2xl text-xl md:text-2xl font-bold mb-10 leading-tight uppercase"
          >
            Manage your <span className="text-reputation underline decoration-4">Reputation</span>.
            Protect your <span className="text-stability underline decoration-4">Stability</span>.
            Rule the <span className="underline decoration-4">Social Hierarchy</span>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center gap-6"
          >
            <Link to="/lunchtable">
              <button
                type="button"
                className="tcg-button-primary px-12 py-5 text-xl flex items-center gap-3 group uppercase"
              >
                <span>Enter The Hallway</span>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>

            <Link to="/news">
              <button
                type="button"
                className="tcg-button px-12 py-5 text-xl flex items-center gap-3 uppercase"
              >
                <span>Bulletin Board</span>
              </button>
            </Link>
          </motion.div>
        </section>

        {/* Features Grid - Zine Style */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-6xl mx-auto mb-32">
          <FeatureCard
            title="Slander & Gossip"
            description="Use weaponized nostalgia to dismantle your rivals. Every secret is a tactical advantage."
            icon={Flame}
            delay={0.2}
          />
          <FeatureCard
            title="Reputation Grind"
            description="Climb from Outcast to Apex. Your social standing determines your power at The Table."
            icon={Trophy}
            delay={0.4}
            featured
          />
          <FeatureCard
            title="School Spirits"
            description="A raw, evolving world of trauma and triumph. New stereotypes added every semester."
            icon={Sparkles}
            delay={0.6}
          />
        </section>

        {/* Call to Action - Paper Cutout Style */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          <div className="paper-panel p-12 text-center relative rotate-1">
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-black uppercase mb-6 ink-bleed">Final Enrollment</h2>
              <p className="text-lg font-bold mb-10 max-w-lg mx-auto uppercase">
                Don't be a nobody. Join the hierarchy today and claim your locker.
              </p>

              <Link to="/signup">
                <button
                  type="button"
                  className="tcg-button-primary px-10 py-5 text-2xl font-black uppercase hover:scale-105 transition-transform"
                >
                  Join The In-Crowd
                </button>
              </Link>
            </div>
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
      className={cn("paper-panel p-8 relative group", featured && "bg-white zine-border")}
    >
      <div className="mb-6 inline-flex p-4 border-2 border-primary bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
        <Icon
          className={cn(
            "w-8 h-8",
            featured ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
          )}
        />
      </div>

      <h3 className="text-2xl font-black mb-3 uppercase ink-bleed">
        {title}
      </h3>

      <p className="font-bold text-muted-foreground leading-tight uppercase text-xs">{description}</p>
    </motion.div>
  );
}
