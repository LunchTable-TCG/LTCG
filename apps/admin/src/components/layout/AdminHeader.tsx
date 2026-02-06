"use client";

/**
 * AdminHeader Component
 *
 * Top navigation header with auto-breadcrumbs, Cmd+K trigger, and user menu.
 */

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { getBreadcrumbs } from "./navigation";

// =============================================================================
// Types
// =============================================================================

interface AdminHeaderProps {
  onCommandPaletteOpen?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function AdminHeader({ onCommandPaletteOpen }: AdminHeaderProps) {
  const { role, isAdmin, isLoading } = useAdmin();
  const pathname = usePathname();

  // Auto-generate breadcrumbs from route map
  const crumbs = getBreadcrumbs(pathname);

  // Role badge colors
  const roleBadgeVariant = (
    r: string | null
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (r) {
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

      {/* Auto Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <Fragment key={crumb.label}>
                {i > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : crumb.href ? (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <span className="text-muted-foreground">{crumb.label}</span>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Cmd+K Search Trigger */}
      {onCommandPaletteOpen && (
        <Button
          variant="outline"
          size="sm"
          className="ml-2 hidden gap-2 text-muted-foreground sm:flex"
          onClick={onCommandPaletteOpen}
        >
          <SearchIcon className="size-3.5" />
          <span className="text-xs">Search...</span>
          <kbd className="pointer-events-none ml-2 inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">&#8984;</span>K
          </kbd>
        </Button>
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
