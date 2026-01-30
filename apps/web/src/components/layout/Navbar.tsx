"use client";

import { LogoutConfirmDialog } from "@/components/dialogs/LogoutConfirmDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth, useLogout } from "@/hooks/auth/useConvexAuthHook";
import { useConvexQuery, apiAny } from "@/lib/convexHelpers";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  ChevronRight,
  Crown,
  LogOut,
  Map,
  Menu,
  Settings,
  Store,
  Swords,
  Target,
  User,
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

interface GameLink {
  href: string;
  label: string;
  icon: typeof Swords;
  description: string;
  comingSoon?: boolean;
}

const gameLinks: GameLink[] = [
  { href: "/lunchtable", label: "The Table", icon: Swords, description: "Enter the battlefield" },
  { href: "/play/story", label: "Story Mode", icon: Map, description: "Campaign adventure" },
  { href: "/quests", label: "Quests", icon: Target, description: "Daily & weekly rewards" },
  { href: "/shop", label: "Shop", icon: Store, description: "Buy packs & trade cards" },
  { href: "/binder", label: "Binder", icon: BookOpen, description: "Your card collection" },
  { href: "/profile", label: "Profile", icon: User, description: "View your stats" },
  { href: "/settings", label: "Settings", icon: Settings, description: "Manage preferences" },
];

export function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const { isOpen, setIsOpen, toggle } = useSidebar();
  const { isAuthenticated } = useAuth();
  const { logout } = useLogout();

  const currentUser = useConvexQuery(apiAny.core.users.currentUser, isAuthenticated ? {} : "skip");

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
                      src="/assets/logo-icon.png"
                      alt="LT"
                      width={32}
                      height={32}
                      className="w-8 h-8 object-contain"
                      sizes="32px"
                    />
                  </div>
                </div>
                <div className="hidden sm:block">
                  <span className="text-xl font-bold gold-gradient">Lunchtable</span>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <Button
                    asChild
                    className="hidden sm:flex tcg-button-primary rounded-lg px-4 py-2 text-sm"
                  >
                    <Link href="/lunchtable">
                      <Swords className="w-3.5 h-3.5 mr-1.5" />
                      The Table
                    </Link>
                  </Button>

                  <Link href="/profile" className="group">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Avatar className="relative w-10 h-10 border-2 border-border group-hover:border-primary/50 transition-colors">
                        <AvatarFallback className="bg-secondary text-primary text-sm font-bold">
                          {currentUser === undefined ? "..." : (currentUser?.username?.[0]?.toUpperCase() || "?")}
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

      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-80 transition-transform duration-500 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full tcg-panel flex flex-col overflow-hidden">
          <div className="ornament-corner ornament-corner-tr" />
          <div className="ornament-corner ornament-corner-br" />

          <div className="flex items-center justify-between p-6 border-b border-border">
            <Link href="/" onClick={() => setIsOpen(false)} className="flex items-center gap-3">
              <div className="w-11 h-11 flex items-center justify-center">
                <Image
                  src="/assets/logo-icon.png"
                  alt="LT"
                  width={36}
                  height={36}
                  className="w-9 h-9 object-contain"
                  sizes="36px"
                />
              </div>
              <div>
                <span className="text-xl font-bold gold-gradient">Lunchtable</span>
                <span className="block text-[10px] text-primary/60 font-semibold tracking-widest uppercase">
                  Trading Card Game
                </span>
              </div>
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              className="tcg-button w-10 h-10 rounded-lg flex items-center justify-center"
            >
              <X className="w-5 h-5 text-primary" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isAuthenticated && (
              <div className="p-4">
                <div className="tcg-frame rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="w-12 h-12 border-2 border-primary/50">
                      <AvatarFallback className="bg-secondary text-primary font-bold">
                        {currentUser === undefined ? "..." : (currentUser?.username?.[0]?.toUpperCase() || "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate">
                        {currentUser === undefined ? "Loading..." : (currentUser?.username || "Champion")}
                      </p>
                      <p className="text-xs text-muted-foreground">Rating: 1000</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isAuthenticated && (
              <nav className="px-2">
                <div className="px-4 py-3">
                  <span className="text-xs font-bold text-primary/60 uppercase tracking-widest">
                    Navigation
                  </span>
                </div>
                {gameLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
                  const isComingSoon = link.comingSoon === true;

                  const content = (
                    <>
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                          isActive ? "bg-primary/20" : "bg-secondary/50",
                          isComingSoon && "opacity-50"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-5 h-5",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "block font-semibold",
                              isComingSoon && "text-muted-foreground"
                            )}
                          >
                            {link.label}
                          </span>
                          {isComingSoon && (
                            <span className="text-[10px] font-bold text-primary px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 uppercase tracking-tighter">
                              Soon
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{link.description}</span>
                      </div>
                      {!isComingSoon && (
                        <ChevronRight
                          className={cn(
                            "w-4 h-4 transition-transform",
                            isActive ? "text-primary" : "text-muted-foreground/50"
                          )}
                        />
                      )}
                    </>
                  );

                  if (isComingSoon) {
                    return (
                      <div
                        key={link.href}
                        className="nav-link rounded-lg mx-2 mb-1 cursor-default opacity-70 grayscale-[0.5]"
                      >
                        {content}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className={cn("nav-link rounded-lg mx-2 mb-1", isActive && "active")}
                    >
                      {content}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {isAuthenticated && (
            <div className="p-4 border-t border-border">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowLogoutDialog(true);
                }}
                className="w-full tcg-button rounded-lg py-3 px-4 flex items-center justify-center gap-2 text-destructive"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          )}

          {!isAuthenticated && (
            <div className="p-4 border-t border-border space-y-2">
              <Button asChild className="w-full tcg-button-primary rounded-lg py-6">
                <Link href="/signup" onClick={() => setIsOpen(false)}>
                  <Crown className="w-4 h-4 mr-2" />
                  Begin Your Journey
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
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
