#!/usr/bin/env bash
set -euo pipefail

lines="${1:-80}"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

print_file_tail() {
  local title="$1"
  local file="$2"
  echo
  echo "=== $title ==="
  if [[ -f "$file" ]]; then
    tail -n "$lines" "$file"
  else
    echo "(missing: $file)"
  fi
}

echo "Engineering memory review (last $lines lines per file)"
print_file_tail "Observations" "$repo_root/docs/engineering/observations.md"
print_file_tail "Mistakes" "$repo_root/docs/engineering/mistakes.md"
print_file_tail "Decisions" "$repo_root/docs/engineering/decisions.md"
print_file_tail "Action Queue" "$repo_root/docs/engineering/action-queue.md"
