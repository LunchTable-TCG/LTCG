# LTCG Plugin Troubleshooting Guide

Solutions to common issues when running LTCG AI agents.

## Table of Contents

- [Connection Issues](#connection-issues)
- [Authentication Problems](#authentication-problems)
- [Gameplay Issues](#gameplay-issues)
- [Performance Problems](#performance-problems)
- [LLM Provider Issues](#llm-provider-issues)
- [Real-time Sync Issues](#real-time-sync-issues)
- [Configuration Errors](#configuration-errors)

---

## Connection Issues

### Agent Won't Connect to LTCG

**Symptoms**:
```
[ERROR] Failed to connect to LTCG servers
[ERROR] Connection timeout
```

**Causes & Solutions**:

#### 1. Invalid Convex URL

Check your `LTCG_CONVEX_URL`:
```bash
# Should look like this:
LTCG_CONVEX_URL=https://your-deployment.convex.cloud

# NOT like this:
LTCG_CONVEX_URL=https://convex.cloud
LTCG_CONVEX_URL=your-deployment.convex.cloud  # Missing https://
```

**Fix**:
```bash
# Verify URL format
echo $LTCG_CONVEX_URL

# Get correct URL from registration email or dashboard
```

#### 2. Network/Firewall Issues

**Check**:
```bash
# Test connection to Convex
curl -I https://your-deployment.convex.cloud

# Should return 200 OK or similar
```

**Fix**:
- Check firewall settings
- Ensure outbound HTTPS (443) is allowed
- Try different network if on restricted WiFi

#### 3. Convex Service Down

**Check**: Visit [Convex Status Page](https://status.convex.dev)

**Temporary Fix**:
- Wait for service restoration
- Monitor status page for updates

---

## Authentication Problems

### "Invalid API Key" Error

**Symptoms**:
```
[ERROR] Authentication failed: Invalid API key
[ERROR] 401 Unauthorized
```

**Causes & Solutions**:

#### 1. Wrong API Key Format

API keys must start with `ltcg_`:
```bash
# Correct
LTCG_API_KEY=ltcg_abc123xyz789...

# Incorrect
LTCG_API_KEY=abc123xyz789...  # Missing prefix
```

**Fix**:
```bash
# Verify your key format
echo $LTCG_API_KEY | grep "^ltcg_"

# Should output your key if correct
```

#### 2. Typo in .env File

Common mistakes:
```bash
# Wrong: Extra spaces
LTCG_API_KEY= ltcg_abc123...  # Space after =

# Wrong: Quotes when not needed
LTCG_API_KEY="ltcg_abc123..."  # Quotes may cause issues

# Correct
LTCG_API_KEY=ltcg_abc123...
```

**Fix**:
```bash
# Remove any extra spaces or quotes
nano .env
# or
vim .env
```

#### 3. API Key Expired or Revoked

**Check**: Log in to LTCG dashboard to verify key status

**Fix**:
1. Generate new API key
2. Update `.env` file
3. Restart agent

#### 4. Environment Variables Not Loaded

**Check**:
```bash
# In your agent's runtime
console.log(process.env.LTCG_API_KEY);
// Should output your key
```

**Fix**:
```bash
# Ensure .env file is in correct location
ls -la .env

# Restart agent to reload environment
elizaos start
```

---

## Gameplay Issues

### Agent Makes No Moves

**Symptoms**:
- Agent connects successfully
- Game starts
- Agent doesn't take any actions
- Timeout on turns

**Causes & Solutions**:

#### 1. LLM Provider Not Configured

**Check**:
```bash
# Verify LLM API key is set
echo $OPENAI_API_KEY
# or
echo $ANTHROPIC_API_KEY
```

**Fix**:
```bash
# Add to .env
OPENAI_API_KEY=sk-your-key-here

# Ensure LLM plugin is in character
plugins: [
  '@elizaos/plugin-openai',
  ltcgPlugin,
]
```

#### 2. Providers Not Working

**Enable Debug Mode**:
```bash
LTCG_DEBUG_MODE=true
```

**Check Logs**:
```
[DEBUG] [gameStateProvider] Fetching game state...
[DEBUG] [handProvider] Analyzing hand...
```

If providers aren't logging, check:
- Game ID is being passed correctly
- API client is initialized
- Network connectivity

#### 3. Action Validation Failing

**Check Logs**:
```
[INFO] [SUMMON] Validation failed: No monsters in hand
[INFO] [ATTACK] Validation failed: Not Battle Phase
```

**Fix**:
- Ensure providers are returning correct data
- Verify game state is updating
- Check phase transitions are working

### Agent Makes Illegal Moves

**Symptoms**:
```
[ERROR] Action rejected: Illegal move
[ERROR] Cannot summon in Battle Phase
```

**Causes & Solutions**:

#### 1. Provider Data Out of Sync

**Fix**:
```bash
# Enable real-time sync logging
LTCG_DEBUG_MODE=true
```

Check that game state updates immediately after each action.

#### 2. Action Validation Not Working

**Check**:
- Providers are validating phase requirements
- Legal actions provider is filtering correctly

**Fix**: Update to latest plugin version
```bash
bun update plugin-ltcg
```

### Agent Plays Too Slowly

**Symptoms**:
- Long delays between actions (>5 seconds)
- Turns timing out
- Game feels sluggish

**Causes & Solutions**:

#### 1. LTCG_RESPONSE_TIME Too High

**Check**:
```bash
echo $LTCG_RESPONSE_TIME
# Default is 1500ms
```

**Fix**:
```bash
# Reduce response time
LTCG_RESPONSE_TIME=500  # 500ms delay

# Or remove delay entirely for fast play
LTCG_RESPONSE_TIME=0
```

#### 2. Slow LLM Model

**Check Current Model**:
```typescript
settings: {
  model: 'gpt-4',  // Slower but more strategic
}
```

**Fix**: Switch to faster model
```typescript
settings: {
  model: 'gpt-4o-mini',  // Much faster
}
```

#### 3. Network Latency

**Test Latency**:
```bash
ping your-deployment.convex.cloud
```

**Fix**:
- Use closer network
- Check internet connection
- Consider cloud hosting for agent

#### 4. Too Many Concurrent Games

**Check**:
```bash
echo $LTCG_MAX_CONCURRENT_GAMES
```

**Fix**:
```bash
# Reduce concurrent games
LTCG_MAX_CONCURRENT_GAMES=1
```

---

## Performance Problems

### High LLM Costs

**Symptoms**:
- API bills higher than expected
- Many LLM requests per game

**Causes & Solutions**:

#### 1. Using Expensive Model

**Check**:
```typescript
model: 'gpt-4'  // Most expensive
```

**Fix**: Switch to cheaper model
```typescript
model: 'gpt-4o-mini'  // Much cheaper, still capable
```

#### 2. Running Too Many Games

**Check**:
```bash
echo $LTCG_AUTO_MATCHMAKING
echo $LTCG_MAX_CONCURRENT_GAMES
```

**Fix**:
```bash
# Reduce game volume
LTCG_AUTO_MATCHMAKING=false
LTCG_MAX_CONCURRENT_GAMES=1
```

#### 3. Excessive Chat Actions

**Check**:
```bash
echo $LTCG_TRASH_TALK_LEVEL
```

**Fix**:
```bash
# Reduce chat
LTCG_TRASH_TALK_LEVEL=none
LTCG_CHAT_ENABLED=false
```

### Memory Leaks

**Symptoms**:
- Agent memory usage grows over time
- Eventually crashes or slows down

**Fixes**:

#### 1. Restart Agent Periodically

```bash
# Use process manager
pm2 start "elizaos start" --name ltcg-agent --cron-restart="0 */6 * * *"
# Restarts every 6 hours
```

#### 2. Limit Game History

```bash
# Don't store too much game history
# Clear old games from memory
```

#### 3. Monitor Memory

```bash
# Check memory usage
pm2 monit
```

---

## LLM Provider Issues

### "OpenAI API Error"

**Symptoms**:
```
[ERROR] OpenAI request failed: Rate limit exceeded
[ERROR] OpenAI request failed: Invalid API key
```

**Solutions**:

#### 1. Rate Limit Exceeded

**Fix**:
```bash
# Reduce request frequency
LTCG_RESPONSE_TIME=2000  # Increase delay

# Or upgrade OpenAI plan
```

#### 2. Invalid API Key

**Check**:
```bash
# Verify key format
echo $OPENAI_API_KEY
# Should start with sk-
```

**Fix**:
```bash
# Get new key from OpenAI dashboard
# Update .env
OPENAI_API_KEY=sk-new-key-here
```

#### 3. Model Not Available

**Fix**: Use available model
```typescript
// If gpt-4 not available
model: 'gpt-4o-mini'  // Use this instead
```

### "Anthropic API Error"

**Solutions**: Similar to OpenAI above

**Check Key Format**:
```bash
# Should start with sk-ant-
echo $ANTHROPIC_API_KEY
```

**Use Correct Model Names**:
```typescript
model: 'claude-3-5-sonnet-20241022'  // Correct
model: 'claude-3'  // Incorrect
```

---

## Real-time Sync Issues

### Connection Drops During Game

**Symptoms**:
```
[WARN] Convex connection lost
[INFO] Attempting to reconnect...
```

**Causes & Solutions**:

#### 1. Unstable Internet

**Check**:
```bash
# Monitor connection
ping -i 1 your-deployment.convex.cloud
```

**Fix**:
- Use wired connection instead of WiFi
- Host agent on stable cloud server
- Enable auto-reconnect (should be default)

#### 2. Convex Client Error

**Check Logs**:
```
[ERROR] Convex client error: ...
```

**Fix**:
```bash
# Update Convex client
bun update convex

# Restart agent
```

### Game State Not Updating

**Symptoms**:
- Agent sees old game state
- Makes decisions based on outdated info

**Solutions**:

#### 1. Subscription Not Active

**Check Debug Logs**:
```
[DEBUG] Subscribed to game_123 updates
```

If missing, subscription failed.

**Fix**:
```bash
# Restart agent
# Check Convex URL is correct
```

#### 2. Cache Issues

**Fix**:
```bash
# Clear any caching
rm -rf .cache/

# Restart with clean state
```

---

## Configuration Errors

### "Invalid Plugin Configuration"

**Symptoms**:
```
[ERROR] Invalid plugin configuration: LTCG_API_KEY is required
[ERROR] Invalid plugin configuration: LTCG_CONVEX_URL must be a valid URL
```

**Solutions**:

#### 1. Missing Required Settings

**Check**:
```bash
# Must have both
echo $LTCG_API_KEY
echo $LTCG_CONVEX_URL
```

**Fix**:
```bash
# Add to .env
LTCG_API_KEY=ltcg_your_key
LTCG_CONVEX_URL=https://your-deployment.convex.cloud
```

#### 2. Invalid Setting Values

**Check Constraints**:
```bash
# LTCG_RESPONSE_TIME must be 0-10000
LTCG_RESPONSE_TIME=15000  # INVALID

# LTCG_MAX_CONCURRENT_GAMES must be 1-5
LTCG_MAX_CONCURRENT_GAMES=10  # INVALID
```

**Fix**: Use valid values
```bash
LTCG_RESPONSE_TIME=1500
LTCG_MAX_CONCURRENT_GAMES=3
```

### Settings Not Taking Effect

**Symptoms**:
- Changed .env but agent behavior unchanged

**Solutions**:

#### 1. Agent Not Restarted

**Fix**:
```bash
# Restart agent to reload .env
elizaos start
```

#### 2. Settings Cached

**Fix**:
```bash
# Clear cache and restart
rm -rf .cache/
elizaos start
```

#### 3. Wrong .env File

**Check**:
```bash
# Ensure .env is in project root
ls -la .env

# Not in subdirectory
```

---

## Debug Mode

Enable comprehensive logging:

```bash
# In .env
LTCG_DEBUG_MODE=true
LOG_LEVEL=debug
```

**Output Will Show**:
```
[DEBUG] [gameStateProvider] Fetching game state for game_123
[DEBUG] [handProvider] Analyzing 5 cards in hand
[DEBUG] [SUMMON] Validating summon action
[DEBUG] [SUMMON] Summoning Blue-Eyes White Dragon with 2 tributes
[DEBUG] [LTCGApiClient] POST /api/games/game_123/summon
[DEBUG] [LTCGRealtimeClient] Received game update
```

This helps identify exactly where issues occur.

---

## Getting More Help

### Check Logs

```bash
# elizaOS logs
tail -f ~/.eliza/logs/latest.log

# Or if using PM2
pm2 logs ltcg-agent
```

### Report Issues

When reporting issues, include:

1. **Error Message**:
   ```
   [ERROR] Full error message here
   ```

2. **Configuration** (sanitized):
   ```bash
   LTCG_PLAY_STYLE=aggressive
   LTCG_RISK_TOLERANCE=high
   # Don't share API keys!
   ```

3. **Steps to Reproduce**:
   - What you did
   - What happened
   - What you expected

4. **Environment**:
   - elizaOS version: `elizaos --version`
   - Plugin version: Check `package.json`
   - Node version: `node --version`
   - OS: `uname -a`

### Community Support

- **Discord**: [LTCG Community](https://discord.gg/ltcg)
- **GitHub Issues**: [plugin-ltcg/issues](https://github.com/your-repo/plugin-ltcg/issues)
- **Documentation**: [docs/](./README.md)

---

## Quick Diagnostics Checklist

Run through this checklist when troubleshooting:

- [ ] API keys are set correctly in `.env`
- [ ] Convex URL is valid and accessible
- [ ] LLM provider is configured (OpenAI, Anthropic, etc.)
- [ ] Plugin is listed in character's plugins array
- [ ] Agent was restarted after config changes
- [ ] Network connection is stable
- [ ] Debug mode is enabled for detailed logs
- [ ] elizaOS and plugin are up to date
- [ ] No typos in configuration keys
- [ ] File paths are correct (absolute, not relative)

Most issues are resolved by checking these basics.

---

For more information:
- [Quick Start Guide](./QUICKSTART.md) - Setup instructions
- [API Reference](./API.md) - Technical details
- [Strategy Guide](./STRATEGY.md) - Optimize performance
