"use client";

/**
 * AdminSidebar Component
 *
 * Hierarchical navigation sidebar with collapsible sections,
 * sub-groups, favorites, inline search, and Lucide icons.
 */

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useAdmin } from "@/contexts/AdminContext";
import { useFavorites } from "@/hooks/use-favorites";
import { ChevronRight, Star } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  FOOTER_NAVIGATION,
  MAIN_NAVIGATION,
  getAllNavItems,
  isPathInSection,
  isPathInSubGroup,
} from "./navigation";
import type { NavItem, NavSection, NavSubGroup } from "./navigation";

// =============================================================================
// Helpers
// =============================================================================

function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// =============================================================================
// NavItemRow — single menu item with favorite star
// =============================================================================

function NavItemRow({
  item,
  pathname,
  isFavorite,
  onToggleFavorite,
}: {
  item: NavItem;
  pathname: string;
  isFavorite: boolean;
  onToggleFavorite: (href: string) => void;
}) {
  const Icon = item.icon;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive(item.href, pathname)}>
        <Link href={item.href}>
          <Icon className="size-4" />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
      <SidebarMenuAction
        className="opacity-0 group-hover/menu-item:opacity-100 data-[active=true]:opacity-100"
        data-active={isFavorite || undefined}
        onClick={() => onToggleFavorite(item.href)}
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Star className={`size-3 ${isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
      </SidebarMenuAction>
    </SidebarMenuItem>
  );
}

// =============================================================================
// SubGroupSection — collapsible sub-group
// =============================================================================

function SubGroupSection({
  subGroup,
  pathname,
}: {
  subGroup: NavSubGroup;
  pathname: string;
}) {
  return (
    <Collapsible defaultOpen={isPathInSubGroup(subGroup, pathname)}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="font-medium text-muted-foreground">
            <ChevronRight className="size-3 transition-transform duration-200 [[data-state=open]>&]:rotate-90" />
            <span>{subGroup.title}</span>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {subGroup.items.map((item) => {
              const Icon = item.icon;
              return (
                <SidebarMenuSubItem key={item.href} className="group/sub-item">
                  <SidebarMenuSubButton asChild isActive={isActive(item.href, pathname)}>
                    <Link href={item.href}>
                      <Icon className="size-3.5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

// =============================================================================
// SectionGroup — collapsible top-level section
// =============================================================================

function SectionGroup({
  section,
  pathname,
  isFavorite,
  onToggleFavorite,
}: {
  section: NavSection;
  pathname: string;
  isFavorite: (href: string) => boolean;
  onToggleFavorite: (href: string) => void;
}) {
  const SectionIcon = section.icon;

  return (
    <Collapsible defaultOpen={isPathInSection(section, pathname)} className="group/collapsible">
      <SidebarGroup>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className="cursor-pointer hover:text-foreground transition-colors">
            <SectionIcon className="mr-1.5 size-3.5" />
            <span>{section.title}</span>
            <ChevronRight className="ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {section.items.map((item) => (
                <NavItemRow
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  isFavorite={isFavorite(item.href)}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
              {section.subGroups?.map((sub) => (
                <SubGroupSection
                  key={sub.title}
                  subGroup={sub}
                  pathname={pathname}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function AdminSidebar() {
  const pathname = usePathname();
  const { hasPermission, isAdmin } = useAdmin();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const [search, setSearch] = useState("");

  // All items flattened (for search + favorites resolution)
  const allItems = useMemo(
    () => [...getAllNavItems(MAIN_NAVIGATION), ...FOOTER_NAVIGATION.items],
    []
  );

  // Permission filter
  const filterByPermission = useCallback(
    (items: NavItem[]) => {
      if (!isAdmin) return [];
      return items.filter((item) => !item.permission || hasPermission(item.permission));
    },
    [isAdmin, hasPermission]
  );

  // Filtered navigation
  const filteredSections = useMemo(() => {
    const filterSection = (section: NavSection): NavSection | null => {
      const filteredItems = filterByPermission(section.items);
      const filteredSubGroups = section.subGroups
        ?.map((sub) => ({ ...sub, items: filterByPermission(sub.items) }))
        .filter((sub) => sub.items.length > 0);

      if (filteredItems.length === 0 && (!filteredSubGroups || filteredSubGroups.length === 0)) {
        return null;
      }

      return { ...section, items: filteredItems, subGroups: filteredSubGroups };
    };

    return MAIN_NAVIGATION.map(filterSection).filter(Boolean) as NavSection[];
  }, [filterByPermission]);

  const filteredFooter = useMemo(
    () => filterByPermission(FOOTER_NAVIGATION.items),
    [filterByPermission]
  );

  // Resolve favorites to NavItem data
  const favoriteItems = useMemo(() => {
    const itemMap = new Map(allItems.map((item) => [item.href, item]));
    return favorites
      .map((href) => itemMap.get(href))
      .filter((item): item is NavItem => item !== undefined)
      .filter((item) => !item.permission || hasPermission(item.permission));
  }, [favorites, allItems, hasPermission]);

  // Search filter
  const searchLower = search.toLowerCase().trim();
  const searchResults = useMemo(() => {
    if (!searchLower) return null;
    return filterByPermission(allItems).filter((item) => {
      const haystack = [item.title, ...(item.keywords ?? [])].join(" ").toLowerCase();
      return haystack.includes(searchLower);
    });
  }, [searchLower, allItems, filterByPermission]);

  return (
    <Sidebar>
      {/* ── Header ── */}
      <SidebarHeader className="border-b p-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold">LT</span>
          <span className="font-semibold">Lunchtable Admin</span>
        </Link>
        <SidebarInput
          placeholder="Search pages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-2"
        />
      </SidebarHeader>

      <SidebarContent>
        {/* ── Search Results ── */}
        {searchResults ? (
          <SidebarGroup>
            <SidebarGroupLabel>Search Results</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {searchResults.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">No pages found.</p>
                ) : (
                  searchResults.map((item) => (
                    <NavItemRow
                      key={item.href}
                      item={item}
                      pathname={pathname}
                      isFavorite={isFavorite(item.href)}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <>
            {/* ── Favorites ── */}
            {favoriteItems.length > 0 && (
              <>
                <SidebarGroup>
                  <SidebarGroupLabel>
                    <Star className="mr-1.5 size-3.5 fill-yellow-400 text-yellow-400" />
                    Favorites
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {favoriteItems.map((item) => (
                        <NavItemRow
                          key={item.href}
                          item={item}
                          pathname={pathname}
                          isFavorite
                          onToggleFavorite={toggleFavorite}
                        />
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
                <SidebarSeparator />
              </>
            )}

            {/* ── Main Sections ── */}
            {filteredSections.map((section) => (
              <SectionGroup
                key={section.title}
                section={section}
                pathname={pathname}
                isFavorite={isFavorite}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </>
        )}
      </SidebarContent>

      {/* ── Footer: Documentation ── */}
      {filteredFooter.length > 0 && !searchResults && (
        <SidebarFooter>
          <SidebarSeparator />
          <Collapsible>
            <SidebarGroup>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="cursor-pointer hover:text-foreground transition-colors">
                  <FOOTER_NAVIGATION.icon className="mr-1.5 size-3.5" />
                  <span>{FOOTER_NAVIGATION.title}</span>
                  <ChevronRight className="ml-auto size-3.5 transition-transform duration-200 [[data-state=open]>&]:rotate-90" />
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {filteredFooter.map((item) => {
                      const Icon = item.icon;
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton asChild isActive={isActive(item.href, pathname)}>
                            <Link href={item.href}>
                              <Icon className="size-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        </SidebarFooter>
      )}

      <SidebarRail />
    </Sidebar>
  );
}
