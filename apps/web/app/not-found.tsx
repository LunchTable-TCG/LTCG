"use client";

import { motion } from "framer-motion";
import { Compass, Home, Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#0d0a09] relative overflow-hidden flex items-center justify-center">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-[#0d0a09] to-[#0d0a09]" />
      <div className="absolute inset-0 bg-[url('/assets/backgrounds/noise.png')] opacity-5" />

      {/* Floating particles - only render on client to avoid hydration mismatch */}
      {mounted && (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-[#d4af37]/30 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [-20, 20],
                opacity: [0.2, 0.8, 0.2],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 text-center px-4 max-w-2xl mx-auto">
        {/* 404 Number */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative mb-8"
        >
          <span className="text-[150px] sm:text-[200px] font-black text-transparent bg-clip-text bg-gradient-to-b from-[#d4af37] to-[#8b4513] opacity-20 leading-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Compass className="w-24 h-24 text-[#d4af37]/50" />
            </motion.div>
          </div>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-3xl sm:text-4xl font-black text-[#e8e0d5] mb-4 uppercase tracking-tight">
            Lost in the Archives
          </h1>
          <p className="text-[#a89f94] text-lg mb-8 max-w-md mx-auto">
            The page you seek has vanished into the void. Perhaps it was consumed by a wayward
            spell, or never existed at all.
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button
            asChild
            className="w-full sm:w-auto bg-gradient-to-r from-[#8b4513] via-[#d4af37] to-[#8b4513] hover:from-[#a0522d] hover:via-[#f9e29f] hover:to-[#a0522d] text-white font-bold px-8 py-6"
          >
            <Link href="/">
              <Home className="w-5 h-5 mr-2" />
              Return Home
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 px-8 py-6"
          >
            <Link href="/play/story">
              <MapIcon className="w-5 h-5 mr-2" />
              Story Mode
            </Link>
          </Button>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 pt-8 border-t border-[#3d2b1f]"
        >
          <p className="text-[#a89f94] text-sm mb-4">Or explore these paths:</p>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { href: "/lunchtable", label: "The Table" },
              { href: "/shop", label: "Shop" },
              { href: "/binder", label: "Collection" },
              { href: "/quests", label: "Quests" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[#d4af37] hover:text-[#f9e29f] text-sm font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
