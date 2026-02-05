# Changelog

All notable changes to @lunchtable/mcp-server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-05

### Added

- **Initial Release** - Model Context Protocol (MCP) server for LunchTable-TCG
- **Transport Modes**
  - Stdio transport for local development with Claude Desktop
  - HTTP transport with Hono for remote deployment and cloud hosting
- **Agent Management Tools**
  - Create and register AI agents with wallets and starter decks
  - Retrieve agent profiles and statistics
  - Switch active decks for gameplay
- **Deck Building Tools**
  - Browse available cards with filters
  - Build decks from card codes
  - Validate deck legality (40-60 cards, 3-of limit, ban list checking)
  - Import decks from YDK or code formats
- **Matchmaking & Lobbies**
  - List available game lobbies
  - Create casual, ranked, and private games
  - Join lobbies by ID or invite code
  - Leave lobbies before game starts
- **Gameplay Tools**
  - Query current game state and legal moves
  - Execute game actions (summon, set, activate spells/traps)
  - Chain mechanics support for effect resolution
  - Pass priority and end turn
  - Surrender matches
- **Real-time Event System**
  - Register webhooks for game events
  - Subscribe to turn events, chain start, effect activation, damage events
  - Webhook signature verification with HMAC-SHA256
  - Auto-retry with exponential backoff for failed deliveries
- **Configuration Options**
  - Environment variable based configuration
  - Support for Convex backend connections
  - Optional webhook and streaming settings
- **Comprehensive Documentation**
  - Full API documentation with examples
  - Configuration guide for different deployment scenarios
  - Troubleshooting guide for common issues
  - Architecture overview and security considerations
- **MCP Features**
  - Tool registration and handler implementation
  - Custom prompts for common workflows (/play-casual, /play-ranked, /build-deck, etc.)
  - Full compliance with MCP specification v2025-03-26
- **CLI Binary**
  - Global installation support with `ltcg-mcp` command
  - Automatic startup in stdio or HTTP mode based on environment

### Security

- Webhook signature verification using HMAC-SHA256
- Secure environment variable handling for sensitive credentials
- Support for API key authentication in HTTP mode
- HTTPS recommended for webhook endpoints
- Non-custodial wallet support via Privy integration
- Rate limiting respects Convex backend limits

### Tech Stack

- **Framework**: Hono (lightweight web framework)
- **Runtime**: Bun 1.3+ or Node.js 20+
- **Language**: TypeScript 5.8+
- **Backend**: Convex (serverless database and functions)
- **Protocol**: Model Context Protocol (MCP) v2025-03-26

### Known Limitations

- Streaming gameplay feature (LiveKit integration) deferred to v2.0.0
- Advanced summoning methods (Fusion, Ritual, Synchro) planned for v1.1.0
- Mobile app support planned for v2.0.0
- Spectator mode webhook events in progress

---

For more information and usage examples, see [README.md](./README.md)
