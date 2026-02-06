# Dizzy - LTCG Streaming Agent Setup

## Overview

**Dizzy** is an ElizaOS-powered AI agent that plays LunchTable TCG while streaming live on Retake.tv. Dizzy engages with viewers, explains strategic decisions, and builds a community around LTCG gameplay.

### What Makes Dizzy Special

- ✅ **Auto-streams to Retake.tv** when playing LTCG games
- ✅ **Engages with chat** during gameplay - responds to viewer questions
- ✅ **Strategic commentary** - explains decisions in real-time
- ✅ **$DIZZY token** - Creates Clanker token on first stream
- ✅ **Community-focused** - builds relationships with viewers

---

## Quick Start

### 1. Prerequisites

```bash
# You need:
- Bun (package manager)
- ElizaOS CLI installed
- Retake.tv account (already registered)
- LTCG agent account
```

### 2. Environment Setup

Create `.env` file in the plugin root:

```bash
# LLM Provider (required - choose one)
OPENROUTER_API_KEY=your_openrouter_key
# OR
ANTHROPIC_API_KEY=your_anthropic_key
# OR
OPENAI_API_KEY=your_openai_key

# LTCG Backend
LTCG_API_URL=https://lunchtable.cards
LTCG_AGENT_ID=your_ltcg_agent_id  # From agent registration

# Retake.tv Credentials (Dizzy's account)
DIZZY_RETAKE_ACCESS_TOKEN=rtk_122aa27fbd1f65cdd59ac0c79e2ac541ce0da678777efe7d
DIZZY_RETAKE_USER_DB_ID=6986353ded5e692769e58e6d

# Optional: Streaming integration
NEXT_PUBLIC_APP_URL=https://lunchtable.cards  # For LiveKit egress notifications
```

### 3. Start Dizzy

```bash
# From plugin directory
cd packages/plugin-ltcg

# Install dependencies
bun install

# Start Dizzy in development mode
elizaos start --character src/characters/dizzy.ts --dev

# Or start with specific model
MODEL=gpt-4o-mini elizaos start --character src/characters/dizzy.ts
```

---

## How It Works

### Streaming Flow

```
1. Dizzy joins/creates LTCG game
   ↓
2. Auto-calls START_RETAKE_STREAM action
   ↓
3. Retake.tv API: /stream/start
   ↓
4. LTCG backend: /api/streaming/start
   ↓
5. LiveKit egress captures overlay + sends to Retake RTMP
   ↓
6. Stream goes LIVE on Retake.tv
   ↓
7. Dizzy plays game + engages with chat
   ↓
8. Game ends → STOP_RETAKE_STREAM
   ↓
9. Stream ends, VOD saved
```

### Chat Interaction

While streaming, Dizzy can:
- **Answer strategy questions**: "Why did you set that card?"
- **Explain decisions**: "I'm baiting their trap before attacking"
- **Acknowledge viewers**: "Thanks for the tip, chat!"
- **Build community**: "You've all been here since day one!"

---

## Dizzy's Character Traits

### Personality
- **Competitive** but humble - acknowledges mistakes
- **Analytical** - explains strategic thinking clearly
- **Engaging** - interacts with viewers actively
- **Enthusiastic** - genuinely excited about LTCG

### Communication Style
- Narrates decisions: *"I'm summoning this because..."*
- Admits mistakes: *"That was a misplay..."*
- Asks for input: *"Chat, should I attack or defend?"*
- Celebrates wins/analyzes losses professionally

### Strategic Approach
- Analyzes board state before each action
- Considers opponent's possible plays
- Balances aggression with defense
- Thinks about card advantage and tempo
- Explains risk/reward calculations

---

## Testing Dizzy

### Local Testing (No Streaming)

```bash
# Test Dizzy's personality without streaming
elizaos dev --character src/characters/dizzy.ts

# Interact via CLI
> find me a game
> summon my strongest monster
> what's my strategy this turn?
```

### Test Streaming Integration

```bash
# Start Dizzy with streaming enabled
elizaos start --character src/characters/dizzy.ts

# Trigger streaming
> start streaming to retake
# Dizzy: "🎬 Stream is LIVE on Retake.tv!"

# Play a game
> find me a game
# Dizzy will stream the game automatically

# Stop streaming
> stop the stream
# Dizzy: "📴 Stream ended! Thanks for watching!"
```

### Monitor Stream on Retake.tv

1. Visit https://retake.tv/
2. Look for "Dizzy" in live streams
3. Watch the overlay with game board + agent decisions
4. Check chat for Dizzy's responses

---

## Available Actions

### Streaming Actions

| Action | Trigger | Description |
|--------|---------|-------------|
| `START_RETAKE_STREAM` | "start streaming", "go live" | Initiates Retake.tv stream |
| `STOP_RETAKE_STREAM` | "stop stream", "end broadcast" | Stops active stream |
| `RETAKE_CHAT_RESPONSE` | Auto during stream | Sends messages to Retake chat |

### Gameplay Actions

Dizzy has full LTCG capabilities:
- Game management (find/create/join games)
- All gameplay actions (summon, attack, spells, traps)
- Personality actions (trash talk, react to plays, GG)
- Economy actions (purchase gems/packs)

See main plugin README for complete action list.

---

## Configuration

### Customize Dizzy's Behavior

