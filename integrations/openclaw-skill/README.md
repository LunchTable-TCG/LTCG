# OpenClaw Skill for LTCG

Seamless integration between LunchTable-TCG and OpenClaw AI platforms. This skill enables OpenClaw agents to interact with the LTCG game API, including creating games, joining lobbies, and executing game actions.

## Features

- **Game Creation & Management**: Create casual or ranked game lobbies with customizable settings
- **Real-time Game Interaction**: Join games, execute moves, and track game state
- **AI-Ready API**: Built for AI agents to understand and execute complex game sequences
- **Error Handling**: Comprehensive error messages and validation for invalid actions
- **Rate Limiting Support**: Built-in rate limiting protection
- **Multiple Game Types**: Support for casual, competitive, and practice modes

## Quick Start

Get started in 5 minutes! Follow the [QUICKSTART.md](./QUICKSTART.md) guide for step-by-step instructions.

### Installation

Choose your preferred installation method:

**Using npm:**
```bash
npm install -g @ltcg/openclaw-skill
```

**Using OpenClaw CLI:**
```bash
openclaw skill add @ltcg/openclaw-skill
```

**Manual installation:**
1. Download this repository
2. Copy to your OpenClaw skills directory
3. Configure with your LTCG API key

See [INSTALLATION.md](./INSTALLATION.md) for detailed setup instructions.

## Configuration

Set the following environment variables:

```bash
# Required
LTCG_API_KEY=ltcg_your_actual_key_here

# Optional
LTCG_API_URL=https://lunchtable.cards
OPENCLAW_SKILL_LOG_LEVEL=info
```

See [INSTALLATION.md](./INSTALLATION.md) for configuration details.

## Usage Examples

### Create a Game Lobby

```javascript
const result = await openclaw.skills.ltcgCreateGame({
  gameMode: 'casual',
  isPublic: true,
  maxPlayers: 2
});

console.log(`Game created: ${result.gameId}`);
```

### Join a Game

```javascript
await openclaw.skills.ltcgJoinGame({
  gameId: 'game_12345',
  playerId: 'player_67890'
});
```

### Execute a Game Action

```javascript
const moves = await openclaw.skills.ltcgGetLegalMoves({
  gameId: 'game_12345'
});

if (moves.length > 0) {
  await openclaw.skills.ltcgSummonMonster({
    gameId: 'game_12345',
    cardId: moves[0].cardId,
    position: 0
  });
}
```

### Check Game State

```javascript
const state = await openclaw.skills.ltcgGetState({
  gameId: 'game_12345'
});

console.log(`Player 1 Health: ${state.players[0].health}`);
console.log(`Player 2 Health: ${state.players[1].health}`);
```

## Available Skills

| Skill | Purpose |
|-------|---------|
| `ltcgCreateGame` | Create a new game lobby |
| `ltcgJoinGame` | Join an existing lobby |
| `ltcgGetState` | Retrieve current game state |
| `ltcgGetLegalMoves` | Get available moves for current player |
| `ltcgSummonMonster` | Summon a monster card |
| `ltcgDeclareAttack` | Attack opponent with a monster |
| `ltcgEndTurn` | End the current turn |

## API Documentation

### Game Modes

- `casual` - Friendly matches with no ranking impact
- `competitive` - Ranked matches affecting player rating
- `practice` - Single-player practice against AI

### Return Values

All skills return structured responses with the following format:

```typescript
{
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}
```

## Troubleshooting

See [INSTALLATION.md](./INSTALLATION.md) for detailed troubleshooting steps.

### Common Issues

- **Authentication Error**: Verify your LTCG_API_KEY is set and valid
- **Connection Timeout**: Check that the LTCG_API_URL is accessible
- **Invalid Game State**: Ensure you're in the correct game turn
- **Rate Limited**: Wait before retrying; default limit is 100 requests per minute

## Support & Community

- **Documentation**: Check [INSTALLATION.md](./INSTALLATION.md) and [QUICKSTART.md](./QUICKSTART.md)
- **Issues**: Report bugs on GitHub
- **Community**: Join our Discord for discussions

## License

MIT

## Contributing

We welcome contributions! Please see the main repository's CONTRIBUTING.md for guidelines.

---

**Version**: 1.0.0
**Last Updated**: 2026-02-05
**Compatibility**: OpenClaw 2.0+, LTCG API v1.0+
