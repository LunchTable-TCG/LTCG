import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  Clock,
  ClipboardList,
  Coins,
  CreditCard,
  Crown,
  DollarSign,
  FileText,
  Filter,
  Flag,
  Gamepad2,
  Gift,
  Image,
  Key,
  Landmark,
  Layers,
  LayoutDashboard,
  Link,
  Medal,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Newspaper,
  Package,
  Paintbrush,
  Palette,
  Printer,
  Receipt,
  Scroll,
  Settings,
  Shield,
  ShoppingCart,
  Store,
  Swords,
  ToggleLeft,
  TrendingUp,
  Trophy,
  Upload,
  User,
  Users,
  Video,
  Wallet,
  Wrench,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
  keywords?: string[];
}

export interface NavSubGroup {
  title: string;
  items: NavItem[];
}

export interface NavSection {
  title: string;
  icon: LucideIcon;
  items: NavItem[];
  subGroups?: NavSubGroup[];
}

export interface FooterSection {
  title: string;
  icon: LucideIcon;
  items: NavItem[];
}

// =============================================================================
// Main Navigation
// =============================================================================

export const MAIN_NAVIGATION: NavSection[] = [
  // ── 1. Overview ──
  {
    title: "Overview",
    icon: LayoutDashboard,
    items: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard, keywords: ["home", "overview"] },
      { title: "Alerts", href: "/alerts", icon: Bell, permission: "admin.manage", keywords: ["notifications"] },
    ],
    subGroups: [
      {
        title: "Alert Management",
        items: [
          { title: "Rules", href: "/alerts/rules", icon: ClipboardList, permission: "admin.manage", keywords: ["alert rules", "triggers"] },
          { title: "Channels", href: "/alerts/channels", icon: Megaphone, permission: "admin.manage", keywords: ["notification channels", "slack"] },
          { title: "History", href: "/alerts/history", icon: Clock, permission: "admin.manage", keywords: ["alert log", "past"] },
        ],
      },
    ],
  },

  // ── 2. Game Content ──
  {
    title: "Game Content",
    icon: Gamepad2,
    items: [
      { title: "Cards", href: "/cards", icon: Layers, permission: "config.edit", keywords: ["deck", "collection"] },
      { title: "Assets", href: "/assets", icon: Image, permission: "config.edit", keywords: ["images", "media"] },
      { title: "Story Mode", href: "/story", icon: BookOpen, permission: "config.edit", keywords: ["campaign", "pve"] },
      { title: "Quests", href: "/quests", icon: Scroll, permission: "config.edit", keywords: ["missions", "tasks"] },
    ],
    subGroups: [
      {
        title: "Card Tools",
        items: [
          { title: "Template Designer", href: "/cards/template-designer", icon: Paintbrush, permission: "config.edit", keywords: ["templates", "design"] },
          { title: "Batch Render", href: "/cards/batch-render", icon: Printer, permission: "config.edit", keywords: ["generate", "bulk"] },
          { title: "Upload Backgrounds", href: "/cards/upload-backgrounds", icon: Upload, permission: "config.edit", keywords: ["images", "bg"] },
          { title: "Design Gallery", href: "/templates", icon: Palette, permission: "config.edit", keywords: ["freeform", "canvas", "designs"] },
        ],
      },
    ],
  },

  // ── 3. Live Operations ──
  {
    title: "Live Operations",
    icon: CalendarDays,
    items: [],
    subGroups: [
      {
        title: "Seasons & Competitions",
        items: [
          { title: "Seasons", href: "/seasons", icon: Trophy, permission: "config.edit", keywords: ["ranked", "ladder"] },
          { title: "Tournaments", href: "/tournaments", icon: Swords, permission: "player.view", keywords: ["events", "competitive"] },
          { title: "Battle Pass", href: "/battle-pass", icon: Medal, permission: "config.edit", keywords: ["rewards", "progression"] },
        ],
      },
      {
        title: "Commerce",
        items: [
          { title: "Shop", href: "/shop", icon: ShoppingCart, permission: "config.edit", keywords: ["store", "buy"] },
          { title: "Promo Codes", href: "/promo-codes", icon: Gift, permission: "config.edit", keywords: ["coupons", "discounts"] },
        ],
      },
      {
        title: "Communications",
        items: [
          { title: "Content Calendar", href: "/content-calendar", icon: CalendarDays, permission: "config.edit", keywords: ["schedule", "planning"] },
          { title: "News", href: "/news", icon: Newspaper, permission: "config.edit", keywords: ["announcements", "updates"] },
          { title: "Broadcast", href: "/broadcast", icon: Megaphone, permission: "batch.operations", keywords: ["push", "notify"] },
        ],
      },
    ],
  },

  // ── 4. Finance ──
  {
    title: "Finance",
    icon: DollarSign,
    items: [],
    subGroups: [
      {
        title: "Treasury",
        items: [
          { title: "Overview", href: "/treasury", icon: Landmark, permission: "admin.manage", keywords: ["funds", "balance"] },
          { title: "Wallets", href: "/treasury/wallets", icon: Wallet, permission: "admin.manage", keywords: ["addresses"] },
          { title: "Transactions", href: "/treasury/transactions", icon: Receipt, permission: "admin.manage", keywords: ["history", "ledger"] },
          { title: "Policies", href: "/treasury/policies", icon: FileText, permission: "admin.manage", keywords: ["rules", "limits"] },
        ],
      },
      {
        title: "Economy",
        items: [
          { title: "Economy Hub", href: "/economy", icon: Coins, permission: "admin.manage", keywords: ["overview", "monetization"] },
          { title: "Revenue", href: "/economy/revenue", icon: TrendingUp, permission: "admin.manage", keywords: ["income", "earnings"] },
          { title: "RNG Config", href: "/economy/rng", icon: Coins, permission: "admin.manage", keywords: ["random", "loot", "drops"] },
          { title: "Sales", href: "/economy/sales", icon: CreditCard, permission: "admin.manage", keywords: ["purchases"] },
          { title: "Stripe", href: "/economy/stripe", icon: CreditCard, permission: "admin.manage", keywords: ["payments", "billing"] },
        ],
      },
    ],
  },

  // ── 5. Players & Community ──
  {
    title: "Players & Community",
    icon: Users,
    items: [
      { title: "All Players", href: "/players", icon: Users, permission: "player.view", keywords: ["users", "accounts"] },
      { title: "Feedback", href: "/feedback", icon: MessageSquare, permission: "player.view", keywords: ["reviews", "suggestions"] },
    ],
    subGroups: [
      {
        title: "Moderation",
        items: [
          { title: "Dashboard", href: "/moderation", icon: Shield, permission: "player.view", keywords: ["mod", "overview"] },
          { title: "Reports", href: "/moderation/reports", icon: Flag, permission: "player.view", keywords: ["violations"] },
          { title: "Chat", href: "/moderation/chat", icon: MessageCircle, permission: "player.view", keywords: ["messages"] },
          { title: "Marketplace", href: "/moderation/marketplace", icon: Store, permission: "player.view", keywords: ["trades", "listings"] },
          { title: "Suspicious Activity", href: "/moderation/suspicious", icon: AlertTriangle, permission: "admin.audit.view", keywords: ["fraud", "abuse"] },
        ],
      },
    ],
  },

  // ── 6. Analytics ──
  {
    title: "Analytics",
    icon: BarChart3,
    items: [
      { title: "Overview", href: "/analytics", icon: BarChart3, keywords: ["stats", "metrics"] },
      { title: "Players", href: "/analytics/players", icon: User, keywords: ["retention", "dau"] },
      { title: "Games", href: "/analytics/games", icon: Gamepad2, keywords: ["matches", "win rate"] },
      { title: "Cards", href: "/analytics/cards", icon: Layers, keywords: ["meta", "usage"] },
      { title: "Economy", href: "/analytics/economy", icon: Coins, keywords: ["spending", "currency"] },
      { title: "Marketplace", href: "/analytics/marketplace", icon: Store, keywords: ["trades", "volume"] },
      { title: "Streaming", href: "/analytics/streaming", icon: Video, keywords: ["viewers", "streams"] },
      { title: "Token", href: "/analytics/token", icon: Coins, keywords: ["price", "holders"] },
      { title: "Feedback", href: "/analytics/feedback", icon: MessageSquare, keywords: ["sentiment", "nps"] },
      { title: "Integrity", href: "/analytics/integrity", icon: Shield, keywords: ["health", "race condition", "monitoring"] },
    ],
    subGroups: [
      {
        title: "User Behavior",
        items: [
          { title: "Overview", href: "/analytics/behavior", icon: BarChart3, keywords: ["posthog", "behavior"] },
          { title: "Sessions", href: "/analytics/behavior/sessions", icon: Clock, keywords: ["activity", "time"] },
          { title: "Errors", href: "/analytics/behavior/errors", icon: AlertCircle, keywords: ["bugs", "crashes"] },
          { title: "Funnels", href: "/analytics/behavior/funnels", icon: Filter, keywords: ["conversion", "drop-off"] },
        ],
      },
    ],
  },

  // ── 7. System ──
  {
    title: "System",
    icon: Settings,
    items: [
      { title: "Admins", href: "/admins", icon: Crown, permission: "admin.manage", keywords: ["roles", "team"] },
      { title: "API Keys", href: "/api-keys", icon: Key, permission: "player.view", keywords: ["tokens", "secrets"] },
      { title: "Maintenance", href: "/maintenance", icon: Wrench, permission: "admin.manage", keywords: ["downtime"] },
      { title: "Batch Operations", href: "/batch", icon: Package, permission: "batch.operations", keywords: ["bulk", "jobs"] },
      { title: "Audit Log", href: "/audit", icon: ClipboardList, permission: "admin.audit.view", keywords: ["history", "changes"] },
    ],
    subGroups: [
      {
        title: "Settings",
        items: [
          { title: "Feature Flags", href: "/settings/features", icon: ToggleLeft, permission: "admin.manage", keywords: ["toggles", "experiments"] },
          { title: "Configuration", href: "/settings/config", icon: Settings, permission: "admin.manage", keywords: ["app config"] },
          { title: "AI Providers", href: "/settings/ai", icon: Bot, permission: "admin.manage", keywords: ["llm", "models"] },
          { title: "Branding", href: "/settings/branding", icon: Palette, permission: "admin.manage", keywords: ["theme", "logo"] },
        ],
      },
      {
        title: "AI Tools",
        items: [
          { title: "AI Assistant", href: "/ai-assistant", icon: Bot, permission: "player.view", keywords: ["chat", "help"] },
          { title: "Dashboard Builder", href: "/ai-dashboard", icon: LayoutDashboard, permission: "player.view", keywords: ["custom", "widgets"] },
        ],
      },
    ],
  },
];

