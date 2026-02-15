"use client";

import { LogoutConfirmDialog } from "@/components/dialogs/LogoutConfirmDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { useAuth, useLogout } from "@/hooks/auth/useConvexAuthHook";
import { getAssetUrl } from "@/lib/blob";
import { navGroups } from "@/lib/config/navigation";
import { typedApi } from "@/lib/convexHelpers";
import { useConvexQuery } from "@/lib/react-query";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useState } from "react";

export function LunchTableSidebar({ className }: { className?: string }) {
  const pathname = useLocation().pathname;
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const { isAuthenticated } = useAuth();
  const { logout } = useLogout();

  const currentUser = useConvexQuery(
    typedApi.auth.currentUser,
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
          "w-64 h-screen sticky top-0 flex flex-col border-r-4 border-primary bg-background scanner-noise relative",
          className
        )}
      >
        {/* Comic Overlays */}
        <div
          className="absolute inset-0 pointer-events-none z-0 opacity-10 mix-blend-multiply"
          style={{
            backgroundImage: "url(/assets/overlays/paper-texture.png)",
            backgroundSize: "256px",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none z-0 opacity-5"
          style={{
            backgroundImage: "url(/assets/overlays/halftone-dots.png)",
            backgroundSize: "128px",
          }}
        />
        <div className="p-6 border-b-2 border-primary relative overflow-hidden">
          <Link href="/" className="flex items-center gap-3 relative z-10 group">
            <div className="relative w-10 h-10 flex items-center justify-center border-4 border-primary overflow-hidden">
              <Image
                src={getAssetUrl("/assets/logo-icon.png")}
                alt="LT"
                width={40}
                height={40}
                className="w-full h-full object-cover filter grayscale contrast-200 group-hover:grayscale-0 transition-all"
              />
            </div>
            <div>
              <h1 className="font-black text-xl leading-none uppercase tracking-tighter ink-bleed">
                LunchTable
              </h1>
              <p className="text-[10px] font-bold text-destructive uppercase tracking-widest mt-1">
                Hierarchy Chronicle
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation Scroll Area */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 scrollbar-thin scrollbar-thumb-primary scrollbar-track-transparent">
          {isAuthenticated ? (
            navGroups.map((group) => (
              <div key={group.label} className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground px-1">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                    {group.label}
                  </span>
                  <div className="h-0.5 flex-1 bg-muted/30" />
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
                          className="flex items-center justify-between px-3 py-2 border-2 border-dashed border-muted/30 opacity-40 cursor-not-allowed"
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-4 h-4" />
                            <span className="text-sm font-black uppercase tracking-tighter">
                              {link.label}
                            </span>
                          </div>
                          <span className="text-[8px] font-black border-2 border-muted px-1 rounded uppercase">
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
                          "flex items-center gap-3 px-3 py-2 border-2 transition-all font-black uppercase tracking-tighter",
                          isActive
                            ? "bg-primary text-primary-foreground border-primary ink-bleed"
                            : "border-transparent text-foreground/70 hover:border-primary hover:text-foreground hover:bg-secondary/20"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-4 h-4 transition-transform",
                            isActive ? "scale-110" : ""
                          )}
                        />
                        <span className="text-sm">{link.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="px-2">
              <div className="border-4 border-dashed border-primary/20 p-6 text-center space-y-4">
                <p className="text-xs font-bold uppercase tracking-tight text-muted-foreground">
                  Enrollment required to access internal hierarchy.
                </p>
                <Button asChild className="w-full tcg-button-primary">
                  <Link to="/profile">LOGIN</Link>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* User Footer */}
        {isAuthenticated && currentUser && (
          <div className="p-4 border-t-2 border-primary bg-secondary/10">
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="w-10 h-10 border-2 border-primary grayscale">
                <AvatarImage src={currentUser.data?.image} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-black">
                  {currentUser.data?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black uppercase tracking-tighter truncate ink-bleed">
                  {currentUser.data?.username}
                </p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                  Regret Level {currentUser.data?.level ?? 1}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 border-2 border-transparent hover:border-destructive hover:bg-destructive/10 hover:text-destructive group transition-all"
                onClick={() => setShowLogoutDialog(true)}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
            {/* Currency Mini-Display - Hierarchy Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-background border-2 border-primary px-2 py-1 flex items-center gap-2 relative overflow-hidden group/rep hover:bg-primary hover:text-primary-foreground transition-colors cursor-help">
                <Image
                  src="/lunchtable/reputation-icon.png"
                  alt="Rep"
                  width={16}
                  height={16}
                  className="w-4 h-4 grayscale group-hover/rep:grayscale-0 group-hover/rep:invert transition-all"
                />
                <span className="text-[10px] font-black uppercase ink-bleed">Rep</span>
              </div>
              <div className="bg-background border-2 border-primary px-2 py-1 flex items-center gap-2 relative overflow-hidden group/stab hover:bg-primary hover:text-primary-foreground transition-colors cursor-help">
                <Image
                  src="/lunchtable/stability-icon.png"
                  alt="Stab"
                  width={16}
                  height={16}
                  className="w-4 h-4 grayscale group-hover/stab:grayscale-0 group-hover/stab:invert transition-all"
                />
                <span className="text-[10px] font-black uppercase ink-bleed">Stab</span>
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