Edit `src/characters/dizzy.ts`:

```typescript
// Change streaming platform
settings: {
  secrets: {
    // Use different streaming service
    RETAKE_ACCESS_TOKEN: process.env.YOUR_RETAKE_TOKEN,
  }
}

// Adjust personality
system: `You are Dizzy, but more aggressive/defensive/analytical...`

// Modify communication style
style: {
  chat: [
    "Use more/less emojis",
    "Be more/less formal",
    // ...
  ]
}
```

### Change LLM Model

```bash
# Use faster model (cheaper)
MODEL=gpt-4o-mini elizaos start --character src/characters/dizzy.ts

# Use more capable model
MODEL=gpt-4 elizaos start --character src/characters/dizzy.ts

# Use Claude (if ANTHROPIC_API_KEY set)
MODEL=claude-3-sonnet-20240229 elizaos start --character src/characters/dizzy.ts
```

---

## Retake.tv Features

### $DIZZY Token

- **Created automatically** on Dizzy's first stream
- **Clanker token** on Base blockchain
- **LP fees** collect to wallet: `0x215bfEeBdbB48a3ca1b0362294fD4fa89F25Aa59`
- **Ticker**: `DIZZY`

### Stream Features

- **Real-time chat** with viewers
- **Game overlay** showing board state
- **Decision panel** with Dizzy's reasoning
- **Event feed** with game actions
- **VOD recording** for highlights

### Viewer Engagement

Viewers can:
- Ask strategy questions
- Give gameplay tips
- Chat during matches
- Support via $DIZZY token
- Build community

---

## Troubleshooting

### Stream Won't Start

**Issue**: "Failed to start stream"

**Solutions**:
1. Check `DIZZY_RETAKE_ACCESS_TOKEN` is set correctly
2. Verify `DIZZY_RETAKE_USER_DB_ID` matches registration
3. Test Retake API manually:
   ```bash
   curl -H "Authorization: Bearer $DIZZY_RETAKE_ACCESS_TOKEN" \
     https://chat.retake.tv/api/agent/stream/status
   ```

### Dizzy Not Responding to Chat

**Issue**: Chat messages not appearing on Retake.tv

**Solutions**:
1. Verify `RETAKE_USER_DB_ID` is correct
2. Check stream is actually live (not just initiated)
3. Look for errors in elizaos logs:
   ```bash
   LOG_LEVEL=debug elizaos start --character src/characters/dizzy.ts
   ```

### Game Actions Not Working

**Issue**: Dizzy can't join games or make moves

**Solutions**:
1. Verify `LTCG_AGENT_ID` is set
2. Check LTCG backend is accessible:
   ```bash
   curl https://lunchtable.cards/api/health
   ```
3. Ensure agent is registered on LTCG:
   ```bash
   # Via Dizzy CLI
   > register me as an agent
   ```

### Performance Issues

**Issue**: Slow responses or high costs

**Solutions**:
1. Switch to faster model:
   ```bash
   MODEL=gpt-4o-mini elizaos start --character src/characters/dizzy.ts
   ```
2. Reduce context window in character config
3. Disable unnecessary plugins
4. Use Groq for ultra-fast inference:
   ```bash
   GROQ_API_KEY=your_key MODEL=llama-3-70b elizaos start --character src/characters/dizzy.ts
   ```

---

## Production Deployment

### Deploy to Server

```bash
# 1. Clone repo on server
git clone your-repo-url
cd packages/plugin-ltcg

# 2. Set environment variables
cp .env.example .env
# Edit .env with production credentials

# 3. Install dependencies
bun install

# 4. Start with PM2 (process manager)
pm2 start "elizaos start --character src/characters/dizzy.ts" --name dizzy

# 5. Monitor logs
pm2 logs dizzy

# 6. Set up auto-restart
pm2 save
pm2 startup
```

### Monitor Production

```bash
# Check Dizzy status
pm2 status dizzy

# View logs
pm2 logs dizzy --lines 100

# Restart if needed
pm2 restart dizzy

# Check memory/CPU usage
pm2 monit
```

---

## Roadmap

### Planned Features

- [ ] **Multi-game streaming** - Stream multiple games in one session
- [ ] **Viewer polls** - Let chat vote on gameplay decisions
- [ ] **Highlights automation** - Auto-clip best plays
- [ ] **Tournament mode** - Special streaming for tournaments
- [ ] **Co-stream support** - Multiple agents streaming together
- [ ] **Advanced analytics** - Track win rates, popular strategies
- [ ] **Custom overlays** - Themed overlays for special events

### Community Suggestions

Have ideas for Dizzy? Open an issue or PR!

---

## Resources

- **Retake.tv Docs**: https://retake.tv/skill.md
- **ElizaOS Docs**: https://docs.elizaos.ai/
- **LTCG Rules**: https://lunchtable.cards/rules
- **Dizzy's Wallet**: `0x215bfEeBdbB48a3ca1b0362294fD4fa89F25Aa59`
- **$DIZZY Token**: (Created on first stream)

---

## Support

**Need help with Dizzy?**
- Discord: Join LTCG community
- GitHub Issues: Report bugs
- Email: support@lunchtable.cards

**Watch Dizzy Live**:
- Retake.tv: https://retake.tv/
- Search for "Dizzy" in live streams

---

**Built with ❤️ using ElizaOS**
