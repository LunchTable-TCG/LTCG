"use client";

/**
 * AdminShell Component
 *
 * Main layout wrapper that combines sidebar, header, and content.
 * Handles loading state, authentication, and unauthorized access.
 */

import { AdminLoginForm } from "@/components/auth/AdminLoginForm";
import { Card } from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdmin } from "@/contexts/AdminContext";
import type { ReactNode } from "react";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";

// =============================================================================
// Types
// =============================================================================

interface AdminShellProps {
  children: ReactNode;
  /** Page title for breadcrumb */
  title?: string;
  /** Additional breadcrumb segments */
  breadcrumb?: ReactNode;
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
        <div className="mb-4 text-4xl">🚫</div>
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

export function AdminShell({ children, title, breadcrumb }: AdminShellProps) {
  const { isLoading, isAuthenticated, isAdmin } = useAdmin();

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

  // Build breadcrumb
  const breadcrumbContent = (
    <>
      <span className="font-medium text-foreground">Admin</span>
      {title && (
        <>
          <span>/</span>
          <span>{title}</span>
        </>
      )}
      {breadcrumb}
    </>
  );

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <AdminHeader breadcrumb={breadcrumbContent} />
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </SidebarInset>
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
}

/**
 * Wrapper for individual admin pages
 * Provides consistent page structure with title and optional actions
 */
export function PageWrapper({ children, title, description, actions }: PageWrapperProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
