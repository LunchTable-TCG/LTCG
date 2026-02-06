#!/bin/bash
# Start Dizzy - LTCG Streaming Agent

set -e

echo "🎮 Starting Dizzy - LTCG Streaming Agent"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found"
    echo ""
    echo "Creating .env from template..."
    cp .env.dizzy.example .env
    echo ""
    echo "✏️  Please edit .env with your credentials:"
    echo "   1. Add your LLM API key (OPENROUTER_API_KEY or ANTHROPIC_API_KEY or OPENAI_API_KEY)"
    echo "   2. Add your LTCG_AGENT_ID (from agent registration)"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Check if elizaos is installed
if ! command -v elizaos &> /dev/null; then
    echo "❌ ElizaOS CLI not found"
    echo ""
    echo "Install with: bun add -g @elizaos/cli"
    exit 1
fi

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun not found"
    echo ""
    echo "Install from: https://bun.sh/"
    exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    bun install
    echo ""
fi

# Parse command line arguments
MODE="${1:-dev}"  # Default to dev mode

# Display startup info
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🤖 Dizzy Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Name: Dizzy"
echo "  Role: LTCG Streaming Agent"
echo "  Platform: Retake.tv"
echo "  Mode: $MODE"
echo ""

# Check critical environment variables
source .env 2>/dev/null || true

if [ -z "$OPENROUTER_API_KEY" ] && [ -z "$ANTHROPIC_API_KEY" ] && [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  No LLM API key found in .env"
    echo "   Add one of: OPENROUTER_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY"
    echo ""
fi

if [ -z "$LTCG_AGENT_ID" ]; then
    echo "⚠️  LTCG_AGENT_ID not set in .env"
    echo "   Dizzy won't be able to join games"
    echo ""
fi

if [ -z "$DIZZY_RETAKE_ACCESS_TOKEN" ]; then
    echo "⚠️  DIZZY_RETAKE_ACCESS_TOKEN not set"
    echo "   Streaming to Retake.tv will be disabled"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start Dizzy based on mode
case "$MODE" in
    dev|development)
        echo "🔧 Starting in development mode (hot reload enabled)"
        echo ""
        elizaos start --character characters/dizzy.json
        ;;

    prod|production)
        echo "🚀 Starting in production mode"
        echo ""
        elizaos start --character characters/dizzy.json
        ;;

    test)
        echo "🧪 Starting in test mode"
        echo ""
        LOG_LEVEL=debug elizaos start --character characters/dizzy.json
        ;;

    *)
        echo "Usage: ./start-dizzy.sh [dev|prod|test]"
        echo ""
        echo "Modes:"
        echo "  dev  - Development mode with hot reload (default)"
        echo "  prod - Production mode"
        echo "  test - Test mode with debug logging"
        exit 1
        ;;
esac
