"use client";

import { NotificationToast } from "@/components/notifications/NotificationToast";
import { Toaster } from "@/components/ui/toaster";
import { usePathname } from "next/navigation";
import { Footer } from "./Footer";
import { LunchTableSidebar } from "./LunchTableSidebar";
import { Navbar, SidebarProvider } from "./Navbar";

const FULL_SCREEN_ROUTES = [
  "/play/",
  "/game/",
  "/onboarding",
  "/login",
  "/signup",
  "/stream/overlay",
];
// Dashboard/app routes should not show the footer
const NO_FOOTER_ROUTES = ["/lunchtable", "/binder", "/profile", "/quests", "/decks", "/shop"];

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Hide navbar/footer on full-screen routes (game screens, onboarding, auth pages)
  const isFullScreen =
    FULL_SCREEN_ROUTES.some((route) => pathname.startsWith(route)) ||
    pathname === "/onboarding" ||
    pathname === "/login" ||
    pathname === "/signup";

  // Hide only footer on certain routes (keeps navbar)
  const hideFooter = NO_FOOTER_ROUTES.some((route) => pathname.startsWith(route));

  if (isFullScreen) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <SidebarProvider>
      <NotificationToast />
      <div className="flex min-h-screen bg-background">
        {/* Desktop Sidebar - hidden on mobile, visible on md+ */}
        {!isFullScreen && <LunchTableSidebar className="hidden md:flex shrink-0 z-30" />}

        <div className="relative flex min-h-screen flex-1 flex-col transition-[width] duration-300 ease-in-out">
          {!isFullScreen && <Navbar />}
          <main className="flex-1">{children}</main>
          {!hideFooter && !isFullScreen && <Footer />}
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
