"use client";

import { LogoutConfirmDialog } from "@/components/dialogs/LogoutConfirmDialog";
import { InboxDropdown } from "@/components/inbox/InboxDropdown";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { WalletButton } from "@/components/wallet";
import { useAuth, useLogout } from "@/hooks/auth/useConvexAuthHook";
import { getAssetUrl } from "@/lib/blob";
import { typedApi, useConvexQuery } from "@/lib/convexHelpers";
import { cn } from "@/lib/utils";
import {
  Award,
  BookOpen,
  Coins,
  Crown,
  Gamepad2,
  LogOut,
  Map as MapIcon,
  Menu,
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
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

interface SidebarContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within SidebarProvider");
  return context;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen, toggle: () => setIsOpen(!isOpen) }}>
      {children}
    </SidebarContext.Provider>
  );
}

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
    links: [{ href: "/guilds", label: "Guilds", icon: Users }],
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

export function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const { isOpen, setIsOpen, toggle } = useSidebar();
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

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-40 transition-all duration-500",
          isScrolled
            ? "tcg-panel py-3"
            : "bg-linear-to-b from-background via-background/80 to-transparent py-4"
        )}
      >
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={toggle}
                className="tcg-button w-12 h-12 rounded-lg flex items-center justify-center"
                aria-label="Toggle menu"
              >
                <Menu className="w-5 h-5 text-primary" />
              </button>

              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/30 rounded-lg blur-lg opacity-50 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-10 h-10 flex items-center justify-center">
                    <Image
                      src={getAssetUrl("/assets/logo-icon.png")}
                      alt="LT"
                      width={32}
                      height={32}
                      className="w-8 h-8 object-contain"
                      sizes="32px"
                    />
                  </div>
                </div>
                <div className="hidden sm:flex sm:items-center sm:gap-2">
                  <span className="text-xl font-bold gold-gradient">Lunchtable</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full uppercase tracking-wider">
                    Alpha
                  </span>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  {/* Only show "The Table" button on landing page */}
                  {pathname === "/" && (
                    <Button
                      asChild
                      className="hidden sm:flex tcg-button-primary rounded-lg px-4 py-2 text-sm"
                    >
                      <Link href="/lunchtable">
                        <Swords className="w-3.5 h-3.5 mr-1.5" />
                        The Table
                      </Link>
                    </Button>
                  )}

                  <WalletButton expandable className="hidden sm:flex" />

                  <InboxDropdown className="hidden sm:block" />

                  <Link href="/profile" className="group">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Avatar className="relative w-10 h-10 border-2 border-border group-hover:border-primary/50 transition-colors">
                        <AvatarFallback className="bg-secondary text-primary text-sm font-bold">
                          {currentUser === undefined
                            ? "..."
                            : currentUser?.username?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </Link>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    asChild
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Link href="/login">Enter</Link>
                  </Button>
                  <Button asChild className="tcg-button-primary rounded-lg px-5 py-5">
                    <Link href="/signup">
                      <Crown className="w-4 h-4 mr-2" />
                      Join
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click is supplementary to close button */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-72 transition-transform duration-500 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full tcg-panel flex flex-col overflow-hidden">
          <div className="ornament-corner ornament-corner-tr" />
          <div className="ornament-corner ornament-corner-br" />

          <div className="flex items-center justify-between px-4 py-4 border-b border-border">
            <Link href="/" onClick={() => setIsOpen(false)} className="flex items-center gap-2">
              <div className="w-9 h-9 flex items-center justify-center">
                <Image
                  src={getAssetUrl("/assets/logo-icon.png")}
                  alt="LT"
                  width={28}
                  height={28}
                  className="w-7 h-7 object-contain"
                  sizes="28px"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold gold-gradient">Lunchtable</span>
                <span className="px-1 py-0.5 text-[8px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full uppercase tracking-wider">
                  α
                </span>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="tcg-button w-9 h-9 rounded-lg flex items-center justify-center"
            >
              <X className="w-4 h-4 text-primary" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isAuthenticated && (
              <div className="px-3 py-3 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <Link href="/profile" onClick={() => setIsOpen(false)} className="shrink-0">
                    <Avatar className="w-10 h-10 border-2 border-primary/30 hover:border-primary/50 transition-colors">
                      <AvatarFallback className="bg-secondary text-primary text-sm font-bold">
                        {currentUser === undefined
                          ? "..."
                          : currentUser?.username?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">
                      {currentUser === undefined
                        ? "Loading..."
                        : currentUser?.username || "Champion"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Welcome back</p>
                  </div>
                  <InboxDropdown />
                </div>
              </div>
            )}

            {isAuthenticated && (
              <nav className="px-3 py-2 space-y-1">
                {/* Primary CTA - The Table */}
                <Link
                  href="/lunchtable"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30 hover:from-primary/30 hover:to-primary/10 transition-all group mb-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Swords className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <span className="block font-bold text-primary">Play Now</span>
                    <span className="text-[11px] text-primary/60">Enter The Table</span>
                  </div>
                </Link>

                {/* Grouped Navigation */}
                {navGroups.map((group) => {
                  const GroupIcon = group.icon;
                  // Skip "The Table" from Play group since it's featured above
                  const filteredLinks = group.links.filter((l) => l.href !== "/lunchtable");
                  if (filteredLinks.length === 0) return null;

                  return (
                    <div key={group.label} className="mb-2">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <GroupIcon className="w-3.5 h-3.5 text-muted-foreground/50" />
                        <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                          {group.label}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {filteredLinks.map((link) => {
                          const Icon = link.icon;
                          const isActive =
                            pathname === link.href || pathname.startsWith(`${link.href}/`);
                          const isComingSoon = link.comingSoon === true;

                          if (isComingSoon) {
                            return (
                              <div
                                key={link.href}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg opacity-40 cursor-not-allowed"
                              >
                                <Icon className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">{link.label}</span>
                                <span className="ml-auto text-[9px] font-bold text-primary/60 px-1.5 py-0.5 rounded border border-primary/20 bg-primary/5 uppercase">
                                  Soon
                                </span>
                              </div>
                            );
                          }

                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setIsOpen(false)}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                                isActive
                                  ? "bg-primary/10 text-primary"
                                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                              )}
                            >
                              <Icon
                                className={cn("w-4 h-4", isActive ? "text-primary" : "opacity-70")}
                              />
                              <span className="text-sm font-medium">{link.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </nav>
            )}
          </div>

          {isAuthenticated && (
            <div className="px-3 py-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setShowLogoutDialog(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          )}

          {!isAuthenticated && (
            <div className="px-3 py-3 border-t border-border space-y-2">
              <Button asChild className="w-full tcg-button-primary rounded-lg py-5">
                <Link href="/signup" onClick={() => setIsOpen(false)}>
                  <Crown className="w-4 h-4 mr-2" />
                  Begin Your Journey
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-foreground"
              >
                <Link href="/login" onClick={() => setIsOpen(false)}>
                  Already a Champion? Enter
                </Link>
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmDialog
        isOpen={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={handleSignOut}
      />
    </>
  );
}
