"use client";

import { useProfile } from "@/hooks";
import { Loader2, Newspaper, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  category: "update" | "event" | "patch" | "announcement";
}

const SAMPLE_NEWS: NewsItem[] = [
  {
    id: "1",
    title: "Welcome to Lunchtable TCG!",
    excerpt:
      "The realm opens its doors. Join the battle, build your deck, and forge your legend in the arena.",
    date: "2026-02-01",
    category: "announcement",
  },
  {
    id: "2",
    title: "Season 1 Begins",
    excerpt:
      "The first ranked season has begun! Climb the ladder, earn exclusive rewards, and prove your worth.",
    date: "2026-02-01",
    category: "event",
  },
  {
    id: "3",
    title: "New Card Pack Available",
    excerpt:
      "The Starter Collection is now available in the shop. Get your first cards and begin your journey.",
    date: "2026-02-01",
    category: "update",
  },
];

const CATEGORY_STYLES = {
  update: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  event: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  patch: "bg-green-500/20 text-green-400 border-green-500/30",
  announcement: "bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]/30",
};

export default function NewsPage() {
  const { profile: currentUser, isLoading: profileLoading } = useProfile();

  if (profileLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0a09] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-amber-900/10 via-[#0d0a09] to-[#0d0a09]" />

      <div className="container mx-auto px-4 pt-28 pb-16 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#d4af37]/20 border-2 border-[#d4af37] mb-4">
            <Newspaper className="w-8 h-8 text-[#d4af37]" />
          </div>
          <h1 className="text-3xl font-bold text-[#e8e0d5] mb-2">Chronicles</h1>
          <p className="text-[#a89f94] max-w-md mx-auto">
            Stay updated with the latest news, events, and announcements from the realm
          </p>
        </div>

        {/* News Grid */}
        <div className="max-w-4xl mx-auto space-y-6">
          {SAMPLE_NEWS.map((item) => (
            <article
              key={item.id}
              className="group p-6 rounded-xl bg-black/40 border border-[#3d2b1f] hover:border-[#d4af37]/50 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${CATEGORY_STYLES[item.category]}`}
                    >
                      {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[#a89f94]">
                      <Clock className="w-3 h-3" />
                      {new Date(item.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-[#e8e0d5] mb-2 group-hover:text-[#d4af37] transition-colors">
                    {item.title}
                  </h2>
                  <p className="text-[#a89f94] text-sm leading-relaxed">{item.excerpt}</p>
                </div>
                <div className="sm:self-center">
                  <div className="w-10 h-10 rounded-full bg-[#d4af37]/10 flex items-center justify-center group-hover:bg-[#d4af37]/20 transition-colors">
                    <ArrowRight className="w-5 h-5 text-[#d4af37] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Coming Soon Notice */}
        <div className="max-w-4xl mx-auto mt-12 p-6 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 text-center">
          <p className="text-[#d4af37] font-medium mb-2">More Chronicles Coming Soon</p>
          <p className="text-[#a89f94] text-sm">
            Follow us on{" "}
            <Link
              href="https://x.com/LunchTableTCG"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#d4af37] hover:underline"
            >
              X
            </Link>{" "}
            and join our{" "}
            <Link
              href="https://discord.gg/hgjCJJZh"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#d4af37] hover:underline"
            >
              Discord
            </Link>{" "}
            to stay updated!
          </p>
        </div>
      </div>
    </div>
  );
}
