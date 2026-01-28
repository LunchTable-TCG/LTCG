"use client";

import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { useAuthActions } from "@convex-dev/auth/react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("flow", "reset");

      await signIn("password", formData);
      setIsSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send reset email. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthPageShell>
      <div className="text-center mb-10">
        <Link href="/" className="inline-flex flex-col items-center gap-3 group">
          <div className="w-16 h-16 rounded-2xl bg-black/60 border border-[#d4af37]/30 flex items-center justify-center shadow-gold group-hover:scale-110 transition-transform duration-500">
            <Sparkles className="w-10 h-10 text-[#d4af37]" />
          </div>
          <span className="text-3xl font-black text-[#e8e0d5] uppercase tracking-tighter">
            Lunchtable
          </span>
        </Link>
      </div>

      <div className="relative p-8 rounded-2xl tcg-chat-leather shadow-2xl overflow-hidden">
        <div className="ornament-corner ornament-corner-tl" />
        <div className="ornament-corner ornament-corner-tr" />

        {isSubmitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-black text-[#e8e0d5] mb-3 uppercase tracking-tight">
              Check Your Email
            </h2>
            <p className="text-[#a89f94] mb-6">
              If an account exists for <span className="text-[#d4af37]">{email}</span>, we&apos;ve
              sent instructions to reset your cipher.
            </p>
            <p className="text-[#a89f94]/60 text-sm mb-6">
              Didn&apos;t receive the email? Check your spam folder or try again.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href={`/reset-password?email=${encodeURIComponent(email)}`}
                className="w-full py-3 rounded-xl bg-linear-to-r from-[#8b4513] via-[#d4af37] to-[#8b4513] hover:from-[#a0522d] hover:via-[#f9e29f] hover:to-[#a0522d] text-white text-center font-bold transition-all"
              >
                Enter Reset Code
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail("");
                }}
                className="w-full py-3 rounded-xl border border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 transition-all font-medium"
              >
                Try a different email
              </button>
              <Link
                href="/login"
                className="w-full py-3 rounded-xl border border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 text-center font-medium transition-all"
              >
                Return to Sign In
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 border border-[#d4af37]/30 text-[10px] text-[#d4af37] font-black uppercase tracking-widest mb-5">
                <Mail className="w-3.5 h-3.5" />
                Cipher Recovery
              </div>
              <h1 className="text-2xl font-black mb-3">
                <span className="text-[#e8e0d5] uppercase tracking-tighter">
                  Forgot Your Cipher?
                </span>
              </h1>
              <p className="text-[#a89f94] text-sm">
                Enter your email and we&apos;ll send you a magic link to reset your password.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
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
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    required
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-parchment text-[#2a1f14] placeholder:text-[#2a1f14]/40 border border-[#3d2b1f]/20 focus:outline-none focus:border-[#d4af37]/50 focus:ring-2 focus:ring-[#d4af37]/10 transition-all font-medium"
                  />
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full py-4 rounded-xl overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed bg-linear-to-r from-[#8b4513] via-[#d4af37] to-[#8b4513] hover:from-[#a0522d] hover:via-[#f9e29f] hover:to-[#a0522d] transition-all duration-300 shadow-lg hover:shadow-gold"
              >
                <span className="relative flex items-center justify-center gap-2 text-lg font-black uppercase tracking-widest text-white">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Reset Link
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Back to login */}
            <div className="mt-8 pt-6 border-t border-white/10 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-[#a89f94] hover:text-[#d4af37] text-sm font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </AuthPageShell>
  );
}
