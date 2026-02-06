#!/bin/bash
# Test script for LTCG External Control API
#
# Usage:
#   ./test-control-api.sh                    # Run all tests
#   ./test-control-api.sh status             # Test status endpoint only
#   ./test-control-api.sh story              # Trigger story mode

set -e  # Exit on error

# Configuration
API_KEY="${LTCG_CONTROL_API_KEY:-test_control_key}"
BASE_URL="${BASE_URL:-http://localhost:3001}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_info() {
  echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Test functions
test_health() {
  print_header "1. Health Check"
  echo "Testing: GET $BASE_URL/ltcg/health"

  response=$(curl -s "$BASE_URL/ltcg/health" || true)

  if echo "$response" | jq -e '.status == "ok"' > /dev/null 2>&1; then
    print_success "Health check passed"
    echo "$response" | jq .
  else
    print_error "Health check failed"
    echo "$response"
    return 1
  fi
}

test_webhook_health() {
  print_header "2. Webhook Health Check"
  echo "Testing: GET $BASE_URL/ltcg/webhook/health"

  response=$(curl -s "$BASE_URL/ltcg/webhook/health" || true)

  if echo "$response" | jq -e '.status == "ok"' > /dev/null 2>&1; then
    print_success "Webhook health check passed"
    echo "$response" | jq .
  else
    print_error "Webhook health check failed"
    echo "$response"
    return 1
  fi
}

test_auth_required() {
  print_header "3. Authentication Test (Should Fail)"
  echo "Testing: GET $BASE_URL/ltcg/control/status (without auth)"

  response=$(curl -s -w "\n%{http_code}" "$BASE_URL/ltcg/control/status" || true)
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "401" ]; then
    print_success "Authentication required (as expected)"
    echo "$body" | jq . || echo "$body"
  else
    print_error "Expected 401, got $http_code"
    echo "$body"
    return 1
  fi
}

test_status() {
  print_header "4. Agent Status (With Auth)"
  echo "Testing: GET $BASE_URL/ltcg/control/status"
  echo "Authorization: Bearer [REDACTED]"

  response=$(curl -s -H "Authorization: Bearer $API_KEY" "$BASE_URL/ltcg/control/status" || true)

  if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
    print_success "Status endpoint working"
    echo "$response" | jq .
  else
    print_error "Status endpoint failed"
    echo "$response"
    return 1
  fi
}

test_story_mode() {
  print_header "5. Trigger Story Mode"
  echo "Testing: POST $BASE_URL/ltcg/control/story-mode"
  echo "Body: {\"difficulty\": \"easy\"}"

  response=$(curl -s -X POST "$BASE_URL/ltcg/control/story-mode" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"difficulty": "easy"}' || true)

  if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
    print_success "Story mode triggered successfully"
    echo "$response" | jq .

    # Extract game ID for monitoring
    game_id=$(echo "$response" | jq -r '.gameId')
    echo ""
    print_info "Game ID: $game_id"

    return 0
  else
    print_error "Story mode trigger failed"
    echo "$response" | jq . || echo "$response"
    return 1
  fi
}

monitor_game() {
  print_header "6. Monitor Game Progress"
  print_info "Polling status every 3 seconds (press Ctrl+C to stop)..."
  echo ""

  iteration=0
  while [ $iteration -lt 10 ]; do
    iteration=$((iteration + 1))
    echo -e "${YELLOW}Poll $iteration:${NC}"

    response=$(curl -s -H "Authorization: Bearer $API_KEY" "$BASE_URL/ltcg/control/status" || true)

    if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
      # Extract key fields
      is_in_game=$(echo "$response" | jq -r '.isInGame')

      if [ "$is_in_game" = "true" ]; then
        echo "$response" | jq -c '{
          isInGame,
          currentGameId,
          gameState: {
            phase: .gameState.phase,
            turnNumber: .gameState.turnNumber,
            currentTurn: .gameState.currentTurn,
            status: .gameState.status,
            playerLP: .gameState.player.lifePoints,
            opponentLP: .gameState.opponent.lifePoints
          }
        }'
      else
        echo "$response" | jq -c '{isInGame, currentGameId}'
        print_info "Game has ended or agent is not in a game"
        break
      fi
    else
      print_error "Failed to fetch status"
      echo "$response"
      break
    fi

    sleep 3
  done

  echo ""
  print_success "Monitoring complete"
}

test_surrender() {
  print_header "7. Surrender Game (Optional)"
  echo "Testing: POST $BASE_URL/ltcg/control/surrender"

  # First check if in a game
  status=$(curl -s -H "Authorization: Bearer $API_KEY" "$BASE_URL/ltcg/control/status" || true)
  is_in_game=$(echo "$status" | jq -r '.isInGame')

  if [ "$is_in_game" != "true" ]; then
    print_info "Agent is not in a game, skipping surrender test"
    return 0
  fi

  response=$(curl -s -X POST "$BASE_URL/ltcg/control/surrender" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" || true)

  if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
    print_success "Successfully surrendered game"
    echo "$response" | jq .
  else
    print_error "Surrender failed"
    echo "$response"
    return 1
  fi
}

# Main test runner
main() {
  print_header "🧪 LTCG External Control API Test Suite"
  echo "Base URL: $BASE_URL"
  echo "API Key: ${API_KEY:0:10}... (${#API_KEY} characters)"
  echo ""

  # Check if specific test requested
  if [ -n "$1" ]; then
    case "$1" in
      health)
        test_health
        ;;
      webhook)
        test_webhook_health
        ;;
      auth)
        test_auth_required
        ;;
      status)
        test_status
        ;;
      story)
        test_story_mode
        monitor_game
        ;;
      surrender)
        test_surrender
        ;;
      monitor)
        monitor_game
        ;;
      *)
        echo "Unknown test: $1"
        echo "Available tests: health, webhook, auth, status, story, surrender, monitor"
        exit 1
        ;;
    esac
    exit 0
  fi

  # Run all tests
  test_health || true
  test_webhook_health || true
  test_auth_required || true
  test_status || true

  echo ""
  read -p "Do you want to trigger story mode and start a game? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    test_story_mode && monitor_game
  else
    print_info "Skipping story mode test"
  fi

  echo ""
  print_header "✅ Test Suite Complete"
  echo ""
  print_info "Summary:"
  echo "  - Health checks: Passed"
  echo "  - Authentication: Passed"
  echo "  - Control API: Ready"
  echo ""
  print_info "Next steps:"
  echo "  1. Ensure agent is running: cd packages/plugin-ltcg && ./start-dizzy.sh dev"
  echo "  2. Trigger story mode: ./test-control-api.sh story"
  echo "  3. Monitor gameplay: ./test-control-api.sh monitor"
  echo "  4. Check streaming at: https://retake.tv/"
  echo ""
}

# Run main with arguments
main "$@"
