"use client";

import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { useAuthActions } from "@convex-dev/auth/react";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, CheckCircle, Loader2, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ResetPasswordForm() {
  const { signIn } = useAuthActions();
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email");

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // SECURITY: Match server-side password validation
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError("Password must contain at least one uppercase letter");
      return;
    }

    if (!/[a-z]/.test(password)) {
      setError("Password must contain at least one lowercase letter");
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError("Password must contain at least one number");
      return;
    }

    if (!code.trim()) {
      setError("Please enter the reset code");
      return;
    }

    if (!email) {
      setError("Email is required. Please request a new reset link.");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("code", code);
      formData.append("newPassword", password);
      formData.append("flow", "reset-verification");

      await signIn("password", formData);
      setIsSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-2xl font-black text-[#e8e0d5] mb-3 uppercase tracking-tight">
          Invalid Reset Link
        </h2>
        <p className="text-[#a89f94] mb-6">
          This password reset link is invalid or missing required information. Please request a new
          one.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block w-full py-3 rounded-xl bg-linear-to-r from-[#8b4513] via-[#d4af37] to-[#8b4513] hover:from-[#a0522d] hover:via-[#f9e29f] hover:to-[#a0522d] text-white text-center font-bold transition-all"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-4"
      >
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-2xl font-black text-[#e8e0d5] mb-3 uppercase tracking-tight">
          Cipher Reset Complete
        </h2>
        <p className="text-[#a89f94] mb-6">
          Your password has been successfully changed. Redirecting you to sign in...
        </p>
        <div className="flex justify-center">
          <Loader2 className="w-6 h-6 text-[#d4af37] animate-spin" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 border border-[#d4af37]/30 text-[10px] text-[#d4af37] font-black uppercase tracking-widest mb-5">
          <Lock className="w-3.5 h-3.5" />
          New Cipher
        </div>
        <h1 className="text-2xl font-black mb-3">
          <span className="text-[#e8e0d5] uppercase tracking-tighter">Create New Password</span>
        </h1>
        <p className="text-[#a89f94] text-sm">
          Enter your new password below. Make it strong and memorable.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="code"
            className="block text-[10px] font-black text-[#a89f94] uppercase tracking-widest mb-2"
          >
            Reset Code
          </label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a89f94] group-focus-within:text-[#d4af37] transition-colors" />
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter code from email"
              required
              className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-parchment text-[#2a1f14] placeholder:text-[#2a1f14]/40 border border-[#3d2b1f]/20 focus:outline-none focus:border-[#d4af37]/50 focus:ring-2 focus:ring-[#d4af37]/10 transition-all font-medium"
            />
          </div>
          <p className="text-[8px] text-[#a89f94]/60 mt-1.5 ml-1 font-medium italic">
            Check your email for the reset code
          </p>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-[10px] font-black text-[#a89f94] uppercase tracking-widest mb-2"
          >
            New Cipher
          </label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a89f94] group-focus-within:text-[#d4af37] transition-colors" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              required
              minLength={8}
              className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-parchment text-[#2a1f14] placeholder:text-[#2a1f14]/40 border border-[#3d2b1f]/20 focus:outline-none focus:border-[#d4af37]/50 focus:ring-2 focus:ring-[#d4af37]/10 transition-all font-medium"
            />
          </div>
          <p className="text-[8px] text-[#a89f94]/60 mt-1.5 ml-1 font-medium italic">
            Min 8 characters with uppercase, lowercase, and a number
          </p>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-[10px] font-black text-[#a89f94] uppercase tracking-widest mb-2"
          >
            Verify New Cipher
          </label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a89f94] group-focus-within:text-[#d4af37] transition-colors" />
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={8}
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
                Resetting...
              </>
            ) : (
              <>
                Reset Password
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </span>
        </button>
      </form>
    </motion.div>
  );
}

export default function ResetPasswordPage() {
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

        <Suspense
          fallback={
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-[#d4af37] animate-spin" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </AuthPageShell>
  );
}
