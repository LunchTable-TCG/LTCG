"use client";

/**
 * AdminSidebar Component
 *
 * Main navigation sidebar with role-based menu items.
 */

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAdmin } from "@/contexts/AdminContext";
import Link from "next/link";
import { usePathname } from "next/navigation";

// =============================================================================
// Navigation Items
// =============================================================================

interface NavItem {
  title: string;
  href: string;
  icon: string;
  permission?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", href: "/", icon: "📊" },
      { title: "Audit Log", href: "/audit", icon: "📜", permission: "admin.audit.view" },
    ],
  },
  {
    title: "Players",
    items: [
      { title: "All Players", href: "/players", icon: "👥", permission: "player.view" },
      { title: "Moderation", href: "/moderation", icon: "🛡️", permission: "player.view" },
      { title: "Reports", href: "/moderation/reports", icon: "📋", permission: "player.view" },
      { title: "Chat", href: "/moderation/chat", icon: "💬", permission: "player.view" },
      { title: "Marketplace", href: "/moderation/marketplace", icon: "🏪", permission: "player.view" },
      {
        title: "Suspicious Activity",
        href: "/moderation/suspicious",
        icon: "⚠️",
        permission: "admin.audit.view",
      },
    ],
  },
  {
    title: "Content",
    items: [
      { title: "News", href: "/news", icon: "📰", permission: "config.edit" },
      { title: "Broadcast", href: "/broadcast", icon: "📢", permission: "batch.operations" },
      { title: "Assets", href: "/assets", icon: "🖼️", permission: "config.edit" },
      { title: "Cards", href: "/cards", icon: "🃏", permission: "config.edit" },
      { title: "Shop", href: "/shop", icon: "🛒", permission: "config.edit" },
      { title: "Promo Codes", href: "/promo-codes", icon: "🎁", permission: "config.edit" },
      { title: "Quests", href: "/quests", icon: "🎯", permission: "config.edit" },
    ],
  },
  {
    title: "Management",
    items: [
      { title: "Admins", href: "/admins", icon: "👑", permission: "admin.manage" },
      { title: "API Keys", href: "/api-keys", icon: "🔑", permission: "player.view" },
      { title: "Batch Operations", href: "/batch", icon: "📦", permission: "batch.operations" },
      { title: "Maintenance", href: "/maintenance", icon: "🔧", permission: "admin.manage" },
    ],
  },
  {
    title: "Analytics",
    items: [
      { title: "Overview", href: "/analytics", icon: "📈" },
      { title: "Players", href: "/analytics/players", icon: "👤" },
      { title: "Games", href: "/analytics/games", icon: "🎮" },
      { title: "Economy", href: "/analytics/economy", icon: "💰" },
      { title: "Cards", href: "/analytics/cards", icon: "🃏" },
      { title: "Marketplace", href: "/analytics/marketplace", icon: "🏪" },
    ],
  },
  {
    title: "Documentation",
    items: [
      { title: "API Docs", href: "/docs", icon: "📚" },
      { title: "Endpoints", href: "/docs/endpoints", icon: "🔗" },
      { title: "Rate Limits", href: "/docs/rate-limits", icon: "⏱️" },
      { title: "Webhooks", href: "/docs/webhooks", icon: "🔔" },
      { title: "Error Codes", href: "/docs/errors", icon: "⚠️" },
    ],
  },
];

// =============================================================================
// Component
// =============================================================================

export function AdminSidebar() {
  const pathname = usePathname();
  const { hasPermission, isAdmin } = useAdmin();

  // Filter items by permission
  const filterItems = (items: NavItem[]): NavItem[] => {
    if (!isAdmin) return [];
    return items.filter((item) => !item.permission || hasPermission(item.permission));
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold">🎴</span>
          <span className="font-semibold">Lunchtable Admin</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {navigation.map((group) => {
          const filteredItems = filterItems(group.items);
          if (filteredItems.length === 0) return null;

          return (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredItems.map((item) => {
                    const isActive =
                      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={item.href}>
                            <span>{item.icon}</span>
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
