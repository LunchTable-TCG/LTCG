#!/bin/bash

# LunchTable-TCG MCP Server Setup Script
# This script helps configure the LunchTable-TCG MCP server for different clients

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
DIST_PATH="$PROJECT_ROOT/dist/index.js"

# Functions
print_header() {
  echo -e "${BLUE}====================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}====================================${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

# Check if dist exists
check_build() {
  if [ ! -f "$DIST_PATH" ]; then
    print_error "MCP server not built yet!"
    print_info "Building the server..."
    cd "$PROJECT_ROOT"
    npm run build || {
      print_error "Build failed. Please check npm output above."
      exit 1
    }
    print_success "Build complete!"
  else
    print_success "MCP server found at: $DIST_PATH"
  fi
}

# Setup Claude Desktop
setup_claude_desktop() {
  print_header "Setting up Claude Desktop"

  if [[ "$OSTYPE" == "darwin"* ]]; then
    CONFIG_DIR="$HOME/.config/Claude"
    CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    CONFIG_DIR="$HOME/.config/Claude"
    CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"
  elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    CONFIG_DIR="$APPDATA/Claude"
    CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"
  else
    print_error "Unsupported OS: $OSTYPE"
    return 1
  fi

  mkdir -p "$CONFIG_DIR"

  if [ -f "$CONFIG_FILE" ]; then
    print_warning "Config file already exists: $CONFIG_FILE"
    read -p "Overwrite? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      print_info "Skipping Claude Desktop setup"
      return 0
    fi
  fi

  read -p "Enter your LTCG API Key: " API_KEY
  if [ -z "$API_KEY" ]; then
    print_error "API key is required!"
    return 1
  fi

  read -p "Enter API URL (default: https://lunchtable.cards): " API_URL
  API_URL="${API_URL:-https://lunchtable.cards}"

  cat > "$CONFIG_FILE" << EOF
{
  "mcpServers": {
    "lunchtable-tcg": {
      "command": "node",
      "args": ["$DIST_PATH"],
      "env": {
        "LTCG_API_KEY": "$API_KEY",
        "LTCG_API_URL": "$API_URL"
      }
    }
  }
}
EOF

  print_success "Claude Desktop configured at: $CONFIG_FILE"
  print_info "Please restart Claude Desktop for changes to take effect"
}

# Setup Cline
setup_cline() {
  print_header "Setting up Cline"

  CONFIG_DIR="$HOME/.config/cline"
  CONFIG_FILE="$CONFIG_DIR/mcp_config.json"

  mkdir -p "$CONFIG_DIR"

  if [ -f "$CONFIG_FILE" ]; then
    print_warning "Config file already exists: $CONFIG_FILE"
    read -p "Overwrite? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      print_info "Skipping Cline setup"
      return 0
    fi
  fi

  read -p "Enter your LTCG API Key: " API_KEY
  if [ -z "$API_KEY" ]; then
    print_error "API key is required!"
    return 1
  fi

  read -p "Enter API URL (default: https://lunchtable.cards): " API_URL
  API_URL="${API_URL:-https://lunchtable.cards}"

  cat > "$CONFIG_FILE" << EOF
{
  "mcpServers": {
    "lunchtable-tcg": {
      "command": "node",
      "args": ["$DIST_PATH"],
      "env": {
        "LTCG_API_KEY": "$API_KEY",
        "LTCG_API_URL": "$API_URL"
      }
    }
  }
}
EOF

  print_success "Cline configured at: $CONFIG_FILE"
  print_info "Please restart VS Code for changes to take effect"
}

# Setup VS Code
setup_vscode() {
  print_header "Setting up VS Code"

  if [[ "$OSTYPE" == "darwin"* ]]; then
    SETTINGS_FILE="$HOME/Library/Application Support/Code/User/settings.json"
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    SETTINGS_FILE="$HOME/.config/Code/User/settings.json"
  elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    SETTINGS_FILE="$APPDATA/Code/User/settings.json"
  else
    print_error "Unsupported OS: $OSTYPE"
    return 1
  fi

  if [ ! -f "$SETTINGS_FILE" ]; then
    print_error "VS Code settings file not found: $SETTINGS_FILE"
    print_info "Please open VS Code first to create the settings file"
    return 1
  fi

  read -p "Enter your LTCG API Key: " API_KEY
  if [ -z "$API_KEY" ]; then
    print_error "API key is required!"
    return 1
  fi

  read -p "Enter API URL (default: https://lunchtable.cards): " API_URL
  API_URL="${API_URL:-https://lunchtable.cards}"

  print_warning "VS Code setup requires manual configuration"
  print_info "1. Open VS Code settings: Cmd/Ctrl + Shift + P → 'Preferences: Open Settings (JSON)'"
  print_info "2. Add the following to your settings.json:"
  cat << EOF
  "mcp.servers": {
    "lunchtable-tcg": {
      "command": "node",
      "args": ["$DIST_PATH"],
      "env": {
        "LTCG_API_KEY": "$API_KEY",
        "LTCG_API_URL": "$API_URL"
      }
    }
  }
EOF
  print_info "3. Save and reload VS Code"
}

# Show menu
show_menu() {
  echo
  print_header "LTCG MCP Server Setup"
  echo "Choose a client to configure:"
  echo "1) Claude Desktop"
  echo "2) Cline (VS Code)"
  echo "3) VS Code (manual setup)"
  echo "4) All of the above"
  echo "5) Exit"
  echo
}

# Main menu loop
main() {
  print_header "LTCG MCP Server Configuration"

  # Check if server is built
  check_build
  echo

  while true; do
    show_menu
    read -p "Select an option (1-5): " choice

    case $choice in
      1)
        setup_claude_desktop
        ;;
      2)
        setup_cline
        ;;
      3)
        setup_vscode
        ;;
      4)
        setup_claude_desktop
        setup_cline
        setup_vscode
        ;;
      5)
        print_info "Goodbye!"
        exit 0
        ;;
      *)
        print_error "Invalid option. Please try again."
        ;;
    esac
  done
}

# Run main
main