// =============================================================================
// Footer Navigation (Documentation)
// =============================================================================

export const FOOTER_NAVIGATION: FooterSection = {
  title: "Documentation",
  icon: BookOpen,
  items: [
    { title: "API Docs", href: "/docs", icon: BookOpen, keywords: ["reference", "api"] },
    { title: "Endpoints", href: "/docs/endpoints", icon: Link, keywords: ["routes", "urls"] },
    { title: "Rate Limits", href: "/docs/rate-limits", icon: Clock, keywords: ["throttle", "quota"] },
    { title: "Webhooks", href: "/docs/webhooks", icon: Bell, keywords: ["callbacks", "events"] },
    { title: "Error Codes", href: "/docs/errors", icon: AlertCircle, keywords: ["status", "errors"] },
  ],
};

// =============================================================================
// Route Map (for auto-breadcrumbs)
// =============================================================================

export const ROUTE_MAP: Record<string, { label: string; parent?: string }> = {
  "/": { label: "Dashboard" },
  "/alerts": { label: "Alerts" },
  "/alerts/rules": { label: "Rules", parent: "/alerts" },
  "/alerts/channels": { label: "Channels", parent: "/alerts" },
  "/alerts/history": { label: "History", parent: "/alerts" },

  // Game Content
  "/cards": { label: "Cards", parent: "/game-content" },
  "/cards/template-designer": { label: "Template Designer", parent: "/cards" },
  "/cards/batch-render": { label: "Batch Render", parent: "/cards" },
  "/cards/upload-backgrounds": { label: "Upload Backgrounds", parent: "/cards" },
  "/assets": { label: "Assets", parent: "/game-content" },
  "/story": { label: "Story Mode", parent: "/game-content" },
  "/quests": { label: "Quests", parent: "/game-content" },
  "/templates": { label: "Design Gallery", parent: "/game-content" },
  "/templates/[templateId]": { label: "Design Editor", parent: "/templates" },

  // Live Operations
  "/seasons": { label: "Seasons", parent: "/live-ops" },
  "/tournaments": { label: "Tournaments", parent: "/live-ops" },
  "/battle-pass": { label: "Battle Pass", parent: "/live-ops" },
  "/shop": { label: "Shop", parent: "/live-ops" },
  "/promo-codes": { label: "Promo Codes", parent: "/live-ops" },
  "/content-calendar": { label: "Content Calendar", parent: "/live-ops" },
  "/news": { label: "News", parent: "/live-ops" },
  "/broadcast": { label: "Broadcast", parent: "/live-ops" },

  // Finance
  "/treasury": { label: "Overview", parent: "/finance-treasury" },
  "/treasury/wallets": { label: "Wallets", parent: "/treasury" },
  "/treasury/transactions": { label: "Transactions", parent: "/treasury" },
  "/treasury/policies": { label: "Policies", parent: "/treasury" },
  "/economy": { label: "Economy Hub", parent: "/finance-economy" },
  "/economy/revenue": { label: "Revenue", parent: "/finance-economy" },
  "/economy/rng": { label: "RNG Config", parent: "/finance-economy" },
  "/economy/sales": { label: "Sales", parent: "/finance-economy" },
  "/economy/stripe": { label: "Stripe", parent: "/finance-economy" },

  // Players & Community
  "/players": { label: "All Players", parent: "/players-community" },
  "/feedback": { label: "Feedback", parent: "/players-community" },
  "/moderation": { label: "Dashboard", parent: "/players-moderation" },
  "/moderation/reports": { label: "Reports", parent: "/moderation" },
  "/moderation/chat": { label: "Chat", parent: "/moderation" },
  "/moderation/marketplace": { label: "Marketplace", parent: "/moderation" },
  "/moderation/suspicious": { label: "Suspicious Activity", parent: "/moderation" },

  // Analytics
  "/analytics": { label: "Overview", parent: "/analytics-section" },
  "/analytics/players": { label: "Players", parent: "/analytics" },
  "/analytics/games": { label: "Games", parent: "/analytics" },
  "/analytics/cards": { label: "Cards", parent: "/analytics" },
  "/analytics/economy": { label: "Economy", parent: "/analytics" },
  "/analytics/marketplace": { label: "Marketplace", parent: "/analytics" },
  "/analytics/streaming": { label: "Streaming", parent: "/analytics" },
  "/analytics/token": { label: "Token", parent: "/analytics" },
  "/analytics/feedback": { label: "Feedback", parent: "/analytics" },
  "/analytics/integrity": { label: "Integrity", parent: "/analytics" },
  "/analytics/behavior": { label: "User Behavior", parent: "/analytics-section" },
  "/analytics/behavior/sessions": { label: "Sessions", parent: "/analytics-behavior" },
  "/analytics/behavior/errors": { label: "Errors", parent: "/analytics-behavior" },
  "/analytics/behavior/funnels": { label: "Funnels", parent: "/analytics-behavior" },

  // System
  "/admins": { label: "Admins", parent: "/system" },
  "/api-keys": { label: "API Keys", parent: "/system" },
  "/settings/features": { label: "Feature Flags", parent: "/system-settings" },
  "/settings/config": { label: "Configuration", parent: "/system-settings" },
  "/settings/ai": { label: "AI Providers", parent: "/system-settings" },
  "/settings/branding": { label: "Branding", parent: "/system-settings" },
  "/maintenance": { label: "Maintenance", parent: "/system" },
  "/batch": { label: "Batch Operations", parent: "/system" },
  "/audit": { label: "Audit Log", parent: "/system" },
  "/ai-assistant": { label: "AI Assistant", parent: "/system-ai" },
  "/ai-dashboard": { label: "Dashboard Builder", parent: "/system-ai" },

  // Documentation
  "/docs": { label: "API Docs", parent: "/docs-section" },
  "/docs/endpoints": { label: "Endpoints", parent: "/docs" },
  "/docs/rate-limits": { label: "Rate Limits", parent: "/docs" },
  "/docs/webhooks": { label: "Webhooks", parent: "/docs" },
  "/docs/errors": { label: "Error Codes", parent: "/docs" },

  // Dynamic route patterns (for getBreadcrumbs pattern matching)
  "/battle-pass/[seasonId]": { label: "Season Details", parent: "/battle-pass" },
  "/battle-pass/[seasonId]/tiers": { label: "Tiers", parent: "/battle-pass/[seasonId]" },
  "/cards/[cardId]": { label: "Card Details", parent: "/cards" },
  "/players/[playerId]": { label: "Player Details", parent: "/players" },
  "/promo-codes/[promoCodeId]": { label: "Promo Code Details", parent: "/promo-codes" },
  "/quests/[questId]": { label: "Quest Details", parent: "/quests" },
  "/quests/achievement/[achievementId]": { label: "Achievement", parent: "/quests" },
  "/seasons/[seasonId]": { label: "Season Details", parent: "/seasons" },
  "/shop/[productId]": { label: "Product Details", parent: "/shop" },
  "/story/[chapterId]": { label: "Chapter", parent: "/story" },
  "/story/[chapterId]/stage/[stageId]": { label: "Stage", parent: "/story/[chapterId]" },
  "/tournaments/[tournamentId]": { label: "Tournament Details", parent: "/tournaments" },

  // Virtual parents for breadcrumb hierarchy
  "/game-content": { label: "Game Content" },
  "/live-ops": { label: "Live Operations" },
  "/finance": { label: "Finance" },
  "/finance-treasury": { label: "Treasury", parent: "/finance" },
  "/finance-economy": { label: "Economy", parent: "/finance" },
  "/players-community": { label: "Players & Community" },
  "/players-moderation": { label: "Moderation", parent: "/players-community" },
  "/analytics-section": { label: "Analytics" },
  "/analytics-behavior": { label: "User Behavior", parent: "/analytics-section" },
  "/system": { label: "System" },
  "/system-settings": { label: "Settings", parent: "/system" },
  "/system-ai": { label: "AI Tools", parent: "/system" },
  "/docs-section": { label: "Documentation" },
};

