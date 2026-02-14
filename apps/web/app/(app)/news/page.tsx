"use client";

import { typedApi, useConvexQuery } from "@/lib/convexHelpers";
import { cn } from "@/lib/utils";
import { AuthLoading, Authenticated } from "convex/react";
import { ArrowRight, Clock, Loader2, Newspaper, Pin } from "lucide-react";
import Link from "next/link";

type NewsCategory = "update" | "event" | "patch" | "announcement" | "maintenance";

interface NewsArticle {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: NewsCategory;
  imageUrl?: string;
  isPinned: boolean;
  publishedAt?: number;
  createdAt: number;
}

const CATEGORY_STYLES: Record<NewsCategory, string> = {
  update: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  event: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  patch: "bg-green-500/20 text-green-400 border-green-500/30",
  announcement: "bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]/30",
  maintenance: "bg-red-500/20 text-red-400 border-red-500/30",
};

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  update: "Update",
  event: "Event",
  patch: "Patch Notes",
  announcement: "Announcement",
  maintenance: "Maintenance",
};

export default function NewsPage() {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
        </div>
      </AuthLoading>
      <Authenticated>
        <NewsContent />
      </Authenticated>
    </>
  );
}

function NewsContent() {
  const articles = useConvexQuery(typedApi.admin.news.getPublishedNews, { limit: 50 });

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

        {/* Loading State */}
        {!articles && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#d4af37] animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {articles && articles.length === 0 && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-16 rounded-xl bg-black/40 border border-[#3d2b1f]">
              <Newspaper className="w-16 h-16 mx-auto mb-4 text-[#a89f94]/50" />
              <p className="text-[#e8e0d5] font-bold mb-2">No news yet</p>
              <p className="text-[#a89f94]">Check back soon for updates!</p>
            </div>

            {/* Social Links */}
            <div className="mt-12 p-6 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 text-center">
              <p className="text-[#d4af37] font-medium mb-2">Stay Connected</p>
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
                  href={process.env.NEXT_PUBLIC_DISCORD_URL || "https://discord.gg/hgjCJJZh"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#d4af37] hover:underline"
                >
                  Discord
                </Link>{" "}
                for the latest updates!
              </p>
            </div>
          </div>
        )}

        {/* News Grid */}
        {articles && articles.length > 0 && (
          <div className="max-w-4xl mx-auto space-y-6">
            {articles.map((article: NewsArticle) => (
              <Link key={article._id} href={`/news/${article.slug}`} className="group block">
                <article className="p-6 rounded-xl bg-black/40 border border-[#3d2b1f] hover:border-[#d4af37]/50 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {article.isPinned && <Pin className="w-4 h-4 text-[#d4af37]" />}
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-xs font-medium border",
                            CATEGORY_STYLES[article.category]
                          )}
                        >
                          {CATEGORY_LABELS[article.category]}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-[#a89f94]">
                          <Clock className="w-3 h-3" />
                          {new Date(article.publishedAt ?? article.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-[#e8e0d5] mb-2 group-hover:text-[#d4af37] transition-colors">
                        {article.title}
                      </h2>
                      <p className="text-[#a89f94] text-sm leading-relaxed">{article.excerpt}</p>
                    </div>
                    <div className="sm:self-center">
                      <div className="w-10 h-10 rounded-full bg-[#d4af37]/10 flex items-center justify-center group-hover:bg-[#d4af37]/20 transition-colors">
                        <ArrowRight className="w-5 h-5 text-[#d4af37] group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            ))}

            {/* Social Links */}
            <div className="mt-8 p-6 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 text-center">
              <p className="text-[#d4af37] font-medium mb-2">Stay Connected</p>
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
                  href={process.env.NEXT_PUBLIC_DISCORD_URL || "https://discord.gg/hgjCJJZh"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#d4af37] hover:underline"
                >
                  Discord
                </Link>{" "}
                for the latest updates!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
