"use client";

import { typedApi, useConvexQuery } from "@/lib/convexHelpers";
import { cn } from "@/lib/utils";
import { AuthLoading, Authenticated } from "convex/react";
import { ArrowLeft, Calendar, Clock, Loader2, Newspaper, Pin, Tag } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

type NewsCategory = "update" | "event" | "patch" | "announcement" | "maintenance";

interface NewsArticle {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: NewsCategory;
  imageUrl?: string;
  isPinned: boolean;
  publishedAt?: number;
  createdAt: number;
  updatedAt: number;
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

export default function ArticlePage() {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
        </div>
      </AuthLoading>
      <Authenticated>
        <ArticleContent />
      </Authenticated>
    </>
  );
}

function ArticleContent() {
  const params = useParams();
  const slug = params["slug"] as string;

  const article = useConvexQuery(typedApi.admin.news.getArticleBySlug, { slug });

  // Loading state
  if (article === undefined) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
      </div>
    );
  }

  // Not found
  if (article === null) {
    return (
      <div className="min-h-screen bg-[#0d0a09] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-amber-900/10 via-[#0d0a09] to-[#0d0a09]" />
        <div className="container mx-auto px-4 pt-28 pb-16 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <Newspaper className="w-16 h-16 mx-auto mb-4 text-[#a89f94]/50" />
            <h1 className="text-2xl font-bold text-[#e8e0d5] mb-4">Article Not Found</h1>
            <p className="text-[#a89f94] mb-8">
              This article doesn&apos;t exist or has been removed.
            </p>
            <Link
              href="/news"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#d4af37] text-[#1a1614] font-medium hover:bg-[#f9e29f] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Chronicles
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const typedArticle = article as NewsArticle;

  return (
    <div className="min-h-screen bg-[#0d0a09] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-amber-900/10 via-[#0d0a09] to-[#0d0a09]" />

      <div className="container mx-auto px-4 pt-28 pb-16 relative z-10">
        <div className="max-w-3xl mx-auto">
          {/* Back Link */}
          <Link
            href="/news"
            className="inline-flex items-center gap-2 text-[#a89f94] hover:text-[#d4af37] transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Chronicles
          </Link>

          {/* Article Header */}
          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {typedArticle.isPinned && (
                <div className="flex items-center gap-1 text-[#d4af37]">
                  <Pin className="w-4 h-4" />
                  <span className="text-xs font-medium">Pinned</span>
                </div>
              )}
              <span
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border",
                  CATEGORY_STYLES[typedArticle.category]
                )}
              >
                <Tag className="w-3 h-3 inline mr-1" />
                {CATEGORY_LABELS[typedArticle.category]}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-[#e8e0d5] mb-4">
              {typedArticle.title}
            </h1>

            <p className="text-lg text-[#a89f94] mb-6">{typedArticle.excerpt}</p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-[#a89f94]">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(typedArticle.publishedAt ?? typedArticle.createdAt).toLocaleDateString(
                  "en-US",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }
                )}
              </span>
              {typedArticle.updatedAt > typedArticle.createdAt + 60000 && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Updated{" "}
                  {new Date(typedArticle.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>
          </header>

          {/* Featured Image */}
          {typedArticle.imageUrl && (
            <div className="mb-8 rounded-xl overflow-hidden border border-[#3d2b1f]">
              <img src={typedArticle.imageUrl} alt={typedArticle.title} className="w-full h-auto" />
            </div>
          )}

          {/* Article Content */}
          <article className="prose prose-invert prose-gold max-w-none">
            <div
              className="text-[#e8e0d5] leading-relaxed whitespace-pre-wrap"
              style={{
                // Basic markdown-like styling
                lineHeight: "1.8",
              }}
            >
              {typedArticle.content.split("\n").map((paragraph, index) => {
                // Handle headers
                if (paragraph.startsWith("# ")) {
                  return (
                    <h2 key={index} className="text-2xl font-bold text-[#d4af37] mt-8 mb-4">
                      {paragraph.slice(2)}
                    </h2>
                  );
                }
                if (paragraph.startsWith("## ")) {
                  return (
                    <h3 key={index} className="text-xl font-bold text-[#e8e0d5] mt-6 mb-3">
                      {paragraph.slice(3)}
                    </h3>
                  );
                }
                if (paragraph.startsWith("### ")) {
                  return (
                    <h4 key={index} className="text-lg font-bold text-[#e8e0d5] mt-4 mb-2">
                      {paragraph.slice(4)}
                    </h4>
                  );
                }
                // Handle bullet points
                if (paragraph.startsWith("- ")) {
                  return (
                    <li key={index} className="text-[#a89f94] ml-4 mb-1">
                      {paragraph.slice(2)}
                    </li>
                  );
                }
                // Empty lines
                if (!paragraph.trim()) {
                  return <br key={index} />;
                }
                // Regular paragraphs
                return (
                  <p key={index} className="text-[#a89f94] mb-4">
                    {paragraph}
                  </p>
                );
              })}
            </div>
          </article>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-[#3d2b1f]">
            <div className="p-6 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 text-center">
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
                  href="https://discord.gg/hgjCJJZh"
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
        </div>
      </div>
    </div>
  );
}
