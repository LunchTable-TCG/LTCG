#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/eng-log.sh <kind> "<title>" "<details>" ["<impact_or_prevention>"]

Kinds:
  observation | note | win
  mistake
  decision
  todo

Examples:
  scripts/eng-log.sh observation "Provider pattern works" "Gathering providers first reduced retries"
  scripts/eng-log.sh mistake "Missed auth check" "Endpoint used wrong wrapper" "Require authHttpAction for agent routes"
  scripts/eng-log.sh decision "Keep polling fallback" "Webhook optional in dev" "Preserves local development without tunnels"
  scripts/eng-log.sh todo "Add integration coverage" "Cover matchmaking + game action contract tests"
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -lt 3 ]]; then
  usage
  exit 1
fi

kind="$1"
title="$2"
details="$3"
impact="${4:-}"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
timestamp="$(date -u +"%Y-%m-%d %H:%M UTC")"
branch="$(git -C "$repo_root" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")"
commit="$(git -C "$repo_root" rev-parse --short HEAD 2>/dev/null || echo "none")"

case "$kind" in
  observation|note|win)
    file="$repo_root/docs/engineering/observations.md"
    kind_label="Observation"
    ;;
  mistake)
    file="$repo_root/docs/engineering/mistakes.md"
    kind_label="Mistake"
    ;;
  decision)
    file="$repo_root/docs/engineering/decisions.md"
    kind_label="Decision"
    ;;
  todo)
    file="$repo_root/docs/engineering/action-queue.md"
    kind_label="Todo"
    ;;
  *)
    echo "Unknown kind: $kind"
    usage
    exit 1
    ;;
esac

mkdir -p "$(dirname "$file")"

{
  echo
  echo "## [$timestamp] $kind_label: $title"
  echo
  echo "- Branch: \`$branch\`"
  echo "- Commit: \`$commit\`"
  echo "- Details: $details"
  if [[ -n "$impact" ]]; then
    if [[ "$kind" == "mistake" ]]; then
      echo "- Prevention: $impact"
    elif [[ "$kind" == "decision" ]]; then
      echo "- Impact: $impact"
    else
      echo "- Next: $impact"
    fi
  fi
} >> "$file"

echo "Logged $kind_label to $file"
