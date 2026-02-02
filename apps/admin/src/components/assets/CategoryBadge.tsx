/**
 * CategoryBadge Component
 *
 * Displays asset category with appropriate styling.
 */

import { Badge } from "@/components/ui/badge";
import type { AssetCategory } from "./types";

const CATEGORY_CONFIG: Record<
  AssetCategory,
  { label: string; className: string }
> = {
  profile_picture: { label: "Profile", className: "bg-blue-500/20 text-blue-500 border-blue-500/30" },
  card_image: { label: "Card", className: "bg-purple-500/20 text-purple-500 border-purple-500/30" },
  document: { label: "Document", className: "bg-gray-500/20 text-gray-500 border-gray-500/30" },
  other: { label: "Other", className: "bg-gray-500/20 text-gray-500 border-gray-500/30" },
  background: { label: "Background", className: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" },
  texture: { label: "Texture", className: "bg-amber-500/20 text-amber-500 border-amber-500/30" },
  ui_element: { label: "UI", className: "bg-cyan-500/20 text-cyan-500 border-cyan-500/30" },
  shop_asset: { label: "Shop", className: "bg-pink-500/20 text-pink-500 border-pink-500/30" },
  story_asset: { label: "Story", className: "bg-orange-500/20 text-orange-500 border-orange-500/30" },
  logo: { label: "Logo", className: "bg-indigo-500/20 text-indigo-500 border-indigo-500/30" },
};

interface CategoryBadgeProps {
  category: AssetCategory;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

export { CATEGORY_CONFIG };
