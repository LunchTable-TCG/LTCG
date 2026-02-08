#!/usr/bin/env bash
set -euo pipefail

RETAKE_API_BASE="https://chat.retake.tv"
CREDS_DIR="${HOME}/.config/retake"
CREDS_FILE="${CREDS_DIR}/credentials.json"

require_bin() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required binary: $1" >&2
    exit 1
  fi
}

require_bin curl
require_bin jq

save_creds() {
  local access_token="$1"
  local agent_name="$2"
  local agent_id="$3"
  local user_db_id="$4"
  local wallet_address="$5"

  mkdir -p "$CREDS_DIR"
  jq -n \
    --arg access_token "$access_token" \
    --arg agent_name "$agent_name" \
    --arg agent_id "$agent_id" \
    --arg userDbId "$user_db_id" \
    --arg wallet_address "$wallet_address" \
    --arg token_address "" \
    --arg token_ticker "" \
    '{
      access_token: $access_token,
      agent_name: $agent_name,
      agent_id: $agent_id,
      userDbId: $userDbId,
      wallet_address: $wallet_address,
      token_address: $token_address,
      token_ticker: $token_ticker
    }' > "$CREDS_FILE"

  chmod 600 "$CREDS_FILE"
  echo "Saved credentials: $CREDS_FILE"
}

load_token() {
  if [[ -n "${RETAKE_ACCESS_TOKEN:-}" ]]; then
    printf "%s" "$RETAKE_ACCESS_TOKEN"
    return
  fi

  if [[ -f "$CREDS_FILE" ]]; then
    jq -r '.access_token // empty' "$CREDS_FILE"
    return
  fi

  echo "" 
}

cmd_register() {
  local agent_name="${1:-}"
  local agent_description="${2:-}"
  local image_url="${3:-}"
  local wallet_address="${4:-}"

  if [[ -z "$agent_name" || -z "$agent_description" || -z "$image_url" || -z "$wallet_address" ]]; then
    echo "Usage: $0 register <agent_name> <agent_description> <image_url> <wallet_address>" >&2
    exit 1
  fi

  local payload
  payload="$(jq -n \
    --arg agent_name "$agent_name" \
    --arg agent_description "$agent_description" \
    --arg image_url "$image_url" \
    --arg wallet_address "$wallet_address" \
    '{
      agent_name: $agent_name,
      agent_description: $agent_description,
      image_url: $image_url,
      wallet_address: $wallet_address
    }')"

  local response
  response="$(curl -sS -X POST "${RETAKE_API_BASE}/api/agent/register" \
    -H "Content-Type: application/json" \
    -d "$payload")"

  local access_token agent_id user_db_id
  access_token="$(printf "%s" "$response" | jq -r '.access_token // empty')"
  agent_id="$(printf "%s" "$response" | jq -r '.agent_id // empty')"
  user_db_id="$(printf "%s" "$response" | jq -r '.userDbId // empty')"

  if [[ -z "$access_token" || -z "$agent_id" || -z "$user_db_id" ]]; then
    echo "Registration failed:" >&2
    printf "%s\n" "$response" | jq . >&2 || printf "%s\n" "$response" >&2
    exit 1
  fi

  save_creds "$access_token" "$agent_name" "$agent_id" "$user_db_id" "$wallet_address"

  echo "Registered on Retake"
  echo "agent_id: $agent_id"
  echo "userDbId: $user_db_id"
}

cmd_start() {
  local token
  token="$(load_token)"
  if [[ -z "$token" ]]; then
    echo "No access token found. Set RETAKE_ACCESS_TOKEN or run register first." >&2
    exit 1
  fi

  echo "Calling /stream/start (required before RTMP push)..."
  curl -sS -X POST "${RETAKE_API_BASE}/api/agent/stream/start" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" | jq .

  echo "Fetching RTMP credentials..."
  curl -sS "${RETAKE_API_BASE}/api/agent/rtmp" \
    -H "Authorization: Bearer ${token}" | jq .
}

cmd_status() {
  local token
  token="$(load_token)"
  if [[ -z "$token" ]]; then
    echo "No access token found. Set RETAKE_ACCESS_TOKEN or run register first." >&2
    exit 1
  fi

  curl -sS "${RETAKE_API_BASE}/api/agent/stream/status" \
    -H "Authorization: Bearer ${token}" | jq .
}

cmd_stop() {
  local token
  token="$(load_token)"
  if [[ -z "$token" ]]; then
    echo "No access token found. Set RETAKE_ACCESS_TOKEN or run register first." >&2
    exit 1
  fi

  curl -sS -X POST "${RETAKE_API_BASE}/api/agent/stream/stop" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" | jq .
}

cmd_help() {
  cat <<USAGE
Retake helper (from official retake.tv skill flow)

Usage:
  $0 register <agent_name> <agent_description> <image_url> <wallet_address>
  $0 start
  $0 status
  $0 stop

Notes:
- Stores credentials at: ${CREDS_FILE}
- You can override token with RETAKE_ACCESS_TOKEN.
- /stream/start must be called before pushing RTMP.
USAGE
}

main() {
  local command="${1:-help}"
  shift || true

  case "$command" in
    register) cmd_register "$@" ;;
    start) cmd_start "$@" ;;
    status) cmd_status "$@" ;;
    stop) cmd_stop "$@" ;;
    help|--help|-h) cmd_help ;;
    *)
      echo "Unknown command: $command" >&2
      cmd_help
      exit 1
      ;;
  esac
}

main "$@"
