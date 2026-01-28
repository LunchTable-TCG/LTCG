"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { AlertTriangle, Bug, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0d0a09] relative overflow-hidden flex items-center justify-center">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-[#0d0a09] to-[#0d0a09]" />
      <div className="absolute inset-0 bg-[url('/assets/backgrounds/noise.png')] opacity-5" />

      <div className="relative z-10 text-center px-4 max-w-2xl mx-auto">
        {/* Error Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", duration: 0.8 }}
          className="mb-8"
        >
          <div className="relative inline-flex">
            <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative w-24 h-24 rounded-full bg-linear-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center">
              <AlertTriangle className="w-12 h-12 text-red-400" />
            </div>
          </div>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-3xl sm:text-4xl font-black text-[#e8e0d5] mb-4 uppercase tracking-tight">
            A Glitch in the Archives
          </h1>
          <p className="text-[#a89f94] text-lg mb-4 max-w-md mx-auto">
            Something unexpected disrupted the flow of magic. Our archivists have been notified and
            are investigating.
          </p>

          {/* Error details (in dev mode) */}
          {process.env.NODE_ENV === "development" && error.message && (
            <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-left max-w-lg mx-auto">
              <div className="flex items-center gap-2 mb-2">
                <Bug className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-sm font-bold">Error Details</span>
              </div>
              <code className="text-red-300 text-xs break-all block">{error.message}</code>
              {error.digest && (
                <p className="text-red-400/60 text-xs mt-2">Digest: {error.digest}</p>
              )}
            </div>
          )}
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button
            onClick={reset}
            className="w-full sm:w-auto bg-linear-to-r from-[#8b4513] via-[#d4af37] to-[#8b4513] hover:from-[#a0522d] hover:via-[#f9e29f] hover:to-[#a0522d] text-white font-bold px-8 py-6"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Try Again
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 px-8 py-6"
          >
            <Link href="/">
              <Home className="w-5 h-5 mr-2" />
              Return Home
            </Link>
          </Button>
        </motion.div>

        {/* Help text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-[#a89f94]/60 text-sm"
        >
          If this keeps happening, try refreshing the page or{" "}
          <a href="mailto:support@lunchtable.gg" className="text-[#d4af37] hover:underline">
            contact support
          </a>
        </motion.p>
      </div>
    </div>
  );
}
