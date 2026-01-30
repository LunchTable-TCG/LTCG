"use client";

import { useLogin, usePrivy } from "@privy-io/react-auth";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiAny, useConvexMutation } from "@/lib/convexHelpers";

interface AuthFormProps {
  mode: "signIn" | "signUp";
}

export function AuthForm({ mode }: AuthFormProps) {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrGetUser = useConvexMutation(apiAny.auth.syncUser.createOrGetUser);

  const isSignUp = mode === "signUp";

  // Use the useLogin hook with onComplete callback per Privy docs
  // onComplete fires after auth AND wallet creation (if configured)
  const { login } = useLogin({
    onComplete: async ({ user, isNewUser: _isNewUser, wasAlreadyAuthenticated }) => {
      // Skip if already authenticated (user was already logged in)
      if (wasAlreadyAuthenticated) {
        router.push("/lunchtable");
        return;
      }

      setSyncing(true);
      try {
        const result = await createOrGetUser({
          email: user.email?.address,
        });

        // If new user without username, redirect to username setup
        if (result.isNewUser || !result.hasUsername) {
          router.push("/setup-username");
        } else {
          router.push("/lunchtable");
        }
      } catch (err) {
        console.error("Failed to sync user:", err);
        setError("Failed to set up your account. Please try again.");
        setSyncing(false);
      }
    },
    onError: (error) => {
      console.error("Login error:", error);
      setError("Login failed. Please try again.");
    },
  });

  const handleLogin = () => {
    setError(null);
    // Privy will show its modal for email login
    login();
  };

  // Show loading state while Privy initializes or syncing
  if (!ready || syncing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-md text-center"
      >
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#d4af37]" />
        <p className="text-[#a89f94] mt-4 text-sm">
          {syncing ? "Setting up your account..." : "Loading..."}
        </p>
      </motion.div>
    );
  }

  // If already authenticated, show syncing message
  if (authenticated) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-md text-center"
      >
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#d4af37]" />
        <p className="text-[#a89f94] mt-4 text-sm">Entering the halls...</p>
      </motion.div>
    );
  }

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

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6"
        >
          {error}
        </motion.div>
      )}

      {/* Login button - triggers Privy modal */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        type="button"
        onClick={handleLogin}
        className="group relative w-full py-4 rounded-xl overflow-hidden bg-linear-to-r from-[#8b4513] via-[#d4af37] to-[#8b4513] hover:from-[#a0522d] hover:via-[#f9e29f] hover:to-[#a0522d] transition-all duration-300 shadow-lg hover:shadow-gold"
      >
        <span className="relative flex items-center justify-center gap-2 text-lg font-black uppercase tracking-widest text-white">
          {isSignUp ? "Create Account" : "Enter the Hall"}
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </span>
      </motion.button>

      {/* Terms */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-[10px] text-[#a89f94]/60 text-center font-medium italic mt-4"
      >
        By continuing, you accept our{" "}
        <Link href="/terms" className="text-[#d4af37] hover:underline">
          Sacred Oaths
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-[#d4af37] hover:underline">
          Covenant of Privacy
        </Link>
      </motion.p>

      {/* Toggle mode */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 pt-6 border-t border-white/10 text-center"
      >
        <p className="text-[#a89f94] text-xs font-medium">
          {isSignUp ? "Already a recognized archivist?" : "New to the halls of Lunchtable?"}{" "}
          <Link
            href={isSignUp ? "/login" : "/signup"}
            className="text-[#d4af37] font-black uppercase tracking-widest hover:underline ml-1"
          >
            {isSignUp ? "Sign In" : "Create Account"}
          </Link>
        </p>
      </motion.div>
    </motion.div>
  );
}
