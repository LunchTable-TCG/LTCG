# LTCG Streaming System

Complete implementation of LiveKit-based streaming for users and AI agents.

## Architecture

### Components

```
User/Agent → API Routes → LiveKit Egress → Overlay Page → RTMP → Twitch/YouTube
                ↓
         Convex (State)
```

**Files:**
- API: `apps/web/app/api/streaming/` (start, stop, status)
- Overlay: `apps/web/app/stream/overlay/page.tsx`
- Convex: `convex/streaming/` (sessions, livekit)
- Utils: `apps/web/src/lib/streaming/` (livekit, encryption, tokens)
- Components: `apps/web/src/components/streaming/`

### Database Tables

**streamingSessions:**
- Tracks all streaming sessions (active/ended)
- Links to user or agent
- Stores egress ID, overlay URL, platform info
- Captures viewer count, duration stats

**streamingPlatforms:**
- Stores encrypted platform credentials (Twitch/YouTube keys)
- Per-user or per-agent configuration
- Auto-start settings

## Configuration

### Environment Variables (Already Set)

```bash
# Domain
NEXT_PUBLIC_APP_URL=https://lunchtable.cards

# LiveKit Cloud
LIVEKIT_URL=wss://<your-livekit-project>.livekit.cloud
LIVEKIT_API_KEY=<your-livekit-api-key>
LIVEKIT_API_SECRET=<your-livekit-api-secret>

# Encryption (32-byte hex)
STREAM_KEY_ENCRYPTION_KEY=<64-char-hex-key>

# JWT for overlay authentication
STREAMING_JWT_SECRET=<base64-jwt-secret>
```

### LiveKit Dashboard Configuration

**Webhook URL to configure:**
```
https://lunchtable.cards/api/webhooks/livekit
```

Configure this in LiveKit dashboard at:
https://cloud.livekit.io/projects/lunchtable-rb51owhu/settings/webhooks

**Events to enable:**
- `egress_started`
- `egress_ended`
- `egress_updated`
- `egress_error`

## Usage

### Start a User Stream

```bash
curl -X POST https://lunchtable.cards/api/streaming/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_id_here",
    "streamType": "user",
    "platform": "twitch",
    "streamKey": "live_123456_your_twitch_key",
    "streamTitle": "LTCG Live Gameplay"
  }'
```

**Response:**
```json
{
  "success": true,
  "sessionId": "session_123",
  "status": "pending",
  "overlayUrl": "https://lunchtable.cards/stream/overlay?sessionId=...",
  "message": "Stream starting..."
}
```

### Start an Agent Stream

```bash
curl -X POST https://lunchtable.cards/api/streaming/start \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent_id_here",
    "streamType": "agent",
    "platform": "twitch",
    "streamKey": "live_123456_your_twitch_key",
    "streamTitle": "AI Agent Playing LTCG"
  }'
```

### Check Stream Status

```bash
curl https://lunchtable.cards/api/streaming/status?sessionId=session_123
```

**Response:**
```json
{
  "sessionId": "session_123",
  "status": "live",
  "streamType": "agent",
  "platform": "twitch",
  "entityName": "BlazeMaster",
  "viewerCount": 42,
  "duration": 1234567,
  "currentLobbyId": "lobby_456"
}
```

### Stop a Stream

```bash
curl -X POST https://lunchtable.cards/api/streaming/stop \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_123",
    "reason": "manual"
  }'
```

## Overlay Configuration

Each stream has configurable overlay settings:

```typescript
{
  showDecisions: boolean,      // Show AI decision reasoning (agents only)
  showAgentInfo: boolean,       // Show streamer/agent info bar
  showEventFeed: boolean,       // Show game events ticker
  showPlayerCam: boolean,       // Reserved for webcam (users)
  theme: "dark" | "light"       // Color theme
}
```

**Default for users:**
```json
{
  "showDecisions": false,
  "showAgentInfo": false,
  "showEventFeed": true,
  "showPlayerCam": true,
  "theme": "dark"
}
```

**Default for agents:**
```json
{
  "showDecisions": true,
  "showAgentInfo": true,
  "showEventFeed": true,
  "showPlayerCam": false,
  "theme": "dark"
}
```

## Platform Integration

### Twitch

**Get Stream Key:**
1. Go to https://dashboard.twitch.tv/settings/stream
2. Copy "Primary Stream Key"

**RTMP URL:** `rtmp://live.twitch.tv/app/{stream_key}`

### YouTube Live

**Get Stream Key:**
1. Go to https://studio.youtube.com/
2. Navigate to "Go Live" → "Stream"
3. Copy "Stream key"

**RTMP URL:** `rtmp://a.rtmp.youtube.com/live2/{stream_key}`

### Custom RTMP

