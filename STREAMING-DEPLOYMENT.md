# Streaming Feature - Production Deployment Guide

**Status:** Ready for deployment, currently DISABLED by default

## Current State

✅ **Schema deployed** - Optional streaming fields added to agents table (safe, won't break existing code)
⏸️ **Code not deployed** - API routes and UI components are untracked files
🔒 **Feature disabled** - Requires `NEXT_PUBLIC_STREAMING_ENABLED=true` to activate

## Pre-Deployment Checklist

### 1. LiveKit Configuration

**Already configured in .env.local:**
```bash
LIVEKIT_URL=wss://lunchtable-rb51owhu.livekit.cloud
LIVEKIT_API_KEY=APIVQCZkSrK2bLR
LIVEKIT_API_SECRET=MUNC3YyvHUQpwFDMnhJTYeVHBSNSlCYElzbblonm3YH
```

**Add these to Vercel environment variables:**
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `STREAM_KEY_ENCRYPTION_KEY`
- `STREAMING_JWT_SECRET`
- `NEXT_PUBLIC_APP_URL=https://lunchtable.cards`

### 2. LiveKit Webhook

**Must configure in LiveKit dashboard:**

1. Go to: https://cloud.livekit.io/projects/lunchtable-rb51owhu/settings/webhooks
2. Add webhook URL: `https://lunchtable.cards/api/webhooks/livekit`
3. Enable events:
   - `egress_started`
   - `egress_ended`
   - `egress_updated`
   - `egress_error`

### 3. Enable Feature Flag

**To enable streaming in production:**

Add to Vercel environment variables:
```bash
NEXT_PUBLIC_STREAMING_ENABLED=true
```

**To keep disabled** (recommended for staged rollout):
```bash
# Don't set NEXT_PUBLIC_STREAMING_ENABLED
# Or set to: NEXT_PUBLIC_STREAMING_ENABLED=false
```

## Deployment Steps

### Phase 1: Deploy Code (Feature Disabled)

```bash
# 1. Stage all streaming files
git add apps/web/app/api/streaming/
git add apps/web/app/api/webhooks/livekit/
git add apps/web/app/stream/
git add apps/web/src/components/streaming/
git add apps/web/src/lib/streaming/
git add convex/streaming/
git add convex/agents/streaming.ts
git add STREAMING.md

# 2. Update schema (already pushed to Convex)
git add convex/schema.ts
git add convex/agents/decisions.ts

# 3. Commit
git commit -m "feat: add streaming infrastructure (disabled by default)"

# 4. Push to production
git push origin main
```

**Vercel will auto-deploy** - feature will be disabled until you enable it.

### Phase 2: Test in Production (Private)

```bash
# Enable feature flag in Vercel
NEXT_PUBLIC_STREAMING_ENABLED=true
```

**Test with:**
1. Your own Twitch test account
2. A test agent with dummy stream key
3. Check overlay renders: `https://lunchtable.cards/stream/overlay?sessionId=test&token=test`

### Phase 3: Enable for Users

Once tested:
1. Keep `NEXT_PUBLIC_STREAMING_ENABLED=true`
2. Announce feature to users
3. Monitor LiveKit dashboard for usage
4. Watch for errors in Sentry/logs

## Rollback Plan

**If something breaks:**

```bash
# Quick rollback - disable feature
# In Vercel dashboard:
NEXT_PUBLIC_STREAMING_ENABLED=false

# Redeploy (or wait for auto-deploy)
```

**Feature will be disabled immediately** - no code changes needed.

## Safety Features

### Built-in Protections

✅ **Optional schema fields** - Won't break existing agents
✅ **Feature flag** - Can disable instantly
✅ **Encrypted stream keys** - Never stored in plain text
✅ **JWT authentication** - Overlays are protected
✅ **Error handling** - Failed streams don't crash games
✅ **Rate limiting ready** - Schema includes rate limit tables

### What Won't Break

- ❌ Existing games
- ❌ Existing agents
- ❌ User accounts
- ❌ Game lobbies
- ❌ Any non-streaming features

### Monitoring

**Check these after deployment:**

1. **Convex Dashboard**
   - No schema errors
   - No query errors
   - Normal write rate

2. **LiveKit Dashboard**
   - https://cloud.livekit.io/projects/lunchtable-rb51owhu/egresses
   - Check egress sessions
   - Monitor bandwidth usage

3. **Vercel Logs**
   - No 500 errors on `/api/streaming/*`
   - Webhook endpoint responding

4. **User Reports**
   - Check Discord/support for issues
   - Monitor social media

## Cost Management

**Current setup:**
- LiveKit free tier: 10K participant-minutes/month (~166 hours)
- After free tier: ~$1.03/hour per stream

**To control costs:**
1. Start with free tier
2. Monitor usage in LiveKit dashboard
3. Add usage limits in code (TODO)
4. Consider paid plan if popular: https://livekit.io/pricing

## Post-Deployment Tasks

### Immediate (First 24h)

- [ ] Verify first stream works end-to-end
- [ ] Check LiveKit webhook delivers events
- [ ] Test with both Twitch and YouTube
- [ ] Monitor error rates
- [ ] Check overlay renders correctly

### Short-term (First Week)

- [ ] Add streaming UI to user settings page
- [ ] Add streaming dashboard to admin panel
- [ ] Create user documentation
- [ ] Add analytics tracking
- [ ] Monitor costs vs free tier

### Long-term

- [ ] Add viewer count sync from Twitch/YouTube APIs
- [ ] Add stream preview thumbnails
- [ ] Add webcam support for users
- [ ] Add chat integration
- [ ] Add multi-platform streaming
- [ ] Add VOD recording

## Support

**If issues arise:**

1. **Check feature flag** - Is it enabled when it shouldn't be?
2. **Check LiveKit dashboard** - Are egress sessions erroring?
3. **Check Vercel logs** - Any API errors?
4. **Disable feature** - Set `NEXT_PUBLIC_STREAMING_ENABLED=false`
5. **Contact LiveKit support** - If LiveKit-specific issue

## Summary

**Safe to deploy because:**
- Feature is disabled by default
- Schema changes are optional fields only
- No breaking changes to existing code
- Can rollback instantly with feature flag
- All stream keys encrypted
- Error handling prevents cascading failures

**Deploy when ready:**
```bash
git push origin main  # Auto-deploys to Vercel
```

**Enable when tested:**
```bash
# In Vercel dashboard:
NEXT_PUBLIC_STREAMING_ENABLED=true
```
