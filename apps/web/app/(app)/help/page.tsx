"use client";

import {
  Book,
  ChevronDown,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Gamepad2,
  HelpCircle,
  Loader2,
  Mail,
  MessageSquare,
  Package,
  Search,
  Settings,
  Swords,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfile } from "@/hooks";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  title: string;
  icon: typeof HelpCircle;
  faqs: FAQItem[];
}

const FAQ_CATEGORIES: FAQCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Book,
    faqs: [
      {
        question: "How do I start playing?",
        answer:
          "After creating an account, you'll receive a starter deck. Head to 'The Table' to find matches, or try Story Mode to learn the game mechanics.",
      },
      {
        question: "What is a starter deck?",
        answer:
          "A starter deck is a pre-built deck of 30 cards that you receive when joining. It contains balanced cards suitable for beginners.",
      },
      {
        question: "How do I get more cards?",
        answer:
          "You can earn cards by: completing quests, winning matches, opening card packs from the shop, or trading with other players in the marketplace.",
      },
    ],
  },
  {
    id: "gameplay",
    title: "Gameplay",
    icon: Gamepad2,
    faqs: [
      {
        question: "How does combat work?",
        answer:
          "Each turn, you draw a card, play cards from your hand using mana, and can attack with your creatures. The goal is to reduce your opponent's life points to zero.",
      },
      {
        question: "What are the different card types?",
        answer:
          "There are four card types: Creatures (attack and defend), Spells (one-time effects), Traps (triggered effects), and Equipment (boost your creatures).",
      },
      {
        question: "How does the mana system work?",
        answer:
          "You gain 1 mana crystal each turn, up to a maximum of 10. Cards cost mana to play, shown in the top-left corner of each card.",
      },
      {
        question: "What are elements?",
        answer:
          "Cards belong to elements: Fire, Water, Earth, Wind, or Neutral. Some cards have synergies with cards of the same element.",
      },
    ],
  },
  {
    id: "ranked",
    title: "Ranked Play",
    icon: Swords,
    faqs: [
      {
        question: "How does the ranking system work?",
        answer:
          "You start at 1000 rating. Winning increases your rating, losing decreases it. Higher-rated opponents give more points for winning.",
      },
      {
        question: "What are the rank tiers?",
        answer:
          "Bronze (0-1199), Silver (1200-1499), Gold (1500-1799), Platinum (1800-2099), Diamond (2100-2399), Master (2400+), and Legend (Top 100).",
      },
      {
        question: "Are there ranked seasons?",
        answer:
          "Yes! Each season lasts one month. At the end, you receive rewards based on your highest achieved rank.",
      },
    ],
  },
  {
    id: "cards",
    title: "Cards & Collection",
    icon: Package,
    faqs: [
      {
        question: "What do the card rarities mean?",
        answer:
          "Common (gray) are basic cards, Uncommon (green) are slightly better, Rare (blue) are strong, Epic (purple) are very powerful, and Legendary (gold) are the most powerful.",
      },
      {
        question: "Can I trade cards with other players?",
        answer:
          "Yes! Visit the Marketplace to list your cards for sale or browse cards from other players. A 5% platform fee applies to sales.",
      },
      {
        question: "How do I favorite a card?",
        answer:
          "In your Binder, click on a card to open the preview, then click the heart icon to add it to your favorites.",
      },
    ],
  },
  {
    id: "shop",
    title: "Shop & Currency",
    icon: CreditCard,
    faqs: [
      {
        question: "What currencies are there?",
        answer:
          "Gold is earned through gameplay (quests, matches). Gems are premium currency that can be purchased. Both can be used in the shop.",
      },
      {
        question: "What's in card packs?",
        answer:
          "Starter Packs contain 5 cards with 1 guaranteed rare. Booster Packs have 8 cards with 1 guaranteed epic. Premium Packs have 10 cards with 1 guaranteed legendary.",
      },
      {
        question: "Are there sales or discounts?",
        answer:
          "Yes! Keep an eye out for special events and seasonal sales where packs and items may be discounted.",
      },
    ],
  },
  {
    id: "social",
    title: "Social Features",
    icon: Users,
    faqs: [
      {
        question: "How do I add friends?",
        answer:
          "Go to the Social page, use the 'Find Players' tab, search for their username, and click 'Add Friend'.",
      },
      {
        question: "Can I challenge friends to matches?",
        answer:
          "Yes! When a friend is online, you can click 'Challenge' on their profile in the Social page.",
      },
      {
        question: "How do I report a player?",
        answer:
          "After a match, click on the opponent's name and select 'Report'. Describe the issue and our team will review it.",
      },
    ],
  },
  {
    id: "account",
    title: "Account & Settings",
    icon: Settings,
    faqs: [
      {
        question: "How do I change my password?",
        answer:
          "Go to Settings > Account > Change Password. You'll need to enter your current password and your new password.",
      },
      {
        question: "Can I change my username?",
        answer: "Username changes are available once every 30 days in Settings > Account.",
      },
      {
        question: "How do I delete my account?",
        answer:
          "Go to Settings > Account > Danger Zone > Delete Account. This action is permanent and cannot be undone.",
      },
    ],
  },
];