For custom streaming servers:

```json
{
  "platform": "custom",
  "streamKey": "your_key",
  "customRtmpUrl": "rtmp://your-server.com/live"
}
```

## Security

### Stream Key Encryption

All stream keys are encrypted using AES-256-GCM before storage:
- Encryption key: 32-byte hex from `STREAM_KEY_ENCRYPTION_KEY`
- Format: `iv:authTag:encrypted` (all hex-encoded)
- Keys never stored in plain text

### Overlay Access Control

Overlay pages require JWT authentication:
- Token generated per session
- 24-hour expiration
- Includes: sessionId, streamType, entityId
- Secret: `STREAMING_JWT_SECRET`

### API Security

- Stream keys encrypted immediately on receipt
- HTTPS required in production
- Rate limiting on API endpoints (TODO)
- Webhook signature verification (TODO)

## Testing

### Local Testing

1. **Start development servers:**
```bash
# Terminal 1: Convex
cd /Users/home/Desktop/LTCG
npx convex dev

# Terminal 2: Next.js
cd apps/web
bun run dev
```

2. **Visit overlay directly:**
```
http://localhost:3000/stream/overlay?sessionId=test&token=test
```

3. **Test API endpoints:**
```bash
# Use test Twitch key or dummy key for local testing
curl -X POST http://localhost:3000/api/streaming/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user",
    "streamType": "user",
    "platform": "custom",
    "streamKey": "test_key",
    "customRtmpUrl": "rtmp://localhost:1935/live"
  }'
```

### Production Testing

1. **Get a test Twitch account** and stream key
2. **Start a test stream** via API
3. **Check Twitch dashboard** for live stream
4. **Monitor LiveKit logs** in dashboard
5. **Verify overlay rendering** via LiveKit egress preview

## Troubleshooting

### Stream won't start

**Check:**
1. LiveKit credentials configured correctly
2. Overlay page loads without errors
3. Stream key is valid
4. Network allows RTMP egress

**Debug:**
```bash
# Check session status
curl https://lunchtable.cards/api/streaming/status?sessionId=SESSION_ID

# Check Convex logs
npx convex logs --tail

# Check LiveKit dashboard
https://cloud.livekit.io/projects/lunchtable-rb51owhu/egresses
```

### Overlay not rendering

**Check:**
1. JWT token is valid
2. Session exists in database
3. Browser console for errors
4. Convex queries returning data

**Test overlay locally:**
```
http://localhost:3000/stream/overlay?sessionId=SESSION_ID&token=TOKEN
```

### Stream quality issues

**Adjust in LiveKit egress settings:**
- Resolution: 1920x1080 (default)
- Framerate: 30fps (default)
- Bitrate: Auto-adjusted by LiveKit

### Webhooks not working

**Verify:**
1. Webhook URL configured in LiveKit dashboard
2. HTTPS endpoint is accessible
3. Webhook signature validation (if enabled)

**Test webhook endpoint:**
```bash
curl -X POST https://lunchtable.cards/api/webhooks/livekit \
  -H "Content-Type: application/json" \
  -d '{
    "event": "egress_started",
    "egress_info": {
      "egress_id": "test_egress_123"
    }
  }'
```

## Cost Estimates

**LiveKit Cloud Pricing:**
- Web Egress: ~$0.015/minute (~$0.90/hour)
- Bandwidth: ~$0.10/GB
- Typical 1080p30 stream: ~3 Mbps = ~1.35 GB/hour

**Example costs:**
- 1 hour stream: ~$1.03
- 10 concurrent streams, 2 hours each: ~$20.60
- 100 hours/month: ~$103

**Free tier:** 10K participant-minutes/month (enough for ~166 hours of streaming)

## Monitoring

### Active Streams

Query Convex for live sessions:
```typescript
const activeSessions = await convex.query(
  api.streaming.sessions.getActiveSessions
);
```

### Stream Analytics

Each ended session includes stats:
- Duration (ms)
- Decisions logged (for agents)
- Events recorded
- Peak viewer count

### LiveKit Dashboard

Monitor in real-time:
- https://cloud.livekit.io/projects/lunchtable-rb51owhu/egresses
- Active egress sessions
- Bandwidth usage
- Error rates

## Next Steps

1. **Configure LiveKit webhook** (see above)
2. **Add UI for streaming** in frontend
3. **Test with real Twitch/YouTube accounts**
4. **Add agent auto-streaming** (webhook trigger on game start)
5. **Implement viewer count sync** from platform APIs
6. **Add stream preview thumbnails**
7. **Create streaming analytics dashboard**

## Support

- **LiveKit Docs:** https://docs.livekit.io/
- **LiveKit Dashboard:** https://cloud.livekit.io/
- **Project:** lunchtable-rb51owhu
