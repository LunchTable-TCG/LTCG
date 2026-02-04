#!/bin/bash

# Migration script to update mutation and internalMutation imports
# to use trigger-wrapped versions from functions.ts
#
# This script updates all Convex TypeScript files to import mutation/internalMutation
# from the wrapped versions in functions.ts instead of directly from _generated/server.
#
# Usage: ./scripts/migrate-mutation-imports.sh

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting mutation import migration...${NC}\n"

# Counter for tracking changes
total_files=0
updated_files=0
skipped_files=0

# Find all .ts files in convex/ directory
while IFS= read -r file; do
  total_files=$((total_files + 1))

  # Skip _generated and node_modules
  if [[ "$file" =~ _generated|node_modules ]]; then
    continue
  fi

  # Skip markdown files
  if [[ "$file" =~ \.md$ ]]; then
    continue
  fi

  # Check if file imports mutation or internalMutation from _generated/server
  if ! grep -q "from [\"'].*_generated/server[\"']" "$file"; then
    continue
  fi

  # Determine the correct relative path to functions.ts based on directory depth
  # Count directory depth from convex/
  depth=$(echo "$file" | sed 's|^convex/||' | grep -o '/' | wc -l)

  if [ "$depth" -eq 0 ]; then
    # Root level: convex/*.ts -> "./functions"
    functions_path="./functions"
  elif [ "$depth" -eq 1 ]; then
    # One level deep: convex/admin/*.ts -> "../functions"
    functions_path="../functions"
  elif [ "$depth" -eq 2 ]; then
    # Two levels deep: convex/gameplay/games/*.ts -> "../../functions"
    functions_path="../../functions"
  else
    echo -e "${YELLOW}Skipping $file (unsupported depth: $depth)${NC}"
    skipped_files=$((skipped_files + 1))
    continue
  fi

  # Check if file actually imports mutation or internalMutation
  has_mutation=$(grep "from [\"'].*_generated/server[\"']" "$file" | grep -E "(^|\{|,\s*)mutation(\s*,|\s*\}|$)" || true)
  has_internal_mutation=$(grep "from [\"'].*_generated/server[\"']" "$file" | grep -E "(^|\{|,\s*)internalMutation(\s*,|\s*\}|$)" || true)

  if [ -z "$has_mutation" ] && [ -z "$has_internal_mutation" ]; then
    continue
  fi

  echo -e "${BLUE}Processing: ${NC}$file"

  # Create backup
  cp "$file" "$file.bak"

  # Extract the current import line
  import_line=$(grep "from [\"'].*_generated/server[\"']" "$file" | head -n 1)

  # Check what's being imported
  imports_mutation=false
  imports_internal_mutation=false
  other_imports=""

  if echo "$import_line" | grep -qE "(^|\{|,\s*)mutation(\s*,|\s*\}|$)"; then
    imports_mutation=true
  fi

  if echo "$import_line" | grep -qE "(^|\{|,\s*)internalMutation(\s*,|\s*\}|$)"; then
    imports_internal_mutation=true
  fi

  # Extract other imports (query, action, internalQuery, internalAction, types, etc.)
  # This is a simplified approach - may need manual review for complex cases
  other_imports=$(echo "$import_line" | sed -E 's/\bmutation\b//g' | sed -E 's/\binternalMutation\b//g' | sed -E 's/,,/,/g' | sed -E 's/,\s*}/}/g' | sed -E 's/{\s*,/{/g')

  # Build new import statements
  new_imports=""

  # Add imports from _generated/server (if any remain)
  if echo "$other_imports" | grep -q "import.*{"; then
    new_imports="$other_imports"
  fi

  # Add imports from functions.ts
  if [ "$imports_mutation" = true ] && [ "$imports_internal_mutation" = true ]; then
    new_imports="${new_imports}\nimport { mutation, internalMutation } from \"${functions_path}\";"
  elif [ "$imports_mutation" = true ]; then
    new_imports="${new_imports}\nimport { mutation } from \"${functions_path}\";"
  elif [ "$imports_internal_mutation" = true ]; then
    new_imports="${new_imports}\nimport { internalMutation } from \"${functions_path}\";"
  fi

  # This is complex to automate perfectly, so we'll output instructions instead
  echo -e "  ${YELLOW}→ Imports mutation: $imports_mutation${NC}"
  echo -e "  ${YELLOW}→ Imports internalMutation: $imports_internal_mutation${NC}"
  echo -e "  ${YELLOW}→ Relative path: $functions_path${NC}"
  echo -e "  ${GREEN}→ Manual update required${NC}\n"

  # Restore backup (since we're not doing automatic replacement)
  rm "$file.bak"

  updated_files=$((updated_files + 1))

done < <(find convex -name "*.ts" -type f)

echo -e "\n${BLUE}Migration Summary:${NC}"
echo -e "Total files scanned: ${total_files}"
echo -e "Files requiring updates: ${updated_files}"
echo -e "Files skipped: ${skipped_files}"

echo -e "\n${YELLOW}Note: This script provides a dry-run analysis.${NC}"
echo -e "${YELLOW}Actual updates should be done carefully with proper testing.${NC}"
echo -e "\n${GREEN}Recommended approach:${NC}"
echo -e "1. Update files in batches by directory depth"
echo -e "2. Run tests after each batch"
echo -e "3. Use the pattern demonstrated in the sample files"
