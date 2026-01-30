"use client";

import { usePrivy } from "@privy-io/react-auth";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Sparkles, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiAny, useConvexMutation } from "@/lib/convexHelpers";

export default function SetupUsernamePage() {
  const { ready, authenticated, logout } = usePrivy();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setUsernameMutation = useConvexMutation(apiAny.auth.syncUser.setUsername);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9]{3,20}$/;
    if (!usernameRegex.test(username)) {
      setError("Username must be 3-20 characters: letters and numbers only");
      return;
    }

    setSubmitting(true);
    try {
      await setUsernameMutation({ username });
      router.push("/lunchtable");
    } catch (err) {
      console.error("Failed to set username:", err);
      if (err instanceof Error && err.message.includes("taken")) {
        setError("Username is already taken. Please choose another.");
      } else {
        setError("Failed to set username. Please try again.");
      }
      setSubmitting(false);
    }
  };

  // Show loading while Privy initializes
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1410] via-[#2a1f14] to-[#1a1410]">
        <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!authenticated) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1410] via-[#2a1f14] to-[#1a1410] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 border border-[#d4af37]/30 text-[10px] text-[#d4af37] font-black uppercase tracking-widest mb-5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            One Last Step
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-black mb-3">
            <span className="text-[#e8e0d5] uppercase tracking-tighter">
              Choose Your Name
            </span>
          </h1>
          <p className="text-[#a89f94] text-sm font-medium italic">
            How shall the Grand Archive know you?
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label
              htmlFor="username"
              className="block text-[10px] font-black text-[#a89f94] uppercase tracking-widest mb-2"
            >
              Archivist Name
            </label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a89f94] group-focus-within:text-[#d4af37] transition-colors" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose your moniker"
                autoComplete="username"
                required
                pattern="[a-zA-Z0-9]{3,20}"
                minLength={3}
                maxLength={20}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-parchment text-[#2a1f14] placeholder:text-[#2a1f14]/40 border border-[#3d2b1f]/20 focus:outline-none focus:border-[#d4af37]/50 focus:ring-2 focus:ring-[#d4af37]/10 transition-all font-medium"
              />
            </div>
            <p className="text-[8px] text-[#a89f94]/60 mt-1.5 ml-1 font-medium italic">
              3-20 characters: letters and numbers only
            </p>
          </motion.div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Submit button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            type="submit"
            disabled={submitting}
            className="group relative w-full py-4 rounded-xl overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed bg-linear-to-r from-[#8b4513] via-[#d4af37] to-[#8b4513] hover:from-[#a0522d] hover:via-[#f9e29f] hover:to-[#a0522d] transition-all duration-300 shadow-lg hover:shadow-gold"
          >
            <span className="relative flex items-center justify-center gap-2 text-lg font-black uppercase tracking-widest text-white">
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Inscribing...
                </>
              ) : (
                <>
                  Enter the Archive
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </span>
          </motion.button>

          {/* Logout option */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center"
          >
            <button
              type="button"
              onClick={() => logout()}
              className="text-[#a89f94] text-xs hover:text-[#d4af37] transition-colors"
            >
              Use a different account
            </button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}
