"use client";

import { FantasyFrame } from "@/components/ui/FantasyFrame";
import { motion } from "framer-motion";
import { Globe, Smartphone, Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Platform {
  id: string;
  name: string;
  status: "available" | "coming-soon";
  icon: React.ReactNode;
  description: string;
}

const platforms: Platform[] = [
  {
    id: "web",
    name: "Web Browser",
    status: "available",
    icon: <Globe className="w-8 h-8" />,
    description: "Play instantly on any device with a modern web browser",
  },
  {
    id: "ios",
    name: "iOS",
    status: "coming-soon",
    icon: <Smartphone className="w-8 h-8" />,
    description: "Native experience coming soon to iPhone and iPad",
  },
  {
    id: "android",
    name: "Android",
    status: "coming-soon",
    icon: <Smartphone className="w-8 h-8" />,
    description: "Native experience coming soon to Android devices",
  },
];

export default function PlatformSection() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleNotifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    // TODO: Implement newsletter/notification signup via Convex
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulated delay
    setIsSubmitted(true);
    setIsSubmitting(false);
    setEmail("");

    // Reset after 3 seconds
    setTimeout(() => setIsSubmitted(false), 3000);
  };

  return (
    <section className="w-full py-20 px-4 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Play Anywhere, Anytime
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Cross-platform progression. Your collection, everywhere.
          </p>
        </motion.div>

        {/* Platform Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {platforms.map((platform, index) => (
            <motion.div
              key={platform.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
            >
              <PlatformCard platform={platform} />
            </motion.div>
          ))}
        </div>

        {/* Email Capture for Mobile Launch */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="max-w-xl mx-auto"
        >
          <FantasyFrame variant="obsidian" className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Mail className="w-5 h-5 text-yellow-400" />
              <h3 className="text-xl font-semibold text-white">
                Get Notified About Mobile Launch
              </h3>
            </div>
            <p className="text-sm text-gray-400 mb-6">
              Be the first to know when we launch on iOS and Android
            </p>

            {isSubmitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-3 px-4 rounded-lg bg-green-900/20 border border-green-500/30 text-green-400 font-medium"
              >
                Thanks! We'll notify you at launch.
              </motion.div>
            ) : (
              <form onSubmit={handleNotifySubmit} className="flex gap-3">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-zinc-900/50 border-zinc-700 text-white placeholder:text-gray-500 focus:border-yellow-500/50 focus:ring-yellow-500/20"
                  required
                />
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-yellow-600 to-amber-700 hover:from-yellow-500 hover:to-amber-600 text-white font-semibold px-6 shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:shadow-[0_0_30px_rgba(251,191,36,0.5)] transition-all duration-300"
                >
                  {isSubmitting ? "Sending..." : "Notify Me"}
                </Button>
              </form>
            )}
          </FantasyFrame>
        </motion.div>
      </div>
    </section>
  );
}

function PlatformCard({ platform }: { platform: Platform }) {
  const isAvailable = platform.status === "available";

  return (
    <motion.div
      whileHover={isAvailable ? { y: -8, scale: 1.02 } : { y: -4, scale: 1.01 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="h-full group cursor-pointer"
    >
      <FantasyFrame
        variant={isAvailable ? "gold" : "obsidian"}
        className={`h-full relative overflow-hidden transition-all duration-300 ${
          isAvailable
            ? "shadow-[0_0_30px_rgba(251,191,36,0.4)] hover:shadow-[0_0_40px_rgba(251,191,36,0.6)]"
            : "shadow-[0_0_15px_rgba(251,191,36,0.1)] hover:shadow-[0_0_25px_rgba(251,191,36,0.2)]"
        }`}
      >
        <div className="relative min-h-[240px] flex flex-col justify-between">
          {/* Status Badge */}
          <div className="flex justify-end mb-4">
            <div
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                isAvailable
                  ? "bg-gradient-to-r from-yellow-500/20 to-amber-600/20 text-yellow-300 shadow-[0_0_20px_rgba(234,179,8,0.4)] border border-yellow-500/40"
                  : "bg-zinc-800/50 text-gray-400 border border-zinc-700/50"
              }`}
            >
              {isAvailable ? "Available Now" : "Coming Soon"}
            </div>
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-300 ${
                isAvailable
                  ? "bg-gradient-to-br from-yellow-500/30 to-amber-600/30 border border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.3)] group-hover:shadow-[0_0_40px_rgba(234,179,8,0.5)]"
                  : "bg-gradient-to-br from-gray-700/20 to-gray-800/20 border border-gray-600/30 shadow-[0_0_15px_rgba(156,163,175,0.1)]"
              }`}
            >
              <div
                className={`transition-colors duration-300 ${
                  isAvailable
                    ? "text-yellow-400 group-hover:text-yellow-300"
                    : "text-gray-500 group-hover:text-gray-400"
                }`}
              >
                {platform.icon}
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="space-y-2 text-center">
            <h3
              className={`text-2xl font-bold transition-colors duration-300 ${
                isAvailable
                  ? "text-yellow-200 group-hover:text-yellow-100"
                  : "text-gray-300 group-hover:text-gray-200"
              }`}
            >
              {platform.name}
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed px-2">
              {platform.description}
            </p>
          </div>

          {/* Decorative Bottom Border */}
          {isAvailable && (
            <div className="pt-6">
              <div className="h-1 w-full bg-gradient-to-r from-transparent via-yellow-500/60 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          )}
        </div>

        {/* Glow Effect on Hover (stronger for available platforms) */}
        {isAvailable && (
          <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/0 via-yellow-500/0 to-yellow-500/0 group-hover:from-yellow-500/10 group-hover:via-yellow-500/0 group-hover:to-yellow-500/5 transition-all duration-300 pointer-events-none rounded-xl" />
        )}
      </FantasyFrame>
    </motion.div>
  );
}
