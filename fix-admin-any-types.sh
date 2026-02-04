#!/bin/bash
#Fix all common ID type casts in admin src directory

cd /Users/home/Desktop/LTCG

# Step 1: Fix all ID type casts
echo "Fixing ID type casts..."
find apps/admin/src -type f \( -name "*.tsx" -o -name "*.ts" \) | while read file; do
  sed -i '' \
    -e 's/questDbId as any/questDbId as QuestId/g' \
    -e 's/achievementDbId as any/achievementDbId as AchievementId/g' \
    -e 's/tournamentId as any/tournamentId as TournamentId/g' \
    -e 's/productId as any/productId as ProductId/g' \
    -e 's/templateId as any/templateId as TemplateId/g' \
    -e 's/promoCodeId as any/promoCodeId as PromoCodeId/g' \
    -e 's/battlePassId as any/battlePassId as BattlePassId/g' \
    -e 's/itemId as any/itemId as LaunchChecklistItemId/g' \
    -e 's/featureFlagId as any/featureFlagId as FeatureFlagId/g' \
    -e 's/chapterId as any/chapterId as ChapterId/g' \
    -e 's/stageId as any/stageId as StageId/g' \
    -e 's/flag._id as any/flag._id as FeatureFlagId/g' \
    -e 's/battlePass._id as any/battlePass._id as BattlePassId/g' \
    "$file"
done

# Step 2: Replace apiAny with api
echo "Replacing apiAny with api..."
find apps/admin/src -type f \( -name "*.tsx" -o -name "*.ts" \) | while read file; do
  sed -i '' 's/apiAny\./api./g' "$file"

  # Add imports if apiAny was used
  if grep -q "import.*apiAny" "$file"; then
    sed -i '' 's/apiAny,//' "$file"
    sed -i '' 's/, apiAny//' "$file"
    sed -i '' 's/{ apiAny }//' "$file"
  fi
done

# Step 3: Add necessary type imports to files that need them
echo "Adding type imports where needed..."
for file in apps/admin/src/app/quests/*.tsx apps/admin/src/app/quests/**/*.tsx; do
  [ -f "$file" ] || continue
  if grep -q "QuestId\|AchievementId" "$file" && ! grep -q "import.*QuestId\|import.*AchievementId" "$file"; then
    # Add import after convexHelpers import
    sed -i '' '/from "@\/lib\/convexHelpers"/a\
import type { QuestId, AchievementId } from "@\/lib\/convexTypes";
' "$file"
  fi
done

for file in apps/admin/src/app/tournaments/**/*.tsx; do
  [ -f "$file" ] || continue
  if grep -q "TournamentId" "$file" && ! grep -q "import.*TournamentId" "$file"; then
    sed -i '' '/from "@\/lib\/convexHelpers"/a\
import type { TournamentId } from "@\/lib\/convexTypes";
' "$file"
  fi
done

for file in apps/admin/src/app/shop/**/*.tsx; do
  [ -f "$file" ] || continue
  if grep -q "ProductId" "$file" && ! grep -q "import.*ProductId" "$file"; then
    sed -i '' '/from "@\/lib\/convexHelpers"/a\
import type { ProductId } from "@\/lib\/convexTypes";
' "$file"
  fi
done

for file in apps/admin/src/app/templates/**/*.tsx; do
  [ -f "$file" ] || continue
  if grep -q "TemplateId" "$file" && ! grep -q "import.*TemplateId" "$file"; then
    sed -i '' '/from "@\/lib\/convexHelpers"/a\
import type { TemplateId } from "@\/lib\/convexTypes";
' "$file"
  fi
done

for file in apps/admin/src/app/promo-codes/**/*.tsx; do
  [ -f "$file" ] || continue
  if grep -q "PromoCodeId" "$file" && ! grep -q "import.*PromoCodeId" "$file"; then
    sed -i '' '/from "@\/lib\/convexHelpers"/a\
import type { PromoCodeId } from "@\/lib\/convexTypes";
' "$file"
  fi
done

for file in apps/admin/src/app/battle-pass/**/*.tsx; do
  [ -f "$file" ] || continue
  if grep -q "BattlePassId" "$file" && ! grep -q "import.*BattlePassId" "$file"; then
    sed -i '' '/from "@\/lib\/convexHelpers"/a\
import type { BattlePassId } from "@\/lib\/convexTypes";
' "$file"
  fi
done

for file in apps/admin/src/app/story/**/*.tsx; do
  [ -f "$file" ] || continue
  if grep -q "ChapterId\|StageId" "$file" && ! grep -q "import.*ChapterId\|import.*StageId" "$file"; then
    sed -i '' '/from "@\/lib\/convexHelpers"/a\
import type { ChapterId, StageId } from "@\/lib\/convexTypes";
' "$file"
  fi
done

for file in apps/admin/src/app/settings/**/*.tsx; do
  [ -f "$file" ] || continue
  if grep -q "FeatureFlagId" "$file" && ! grep -q "import.*FeatureFlagId" "$file"; then
    sed -i '' '/from "@\/lib\/convexHelpers"/a\
import type { FeatureFlagId } from "@\/lib\/convexTypes";
' "$file"
  fi
done

for file in apps/admin/src/app/token/**/*.tsx; do
  [ -f "$file" ] || continue
  if grep -q "LaunchChecklistItemId" "$file" && ! grep -q "import.*LaunchChecklistItemId" "$file"; then
    sed -i '' '/from "@\/lib\/convexHelpers"/a\
import type { LaunchChecklistItemId } from "@\/lib\/convexTypes";
' "$file"
  fi
done

echo "Done! Checking results..."
bun biome check apps/admin/src 2>&1 | grep "noExplicitAny" | wc -l
echo "Remaining noExplicitAny errors ^"