export default function HelpPage() {
  const { profile: currentUser, isLoading: profileLoading } = useProfile();

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>("getting-started");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const filteredCategories = searchQuery
    ? FAQ_CATEGORIES.map((cat) => ({
        ...cat,
        faqs: cat.faqs.filter(
          (faq) =>
            faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter((cat) => cat.faqs.length > 0)
    : FAQ_CATEGORIES;

  if (profileLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0a09] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-green-900/10 via-[#0d0a09] to-[#0d0a09]" />

      <div className="container mx-auto px-4 pt-28 pb-16 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#d4af37]/20 border-2 border-[#d4af37] mb-4">
            <HelpCircle className="w-8 h-8 text-[#d4af37]" />
          </div>
          <h1 className="text-3xl font-bold text-[#e8e0d5] mb-2">Help Center</h1>
          <p className="text-[#a89f94] max-w-md mx-auto">
            Find answers to common questions or contact our support team
          </p>
        </div>

        {/* Search */}
        <div className="max-w-xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a89f94]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for help..."
              className="pl-12 py-6 bg-black/40 border-[#3d2b1f] text-[#e8e0d5] text-lg"
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* FAQ Categories */}
          <div className="lg:col-span-2 space-y-4">
            {filteredCategories.map((category) => {
              const Icon = category.icon;
              const isExpanded = expandedCategory === category.id;

              return (
                <div
                  key={category.id}
                  className="rounded-xl bg-black/40 border border-[#3d2b1f] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#d4af37]/20 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[#d4af37]" />
                    </div>
                    <span className="flex-1 text-left font-bold text-[#e8e0d5]">
                      {category.title}
                    </span>
                    <span className="text-xs text-[#a89f94] mr-2">
                      {category.faqs.length} articles
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-[#a89f94]" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-[#a89f94]" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-[#3d2b1f]">
                      {category.faqs.map((faq, index) => {
                        const faqId = `${category.id}-${index}`;
                        const isFaqExpanded = expandedFaq === faqId;

                        return (
                          <div key={faqId} className="border-b border-[#3d2b1f] last:border-0">
                            <button
                              type="button"
                              onClick={() => setExpandedFaq(isFaqExpanded ? null : faqId)}
                              className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left"
                            >
                              <span className="flex-1 text-[#e8e0d5]">{faq.question}</span>
                              {isFaqExpanded ? (
                                <ChevronDown className="w-4 h-4 text-[#a89f94] shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-[#a89f94] shrink-0" />
                              )}
                            </button>
                            {isFaqExpanded && (
                              <div className="px-4 pb-4 text-[#a89f94] text-sm">{faq.answer}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredCategories.length === 0 && (
              <div className="text-center py-16 rounded-xl bg-black/40 border border-[#3d2b1f]">
                <Search className="w-16 h-16 mx-auto mb-4 text-[#a89f94]/50" />
                <p className="text-[#e8e0d5] font-bold mb-2">No results found</p>
                <p className="text-[#a89f94]">Try different keywords or browse categories</p>
              </div>
            )}
          </div>

          {/* Contact & Quick Links */}
          <div className="space-y-6">
            {/* Contact Support */}
            <div className="p-6 rounded-xl bg-black/40 border border-[#3d2b1f]">
              <h2 className="text-lg font-bold text-[#e8e0d5] mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#d4af37]" />
                Contact Support
              </h2>
              <p className="text-[#a89f94] text-sm mb-4">
                Can&apos;t find what you&apos;re looking for? Our support team is here to help.
              </p>
              <Button asChild className="w-full bg-[#d4af37] hover:bg-[#f9e29f] text-[#1a1614]">
                <a href="mailto:support@lunchtable.gg">
                  <Mail className="w-4 h-4 mr-2" />
                  Email Support
                </a>
              </Button>
            </div>

            {/* Quick Links */}
            <div className="p-6 rounded-xl bg-black/40 border border-[#3d2b1f]">
              <h2 className="text-lg font-bold text-[#e8e0d5] mb-4">Quick Links</h2>
              <div className="space-y-2">
                {[
                  { href: "/terms", label: "Terms of Service" },
                  { href: "/privacy", label: "Privacy Policy" },
                  { href: "/settings", label: "Account Settings" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2 p-3 rounded-lg text-[#a89f94] hover:text-[#e8e0d5] hover:bg-white/5 transition-colors"
                  >
                    <span>{link.label}</span>
                    <ExternalLink className="w-4 h-4 ml-auto" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Game Status */}
            <div className="p-6 rounded-xl bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <div>
                  <p className="font-bold text-green-400">All Systems Operational</p>
                  <p className="text-xs text-green-400/60">Last updated: Just now</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
