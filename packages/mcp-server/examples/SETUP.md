# LunchTable-TCG MCP Server Setup Guide

This guide walks you through setting up the LunchTable-TCG MCP server with different clients.

## Prerequisites

- Node.js 18+ installed
- The MCP server built: `npm run build` (from the `mcp-server` directory)
- A LunchTable-TCG API key (get from your account dashboard)

## Quick Setup (Automated)

On macOS/Linux, use the included setup script:

```bash
cd packages/mcp-server/examples
chmod +x setup.sh
./setup.sh
```

This will guide you through configuring any of the supported clients interactively.

---

## Manual Setup by Client

### Claude Desktop

**What it is:** Official Claude desktop application by Anthropic

**Configuration file location:**
- **macOS/Linux:** `~/.config/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**Step-by-step setup:**

1. First, build the MCP server:
   ```bash
   cd packages/mcp-server
   npm run build
   ```

2. Note the full path to `dist/index.js`:
   ```bash
   pwd  # Get current directory
   # Then append: /dist/index.js
   ```

3. Locate and open your Claude Desktop config file:
   - macOS: Open Finder, press `Cmd + Shift + .` to show hidden files, navigate to `.config/Claude/`
   - Linux: Navigate to `~/.config/Claude/`
   - Windows: Press `Win + R`, type `%APPDATA%`, navigate to `Claude/`

4. If the file doesn't exist, create a new file named `claude_desktop_config.json`

5. Copy and paste this configuration:
   ```json
   {
     "mcpServers": {
       "lunchtable-tcg": {
         "command": "node",
         "args": ["/full/path/to/@lunchtable/mcp-server/dist/index.js"],
         "env": {
           "LTCG_API_KEY": "your-api-key-here",
           "LTCG_API_URL": "https://lunchtable.cards"
         }
       }
     }
   }
   ```

6. Replace:
   - `/full/path/to/@lunchtable/mcp-server/dist/index.js` with your actual path
   - `your-api-key-here` with your LunchTable-TCG API key

7. Save the file and restart Claude Desktop

8. Verify it works by asking Claude to use a LunchTable-TCG tool

---

### Cline (VS Code Extension)

**What it is:** AI coding assistant extension for VS Code

**Configuration file location:**
- `~/.config/cline/mcp_config.json`

**Step-by-step setup:**

1. Build the MCP server (if not already done):
   ```bash
   cd packages/mcp-server
   npm run build
   ```

2. Note the full path to `dist/index.js`

3. Create the Cline config directory if it doesn't exist:
   ```bash
   mkdir -p ~/.config/cline
   ```

4. Create or edit `~/.config/cline/mcp_config.json`:
   ```json
   {
     "mcpServers": {
       "lunchtable-tcg": {
         "command": "node",
         "args": ["/full/path/to/@lunchtable/mcp-server/dist/index.js"],
         "env": {
           "LTCG_API_KEY": "your-api-key-here",
           "LTCG_API_URL": "https://lunchtable.cards"
         }
       }
     }
   }
   ```

5. Replace the path and API key as above

6. Restart VS Code

7. Open Cline and verify the LunchTable-TCG tools are available

---

### VS Code (MCP Extension)

**What it is:** VS Code integration using the MCP extension

**Setup:**

1. Install the MCP extension from VS Code marketplace (search "Model Context Protocol")

2. Build the MCP server:
   ```bash
   cd packages/mcp-server
   npm run build
   ```

3. Note the full path to `dist/index.js`

4. Open VS Code settings:
   - Press `Cmd/Ctrl + Shift + P`
   - Search for "Preferences: Open Settings (JSON)"
   - Click to open `settings.json`

5. Add the following to your settings.json:
   ```json
   "mcp.servers": {
     "lunchtable-tcg": {
       "command": "node",
       "args": ["/full/path/to/@lunchtable/mcp-server/dist/index.js"],
       "env": {
         "LTCG_API_KEY": "your-api-key-here",
         "LTCG_API_URL": "https://lunchtable.cards"
       }
     }
   }
   ```

6. Replace the path and API key

7. Save and reload VS Code

8. The MCP extension should now show the LunchTable-TCG server as available

---

## Getting Your API Key

1. Go to your LunchTable-TCG account dashboard
2. Navigate to Settings → API Keys
3. Click "Generate New Key"
4. Copy the key and add it to your configuration
5. **Important:** Keep this key secret and don't commit it to version control

---

## Using Environment Variables

Instead of hardcoding your API key in config files, you can use environment variables:

### macOS/Linux

Add to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.):
```bash
export LTCG_API_KEY="your-api-key-here"
export LTCG_API_URL="https://lunchtable.cards"
```

Then in your config:
```json
{
  "env": {
    "LTCG_API_KEY": "${LTCG_API_KEY}",
    "LTCG_API_URL": "${LTCG_API_URL}"
  }
}
```

### Windows

Set environment variables:
```cmd
setx LTCG_API_KEY "your-api-key-here"
setx LTCG_API_URL "https://lunchtable.cards"
```

Then restart your client for changes to take effect.

---

## Troubleshooting

### "Server failed to start"

**Cause:** The MCP server hasn't been built or the path is wrong

**Fix:**
```bash
cd packages/mcp-server
npm run build
# Verify dist/index.js exists
ls -la dist/index.js
```

Then update your config with the correct full path.

### "Unknown tool" error

**Cause:** The server is running but tools haven't been registered yet

**Fix:**
- Check the server is built: `npm run build`
- Check that your config file is using the correct path
- Restart your client application

### "LTCG_API_KEY environment variable is required"

**Cause:** The API key isn't set in the configuration

**Fix:**
- Add `"LTCG_API_KEY": "your-key-here"` to the `"env"` section
- Or set it as an environment variable before starting the client

### Server works locally but not in client

**Cause:** Path might be relative or incorrect

**Fix:**
- Use absolute paths in your configuration
- Verify path with: `cd /path/to && pwd` then `ls -la dist/index.js`
- Copy the full path output and use it in your config

### "Cannot find module" error

**Cause:** Dependencies might not be installed

**Fix:**
```bash
cd packages/mcp-server
npm install
npm run build
```

---

## Verifying Setup

### Test locally first

Run the server manually to check for errors:
```bash
LTCG_API_KEY="test-key" node /path/to/dist/index.js
```

You should see: `LunchTable-TCG MCP server running on stdio`

Press `Ctrl + C` to stop.

### Test in your client

1. Open the client (Claude Desktop, VS Code, etc.)
2. Try to use a LunchTable-TCG tool or ask the AI to list available tools
3. The LunchTable-TCG tools should appear in the available tools list

---

## Configuration Examples

### Development Setup (Multiple Instances)

Run different API URLs for dev/prod:

```json
{
  "mcpServers": {
    "lunchtable-tcg-prod": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "LTCG_API_KEY": "prod-key",
        "LTCG_API_URL": "https://lunchtable.cards"
      }
    },
    "lunchtable-tcg-dev": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "LTCG_API_KEY": "dev-key",
        "LTCG_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

### Using with npm/bun

If you've installed globally:

```json
{
  "command": "npx",
  "args": ["@lunchtable/mcp-server"]
}
```

Or with bun:

```json
{
  "command": "bun",
  "args": ["run", "npm:@lunchtable/mcp-server"]
}
```

---

## Next Steps

After setup:

1. Test a basic operation in your client
2. Read the LunchTable-TCG project documentation for available tools
3. Start using LunchTable-TCG tools in your AI workflows

For more information, see:
- [README.md](./README.md) - Overview and reference
- [../README.md](../README.md) - MCP server documentation
