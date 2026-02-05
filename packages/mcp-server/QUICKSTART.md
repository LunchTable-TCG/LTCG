# LunchTable-TCG MCP Server - Quick Start Guide

Get up and running with the LunchTable-TCG MCP server in 5 minutes.

## Prerequisites

- Node.js 20+ or Bun installed
- LunchTable-TCG API key (obtain from https://lunchtable.cards)
- Claude Desktop or another MCP-compatible client

## Step 1: Build the Server

```bash
cd packages/mcp-server
bun install
bun run build
```

## Step 2: Get Your API Key

1. Visit https://lunchtable.cards
2. Sign in to your account
3. Navigate to Settings → API Keys
4. Create a new API key
5. Copy the key (format: `ltcg_xxxxx...`)

## Step 3: Configure Claude Desktop

Edit your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**Linux:** `~/.config/Claude/claude_desktop_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "lunchtable-tcg": {
      "command": "node",
      "args": ["/FULL/PATH/TO/LTCG/packages/mcp-server/dist/index.js"],
      "env": {
        "LTCG_API_KEY": "ltcg_your_actual_key_here"
      }
    }
  }
}
```

**Important:** Replace `/FULL/PATH/TO/LTCG` with the actual absolute path to your LTCG repository.

## Step 4: Restart Claude Desktop

Completely quit and restart Claude Desktop for the changes to take effect.

## Step 5: Test the Connection

In Claude Desktop, try this prompt:

```
Use the ltcg_create_game tool to create a casual, public game lobby.
```

If successful, you should see a response with a lobby ID!

## Example First Game

Here's a complete workflow to test:

### 1. Create a lobby
```
Create a casual public game lobby using ltcg_create_game
```

### 2. In another account/tab, join the lobby
```
Join lobby {lobbyId} using ltcg_join_game
```

### 3. Check your legal moves
```
Get legal moves for game {gameId} using ltcg_get_legal_moves
```

### 4. Play your turn
```
Use ltcg_summon_monster to summon a monster,
then ltcg_declare_attack to attack,
then ltcg_end_turn to end your turn
```

## Troubleshooting

### "Unknown tool: ltcg_create_game"
- Check that Claude Desktop was fully restarted
- Verify the path to `dist/index.js` is correct and absolute
- Check Claude Desktop logs for errors

### "Missing or malformed Authorization header"
- Verify `LTCG_API_KEY` is set in the config
- Make sure the key starts with `ltcg_`
- Check that the key is still valid (not revoked)

### "Command not found" or path errors
- Use absolute paths, not relative paths
- On Windows, use forward slashes or escaped backslashes
- Verify the file exists: `ls /path/to/dist/index.js`

### Check Claude Desktop Logs

**macOS:** `~/Library/Logs/Claude/mcp*.log`
**Windows:** `%APPDATA%\Claude\logs\mcp*.log`
**Linux:** `~/.local/share/Claude/logs/mcp*.log`

## What's Next?

- Read [EXAMPLE_USAGE.md](./EXAMPLE_USAGE.md) for detailed workflows
- Check [README.md](./README.md) for complete tool documentation
- Review [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for technical details

## Quick Reference

### Available Tools

1. `ltcg_create_game` - Create a new game lobby
2. `ltcg_join_game` - Join an existing lobby
3. `ltcg_get_state` - Get current game state
4. `ltcg_get_legal_moves` - Get available moves
5. `ltcg_summon_monster` - Summon a monster
6. `ltcg_declare_attack` - Attack with a monster
7. `ltcg_end_turn` - End your turn

### Environment Variables

- `LTCG_API_KEY` - Your API key (required)
- `LTCG_API_URL` - API base URL (optional, defaults to https://lunchtable.cards)

## Support

- Issues: Report on GitHub
- Documentation: See README.md
- Examples: See EXAMPLE_USAGE.md

Happy gaming! 🎮
