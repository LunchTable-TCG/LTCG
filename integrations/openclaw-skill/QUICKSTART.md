# OpenClaw Skill - Quick Start Guide

Get the LTCG OpenClaw Skill up and running in 5 minutes.

## Prerequisites

- OpenClaw 2.0+ installed
- LTCG API key (see Step 1)
- 5 minutes of your time

## Step 1: Get Your API Key (2 minutes)

1. Visit **https://lunchtable.cards**
2. Sign in to your account (or create one)
3. Go to **Settings** (gear icon in top-right)
4. Click **API Keys**
5. Click **Generate New Key**
6. **Copy the key immediately** - it won't be shown again
7. Key format should start with `ltcg_`

> **Security Tip**: Never share your API key or commit it to version control. Treat it like a password.

## Step 2: Install the Skill (1 minute)

Choose one method:

### Quick Install (npm)
```bash
npm install -g @ltcg/openclaw-skill
```

### Using OpenClaw CLI
```bash
openclaw skill add @ltcg/openclaw-skill
```

Done! You should see:
```
✓ Skill installed: @ltcg/openclaw-skill
```

## Step 3: Configure OpenClaw (1 minute)

### Option A: Using .env (Recommended)

Create a file named `.env` in your home directory or project folder:

```bash
LTCG_API_KEY=ltcg_your_key_here
```

Replace `ltcg_your_key_here` with your actual key from Step 1.

### Option B: Using OpenClaw Config

Edit your OpenClaw config file:
- **macOS:** `~/Library/Application Support/OpenClaw/openclaw-config.json`
- **Windows:** `%APPDATA%\OpenClaw\openclaw-config.json`
- **Linux:** `~/.config/OpenClaw/openclaw-config.json`

