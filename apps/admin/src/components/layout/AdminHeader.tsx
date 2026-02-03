"use client";

/**
 * AdminHeader Component
 *
 * Top navigation header with user info and quick actions.
 */

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAdmin } from "@/contexts/AdminContext";

// =============================================================================
// Types
// =============================================================================

interface AdminHeaderProps {
  /** Optional breadcrumb content */
  breadcrumb?: React.ReactNode;
}

// =============================================================================
// Component
// =============================================================================

export function AdminHeader({ breadcrumb }: AdminHeaderProps) {
  const { role, isAdmin, isLoading } = useAdmin();

  // Role badge colors
  const roleBadgeVariant = (
    role: string | null
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case "super_admin":
        return "destructive";
      case "admin":
        return "default";
      case "moderator":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
      <SidebarTrigger className="-ml-1" />

      {/* Breadcrumb */}
      {breadcrumb && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">{breadcrumb}</div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Theme Toggle */}
      <ThemeToggle />

      {/* Role Badge */}
      {isAdmin && role && (
        <Badge variant={roleBadgeVariant(role)} className="hidden sm:inline-flex">
          {role.replace("_", " ").toUpperCase()}
        </Badge>
      )}

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {isLoading ? "..." : isAdmin ? (role?.[0]?.toUpperCase() ?? "A") : "?"}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">Admin</p>
              <p className="text-xs leading-none text-muted-foreground">
                {role ? role.replace("_", " ") : "Loading..."}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <span>Audit Log</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive">
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
