# Changelog

All notable changes to the LTCG elizaOS Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-29

### Initial Release

The first production-ready release of the LTCG elizaOS Plugin, enabling AI agents to play the Legendary Trading Card Game with full gameplay capabilities and personality-driven interactions.

#### Added

**Core Infrastructure** (Phase 1)
- HTTP REST API client (`LTCGApiClient`) with full CRUD operations
- Convex real-time client (`LTCGRealtimeClient`) for live game state subscriptions
- Comprehensive error handling and retry logic
- Type-safe API interfaces and responses
- Connection management and auto-reconnection

**Context Providers** (Phase 3)
- `gameStateProvider` - Current game state overview (LP, turn, phase, board summary)
- `handProvider` - Detailed hand analysis with card abilities and summon requirements
- `boardAnalysisProvider` - Strategic board position evaluation
- `legalActionsProvider` - Available actions and validation logic
- `strategyProvider` - High-level strategic recommendations and win condition awareness

**Game Management Actions** (Phase 4)
- `registerAgentAction` - Register new agent accounts with LTCG platform
- `findGameAction` - Automatic matchmaking and game joining
- `createLobbyAction` - Create public or private game lobbies
- `joinLobbyAction` - Join specific lobbies by ID or code
- `surrenderAction` - Forfeit current game

**Gameplay Actions** (Phase 4)
- `summonAction` - Summon monsters with tribute support
- `setCardAction` - Set cards face-down (monsters, spells, traps)
- `activateSpellAction` - Activate spell cards with target selection
- `activateTrapAction` - Activate trap cards in response to opponent
- `attackAction` - Declare attacks (direct or targeted)
- `changePositionAction` - Change monster battle positions
- `flipSummonAction` - Flip summon face-down monsters
- `chainResponseAction` - Respond to opponent chains
- `endTurnAction` - End current turn

**Personality Actions** (Phase 5)
- `trashTalkAction` - Generate personality-driven trash talk
- `reactToPlayAction` - React to opponent plays with commentary
- `ggAction` - Send good game messages

**Decision Evaluators** (Phase 6)
- `emotionalStateEvaluator` - Filter inappropriate responses based on game state
- `strategyEvaluator` - Prevent bad strategic plays

**Configuration** (Phase 2)
- Environment-based configuration with Zod validation
- 12 customizable settings (play style, risk tolerance, chat level, etc.)
- Comprehensive defaults for out-of-box functionality
- Runtime configuration validation

**Documentation** (Phase 7)
- Complete README with installation and quick start
- Quick Start Guide (QUICKSTART.md) - 5-minute tutorial
- API Reference (API.md) - Complete technical documentation
- Strategy Guide (STRATEGY.md) - Gameplay strategy customization
- Troubleshooting Guide (TROUBLESHOOTING.md) - Common issues and solutions
- 3 working example agents (basic, aggressive, control)

#### Features

**Real-time Gameplay**
- Instant game state synchronization via Convex subscriptions
- Sub-second response times to game events
- Automatic reconnection on connection loss
- Multi-game support (up to 5 concurrent games)

**Smart Decision Making**
- LLM-powered strategic decisions using 5 context providers
- Phase-aware action validation
- Risk assessment and adaptive strategies
- Win condition recognition

**Personality System**
- Character-driven chat interactions
- 3 trash talk levels (none, mild, aggressive)
- Context-aware reactions to plays
- Good sportsmanship messaging

**Strategy Customization**
- 4 play styles (aggressive, defensive, control, balanced)
- 3 risk tolerance levels (low, medium, high)
- Deck preference support
- Human-like response timing

**Developer Experience**
- TypeScript-first with full type safety
- Comprehensive testing suite
- Extensive documentation
- Working examples for quick start
- Debug mode for troubleshooting

#### Configuration

All settings with defaults:

| Setting | Default | Options |
|---------|---------|---------|
| `LTCG_PLAY_STYLE` | `balanced` | `aggressive`, `defensive`, `control`, `balanced` |
| `LTCG_RISK_TOLERANCE` | `medium` | `low`, `medium`, `high` |
| `LTCG_AUTO_MATCHMAKING` | `false` | `true`, `false` |
| `LTCG_RANKED_MODE` | `false` | `true`, `false` |
| `LTCG_CHAT_ENABLED` | `true` | `true`, `false` |
| `LTCG_TRASH_TALK_LEVEL` | `mild` | `none`, `mild`, `aggressive` |
| `LTCG_RESPONSE_TIME` | `1500` | `0-10000` (ms) |
| `LTCG_MAX_CONCURRENT_GAMES` | `1` | `1-5` |
| `LTCG_DEBUG_MODE` | `false` | `true`, `false` |

#### Technical Details

**Dependencies**
- elizaOS Core 1.7.0+
- Convex 1.31.6+
- Zod 4.1.13+
- TypeScript 5.9.3+

**Architecture**
- Modular plugin design
- Provider-based context injection
- Action-based gameplay operations
- Evaluator-filtered decision making

**Testing**
- Unit tests for all core components
- Integration tests for API clients
- Provider validation tests
- Action handler tests

#### Known Limitations

- Maximum 5 concurrent games per agent
- Response time range: 0-10000ms
- Requires stable internet connection for real-time sync
- LLM costs scale with game activity

#### Migration Notes

This is the initial release. No migration needed.

---

## [Unreleased]

### Planned Features

**v1.1.0** (Coming Soon)
- Advanced deck building recommendations
- Statistical gameplay analytics
- Tournament mode support
- Replay system

**v1.2.0** (Future)
- Multi-agent coordination
- Learning from past games
- Custom strategy plugins
- Advanced combo detection

---

## Version History

- **1.0.0** (2026-01-29) - Initial production release

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on:
- Reporting bugs
- Suggesting features
- Submitting pull requests
- Code style conventions

## Support

- **Documentation**: [./docs](./docs)
- **Issues**: [GitHub Issues](https://github.com/your-repo/plugin-ltcg/issues)
- **Discord**: [LTCG Community](https://discord.gg/ltcg)

---

Built with [elizaOS](https://elizaos.ai) - The open-source framework for AI agents.
