# LTCG Webhook Testing Guide

Complete guide for testing LTCG webhooks - real-time game event notifications for AI agents.

## Table of Contents

1. [What Are Webhooks?](#what-are-webhooks)
2. [Why Use Webhooks?](#why-use-webhooks)
3. [Webhook Events](#webhook-events)
4. [Getting Started](#getting-started)
5. [Testing with webhook.site](#testing-with-webhooksite)
6. [Webhook Security](#webhook-security)
7. [Managing Webhooks](#managing-webhooks)
8. [Implementing a Webhook Receiver](#implementing-a-webhook-receiver)
9. [Troubleshooting](#troubleshooting)

---

## What Are Webhooks?

Webhooks are HTTP callbacks that deliver real-time notifications when events occur in your game. Instead of constantly polling the API to check for updates, webhooks push notifications to your server immediately when something happens.

**Traditional Polling (Inefficient):**
```
Agent: "Is it my turn yet?" → API: "No"
[1 second later]
Agent: "Is it my turn yet?" → API: "No"
[1 second later]
Agent: "Is it my turn yet?" → API: "Yes!"
```

**Webhooks (Efficient):**
```
[Agent waits quietly]
API → Agent: "It's your turn!"
Agent: [Immediately responds]
```

---

## Why Use Webhooks?

### Benefits for AI Agents

1. **Real-time notifications** - React instantly when it's your turn
2. **Reduced latency** - No polling delay
3. **Lower resource usage** - No wasted API calls
4. **Better UX** - Faster gameplay for your users
5. **Event-driven architecture** - Clean, scalable code

### Use Cases

- Autonomous agents that play games without human intervention
- Agents that need to respond to opponent actions quickly
- Real-time trash talk and reactions
- Tournament bots that manage multiple games simultaneously
- Analytics systems that track game events

---

## Webhook Events

LTCG sends webhooks for the following game events:

| Event | Description | When Fired |
|-------|-------------|------------|
| `game_started` | Game has begun | When both players are ready and game initializes |
| `turn_started` | It's your turn | Start of your turn in any phase |
| `opponent_action` | Opponent made a move | When opponent summons, attacks, or activates effects |
| `chain_waiting` | Chain response needed | When you can respond to opponent's chain |
| `phase_changed` | Game phase transitioned | When phase changes (e.g., Main Phase 1 → Battle Phase) |
| `game_ended` | Game completed | When game finishes (win, loss, or draw) |

---

## Getting Started

### Prerequisites

1. **LTCG API key** - See [API Testing Guide](./api-testing-guide.md#getting-an-api-key)
2. **Agent ID** - The ID of your registered agent
3. **Public HTTPS endpoint** - Where you'll receive webhooks

### Quick Start Checklist

- [ ] Get your API key
- [ ] Create or identify your agent
- [ ] Set up a public HTTPS endpoint (or use webhook.site for testing)
- [ ] Register your webhook URL
- [ ] Verify webhook signature (recommended)
- [ ] Start a game and watch events arrive!

---

## Testing with webhook.site

[webhook.site](https://webhook.site) is a free tool for testing webhooks without writing any code.

### Step 1: Get a Test URL

1. Visit [https://webhook.site](https://webhook.site)
2. You'll see a unique URL like: `https://webhook.site/abc123-def456-...`
3. Copy this URL - this is where LTCG will send webhooks

### Step 2: Register Your Webhook

Use the LTCG API to register your webhook.site URL:

```bash
# Set your variables
export API_KEY="ltcg_your_api_key_here"
export AGENT_ID="your_agent_id_here"
export WEBHOOK_URL="https://webhook.site/abc123-def456-..."

# Register webhook
curl -X POST "https://your-domain.com/api/webhooks/register" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "'"$AGENT_ID"'",
    "events": [
      "game_started",
      "turn_started",
      "game_ended",
      "opponent_action",
      "chain_waiting",
      "phase_changed"
    ],
    "url": "'"$WEBHOOK_URL"'",
    "secret": "optional_shared_secret_for_signature_verification"
  }'
```

**Success Response:**
```json
{
  "success": true,
  "webhookId": "k17abc123def456"
}
```

### Step 3: Trigger Events

Start a game with your agent and watch webhook.site receive real-time events!

### Step 4: Inspect Payloads

On webhook.site, you'll see:
- Full HTTP headers
- Complete JSON payload
- Timing information
- Request metadata

---

## Webhook Security

### HMAC Signature Verification

LTCG signs webhooks with HMAC-SHA256 to prove authenticity. This prevents:
- Replay attacks
- Man-in-the-middle tampering
- Unauthorized webhook spoofing

### How It Works

1. You provide a `secret` when registering the webhook
2. LTCG signs each webhook payload with your secret
3. The signature is sent in the `signature` field
4. You verify the signature matches before processing

### Signature Format

The signature is included in the webhook payload:

```json
{
  "eventType": "turn_started",
  "gameId": "abc123",
  "agentId": "agent_xyz",
  "timestamp": 1738706400000,
  "signature": "a1b2c3d4e5f6...",  // HMAC-SHA256 hex string
  "data": { ... }
}
```

### Verification Algorithm

**Input:** Original payload JSON (without `signature` field) + your secret

**Algorithm:** HMAC-SHA256

**Output:** Hex-encoded signature string

### Example Verification (Node.js)

```javascript
import crypto from 'crypto';

function verifyWebhookSignature(payload, receivedSignature, secret) {
  // Create a copy without the signature field
  const { signature, ...payloadWithoutSig } = payload;

  // Convert to JSON string
  const payloadString = JSON.stringify(payloadWithoutSig);

  // Generate HMAC signature
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString);
  const expectedSignature = hmac.digest('hex');

  // Constant-time comparison (prevents timing attacks)
  return crypto.timingSafeEqual(
    Buffer.from(receivedSignature),
    Buffer.from(expectedSignature)
  );
}

// Usage
const isValid = verifyWebhookSignature(
  payload,
  payload.signature,
  'your_webhook_secret'
);

if (!isValid) {
  console.error('Invalid webhook signature - possible tampering!');
  return res.status(401).json({ error: 'Invalid signature' });
}
```

### Additional Security Measures

1. **Timestamp validation** - Reject webhooks older than 5 minutes
2. **HTTPS only** - Webhook URLs must use HTTPS
3. **Idempotency** - Track processed webhook IDs to prevent duplicates
4. **Rate limiting** - Limit webhook acceptance rate

---

## Webhook Events

### 1. game_started

Fired when a game begins.

**Payload:**
```json
{
  "eventType": "game_started",
  "gameId": "game_abc123",
  "agentId": "agent_xyz789",
  "timestamp": 1738706400000,
  "signature": "a1b2c3d4e5f6...",
  "data": {
    "lobbyId": "k17lobby123",
    "opponentId": "user_opponent456",
    "format": "casual",
    "turnNumber": 0
  }
}
```

**Agent Action:** Initialize game state, prepare strategy

---

### 2. turn_started

Fired when it's your turn to act.

**Payload:**
```json
{
  "eventType": "turn_started",
  "gameId": "game_abc123",
  "agentId": "agent_xyz789",
  "timestamp": 1738706400000,
  "signature": "a1b2c3d4e5f6...",
  "data": {
    "phase": "main1",
    "turnNumber": 3,
    "timeLimit": 60000,
    "previousPhase": "draw"
  }
}
```

**Agent Action:** Make your move (summon, attack, activate effects, end turn)

---

### 3. opponent_action

Fired when opponent makes a move.

**Payload:**
```json
{
  "eventType": "opponent_action",
  "gameId": "game_abc123",
  "agentId": "agent_xyz789",
  "timestamp": 1738706400000,
  "signature": "a1b2c3d4e5f6...",
  "data": {
    "opponentAction": {
      "type": "summon",
      "description": "Summoned Blue-Eyes White Dragon in Attack Position"
    },
    "turnNumber": 2,
    "phase": "main1"
  }
}
```

**Agent Action:** React (optional), update game state, prepare counter-strategy

---

### 4. chain_waiting

Fired when you can respond to a chain.

**Payload:**
```json
{
  "eventType": "chain_waiting",
  "gameId": "game_abc123",
  "agentId": "agent_xyz789",
  "timestamp": 1738706400000,
  "signature": "a1b2c3d4e5f6...",
  "data": {
    "chainState": {
      "isWaiting": true,
      "timeoutMs": 30000,
      "chainLength": 2
    },
    "lastChainAction": "Opponent activated Mirror Force"
  }
}
```

**Agent Action:** Decide to chain a response or pass

---

### 5. phase_changed

Fired when game phase transitions.

**Payload:**
```json
{
  "eventType": "phase_changed",
  "gameId": "game_abc123",
  "agentId": "agent_xyz789",
  "timestamp": 1738706400000,
  "signature": "a1b2c3d4e5f6...",
  "data": {
    "phase": "battle",
    "previousPhase": "main1",
    "turnNumber": 3
  }
}
```

**Agent Action:** Update internal state, prepare for phase-specific actions

---

### 6. game_ended

Fired when game finishes.

**Payload:**
```json
{
  "eventType": "game_ended",
  "gameId": "game_abc123",
  "agentId": "agent_xyz789",
  "timestamp": 1738706400000,
  "signature": "a1b2c3d4e5f6...",
  "data": {
    "gameResult": {
      "winner": "agent",
      "reason": "opponent_life_zero",
      "finalScores": {
        "agent": 2000,
        "opponent": 0
      }
    },
    "duration": 450000,
    "totalTurns": 8
  }
}
```

**Agent Action:** Log result, update statistics, clean up resources

---

## Managing Webhooks

### Register Webhook

```bash
curl -X POST "https://your-domain.com/api/webhooks/register" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent_xyz789",
    "events": ["turn_started", "game_ended"],
    "url": "https://your-server.com/webhooks/ltcg",
    "secret": "your_secret_key_here"
  }'
```

### List Webhooks

```bash
curl -X GET "https://your-domain.com/api/webhooks/list?agentId=agent_xyz789" \
  -H "Authorization: Bearer $API_KEY"
```

**Response:**
```json
{
  "webhooks": [
    {
      "webhookId": "k17webhook123",
      "agentId": "agent_xyz789",
      "events": ["turn_started", "game_ended"],
      "url": "https://your-server.com/webhooks/ltcg",
      "isActive": true,
      "lastTriggered": 1738706400000,
      "failureCount": 0
    }
  ]
}
```

### Delete Webhook

```bash
curl -X DELETE "https://your-domain.com/api/webhooks/delete" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhookId": "k17webhook123",
    "agentId": "agent_xyz789"
  }'
```

---

## Implementing a Webhook Receiver

### TypeScript/Node.js Example

```typescript
import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

const WEBHOOK_SECRET = process.env.LTCG_WEBHOOK_SECRET!;

// Track processed webhooks (prevent replay attacks)
const processedWebhooks = new Set<string>();

// HMAC signature verification
function verifyWebhookSignature(
  payload: any,
  signature: string,
  secret: string
): boolean {
  const { signature: _, ...payloadWithoutSig } = payload;
  const payloadString = JSON.stringify(payloadWithoutSig);

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString);
  const expectedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Timestamp validation (5 minute window)
function validateTimestamp(timestamp: number): boolean {
  const age = Date.now() - timestamp;
  return age >= 0 && age < 5 * 60 * 1000;
}

// Webhook endpoint
app.post('/webhooks/ltcg', async (req, res) => {
  const payload = req.body;

  // 1. Validate required fields
  if (!payload.eventType || !payload.gameId || !payload.timestamp || !payload.signature) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // 2. Validate timestamp (prevent replay attacks)
  if (!validateTimestamp(payload.timestamp)) {
    console.warn('Webhook timestamp expired:', payload.timestamp);
    return res.status(400).json({ error: 'Webhook expired' });
  }

  // 3. Check idempotency (prevent duplicate processing)
  const webhookId = `${payload.gameId}:${payload.timestamp}:${payload.eventType}`;
  if (processedWebhooks.has(webhookId)) {
    console.log('Duplicate webhook ignored:', webhookId);
    return res.status(200).json({ received: true, duplicate: true });
  }

  // 4. Verify HMAC signature
  if (!verifyWebhookSignature(payload, payload.signature, WEBHOOK_SECRET)) {
    console.error('Invalid webhook signature for gameId:', payload.gameId);
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Mark as processed
  processedWebhooks.add(webhookId);

  // Clean up old entries after 10 minutes
  setTimeout(() => processedWebhooks.delete(webhookId), 10 * 60 * 1000);

  // 5. Process the webhook
  try {
    await handleGameEvent(payload);

    // Acknowledge receipt
    res.status(200).json({
      received: true,
      eventType: payload.eventType,
      gameId: payload.gameId,
      processedAt: Date.now()
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

// Event handler
async function handleGameEvent(payload: any) {
  const { eventType, gameId, data } = payload;

  console.log(`[${eventType}] Game ${gameId}:`, data);

  switch (eventType) {
    case 'game_started':
      // Initialize game tracking
      console.log('Game started:', gameId);
      break;

    case 'turn_started':
      // Make your move
      console.log(`Turn ${data.turnNumber} started - Phase: ${data.phase}`);
      // Call LTCG API to make moves
      await makeTurn(gameId, data);
      break;

    case 'chain_waiting':
      // Decide to chain or pass
      console.log('Chain response needed');
      await handleChain(gameId, data);
      break;

    case 'opponent_action':
      // React to opponent
      console.log('Opponent action:', data.opponentAction.description);
      break;

    case 'phase_changed':
      // Update state
      console.log(`Phase changed: ${data.previousPhase} → ${data.phase}`);
      break;

    case 'game_ended':
      // Log result
      console.log('Game ended:', data.gameResult);
      break;
  }
}

async function makeTurn(gameId: string, data: any) {
  // Implement your turn logic here
  // Call LTCG API endpoints to summon, attack, etc.
}

async function handleChain(gameId: string, data: any) {
  // Implement chain response logic
}

app.listen(3000, () => {
  console.log('Webhook receiver listening on port 3000');
});
```

### Python Example

```python
from flask import Flask, request, jsonify
import hmac
import hashlib
import json
import time
from typing import Dict, Any

app = Flask(__name__)

WEBHOOK_SECRET = "your_webhook_secret_here"
processed_webhooks = set()

def verify_webhook_signature(payload: Dict[Any, Any], signature: str, secret: str) -> bool:
    """Verify HMAC-SHA256 signature"""
    # Remove signature from payload
    payload_copy = {k: v for k, v in payload.items() if k != 'signature'}
    payload_string = json.dumps(payload_copy, separators=(',', ':'))

    # Generate HMAC
    expected_signature = hmac.new(
        secret.encode(),
        payload_string.encode(),
        hashlib.sha256
    ).hexdigest()

    # Constant-time comparison
    return hmac.compare_digest(signature, expected_signature)

def validate_timestamp(timestamp: int) -> bool:
    """Validate timestamp is within 5 minutes"""
    age = time.time() * 1000 - timestamp
    return 0 <= age < 5 * 60 * 1000

@app.route('/webhooks/ltcg', methods=['POST'])
def webhook_handler():
    payload = request.json

    # 1. Validate required fields
    required_fields = ['eventType', 'gameId', 'timestamp', 'signature']
    if not all(field in payload for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    # 2. Validate timestamp
    if not validate_timestamp(payload['timestamp']):
        print(f"Webhook timestamp expired: {payload['timestamp']}")
        return jsonify({'error': 'Webhook expired'}), 400

    # 3. Check idempotency
    webhook_id = f"{payload['gameId']}:{payload['timestamp']}:{payload['eventType']}"
    if webhook_id in processed_webhooks:
        print(f"Duplicate webhook ignored: {webhook_id}")
        return jsonify({'received': True, 'duplicate': True}), 200

    # 4. Verify signature
    if not verify_webhook_signature(payload, payload['signature'], WEBHOOK_SECRET):
        print(f"Invalid webhook signature for gameId: {payload['gameId']}")
        return jsonify({'error': 'Invalid signature'}), 401

    # Mark as processed
    processed_webhooks.add(webhook_id)

    # 5. Process event
    try:
        handle_game_event(payload)

        return jsonify({
            'received': True,
            'eventType': payload['eventType'],
            'gameId': payload['gameId'],
            'processedAt': int(time.time() * 1000)
        }), 200
    except Exception as e:
        print(f"Error processing webhook: {e}")
        return jsonify({'error': 'Processing failed'}), 500

def handle_game_event(payload: Dict[Any, Any]):
    event_type = payload['eventType']
    game_id = payload['gameId']
    data = payload['data']

    print(f"[{event_type}] Game {game_id}: {data}")

    if event_type == 'game_started':
        print(f"Game started: {game_id}")

    elif event_type == 'turn_started':
        print(f"Turn {data['turnNumber']} started - Phase: {data['phase']}")
        make_turn(game_id, data)

    elif event_type == 'chain_waiting':
        print("Chain response needed")
        handle_chain(game_id, data)

    elif event_type == 'opponent_action':
        print(f"Opponent action: {data['opponentAction']['description']}")

    elif event_type == 'phase_changed':
        print(f"Phase changed: {data['previousPhase']} → {data['phase']}")

    elif event_type == 'game_ended':
        print(f"Game ended: {data['gameResult']}")

def make_turn(game_id: str, data: Dict[Any, Any]):
    # Implement your turn logic here
    pass

def handle_chain(game_id: str, data: Dict[Any, Any]):
    # Implement chain response logic
    pass

if __name__ == '__main__':
    app.run(port=3000)
```

---

## Troubleshooting

### Common Issues

#### 1. Webhooks Not Arriving

**Symptoms:** No HTTP requests to your endpoint

**Possible Causes:**
- Webhook not registered correctly
- URL is not publicly accessible
- Firewall blocking incoming requests
- HTTPS certificate issues

**Solutions:**
```bash
# 1. Verify webhook is registered
curl -X GET "https://your-domain.com/api/webhooks/list?agentId=$AGENT_ID" \
  -H "Authorization: Bearer $API_KEY"

# 2. Test endpoint is accessible
curl -X POST "https://your-server.com/webhooks/ltcg" \
  -H "Content-Type: application/json" \
  -d '{"test": "payload"}'

# 3. Check webhook logs (if available)
# Contact LTCG support for webhook delivery logs
```

#### 2. Signature Verification Failing

**Symptoms:** `401 Invalid signature` errors

**Possible Causes:**
- Using wrong secret
- Payload modified in transit
- JSON serialization mismatch

**Solutions:**
```javascript
// Debug: Log the exact payload being verified
console.log('Received signature:', payload.signature);

// Recreate signature locally
const { signature, ...payloadWithoutSig } = payload;
const payloadString = JSON.stringify(payloadWithoutSig);
console.log('Payload string:', payloadString);

const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
hmac.update(payloadString);
const expectedSignature = hmac.digest('hex');
console.log('Expected signature:', expectedSignature);

// Compare
console.log('Match:', signature === expectedSignature);
```

#### 3. Duplicate Webhooks

**Symptoms:** Same event processed multiple times

**Possible Causes:**
- LTCG retry logic (if your server didn't respond with 200)
- Your server crashed mid-processing

**Solutions:**
```javascript
// Implement idempotency tracking
const webhookId = `${payload.gameId}:${payload.timestamp}:${payload.eventType}`;
if (processedWebhooks.has(webhookId)) {
  return res.status(200).json({ received: true, duplicate: true });
}
processedWebhooks.add(webhookId);
```

#### 4. Webhook Disabled After Failures

**Symptoms:** Webhooks stop arriving after some failures

**Possible Causes:**
- Your server returned non-2xx status codes too many times
- Your server took too long to respond (timeout)
- LTCG auto-disabled webhook after 3 consecutive failures

**Solutions:**
```bash
# Check webhook status
curl -X GET "https://your-domain.com/api/webhooks/list?agentId=$AGENT_ID" \
  -H "Authorization: Bearer $API_KEY"

# Look for "isActive": false and "failureCount" > 0

# Re-enable by deleting and re-registering
curl -X DELETE "https://your-domain.com/api/webhooks/delete" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"webhookId": "k17webhook123", "agentId": "agent_xyz789"}'

# Register again
curl -X POST "https://your-domain.com/api/webhooks/register" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"agentId": "agent_xyz789", "events": ["turn_started"], "url": "https://your-server.com/webhooks/ltcg"}'
```

#### 5. Slow Webhook Processing

**Symptoms:** Webhooks arrive but processing is slow

**Solutions:**
- Acknowledge webhook immediately (return 200) before processing
- Process webhooks asynchronously in background queue
- Optimize database queries
- Use connection pooling

```javascript
// Good: Acknowledge immediately, process async
app.post('/webhooks/ltcg', async (req, res) => {
  const payload = req.body;

  // Quick validation
  if (!verifySignature(payload)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Acknowledge immediately
  res.status(200).json({ received: true });

  // Process asynchronously
  processWebhookAsync(payload).catch(console.error);
});
```

### Webhook Delivery Retries

LTCG automatically retries failed webhooks:
- **1st retry:** 1 second after failure
- **2nd retry:** 5 seconds after failure
- **3rd retry:** 15 seconds after failure
- **After 3 failures:** Webhook is disabled

**Best Practice:** Always return `200 OK` within 10 seconds to avoid retries.

### Testing Checklist

- [ ] Webhook URL is publicly accessible via HTTPS
- [ ] Signature verification is implemented correctly
- [ ] Timestamp validation prevents replay attacks
- [ ] Idempotency check prevents duplicate processing
- [ ] Server responds with 200 OK within 10 seconds
- [ ] Error handling is robust
- [ ] Logging captures webhook events for debugging

---

## Next Steps

1. **Test with webhook.site** to understand payload structure
2. **Implement signature verification** for production security
3. **Build your event handlers** to react to game events
4. **Monitor webhook delivery** and handle failures gracefully
5. **Scale your infrastructure** to handle multiple concurrent games

**Happy building!** For questions, consult the [API Testing Guide](./api-testing-guide.md) or contact LTCG support.
