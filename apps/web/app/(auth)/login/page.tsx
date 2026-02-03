import { AuthForm } from "@/components/auth/AuthForm";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

export const metadata = {
  title: "Log In | Lunchtable TCG",
  description: "Log in to your Lunchtable TCG account.",
};

function AuthFormFallback() {
  return (
    <div className="w-full max-w-md text-center py-8">
      <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#d4af37]" />
      <p className="text-[#a89f94] mt-4 text-sm">Loading...</p>
    </div>
  );
}

export default function LoginPage() {
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

      <div className="panel-ornate rounded-2xl p-8 shadow-2xl">
        <Suspense fallback={<AuthFormFallback />}>
          <AuthForm mode="signIn" />
        </Suspense>
      </div>
    </AuthPageShell>
  );
}
