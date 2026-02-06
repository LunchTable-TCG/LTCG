"use client";

/**
 * AdminShell Component
 *
 * Main layout wrapper that combines sidebar, header, command palette, and content.
 * Handles loading state, authentication, and unauthorized access.
 */

import { AdminAssistantChat } from "@/components/ai";
import { AdminLoginForm } from "@/components/auth/AdminLoginForm";
import { Card } from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdmin } from "@/contexts/AdminContext";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";
import { CommandPalette } from "./CommandPalette";

// =============================================================================
// Types
// =============================================================================

interface AdminShellProps {
  children: ReactNode;
}

// =============================================================================
// Loading Component
// =============================================================================

function LoadingShell() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-pulse rounded-lg bg-muted" />
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-4 w-[150px]" />
      </div>
    </div>
  );
}

// =============================================================================
// Unauthorized Component
// =============================================================================

function UnauthorizedShell() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Card className="max-w-md p-6 text-center">
        <h1 className="mb-2 text-xl font-semibold">Access Denied</h1>
        <p className="text-muted-foreground">
          You don&apos;t have permission to access the admin dashboard. Please contact a super admin
          if you believe this is an error.
        </p>
      </Card>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function AdminShell({ children }: AdminShellProps) {
  const { isLoading, isAuthenticated, isAdmin } = useAdmin();
  const pathname = usePathname();
  const [commandOpen, setCommandOpen] = useState(false);

  // Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Don't show floating chat on the dedicated AI assistant page
  const showFloatingChat = pathname !== "/ai-assistant";

  // Show loading state
  if (isLoading) {
    return <LoadingShell />;
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <AdminLoginForm />;
  }

  // Show unauthorized state if authenticated but not admin
  if (!isAdmin) {
    return <UnauthorizedShell />;
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <AdminHeader onCommandPaletteOpen={() => setCommandOpen(true)} />
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      {/* Floating AI Assistant Chat */}
      {showFloatingChat && <AdminAssistantChat />}
    </SidebarProvider>
  );
}

// =============================================================================
// Page Wrapper Component
// =============================================================================

interface PageWrapperProps {
  children: ReactNode;
  /** Page title */
  title: ReactNode;
  /** Page description */
  description?: string;
  /** Actions to show in the header */
  actions?: ReactNode;
  /** Optional className for the container */
  className?: string;
  /** Whether to use compact spacing */
  compact?: boolean;
}

/**
 * Wrapper for individual admin pages
 * Provides consistent page structure with title and optional actions
 */
export function PageWrapper({
  children,
  title,
  description,
  actions,
  className,
  compact = false,
}: PageWrapperProps) {
  return (
    <div className={`admin-page ${compact ? "space-y-4 sm:space-y-6" : ""} ${className ?? ""}`}>
      {/* Page Header */}
      <div className="admin-section-header">
        <div className="space-y-1">
          <h1 className="admin-page-title">{title}</h1>
          {description && <p className="admin-page-description">{description}</p>}
        </div>
        {actions && <div className="admin-action-bar">{actions}</div>}
      </div>

      {/* Page Content */}
      <div className="admin-section">{children}</div>
    </div>
  );
}
