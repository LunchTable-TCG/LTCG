# MCP Server Configuration Examples

This directory contains example configuration files for integrating the LunchTable-TCG MCP server with different AI clients and IDEs.

## Quick Start

Before using any configuration, you need to:

1. Build the MCP server:
   ```bash
   npm run build
   ```

2. Install the server globally or get its full path:
   ```bash
   npm install -g @lunchtable/mcp-server
   ```
   Or note the path to `dist/index.js`

3. Replace `/path/to/@lunchtable/mcp-server/dist/index.js` in the examples with your actual path

4. Replace `your-api-key-here` with your actual LunchTable-TCG API key

## Configuration Files

### Claude Desktop (claude-desktop.json)

**Location:** `~/.config/Claude/claude_desktop_config.json` (macOS/Linux) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

**Setup Instructions:**

1. Open your Claude Desktop configuration file in a text editor
2. Copy the `lunchtable-tcg` server configuration from `claude-desktop.json`
3. Add it to the `mcpServers` object in your config
4. Restart Claude Desktop
5. The LunchTable-TCG tools will be available to Claude

**Full Example:**
```json
{
  "mcpServers": {
    "lunchtable-tcg": {
      "command": "node",
      "args": ["/path/to/@lunchtable/mcp-server/dist/index.js"],
      "env": {
        "LTCG_API_KEY": "your-api-key-here",
        "LTCG_API_URL": "https://lunchtable.cards"
      }
    }
  }
}
```

### Cline (cline.json)

**Location:** VS Code settings → Search "MCP" → Edit in settings.json or `~/.config/cline/mcp_config.json`

**Setup Instructions:**

1. Open VS Code settings (Cmd/Ctrl + ,)
2. Search for "MCP"
3. Click "Edit in settings.json"
4. Add the LunchTable-TCG server configuration to the MCP servers array
5. Reload VS Code
6. LunchTable-TCG tools will be available in Cline

**Full Example:**
```json
{
  "mcpServers": {
    "lunchtable-tcg": {
      "command": "node",
      "args": ["/path/to/@lunchtable/mcp-server/dist/index.js"],
      "env": {
        "LTCG_API_KEY": "your-api-key-here",
        "LTCG_API_URL": "https://lunchtable.cards"
      }
    }
  }
}
```

### VS Code MCP (vscode.json)

**Location:** VS Code settings → `"mcp.servers"` in settings.json

**Setup Instructions:**

1. Install the MCP extension in VS Code
2. Open Command Palette (Cmd/Ctrl + Shift + P)
3. Search for "Preferences: Open Settings (JSON)"
4. Add the LunchTable-TCG server configuration to `"mcp.servers"`
5. Save and reload VS Code
6. LunchTable-TCG tools will be available to the MCP extension

**Full Example:**
```json
{
  "mcp.servers": {
    "lunchtable-tcg": {
      "command": "node",
      "args": ["/path/to/@lunchtable/mcp-server/dist/index.js"],
      "env": {
        "LTCG_API_KEY": "your-api-key-here",
        "LTCG_API_URL": "https://lunchtable.cards"
      }
    }
  }
}
```

## Environment Variables

### Required
- **LTCG_API_KEY**: Your API key for authenticating with the LunchTable-TCG backend
  - Obtain this from your LunchTable-TCG account dashboard
  - Keep this secret; don't commit it to version control

### Optional
- **LTCG_API_URL**: Base URL for the LunchTable-TCG API
  - Defaults to: `https://lunchtable.cards`
  - Override for custom/self-hosted deployments

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment files** (`.env`) locally:
   ```bash
   # .env (add to .gitignore)
   LTCG_API_KEY=your-secret-key
   ```
3. **Use system environment variables** in production
4. **Rotate keys regularly** in your account settings
5. **Limit key permissions** to only what's needed

## Path Resolution Guide

### Finding the MCP Server Path

**If installed globally:**
```bash
npm list -g @lunchtable/mcp-server
# Look for the global npm bin directory
which ltcg-mcp  # macOS/Linux
where ltcg-mcp  # Windows
```

**If in a local project:**
```bash
ls -la node_modules/@lunchtable/mcp-server/dist/index.js
```

**Using npx (no installation needed):**
```json
{
  "command": "npx",
  "args": ["@lunchtable/mcp-server"]
}
```

**Using bun (if installed):**
```json
{
  "command": "bun",
  "args": ["run", "/path/to/@lunchtable/mcp-server/dist/index.js"]
}
```

## Troubleshooting

### Server won't start
- Check that `LTCG_API_KEY` is set correctly
- Verify the path to `dist/index.js` is correct
- Try running the server directly: `node /path/to/dist/index.js`

### Tools not appearing
- Restart the client application
- Check that the server is running without errors
- Look for error logs in the client's debug output

### Connection timeout
- Verify the API URL is correct
- Check your internet connection
- Ensure the API server is running

### "Cannot find module" error
- Run `npm run build` in the mcp-server directory
- Verify `dist/index.js` exists
- Check that Node.js dependencies are installed: `npm install`

## Advanced Configuration

### Using Different API URLs for Different Environments

**Claude Desktop:**
```json
{
  "mcpServers": {
    "ltcg-prod": {
      "command": "node",
      "args": ["/path/to/@lunchtable/mcp-server/dist/index.js"],
      "env": {
        "LTCG_API_KEY": "prod-key",
        "LTCG_API_URL": "https://lunchtable.cards"
      }
    },
    "ltcg-dev": {
      "command": "node",
      "args": ["/path/to/@lunchtable/mcp-server/dist/index.js"],
      "env": {
        "LTCG_API_KEY": "dev-key",
        "LTCG_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

### Using a Shell Script to Manage Secrets

Create `scripts/ltcg-mcp.sh`:
```bash
#!/bin/bash
export LTCG_API_KEY=$(cat ~/.ltcg-api-key)
export LTCG_API_URL="${LTCG_API_URL:-https://lunchtable.cards}"
exec node /path/to/@lunchtable/mcp-server/dist/index.js
```

Then configure:
```json
{
  "command": "bash",
  "args": ["/path/to/scripts/ltcg-mcp.sh"]
}
```

## Documentation

- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [LTCG Project Documentation](../../README.md)
- [API Reference](../README.md)

## Support

For issues or questions about the LunchTable-TCG MCP server:
1. Check the troubleshooting section above
2. Review the LunchTable-TCG project documentation
3. Contact the LunchTable-TCG team
