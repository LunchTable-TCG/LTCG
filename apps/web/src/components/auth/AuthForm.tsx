"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Lock, Mail, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ConvexError } from "convex/values";

interface AuthFormProps {
  mode: "signIn" | "signUp";
}

export function AuthForm({ mode }: AuthFormProps) {
  const { signIn } = useAuthActions();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === "signUp";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    // Validate username format for sign up
    if (isSignUp) {
      const name = formData.get("name") as string;
      const usernameRegex = /^[a-zA-Z0-9]{3,20}$/;

      if (!name || !usernameRegex.test(name)) {
        setError("Username must be 3-20 characters: letters and numbers only (no spaces or special characters)");
        setSubmitting(false);
        return;
      }

      // Validate password confirmation match
      const password = formData.get("password") as string;
      const confirmPassword = formData.get("confirmPassword") as string;

      if (password !== confirmPassword) {
        setError("Passwords do not match");
        setSubmitting(false);
        return;
      }
    }

    try {
      await signIn("password", formData);
      window.location.href = "/lunchtable";
    } catch (err) {
      console.error("Auth error:", err);

      // SECURITY: Parse ConvexError for specific validation errors
      if (err instanceof ConvexError) {
        const data = err.data as { code?: string; message?: string };

        // Show specific validation errors (these are safe to display)
        if (
          data.code === "PASSWORD_TOO_SHORT" ||
          data.code === "PASSWORD_NO_UPPERCASE" ||
          data.code === "PASSWORD_NO_LOWERCASE" ||
          data.code === "PASSWORD_NO_NUMBER" ||
          data.code === "PASSWORD_TOO_COMMON" ||
          data.code === "INVALID_USERNAME"
        ) {
          setError(data.message || err.message);
        } else {
          // SECURITY: Generic error for auth failures (don't reveal if user exists)
          setError(
            isSignUp
              ? "Could not create account. Please check your information and try again."
              : "Invalid email or password. Please try again."
          );
        }
      } else if (err instanceof Error) {
        // SECURITY: Don't expose internal error messages
        setError(
          isSignUp
            ? "Could not create account. Please try again."
            : "Invalid email or password. Please try again."
        );
      } else {
        setError(
          isSignUp
            ? "Could not create account. Please try again."
            : "Invalid email or password. Please try again."
        );
      }
      setSubmitting(false);
    }
  };

  return (
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
          {isSignUp ? "Initiate Your Archive" : "Speak the Passcode"}
        </motion.div>
        <h1 className="text-3xl sm:text-4xl font-black mb-3">
          <span className="text-[#e8e0d5] uppercase tracking-tighter">
            {isSignUp ? "Create Account" : "Sign In"}
          </span>
        </h1>
        <p className="text-[#a89f94] text-sm font-medium italic">
          {isSignUp
            ? "Your journey within the Grand Archive begins here"
            : "Re-enter the sacred halls of Lunchtable"}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username field (sign up only) */}
        {isSignUp && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label
              htmlFor="name"
              className="block text-[10px] font-black text-[#a89f94] uppercase tracking-widest mb-2"
            >
              Archivist Name
            </label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a89f94] group-focus-within:text-[#d4af37] transition-colors" />
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Choose your moniker"
                autoComplete="username"
                required
                pattern="[a-zA-Z0-9]{3,20}"
                minLength={3}
                maxLength={20}
                title="Username must be 3-20 characters: letters and numbers only"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-parchment text-[#2a1f14] placeholder:text-[#2a1f14]/40 border border-[#3d2b1f]/20 focus:outline-none focus:border-[#d4af37]/50 focus:ring-2 focus:ring-[#d4af37]/10 transition-all font-medium"
              />
            </div>
            <p className="text-[8px] text-[#a89f94]/60 mt-1.5 ml-1 font-medium italic">
              3-20 characters: letters and numbers only
            </p>
          </motion.div>
        )}

        {/* Email field */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: isSignUp ? 0.3 : 0.2 }}
        >
          <label
            htmlFor="email"
            className="block text-[10px] font-black text-[#a89f94] uppercase tracking-widest mb-2"
          >
            Digital Seal (Email)
          </label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a89f94] group-focus-within:text-[#d4af37] transition-colors" />
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your scribe email"
              autoComplete="email"
              className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-parchment text-[#2a1f14] placeholder:text-[#2a1f14]/40 border border-[#3d2b1f]/20 focus:outline-none focus:border-[#d4af37]/50 focus:ring-2 focus:ring-[#d4af37]/10 transition-all font-medium"
            />
          </div>
        </motion.div>

        {/* Password field */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: isSignUp ? 0.4 : 0.3 }}
        >
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="password"
              className="block text-[10px] font-black text-[#a89f94] uppercase tracking-widest"
            >
              Secret Cipher
            </label>
            {!isSignUp && (
              <Link
                href="/forgot-password"
                className="text-[10px] font-medium text-[#d4af37] hover:text-[#f9e29f] transition-colors"
              >
                Forgot cipher?
              </Link>
            )}
          </div>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a89f94] group-focus-within:text-[#d4af37] transition-colors" />
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Inscribe your cipher"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              required
              minLength={8}
              title={isSignUp ? "Password must be at least 8 characters with uppercase, lowercase, and a number" : undefined}
              className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-parchment text-[#2a1f14] placeholder:text-[#2a1f14]/40 border border-[#3d2b1f]/20 focus:outline-none focus:border-[#d4af37]/50 focus:ring-2 focus:ring-[#d4af37]/10 transition-all font-medium"
            />
          </div>
          {isSignUp && (
            <p className="text-[8px] text-[#a89f94]/60 mt-1.5 ml-1 font-medium italic">
              Min 8 characters with uppercase, lowercase, and a number
            </p>
          )}
        </motion.div>

        {/* Confirm Password field (sign up only) */}
        {isSignUp && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <label
              htmlFor="confirmPassword"
              className="block text-[10px] font-black text-[#a89f94] uppercase tracking-widest mb-2"
            >
              Verify Cipher
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a89f94] group-focus-within:text-[#d4af37] transition-colors" />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Inscribe cipher again"
                autoComplete="new-password"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-parchment text-[#2a1f14] placeholder:text-[#2a1f14]/40 border border-[#3d2b1f]/20 focus:outline-none focus:border-[#d4af37]/50 focus:ring-2 focus:ring-[#d4af37]/10 transition-all font-medium"
              />
            </div>
          </motion.div>
        )}

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

        {/* Hidden flow field */}
        <input name="flow" type="hidden" value={isSignUp ? "signUp" : "signIn"} />

        {/* Submit button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: isSignUp ? 0.6 : 0.4 }}
          type="submit"
          disabled={submitting}
          className="group relative w-full py-4 rounded-xl overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed bg-linear-to-r from-[#8b4513] via-[#d4af37] to-[#8b4513] hover:from-[#a0522d] hover:via-[#f9e29f] hover:to-[#a0522d] transition-all duration-300 shadow-lg hover:shadow-gold"
        >
          <span className="relative flex items-center justify-center gap-2 text-lg font-black uppercase tracking-widest text-white">
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isSignUp ? "Creating..." : "Signing In..."}
              </>
            ) : (
              <>
                {isSignUp ? "Create Account" : "Enter the Hall"}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </span>
        </motion.button>

        {/* Terms (sign up only) */}
        {isSignUp && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-[10px] text-[#a89f94]/60 text-center font-medium italic"
          >
            By inscribing your name, you accept our{" "}
            <Link href="/terms" className="text-[#d4af37] hover:underline">
              Sacred Oaths
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-[#d4af37] hover:underline">
              Covenant of Privacy
            </Link>
          </motion.p>
        )}
      </form>

      {/* Toggle mode */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: isSignUp ? 0.8 : 0.6 }}
        className="mt-8 pt-6 border-t border-white/10 text-center"
      >
        <p className="text-[#a89f94] text-xs font-medium">
          {isSignUp ? "Already a recognized archivist?" : "New to the halls of Lunchtable?"}{" "}
          <Link
            href={isSignUp ? "/login" : "/signup"}
            className="text-[#d4af37] font-black uppercase tracking-widest hover:underline ml-1"
          >
            {isSignUp ? "Reveal Yourself" : "Begin Your Tale"}
          </Link>
        </p>
      </motion.div>
    </motion.div>
  );
}
