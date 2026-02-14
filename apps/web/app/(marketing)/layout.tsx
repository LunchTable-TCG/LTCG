import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { NotificationToast } from "@/components/notifications/NotificationToast";
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider } from "@/components/layout/Navbar"; // Navbar requires this context

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
       <NotificationToast />
       <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
