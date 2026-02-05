# LiveKit Browser Streaming - Implementation Status

## ✅ Completed

### 1. LiveKit Integration
- ✅ Installed `@livekit/components-react` and `livekit-client` packages
- ✅ Created room token generation utilities ([livekitRoom.ts](apps/web/src/lib/streaming/livekitRoom.ts))
- ✅ Built `/api/streaming/room` endpoint for creating rooms
- ✅ Room tokens include proper grants (publish, subscribe, data)

### 2. UI Components
- ✅ **LiveStreamingRoom** component using LiveKit's PreJoin + VideoConference
  - Device selection (camera, microphone)
  - Screen share support
  - Live preview before going live
  - Built-in controls (mute, camera toggle, screen share)

- ✅ **Go Live Page** ([/streaming/live](apps/web/app/(app)/streaming/live/page.tsx))
  - Platform selection (Twitch/YouTube)
  - Stream key input
  - Integration with LiveStreamingRoom
  - Notification system integration

### 3. User Flow
```
User clicks "Go Live"
  ↓
Select Twitch/YouTube + Enter Stream Key
  ↓
PreJoin: Select camera/mic, preview
  ↓
Join LiveKit Room
  ↓
Publish screen share + webcam + mic tracks
  ↓
[TODO] Start Track Composite Egress → RTMP
```

## 🚧 In Progress

### Track Composite Egress
Need to create backend logic that:
1. Detects when user has published tracks to room
2. Starts Track Composite Egress with:
   - User's screen share track
   - User's webcam track (optional, as overlay)
   - User's audio track
3. Composites them with layout
4. Streams to RTMP (Twitch/YouTube)

**Implementation Location:**
- Create: `apps/web/src/lib/streaming/trackEgress.ts`
- Trigger: When user connects to room (webhook or API call)

### Alternative: Web Egress Approach
Or keep using Web Egress but update overlay page to:
1. Join the same LiveKit room
2. Subscribe to user's published tracks
3. Display: Screen (main) + Webcam (corner) + Game overlay (on top)
4. Web Egress captures this composite page

**This approach gives more layout control!**

## 📋 TODO - Critical Path

### Option A: Track Composite Egress (Simpler)

1. **Create Track Egress Utility** ([apps/web/src/lib/streaming/trackEgress.ts](apps/web/src/lib/streaming/trackEgress.ts))
```typescript
export async function startTrackCompositeEgress(params: {
  roomName: string;
  videoTrackId: string; // Screen share
  audioTrackId: string; // Mic
  rtmpUrl: string;
}) {
  // Use livekit-server-sdk to start egress
  // POST to LiveKit API: /twirp/livekit.Egress/StartTrackCompositeEgress
}
```

2. **Update Room API** to start egress after user connects
3. **Handle Egress Events** via webhook (already have /api/webhooks/livekit)

### Option B: Web Egress with LiveKit Tracks (More Control)

1. **Update Overlay Page** ([apps/web/app/stream/overlay/page.tsx](apps/web/app/stream/overlay/page.tsx))
   - Join LiveKit room (same as user)
   - Subscribe to user's tracks
   - Render layout:
```tsx
<div className="composite-stream">
  {/* User's screen - full size */}
  <VideoTrack trackRef={screenTrack} />

  {/* Webcam - corner overlay */}
  <div className="webcam-overlay">
    <VideoTrack trackRef={webcamTrack} />
  </div>

  {/* Game overlay - stats, decisions, etc */}
  <GameOverlay sessionId={sessionId} />
</div>
```

2. **Keep Web Egress** (current system) capturing overlay page
3. **Update /api/streaming/start** to pass roomName to overlay URL

**Option B is recommended** - gives full layout control with HTML/CSS.

## 🔧 Implementation Steps (Option B - Recommended)

### Step 1: Update Overlay Page
```typescript
// apps/web/app/stream/overlay/page.tsx

// Get roomName from query params
const roomName = searchParams.get('roomName');

// Generate token for overlay to join room
const overlayToken = await generateOverlayRoomToken(roomName);

// Join room and subscribe to tracks
<LiveKitRoom token={overlayToken} serverUrl={livekitUrl}>
  <StreamCompositeView sessionId={sessionId} />
</LiveKitRoom>
```

### Step 2: Create Composite View Component
```typescript
// apps/web/src/components/streaming/StreamCompositeView.tsx

export function StreamCompositeView({ sessionId }) {
  const tracks = useTracks([Track.Source.ScreenShare, Track.Source.Camera]);

  return (
    <div className="stream-composite">
      {/* Screen share - full */}
      {screenTrack && <VideoTrack trackRef={screenTrack} />}

      {/* Webcam - corner */}
      {cameraTrack && (
        <div className="webcam-pip">
          <VideoTrack trackRef={cameraTrack} />
        </div>
      )}

      {/* Game overlay */}
      <GameOverlay sessionId={sessionId} />
    </div>
  );
}
```

### Step 3: Update Room API
```typescript
// apps/web/app/api/streaming/room/route.ts

// After creating room, also:
// 1. Generate overlay token
const overlayToken = await generateRoomToken({
  roomName,
  participantIdentity: `overlay-${sessionId}`,
  participantName: "Stream Overlay",
});

// 2. Create overlay URL with roomName
const overlayUrl = `${baseUrl}/stream/overlay?sessionId=${sessionId}&roomName=${roomName}&token=${overlayToken}`;

// 3. Start Web Egress to capture overlay
const { egressId } = await startWebEgress({ overlayUrl, rtmpUrl });
```

### Step 4: Test End-to-End
1. User goes to /streaming/live
2. Selects Twitch, enters stream key
3. PreJoin: selects camera, shares screen
4. Clicks "Start Streaming"
5. Room created, user joins
6. Overlay page joins same room, subscribes to tracks
7. Web Egress captures composite overlay
8. Streams to Twitch

## 📦 Files Created

- ✅ `apps/web/src/lib/streaming/livekitRoom.ts` - Token generation
- ✅ `apps/web/app/api/streaming/room/route.ts` - Room creation API
- ✅ `apps/web/src/components/streaming/LiveStreamingRoom.tsx` - LiveKit UI
- ✅ `apps/web/app/(app)/streaming/live/page.tsx` - Go Live page
- 🚧 `apps/web/src/components/streaming/StreamCompositeView.tsx` - Composite layout (TODO)

## 🧪 Testing Checklist

- [ ] User can select camera and see preview
- [ ] User can share screen
- [ ] User can toggle mic/camera
- [ ] Room token generates correctly
- [ ] Overlay page receives tracks
- [ ] Layout composites correctly (screen + webcam + game overlay)
- [ ] Web Egress captures composite
- [ ] Stream appears on Twitch/YouTube
- [ ] Audio works (mic + system audio if available)
- [ ] Stream ends cleanly when user disconnects

## 🎨 Current Architecture

```
User Browser (LiveStreamingRoom)
  ↓ Publishes tracks
LiveKit Room "stream-{sessionId}"
  ↓ Subscribes to tracks
Overlay Page (joins same room)
  - Renders: Screen (main) + Webcam (corner) + Game Overlay (stats)
  ↓ Captures composite
LiveKit Web Egress
  ↓ Streams via RTMP
Twitch / YouTube
```

## 🚀 Next Session

Complete Option B implementation:
1. Create StreamCompositeView component
2. Update overlay page to join LiveKit room
3. Update room API to start Web Egress with room-enabled overlay
4. Test complete flow

Estimated time: 1-2 hours
