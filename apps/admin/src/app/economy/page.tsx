"use client";

/**
 * Economy Hub Page
 *
 * Central navigation for all economy-related admin features.
 */

import { PageWrapper } from "@/components/layout";
import { Card, Text, Title } from "@tremor/react";
import {
  BarChart3Icon,
  CreditCardIcon,
  DicesIcon,
  PercentIcon,
  ShoppingBagIcon,
  TagIcon,
} from "lucide-react";
import Link from "next/link";

interface FeatureCard {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
}

const ECONOMY_FEATURES: FeatureCard[] = [
  {
    title: "RNG Configuration",
    description: "Adjust rarity weights, variant rates, and pity thresholds for pack opening",
    href: "/economy/rng",
    icon: <DicesIcon className="h-8 w-8" />,
    color: "text-purple-500",
  },
  {
    title: "Revenue Dashboard",
    description: "Real-time revenue metrics, pack sales breakdown, and spending analytics",
    href: "/economy/revenue",
    icon: <BarChart3Icon className="h-8 w-8" />,
    color: "text-emerald-500",
  },
  {
    title: "Sales Management",
    description: "Create and manage promotional sales, discounts, and special offers",
    href: "/economy/sales",
    icon: <TagIcon className="h-8 w-8" />,
    color: "text-amber-500",
  },
  {
    title: "Stripe Dashboard",
    description: "Monitor subscriptions, MRR, churn rate, and payment events",
    href: "/economy/stripe",
    icon: <CreditCardIcon className="h-8 w-8" />,
    color: "text-blue-500",
  },
  {
    title: "Shop Products",
    description: "Manage card packs, boxes, and currency bundles in the shop",
    href: "/shop",
    icon: <ShoppingBagIcon className="h-8 w-8" />,
    color: "text-rose-500",
  },
  {
    title: "Marketplace Moderation",
    description: "Review and moderate player-to-player marketplace listings",
    href: "/moderation/marketplace",
    icon: <PercentIcon className="h-8 w-8" />,
    color: "text-indigo-500",
  },
];

export default function EconomyHubPage() {
  return (
    <PageWrapper title="Economy Hub" description="Manage game economy, revenue, and monetization">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {ECONOMY_FEATURES.map((feature) => (
          <Link key={feature.href} href={feature.href}>
            <Card className="h-full cursor-pointer transition-all hover:shadow-lg hover:border-primary/50">
              <div className="flex flex-col items-center text-center p-4">
                <div className={`mb-4 ${feature.color}`}>{feature.icon}</div>
                <Title className="mb-2">{feature.title}</Title>
                <Text className="text-muted-foreground">{feature.description}</Text>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </PageWrapper>
  );
}