// =============================================================================
// Helpers
// =============================================================================

/** Flatten all navigable items from sections (for command palette) */
export function getAllNavItems(sections: NavSection[]): NavItem[] {
  const items: NavItem[] = [];
  for (const section of sections) {
    items.push(...section.items);
    if (section.subGroups) {
      for (const sub of section.subGroups) {
        items.push(...sub.items);
      }
    }
  }
  return items;
}

/** Check if a pathname belongs to a section */
export function isPathInSection(section: NavSection, pathname: string) {
  for (const item of section.items) {
    if (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)) return true;
  }
  if (section.subGroups) {
    for (const sub of section.subGroups) {
      for (const item of sub.items) {
        if (pathname.startsWith(item.href)) return true;
      }
    }
  }
  return false;
}

/** Check if a pathname belongs to a sub-group */
export function isPathInSubGroup(subGroup: NavSubGroup, pathname: string) {
  return subGroup.items.some((item) => pathname.startsWith(item.href));
}

/** Try to match a pathname against ROUTE_MAP patterns with bracket segments */
function resolveRoutePattern(pathname: string): string | undefined {
  if (ROUTE_MAP[pathname]) return pathname;
  for (const pattern of Object.keys(ROUTE_MAP)) {
    if (!pattern.includes("[")) continue;
    const regex = new RegExp(`^${pattern.replace(/\[[\w]+\]/g, "[^/]+")}$`);
    if (regex.test(pathname)) return pattern;
  }
  return undefined;
}

/** Build breadcrumb chain from ROUTE_MAP (supports dynamic routes) */
export function getBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  const crumbs: { label: string; href?: string }[] = [];
  const resolved = resolveRoutePattern(pathname);
  let current: { label: string; parent?: string } | undefined = resolved
    ? ROUTE_MAP[resolved]
    : undefined;
  if (!current) return [{ label: "Admin" }];

  // Walk up the parent chain
  const visited = new Set<string>();
  let path: string | undefined = resolved;
  let isFirst = true;

  while (current && path && !visited.has(path)) {
    visited.add(path);
    // Use the actual pathname for the current page, pattern key for parents
    const href = isFirst
      ? pathname
      : path.startsWith("/") && !path.includes("-") && !path.includes("[")
        ? path
        : undefined;
    crumbs.unshift({ label: current.label, href });
    isFirst = false;
    path = current.parent;
    current = path ? ROUTE_MAP[path] : undefined;
  }

  // Always prepend "Admin" as root
  crumbs.unshift({ label: "Admin", href: "/" });

  return crumbs;
}
