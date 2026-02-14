"use client";

import { LogoutConfirmDialog } from "@/components/dialogs/LogoutConfirmDialog";
import { InboxDropdown } from "@/components/inbox/InboxDropdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { WalletButton } from "@/components/wallet";
import { useAuth, useLogout } from "@/hooks/auth/useConvexAuthHook";
import { getAssetUrl } from "@/lib/blob";
import { typedApi, useConvexQuery } from "@/lib/convexHelpers";
import { XPDisplay } from "@/components/shared/XPDisplay";
import { cn } from "@/lib/utils";
import {
  Award,
  BookOpen,
  Coins,
  Gamepad2,
  Heart,
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
import { Image } from "@/components/ui/image";
import { Link } from "@tanstack/react-router";
import { useLocation } from "@tanstack/react-router";
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

export function Navbar() {
  const pathname = useLocation().pathname;
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
          "sticky top-0 z-40 transition-all duration-300 w-full",
          isScrolled
            ? "bg-background border-b-2 border-primary py-2"
            : "bg-background/80 py-4"
        )}
      >
        {/* Comic Overlays */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-10 mix-blend-multiply" style={{ backgroundImage: 'url(/assets/overlays/paper-texture.png)', backgroundSize: '256px' }} />
        <div className="absolute inset-0 pointer-events-none z-0 opacity-5" style={{ backgroundImage: 'url(/assets/overlays/halftone-dots.png)', backgroundSize: '128px' }} />
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile Menu Toggle - Only visible on mobile */}
              <button
                type="button"
                onClick={toggle}
                className="tcg-button w-10 h-10 flex md:hidden items-center justify-center cursor-pointer"
                aria-label="Toggle menu"
              >
                <Menu className="w-5 h-5 text-primary" />
              </button>

              {/* Logo - Only visible on mobile */}
              <Link to="/" className="flex md:hidden items-center gap-3 group">
                <div className="relative">
                  <div className="relative w-8 h-8 flex items-center justify-center border-2 border-primary overflow-hidden">
                    <Image
                      src={getAssetUrl("/assets/logo-icon.png")}
                      alt="LT"
                      width={32}
                      height={32}
                      className="w-full h-full object-cover filter grayscale contrast-150"
                      sizes="32px"
                    />
                  </div>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              {isAuthenticated ? (
                <>
                  {/* Desktop Header Actions */}
                  <div className="hidden md:flex items-center gap-6 mr-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-primary text-primary-foreground font-mono text-[10px] uppercase tracking-tighter">
                      <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                      Status: Active
                    </div>
                  </div>

                  <WalletButton className="hidden sm:flex" />

                  <InboxDropdown className="hidden sm:block" />

                  <Link to="/profile" className="group md:hidden">
                    <div className="relative">
                      <Avatar className="relative w-10 h-10 border-2 border-primary grayscale group-hover:grayscale-0 transition-all">
                        {currentUser?.image && (
                          <AvatarImage
                            src={currentUser.image}
                            alt={currentUser.username || "User"}
                          />
                        )}
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
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
                    className="text-foreground font-bold hover:underline"
                  >
                    <Link to="/login">LOGIN</Link>
                  </Button>
                  <Button asChild className="tcg-button-primary px-6 py-4">
                    <Link to="/signup">
                      JOIN US
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/40 backdrop-blur-[1px] transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      <aside
        className={cn(
          "fixed top-0 left-0 z-[70] h-full w-72 transition-transform duration-500 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full bg-background border-r-4 border-primary flex flex-col overflow-hidden relative scanner-noise">
          <div className="flex items-center justify-between px-6 py-6 border-b-2 border-primary">
            <Link to="/" onClick={() => setIsOpen(false)} className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center border-4 border-primary overflow-hidden">
                <Image
                  src={getAssetUrl("/assets/logo-icon.png")}
                  alt="LT"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover filter grayscale contrast-200"
                  sizes="32px"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black uppercase tracking-tighter leading-none ink-bleed">LunchTable</span>
                <span className="text-[10px] font-bold text-destructive uppercase tracking-widest mt-0.5">Hierarchy Chronicle</span>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="tcg-button w-10 h-10 flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5 text-primary" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
            {isAuthenticated && (
              <div className="p-4 border-2 border-primary bg-secondary/30 relative">
                <div className="flex items-center gap-4">
                  <Link to="/profile" onClick={() => setIsOpen(false)} className="shrink-0">
                    <Avatar className="w-12 h-12 border-2 border-primary grayscale">
                      {currentUser?.image && (
                        <AvatarImage src={currentUser.image} alt={currentUser.username || "User"} />
                      )}
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                        {currentUser === undefined
                          ? "..."
                          : currentUser?.username?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-foreground text-lg uppercase tracking-tighter truncate ink-bleed">
                      {currentUser === undefined
                        ? "LOADING..."
                        : currentUser?.username || "STUDENT"}
                    </p>
                    <XPDisplay
                      level={currentUser?.level ?? 1}
                      currentXP={currentUser?.xp ?? 0}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {isAuthenticated ? (
              <nav className="space-y-6">
                {/* Primary CTA - The Table */}
                  <Link
                  to="/lunchtable"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-4 px-4 py-4 border-4 border-primary bg-primary text-primary-foreground hover:scale-[1.02] transition-transform group"
                >
                  <div className="w-10 h-10 border-2 border-primary-foreground flex items-center justify-center bg-transparent">
                    <Swords className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <span className="block font-black text-xl uppercase tracking-tighter leading-none">Play Now</span>
                    <span className="text-[10px] font-bold uppercase text-primary-foreground/70">Claim Your Seat</span>
                  </div>
                </Link>

                {/* Grouped Navigation */}
                {navGroups.map((group) => {
                  const GroupIcon = group.icon;
                  const filteredLinks = group.links.filter((l) => l.href !== "/lunchtable");
                  if (filteredLinks.length === 0) return null;

                  return (
                    <div key={group.label} className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <GroupIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-80">
                          {group.label}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {filteredLinks.map((link) => {
                          const Icon = link.icon;
                          const isActive =
                            pathname === link.href || pathname.startsWith(`${link.href}/`);
                          const isComingSoon = link.comingSoon === true;

                          if (isComingSoon) {
                            return (
                              <div
                                key={link.href}
                                className="flex items-center gap-4 px-4 py-2 border-2 border-dashed border-muted/50 opacity-40 grayscale"
                              >
                                <Icon className="w-5 h-5" />
                                <span className="text-sm font-black uppercase tracking-tighter">{link.label}</span>
                                <span className="ml-auto text-[8px] font-bold bg-muted px-1 py-0.5 uppercase tracking-tighter">Soon</span>
                              </div>
                            );
                          }

                          return (
                            <Link
                              key={link.href}
                              to={link.href}
                              onClick={() => setIsOpen(false)}
                              className={cn(
                                "flex items-center gap-4 px-4 py-2 border-2 transition-all font-black uppercase tracking-tighter",
                                isActive
                                  ? "bg-primary text-primary-foreground border-primary ink-bleed"
                                  : "border-transparent text-foreground/70 hover:border-primary hover:text-foreground hover:bg-secondary/20"
                              )}
                            >
                              <Icon className="w-5 h-5" />
                              <span className="text-sm">{link.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </nav>
            ) : null}
          </div>

          <div className="px-6 py-6 border-t-2 border-primary bg-secondary/10">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setShowLogoutDialog(true);
                }}
                className="w-full flex items-center justify-center gap-3 py-3 border-2 border-primary font-black uppercase tracking-tighter hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Withdraw</span>
              </button>
            ) : (
              <div className="space-y-3">
                <Button asChild className="w-full tcg-button-primary py-6">
                  <Link to="/signup" onClick={() => setIsOpen(false)}>
                    ENROLL NOW
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="w-full text-foreground/70 font-bold uppercase tracking-tight text-xs hover:underline"
                >
                  <Link to="/login" onClick={() => setIsOpen(false)}>
                    Already Registred? Enter
                  </Link>
                </Button>
              </div>
            )}
          </div>
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
