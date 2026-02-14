"use client";

import { LogoutConfirmDialog } from "@/components/dialogs/LogoutConfirmDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth, useLogout } from "@/hooks/auth/useConvexAuthHook";
import { getAssetUrl } from "@/lib/blob";
import { typedApi, useConvexQuery } from "@/lib/convexHelpers";
import { cn } from "@/lib/utils";
import {
  Award,
  BookOpen,
  Coins,
  Gamepad2,
  Heart,
  LogOut,
  Map as MapIcon,
  Settings,
  Sparkles,
  Star,
  Store,
  Swords,
  Target,
  Trophy,
  User,
  Users,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavLink {
  href: string;
  label: string;
  icon: typeof Swords;
  comingSoon?: boolean;
}

interface NavGroup {
  label: string;
  icon: typeof Swords;
  links: NavLink[];
}

const navGroups: NavGroup[] = [
  {
    label: "Play",
    icon: Gamepad2,
    links: [
      { href: "/lunchtable", label: "The Table", icon: Swords },
      { href: "/play/story", label: "Story Mode", icon: MapIcon },
      { href: "/tournaments", label: "Tournaments", icon: Award },
    ],
  },
  {
    label: "Progress",
    icon: Star,
    links: [
      { href: "/battle-pass", label: "Battle Pass", icon: Sparkles },
      { href: "/quests", label: "Quests", icon: Target },
      { href: "/leaderboards", label: "Leaderboards", icon: Trophy },
    ],
  },
  {
    label: "Community",
    icon: Users,
    links: [
      { href: "/friends", label: "Friends", icon: Heart },
      { href: "/guilds", label: "Guilds", icon: Users },
    ],
  },
  {
    label: "Economy",
    icon: Coins,
    links: [
      { href: "/shop", label: "Shop", icon: Store },
      { href: "/lunchmoney", label: "LunchMoney", icon: Wallet },
    ],
  },
  {
    label: "Collection",
    icon: BookOpen,
    links: [
      { href: "/binder", label: "Binder", icon: BookOpen },
      { href: "/profile", label: "Profile", icon: User },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function GrimoireSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const { isAuthenticated } = useAuth();
  const { logout } = useLogout();

  const currentUser = useConvexQuery(
    typedApi.core.users.currentUser,
    isAuthenticated ? {} : "skip"
  );

  const handleSignOut = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <>
      <aside
        className={cn(
          "w-64 h-screen sticky top-0 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
          className
        )}
      >
        {/* Tome Spine Texture / Header */}
        <div className="p-6 border-b border-sidebar-border relative overflow-hidden">
          {/* Decorative background for the logo area */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

          <Link href="/" className="flex items-center gap-3 relative z-10 group">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              <Image
                src={getAssetUrl("/assets/logo-icon.png")}
                alt="LT"
                width={40}
                height={40}
                className="w-8 h-8 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
              />
            </div>
            <div>
              <h1 className="font-heading text-xl font-bold bg-gradient-to-r from-primary via-amber-200 to-primary bg-clip-text text-transparent drop-shadow-sm">
                Lunchtable
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
                TCG Alpha
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation Scroll Area */}
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-8 scrollbar-thin scrollbar-thumb-sidebar-border scrollbar-track-transparent">
          {isAuthenticated ? (
            navGroups.map((group) => (
              <div key={group.label} className="space-y-2">
                <div className="px-3 flex items-center gap-2 text-muted-foreground/60 select-none">
                  {/* <group.icon className="w-3 h-3" /> */}
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    {group.label}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent" />
                </div>
                <div className="space-y-1">
                  {group.links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
                    const isComingSoon = link.comingSoon;

                    if (isComingSoon) {
                      return (
                        <div
                          key={link.href}
                          className="flex items-center justify-between px-3 py-2 rounded-md opacity-50 cursor-not-allowed"
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-4 h-4" />
                            <span className="text-sm font-medium">{link.label}</span>
                          </div>
                          <span className="text-[9px] border border-muted-foreground/30 px-1 rounded">
                            SOON
                          </span>
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group relative overflow-hidden",
                          isActive
                            ? "text-primary-foreground bg-sidebar-primary shadow-[0_0_15px_rgba(212,175,55,0.1)] font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/20" />
                        )}
                        <Icon
                          className={cn(
                            "w-4 h-4 transition-transform group-hover:scale-110",
                            isActive
                              ? "text-primary-foreground"
                              : "text-muted-foreground group-hover:text-primary"
                          )}
                        />
                        <span className="text-sm">{link.label}</span>
                        {isActive && (
                          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="px-3">
              <div className="bg-card/50 border border-border/50 rounded-xl p-4 text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Sign in to access your deck and battle.
                </p>
                <Button asChild className="w-full" variant="primary">
                  <Link href="/login">Sign In</Link>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* User Footer */}
        {isAuthenticated && currentUser && (
          <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/20">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-9 h-9 border border-primary/20">
                <AvatarImage src={currentUser.image} />
                <AvatarFallback className="bg-background text-xs">
                  {currentUser.username?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">
                  {currentUser.username}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Level {currentUser.level ?? 1}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:text-destructive"
                onClick={() => setShowLogoutDialog(true)}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
            {/* Currency Mini-Display */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-background/50 rounded px-2 py-1 flex items-center gap-2 border border-border/30">
                <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.5)]" />
                <span className="text-xs font-mono text-muted-foreground">1,250</span>
              </div>
              <div className="bg-background/50 rounded px-2 py-1 flex items-center gap-2 border border-border/30">
                <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.5)]" />
                <span className="text-xs font-mono text-muted-foreground">50</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      <LogoutConfirmDialog
        isOpen={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={handleSignOut}
      />
    </>
  );
}
