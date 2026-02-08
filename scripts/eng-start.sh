#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== Working Agreement ==="
if [[ -f "$repo_root/docs/engineering/working-agreement.md" ]]; then
  sed -n '1,120p' "$repo_root/docs/engineering/working-agreement.md"
else
  echo "Missing docs/engineering/working-agreement.md"
fi

echo
echo "=== Recent Memory ==="
bash "$repo_root/scripts/eng-review.sh" "${1:-40}"