Add this (create the file if it doesn't exist):
```json
{
  "skills": {
    "ltcg": {
      "apiKey": "ltcg_your_key_here"
    }
  }
}
```

### Option C: Environment Variable
```bash
export LTCG_API_KEY=ltcg_your_key_here
```

## Step 4: Test Connection (30 seconds)

Verify everything works:

```bash
openclaw call ltcg:createGame --mode casual --public true
```

You should see output like:
```json
{
  "success": true,
  "data": {
    "gameId": "game_abc123...",
    "status": "waiting_for_players",
    "createdAt": "2026-02-05T12:00:00Z"
  }
}
```

**If you see an error**, jump to the [Troubleshooting](#troubleshooting) section.

## Step 5: Play Your First Game (Remaining time)

Now let's test with a real game flow!

### Create a Game Lobby

```bash
openclaw call ltcg:createGame --mode casual --public true
```

Copy the `gameId` from the response. Example: `game_abc123xyz`

### Join the Game

In a new terminal:
```bash
openclaw call ltcg:joinGame --gameId game_abc123xyz --playerId player_you_123
```

### Check Your Legal Moves

```bash
openclaw call ltcg:getLegalMoves --gameId game_abc123xyz
```

Response shows available actions:
```json
{
  "success": true,
  "data": [
    {
      "moveId": "m_001",
      "type": "summon",
      "cardId": "card_123",
      "cardName": "Fire Dragon",
      "description": "Summon Fire Dragon to position 0"
    },
    {
      "moveId": "m_002",
      "type": "summon",
      "cardId": "card_456",
      "cardName": "Water Elemental",
      "description": "Summon Water Elemental to position 0"
    }
  ]
}
```

### Summon a Monster

Use one of the cards from legal moves:

```bash
openclaw call ltcg:summonMonster \
  --gameId game_abc123xyz \
  --cardId card_123 \
  --position 0
```

Expected response:
```json
{
  "success": true,
  "data": {
    "cardName": "Fire Dragon",
    "position": 0,
    "health": 5,
    "attack": 3
  },
  "message": "Monster summoned successfully"
}
```

### End Your Turn

```bash
openclaw call ltcg:endTurn --gameId game_abc123xyz
```

Response:
```json
{
  "success": true,
  "data": {
    "currentTurn": 2,
    "currentPlayer": "opponent",
    "message": "Turn ended. Waiting for opponent."
  }
}
```

### Check Game State

At any time, see the full game state:

```bash
openclaw call ltcg:getState --gameId game_abc123xyz
```

Detailed output:
```json
{
  "success": true,
  "data": {
    "gameId": "game_abc123xyz",
    "status": "in_progress",
    "currentTurn": 2,
    "players": [
      {
        "playerId": "player_you_123",
        "username": "YourName",
        "health": 20,
        "maxHealth": 20,
        "mana": 5,
        "maxMana": 10,
        "hand": [
          {
            "cardId": "card_789",
            "name": "Lightning Bolt",
            "cost": 2,
            "type": "spell"
          }
        ],
        "board": [
          {
            "cardId": "card_123",
            "position": 0,
            "name": "Fire Dragon",
            "health": 5,
            "attack": 3
          }
        ]
      },
      {
        "playerId": "opponent_456",
        "username": "Opponent",
        "health": 18,
        "board": []
      }
    ]
  }
}
```

## Common Commands Reference

| Command | Purpose | Example |
|---------|---------|---------|
| `ltcg:createGame` | Create new lobby | `--mode casual --public true` |
| `ltcg:joinGame` | Join existing game | `--gameId game_abc --playerId player_123` |
| `ltcg:getState` | View game state | `--gameId game_abc` |
| `ltcg:getLegalMoves` | See available moves | `--gameId game_abc` |
| `ltcg:summonMonster` | Play a monster | `--gameId game_abc --cardId card_123 --position 0` |
| `ltcg:declareAttack` | Attack opponent | `--gameId game_abc --monsterId mon_123 --targetId target_456` |
| `ltcg:endTurn` | End your turn | `--gameId game_abc` |

## Next Steps

- Read [INSTALLATION.md](./INSTALLATION.md) for advanced configuration
- Check [README.md](./README.md) for complete API reference
- Explore examples in the `examples/` directory
- Join our community Discord

## Troubleshooting

### "Command not found: openclaw"
**Solution:** Install OpenClaw globally
```bash
npm install -g openclaw
```

### "LTCG_API_KEY not found"
**Solution:** Ensure your API key is configured
```bash
# Check if it's set
echo $LTCG_API_KEY

# If blank, set it
export LTCG_API_KEY=ltcg_your_key_here
```

### "Authentication failed"
**Solution:** Verify your key is correct
1. Go back to https://lunchtable.cards/settings/api-keys
2. Check that your key is active
3. Copy the key again (fresh)
4. Update your configuration

### "Connection timeout"
**Solution:** Check your network
```bash
# Test connectivity
ping lunchtable.cards

# If that fails, check firewall/proxy settings
```

### "Skill not found"
**Solution:** Restart OpenClaw
```bash
openclaw restart
```

### "Invalid game state"
**Solution:** Verify the game ID exists
```bash
openclaw call ltcg:getState --gameId game_abc123xyz
```

If it returns an error, the game ID is invalid. Create a new game.

## Getting Help

If you're stuck:

1. **Check logs:**
   ```bash
   openclaw logs skill ltcg
   ```

2. **Enable debug mode:**
   ```bash
   export OPENCLAW_SKILL_LOG_LEVEL=debug
   openclaw restart
   ```

3. **Report an issue:**
   - Include the error message
   - Include your logs
   - Include the command you ran
   - Your operating system and versions

## What's Next?

- **Learn Advanced Strategies**: Read documentation in docs/ folder
- **Automate Games**: Use the API to build bots
- **Join Community**: Connect with other players on Discord
- **Report Bugs**: Found an issue? Let us know on GitHub

---

**You're all set! Start playing!** 🎮

Questions? Check [INSTALLATION.md](./INSTALLATION.md) for detailed setup help.

**Quick Start Version**: 1.0.0
**Last Updated**: 2026-02-05
