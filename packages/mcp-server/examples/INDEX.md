# LunchTable-TCG MCP Server Examples - File Index

This directory contains example configurations and setup guides for integrating the LunchTable-TCG MCP server with different clients.

## Files

### Configuration Files (Copy-Paste Ready)

| File | Client | Purpose |
|------|--------|---------|
| **claude-desktop.json** | Claude Desktop | Configuration for official Claude desktop app |
| **cline.json** | Cline (VS Code) | Configuration for Cline extension |
| **vscode.json** | VS Code | Configuration for VS Code MCP extension |

All three configuration files have the same structure and are ready to copy and paste into your client configuration with minimal modifications.

### Documentation Files

| File | Purpose |
|------|---------|
| **README.md** | Overview of all clients, quick start guide, and reference |
| **SETUP.md** | Detailed step-by-step setup instructions for each client |
| **INDEX.md** | This file - index of all example files |
| **schema.json** | JSON Schema for validating configuration files |

### Environment Files

| File | Purpose |
|------|---------|
| **.env.example** | Example environment variables for local development |

### Scripts

| File | Purpose |
|------|---------|
| **setup.sh** | Interactive setup script for macOS/Linux (automated configuration) |

---

## Quick Navigation

**Just want to get started?**
- Run: `./setup.sh` (interactive setup)
- Or: Read [SETUP.md](./SETUP.md) (step-by-step guide)

**Need reference?**
- See: [README.md](./README.md) (comprehensive reference)

**Specific client?**
- **Claude Desktop:** [SETUP.md → Claude Desktop section](./SETUP.md#claude-desktop)
- **Cline:** [SETUP.md → Cline section](./SETUP.md#cline-vs-code-extension)
- **VS Code:** [SETUP.md → VS Code section](./SETUP.md#vs-code-mcp-extension)

---

## File Descriptions

### Configuration Files

Each configuration file contains:
- `command`: How to run the server (typically `node`)
- `args`: Path to the MCP server and any arguments
- `env`: Environment variables including API key and URL

**Example structure:**
```json
{
  "mcpServers": {
    "lunchtable-tcg": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "LTCG_API_KEY": "your-api-key",
        "LTCG_API_URL": "https://lunchtable.cards"
      }
    }
  }
}
```

**Where to use each:**
- `claude-desktop.json` → `~/.config/Claude/claude_desktop_config.json`
- `cline.json` → `~/.config/cline/mcp_config.json`
- `vscode.json` → VS Code settings.json under `"mcp.servers"`

### .env.example

Sample environment variables file for local development. Copy to `.env` and fill in your actual values.

### setup.sh

Interactive shell script that:
1. Builds the MCP server if not already built
2. Prompts you to select a client
3. Gathers configuration details (API key, URL)
4. Creates the appropriate config file in the right location
5. Provides next steps

**Usage:**
```bash
chmod +x setup.sh
./setup.sh
```

### README.md

Comprehensive reference including:
- Quick start overview
- Per-client setup instructions
- Environment variable documentation
- Security best practices
- Path resolution guide
- Troubleshooting section
- Advanced configuration examples

### SETUP.md

Detailed step-by-step guide including:
- Prerequisites
- Quick setup (automated script)
- Manual setup for each client
- Getting your API key
- Using environment variables
- Extensive troubleshooting
- Configuration examples
- Next steps

### schema.json

JSON Schema for validating MCP configuration files. Can be used by:
- IDE validation plugins
- Configuration linters
- Automated setup tools

---

## Common Tasks

### I want to quickly set up LunchTable-TCG MCP
```bash
./setup.sh
```

### I want to configure Claude Desktop manually
1. Copy `claude-desktop.json` as reference
2. Follow steps in [SETUP.md → Claude Desktop](./SETUP.md#claude-desktop)
3. Place config in `~/.config/Claude/claude_desktop_config.json`

### I want to use the same API key for multiple clients
Edit `.env.example`, save as `.env`, and load it in your shell profile:
```bash
source .env
```

### I want different configs for dev and production
See [Advanced Configuration](./README.md#advanced-configuration) in README.md

### I need to debug connection issues
See [Troubleshooting](./SETUP.md#troubleshooting) in SETUP.md

---

## File Locations Quick Reference

| Client | Config Location |
|--------|-----------------|
| Claude Desktop (macOS/Linux) | `~/.config/Claude/claude_desktop_config.json` |
| Claude Desktop (Windows) | `%APPDATA%\Claude\claude_desktop_config.json` |
| Cline | `~/.config/cline/mcp_config.json` |
| VS Code | `settings.json` under `"mcp.servers"` |

---

## Important Notes

1. **Path must be absolute:** Always use full paths like `/Users/home/...`, not relative paths
2. **API key is sensitive:** Never commit your config files with real API keys to version control
3. **Restart after changes:** Always restart your client after modifying config files
4. **Build first:** Run `npm run build` in the mcp-server directory before setting up

---

## Support

For issues:
1. Check [Troubleshooting](./SETUP.md#troubleshooting) in SETUP.md
2. Review [README.md](./README.md) for detailed reference
3. Verify your path is correct using: `ls -la /path/to/dist/index.js`
4. Test the server manually: `LTCG_API_KEY=test node /path/to/dist/index.js`

