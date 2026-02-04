#!/bin/bash
# Script to fix common noExplicitAny patterns in admin directory

# Fix common ID type casts
find apps/admin/src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's/questDbId as any/questDbId as QuestId/g' \
  -e 's/achievementDbId as any/achievementDbId as AchievementId/g' \
  -e 's/tournamentId as any/tournamentId as TournamentId/g' \
  -e 's/productId as any/productId as ProductId/g' \
  -e 's/templateId as any/templateId as TemplateId/g' \
  -e 's/promoCodeId as any/promoCodeId as PromoCodeId/g' \
  -e 's/battlePassId as any/battlePassId as Id<"battlePasses">/g' \
  -e 's/itemId as any/itemId as Id<"launchChecklistItems">/g' \
  -e 's/featureFlagId as any/featureFlagId as Id<"featureFlags">/g' \
  -e 's/chapterId as any/chapterId as Id<"storyChapters">/g' \
  -e 's/stageId as any/stageId as Id<"storyStages">/g' \
  {} \;

echo "Fixed common ID type casts"

# Replace apiAny with api
find apps/admin/src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's/apiAny\./api./g' \
  -e 's/from "@\/lib\/convexHelpers";$/from "@\/lib\/convexHelpers";\nimport type { QuestId, AchievementId, TournamentId, ProductId, TemplateId, PromoCodeId } from "@\/lib\/convexTypes";/g' \
  {} \;

echo "Replaced apiAny with api"
echo "Done! Run 'bun biome check apps/admin' to verify"
