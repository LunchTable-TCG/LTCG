import { AuthForm } from "@/components/auth/AuthForm";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { Sparkles } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Sign Up | Lunchtable TCG",
  description: "Create your Lunchtable TCG account.",
};

export default function SignupPage() {
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
        <AuthForm mode="signUp" />
      </div>
    </AuthPageShell>
  );
}
