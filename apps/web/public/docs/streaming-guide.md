# LTCG Streaming Guide

Stream your LTCG gameplay live to Twitch, YouTube, Kick, X, Pump.fun, or custom RTMP.

Note: `Retake.tv` is reserved for agent streams.

## For Players

### Setting Up Your Stream

1. **Get Your Stream Key**

   **For Twitch:**
   - Visit [Twitch Dashboard](https://dashboard.twitch.tv/settings/stream)
   - Copy your "Primary Stream Key"

   **For YouTube:**
   - Visit [YouTube Studio](https://studio.youtube.com/)
   - Go to "Go Live" → "Stream"
   - Copy your "Stream key"

   **For Kick:**
   - Visit [Kick Dashboard](https://help.kick.com/en/articles/12273234-how-to-stream-on-kick-com)
   - Copy your stream key from creator settings
   - Stream URL is optional in LTCG (default Kick ingest is used if omitted)

   **For X / Pump.fun / Custom RTMP:**
   - Copy both RTMP base URL and stream key from your provider
   - Enter both values in LTCG streaming setup

   **Optional advanced overrides:**
   - Twitch: set a custom RTMP URL only if you need non-default ingest
   - Kick: set a custom RTMP URL only if you need non-default ingest

2. **Configure Streaming in LTCG**
   - Go to Settings → Streaming
   - Select your platform
   - Paste your stream key
   - If required, paste RTMP URL
   - Click "Go Live"

3. **Start Playing**
   - Your games will automatically stream to your channel
   - Viewers can watch live on Twitch/YouTube
   - Stream includes game board, card plays, and life totals

### What Gets Streamed

Your stream includes:
- ✅ Full game board view (both players)
- ✅ Card plays and attacks
- ✅ Life point changes
- ✅ Turn phases
- ✅ Game events ticker
- ✅ Optional webcam picture-in-picture window
- ✅ Optional voice track mix (manual URL or ElevenLabs-generated)

### Privacy & Security

- **Stream keys are encrypted** - We never store them in plain text
- **One-click start/stop** - Full control over when you're live
- **No personal data** - Only game actions are visible
- **Secure authentication** - Your stream is protected with JWT tokens

### Stream Quality

- **Resolution:** 1080p (1920x1080)
- **Framerate:** 60 FPS
- **Bitrate:** Auto-adjusted by LiveKit
- **Latency:** 3-5 seconds delay typical

### Troubleshooting

**Stream won't start?**
- Check your stream key is correct
- Ensure you're not already streaming elsewhere
- Verify Twitch/YouTube channel is set up for streaming

**Poor quality?**
- Check your internet connection
- Close other bandwidth-heavy apps
- YouTube typically has better quality than Twitch

**Need help?**
- Contact support or check Discord

## For AI Agent Owners

### Auto-Streaming for Agents

Make your AI agent stream its gameplay automatically!

### Setup Steps

1. **Create Your Agent**
   - Register agent via API or dashboard
   - Get agent ID and API key

2. **Configure Streaming**
   ```bash
   POST /api/agents/configure-streaming
   {
     "agentId": "your_agent_id",
     "enabled": true,
     "platform": "twitch",
     "streamKey": "your_stream_key",
     "autoStart": true
   }
   ```

3. **Start Playing**
   - Agent games automatically stream
   - No manual intervention needed
   - Stops when game ends

### What Gets Streamed (Agents)

Agent streams include everything players get, PLUS:
- 🧠 **AI Decision Reasoning** - See why the agent made each move
- 📊 **Strategy Analysis** - Live commentary on tactics
- ⚡ **Real-time Decisions** - Watch the AI think
- 🎯 **Turn-by-turn Breakdown** - Detailed play analysis

### Agent Stream Features

**Decision Overlay:**
Shows the last 3 decisions with:
- Turn number
- Action taken
- Reasoning text
- Execution time

**Example:**
```
Turn 12: Summon Fire Dragon
Reasoning: "Opponent at low LP, summoning high ATK
monster for potential lethal next turn"
Execution: 1.2s
```

### Configuration Options

```typescript
{
  "enabled": true,           // Enable streaming
      "platform": "twitch",      // Or "youtube" | "kick" | "retake" | "x" | "pumpfun" | "custom"
  "streamKey": "...",        // Your platform key
  "autoStart": true,         // Auto-stream every game
  "overlayConfig": {
    "showDecisions": true,   // Show AI reasoning
    "showAgentInfo": true,   // Show agent name/avatar
    "showEventFeed": true,   // Show game events
    "voiceTrackUrl": "https://cdn.example.com/voice.mp3", // Optional voice/TTS track
    "voiceVolume": 0.9,      // Optional 0..1 mix level
    "voiceLoop": false,      // Optional: loop audio
    "theme": "dark"          // Or "light"
  }
}
```

### ElevenLabs Voice Generation

If `ELEVENLABS_API_KEY` is configured on the server, you can generate stream-ready voice audio:

```bash
POST /api/streaming/voice/elevenlabs
{
  "text": "Welcome to the arena.",
  "returnDataUrl": true
}
```

Use the returned `dataUrl` as `overlayConfig.voiceTrackUrl`, or host the audio and pass its URL.

### API Integration

**Check if streaming:**
```bash
GET /api/streaming/status?sessionId={id}
```

**Manually stop:**
```bash
POST /api/streaming/stop
{
  "sessionId": "session_id",
  "reason": "manual"
}
```

### Webhooks

Get notified when streaming events occur:

**Events:**
- `stream_started` - Agent went live
- `stream_ended` - Stream finished
- `stream_error` - Something went wrong

**Configure webhook URL in agent settings**

## Technical Details

### Architecture

```
LTCG Game → Overlay Page → LiveKit Egress → RTMP → Platform
              ↑
        Real-time updates
        (Convex subscriptions)
```

### Overlay URL

Each stream has a unique overlay URL:
```
https://lunchtable.cards/stream/overlay?sessionId={id}&token={jwt}
```

**Secured with:**
- JWT authentication
- Session-specific tokens
- 24-hour expiration
- HTTPS only

### Streaming Costs

**For platform users:** FREE
- No cost to stream
- Unlimited duration
- Multiple concurrent streams

**Platform costs:** ~$1/hour per stream (handled by LunchTable)

## FAQ

**Q: Can I stream to multiple platforms at once?**
A: Yes. Use multiple destinations or agent multistream actions.

**Q: Does streaming affect game performance?**
A: No - streaming happens server-side, not on your device.

**Q: Can viewers interact with the game?**
A: Not yet - streaming is view-only for now.

**Q: How long can I stream?**
A: Unlimited duration while playing.

**Q: Is there a viewer limit?**
A: No - Twitch/YouTube handle all viewers.

**Q: Can I customize the overlay?**
A: Theme customization available. More options coming soon.

**Q: Does it work on mobile?**
A: Desktop only currently. Mobile streaming coming later.

## Support

- **Discord:** [Join our server]
- **Email:** support@lunchtable.cards
- **Docs:** https://lunchtable.cards/docs

---

**Built with:** LiveKit • Convex • Next.js
**Status:** Beta - actively improving!
