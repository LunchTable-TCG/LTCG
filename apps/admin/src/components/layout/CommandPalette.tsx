"use client";

/**
 * CommandPalette Component
 *
 * Cmd+K search dialog for quick navigation across all admin pages.
 * Groups items by section, shows favorites at top, filters by permission.
 */

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useAdmin } from "@/contexts/AdminContext";
import { useFavorites } from "@/hooks/use-favorites";
import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  FOOTER_NAVIGATION,
  MAIN_NAVIGATION,
  getAllNavItems,
} from "./navigation";
import type { NavItem } from "./navigation";

// =============================================================================
// Types
// =============================================================================

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Component
// =============================================================================

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { hasPermission, isAdmin } = useAdmin();
  const { favorites, isFavorite } = useFavorites();

  const allItems = useMemo(
    () => [...getAllNavItems(MAIN_NAVIGATION), ...FOOTER_NAVIGATION.items],
    []
  );

  const filterByPermission = (items: NavItem[]) => {
    if (!isAdmin) return [];
    return items.filter((item) => !item.permission || hasPermission(item.permission));
  };

  // Resolve favorites
  const favoriteItems = useMemo(() => {
    const itemMap = new Map(allItems.map((item) => [item.href, item]));
    return favorites
      .map((href) => itemMap.get(href))
      .filter((item): item is NavItem => item !== undefined)
      .filter((item) => !item.permission || hasPermission(item.permission));
  }, [favorites, allItems, hasPermission]);

  const handleSelect = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Navigate to page"
      description="Search for a page to navigate to..."
    >
      <CommandInput placeholder="Search pages..." />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>No pages found.</CommandEmpty>

        {/* Favorites */}
        {favoriteItems.length > 0 && (
          <>
            <CommandGroup heading="Favorites">
              {favoriteItems.map((item) => (
                <CommandItem
                  key={`fav-${item.href}`}
                  value={`${item.title} ${item.keywords?.join(" ") ?? ""}`}
                  onSelect={() => handleSelect(item.href)}
                >
                  <Star className="size-4 fill-yellow-400 text-yellow-400" />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Main sections */}
        {MAIN_NAVIGATION.map((section) => {
          const sectionItems = filterByPermission(section.items);
          const subItems = section.subGroups?.flatMap((sub) => filterByPermission(sub.items)) ?? [];
          const allSectionItems = [...sectionItems, ...subItems];

          if (allSectionItems.length === 0) return null;

          return (
            <CommandGroup key={section.title} heading={section.title}>
              {allSectionItems.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.href}
                    value={`${item.title} ${section.title} ${item.keywords?.join(" ") ?? ""}`}
                    onSelect={() => handleSelect(item.href)}
                  >
                    <Icon className="size-4" />
                    <span>{item.title}</span>
                    {isFavorite(item.href) && (
                      <Star className="ml-auto size-3 fill-yellow-400 text-yellow-400" />
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })}

        {/* Footer: Documentation */}
        {filterByPermission(FOOTER_NAVIGATION.items).length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={FOOTER_NAVIGATION.title}>
              {filterByPermission(FOOTER_NAVIGATION.items).map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.href}
                    value={`${item.title} documentation ${item.keywords?.join(" ") ?? ""}`}
                    onSelect={() => handleSelect(item.href)}
                  >
                    <Icon className="size-4" />
                    <span>{item.title}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
