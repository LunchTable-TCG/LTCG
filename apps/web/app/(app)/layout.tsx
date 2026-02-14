import { AuthGuard } from "@/components/auth/AuthGuard";
import { AnnouncementBanner } from "@/components/layout/AnnouncementBanner";
import { LunchTableSidebar } from "@/components/layout/LunchTableSidebar";
import { Navbar, SidebarProvider } from "@/components/layout/Navbar";
import { NotificationToast } from "@/components/notifications/NotificationToast";
import { Toaster } from "@/components/ui/toaster";

/**
 * Layout for all protected app routes.
 * Wraps children with AuthGuard and provides the standard internal app layout
 * (Sidebar + Navbar).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <NotificationToast />
        <div className="flex min-h-screen bg-background">
          {/* Desktop Sidebar */}
          <LunchTableSidebar className="hidden md:flex shrink-0 z-30" />

          <div className="relative flex min-h-screen flex-1 flex-col transition-[width] duration-300 ease-in-out">
            <AnnouncementBanner />
            <Navbar />
            <main className="flex-1 overflow-x-hidden">{children}</main>
          </div>
        </div>
        <Toaster />
      </SidebarProvider>
    </AuthGuard>
  );
}
