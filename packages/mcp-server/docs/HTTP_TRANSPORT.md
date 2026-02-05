# HTTP Transport Deep Dive

This document provides comprehensive technical details on the HTTP transport implementation for the LunchTable-TCG MCP server, based on the Model Context Protocol (MCP) Streamable HTTP specification (version 2025-03-26).

## Table of Contents

- [Protocol Overview](#protocol-overview)
- [Session Management](#session-management)
- [Authentication](#authentication)
- [CORS Configuration](#cors-configuration)
- [API Endpoints](#api-endpoints)
- [Request/Response Flow](#requestresponse-flow)
- [Error Handling](#error-handling)
- [Performance Considerations](#performance-considerations)
- [Load Balancing and Scaling](#load-balancing-and-scaling)
- [Security Best Practices](#security-best-practices)

## Protocol Overview

The HTTP transport implements the MCP Streamable HTTP protocol, which provides a JSON-RPC 2.0 interface over HTTP/HTTPS. This allows MCP servers to be deployed remotely and accessed by multiple clients over the network.

### Key Features

- **Stateful Sessions**: Session IDs track client connections and maintain state
- **JSON-RPC 2.0**: Standard protocol for method calls and responses
- **RESTful Endpoints**: HTTP methods map to operations (POST for RPC, DELETE for session termination)
- **CORS Support**: Cross-origin resource sharing for browser-based clients
- **Bearer Token Authentication**: Optional API key authentication for secure deployments

### Protocol Version

The implementation follows the **MCP 2025-03-26** specification, with protocol version negotiation during the `initialize` handshake.

## Session Management

Sessions track client connections and maintain state between requests. Each session has a unique identifier that clients must include in subsequent requests.

### Session Lifecycle

```
┌──────────────┐
│   Client     │
└──────┬───────┘
       │
       │ 1. POST /mcp (initialize)
       ▼
┌──────────────────────────────────┐
│  Server creates session          │
│  Returns: Mcp-Session-Id header  │
└──────┬───────────────────────────┘
       │
       │ 2. POST /mcp (with session ID)
       │    All subsequent requests
       ▼
┌──────────────────────────────────┐
│  Server validates session        │
│  Updates last activity           │
│  Processes request               │
└──────┬───────────────────────────┘
       │
       │ 3. DELETE /mcp (optional)
       ▼
┌──────────────────────────────────┐
│  Server terminates session       │
│  Cleans up resources             │
└──────────────────────────────────┘
```

### Session Properties

```typescript
interface SessionData {
  id: string;           // UUID v4 session identifier
  createdAt: number;    // Timestamp (milliseconds since epoch)
  lastActivity: number; // Last request timestamp
}
```

### Session Timeout

- **Default timeout**: 1 hour (3,600,000 milliseconds)
- **Activity tracking**: Every request updates `lastActivity`
- **Cleanup interval**: Expired sessions are removed every 5 minutes
- **Timeout behavior**: Sessions exceeding timeout are deleted; clients must reinitialize

### Session ID Format

Session IDs are cryptographically secure UUID v4 identifiers:

```
Example: "550e8400-e29b-41d4-a716-446655440000"
```

### Session Storage

The current implementation uses **in-memory storage** with a JavaScript `Map`:

```typescript
const sessions = new Map<string, SessionData>();
```

#### Production Considerations

For production deployments with multiple server instances, consider:

1. **Redis** - Distributed session storage
2. **Memcached** - Fast in-memory cache with TTL support
3. **Database** - Persistent session storage (PostgreSQL, MongoDB)

Example Redis integration:

```typescript
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function createSession(): Promise<SessionData> {
  const sessionId = crypto.randomUUID();
  const session = {
    id: sessionId,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };

  // Store with 1 hour TTL
  await redis.setex(
    `mcp:session:${sessionId}`,
    3600,
    JSON.stringify(session)
  );

  return session;
}
```

## Authentication

The HTTP transport supports **Bearer token authentication** for securing access to the MCP server.

### Authentication Flow

```
Client Request
│
├─ Header: Authorization: Bearer YOUR_MCP_API_KEY
│
▼
┌──────────────────────────────────┐
│  Server validates API key        │
│  If MCP_API_KEY is set:          │
│    - Compare with provided key   │
│    - Reject if mismatch          │
│  If MCP_API_KEY not set:         │
│    - Allow all requests          │
└──────┬───────────────────────────┘
       │
       ▼
   Process Request
```

### Configuration

```bash
# Enable authentication (recommended for production)
MCP_API_KEY=your_secret_key_here

# Disable authentication (development only)
# Omit MCP_API_KEY or leave it empty
```

### Request Headers

```http
POST /mcp HTTP/1.1
Host: your-mcp-server.com
Content-Type: application/json
Authorization: Bearer your_secret_key_here
Mcp-Session-Id: 550e8400-e29b-41d4-a716-446655440000
```

### Authentication Errors

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32600,
    "message": "Unauthorized: Invalid or missing API key"
  }
}
```

HTTP Status: `401 Unauthorized`

### API Key Best Practices

1. **Use strong, random keys**: Minimum 32 characters, cryptographically random
2. **Rotate regularly**: Change keys every 30-90 days
3. **Store securely**: Use environment variables, never commit to version control
4. **Separate keys per environment**: Different keys for dev, staging, production
5. **Implement rate limiting**: Protect against brute force attacks

### Generating Secure API Keys

```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Using Bun
bun -e "console.log(Bun.hash.base64(crypto.getRandomValues(new Uint8Array(32))))"
```

## CORS Configuration

Cross-Origin Resource Sharing (CORS) allows browser-based clients to access the MCP server from different origins.

### CORS Headers

The server sets the following CORS headers:

| Header | Purpose | Value |
|--------|---------|-------|
| `Access-Control-Allow-Origin` | Allowed origins | Configured via `ALLOWED_ORIGINS` |
| `Access-Control-Allow-Methods` | Allowed HTTP methods | `GET, POST, DELETE, OPTIONS` |
| `Access-Control-Allow-Headers` | Allowed request headers | `Content-Type, Authorization, Mcp-Session-Id, Last-Event-ID` |
| `Access-Control-Expose-Headers` | Headers exposed to client | `Mcp-Session-Id` |
| `Access-Control-Allow-Credentials` | Allow cookies/auth | `true` |

### Configuration Options

```bash
# Allow all origins (development only)
ALLOWED_ORIGINS=*

# Allow specific origins (production)
ALLOWED_ORIGINS=https://app.example.com,https://agent.example.com

# Allow localhost (local development)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Preflight Requests

The server handles `OPTIONS` preflight requests automatically:

```http
OPTIONS /mcp HTTP/1.1
Origin: https://app.example.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: authorization,content-type
```

Response:

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, Mcp-Session-Id, Last-Event-ID
Access-Control-Max-Age: 86400
```

### DNS Rebinding Protection

The CORS middleware validates the `Origin` header to prevent DNS rebinding attacks:

```typescript
cors({
  origin: (origin) => {
    // Only allow configured origins
    if (config.allowedOrigins.includes('*')) {
      return origin || '*';
    }
    if (origin && config.allowedOrigins.includes(origin)) {
      return origin;
    }
    // Reject if not in allow list
    return config.allowedOrigins[0] || '*';
  }
})
```

## API Endpoints

### POST /mcp

Main JSON-RPC endpoint for all MCP operations.

**Request:**

```http
POST /mcp HTTP/1.1
Host: your-mcp-server.com
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
Mcp-Session-Id: SESSION_ID

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

**Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json
Mcp-Session-Id: SESSION_ID

{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [...]
  }
}
```

**Special Cases:**

- **Notifications** (no `id` field): Return `202 Accepted` with empty body
- **Batch requests**: Array of requests → Array of responses
- **Initialize method**: Creates new session, returns `Mcp-Session-Id` header

### DELETE /mcp

Terminates an active session.

**Request:**

```http
DELETE /mcp HTTP/1.1
Host: your-mcp-server.com
Mcp-Session-Id: SESSION_ID
```

**Response:**

```http
HTTP/1.1 204 No Content
```

### GET /health

Health check endpoint for monitoring and load balancer probes.

**Request:**

```http
GET /health HTTP/1.1
Host: your-mcp-server.com
```

**Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "healthy",
  "transport": "http",
  "sessions": 5
}
```

**Fields:**

- `status`: Always "healthy" if server is running
- `transport`: Always "http" for HTTP mode
- `sessions`: Current number of active sessions

## Request/Response Flow

### Complete Workflow Example

```typescript
// 1. Initialize session
const initResponse = await fetch('https://mcp.example.com/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: {
        name: 'my-agent',
        version: '1.0.0'
      }
    }
  })
});

// Extract session ID
const sessionId = initResponse.headers.get('Mcp-Session-Id');

// 2. List available tools
const toolsResponse = await fetch('https://mcp.example.com/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY',
    'Mcp-Session-Id': sessionId
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list'
  })
});

const tools = await toolsResponse.json();

// 3. Call a tool
const callResponse = await fetch('https://mcp.example.com/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY',
    'Mcp-Session-Id': sessionId
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'list_lobbies',
      arguments: { mode: 'casual' }
    }
  })
});

const result = await callResponse.json();

// 4. Clean up session
await fetch('https://mcp.example.com/mcp', {
  method: 'DELETE',
  headers: {
    'Mcp-Session-Id': sessionId
  }
});
```

### Batch Requests

Send multiple JSON-RPC requests in a single HTTP request:

```json
[
  {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  },
  {
    "jsonrpc": "2.0",
    "id": 2,
    "method": "prompts/list"
  }
]
```

Response:

```json
[
  {
    "jsonrpc": "2.0",
    "id": 1,
    "result": { "tools": [...] }
  },
  {
    "jsonrpc": "2.0",
    "id": 2,
    "result": { "prompts": [...] }
  }
]
```

## Error Handling

### JSON-RPC Error Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `-32700` | Parse error | Invalid JSON was received |
| `-32600` | Invalid Request | The JSON sent is not a valid Request object |
| `-32601` | Method not found | The method does not exist / is not available |
| `-32602` | Invalid params | Invalid method parameter(s) |
| `-32603` | Internal error | Internal JSON-RPC error |
| `-32000` to `-32099` | Server error | Reserved for implementation-defined server-errors |

### HTTP Status Codes

| Status | When Used |
|--------|-----------|
| `200 OK` | Successful JSON-RPC request |
| `202 Accepted` | Notification processed (no response) |
| `204 No Content` | Session deleted successfully |
| `400 Bad Request` | Invalid JSON or malformed request |
| `401 Unauthorized` | Missing or invalid API key |
| `404 Not Found` | Invalid session or endpoint not found |
| `405 Method Not Allowed` | Unsupported HTTP method |
| `500 Internal Server Error` | Server error during processing |

### Error Response Format

```json
{
  "jsonrpc": "2.0",
  "id": null,
  "error": {
    "code": -32600,
    "message": "Invalid session"
  }
}
```

### Error Handling Best Practices

1. **Log errors server-side**: Track all errors for debugging
2. **Return user-friendly messages**: Don't expose internal details
3. **Use appropriate HTTP status codes**: Follow REST conventions
4. **Include request ID in logs**: For tracing across distributed systems
5. **Implement error monitoring**: Use tools like Sentry, DataDog, etc.

## Performance Considerations

### Connection Reuse

Reuse HTTP connections with keep-alive:

```typescript
const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 50
});

fetch(url, { agent });
```

### Session Caching

Cache session IDs client-side to avoid re-initialization:

```typescript
class McpClient {
  private sessionId?: string;

  async request(method: string, params?: any) {
    if (!this.sessionId) {
      await this.initialize();
    }
    // Use cached sessionId
    return this.send(method, params);
  }
}
```

### Request Batching

Batch multiple requests to reduce HTTP overhead:

```typescript
// Instead of 3 HTTP requests
await call('tools/list');
await call('prompts/list');
await call('resources/list');

// Do 1 batched request
await batchCall([
  { method: 'tools/list' },
  { method: 'prompts/list' },
  { method: 'resources/list' }
]);
```

### Response Compression

Enable gzip compression in your reverse proxy (Nginx, Cloudflare):

```nginx
gzip on;
gzip_types application/json;
gzip_min_length 1000;
```

### Timeout Configuration

Set appropriate timeouts:

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

try {
  const response = await fetch(url, {
    signal: controller.signal
  });
} finally {
  clearTimeout(timeout);
}
```

## Load Balancing and Scaling

### Horizontal Scaling

Deploy multiple MCP server instances behind a load balancer:

```
                  ┌─────────────────┐
     Client  ────▶│  Load Balancer  │
                  └────────┬────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
    ┌──────────┐     ┌──────────┐     ┌──────────┐
    │  MCP #1  │     │  MCP #2  │     │  MCP #3  │
    └────┬─────┘     └────┬─────┘     └────┬─────┘
         │                │                │
         └────────────────┼────────────────┘
                          ▼
                  ┌───────────────┐
                  │  Redis/DB     │  (Shared session storage)
                  └───────────────┘
```

### Session Affinity (Sticky Sessions)

Configure load balancer to route requests from the same client to the same server:

**Nginx:**

```nginx
upstream mcp_servers {
  ip_hash;  # Session affinity by client IP
  server mcp1.example.com:3000;
  server mcp2.example.com:3000;
  server mcp3.example.com:3000;
}

server {
  listen 443 ssl;
  server_name mcp.example.com;

  location /mcp {
    proxy_pass http://mcp_servers;
    proxy_set_header Mcp-Session-Id $http_mcp_session_id;
  }
}
```

**AWS Application Load Balancer:**

- Enable "Stickiness" in target group settings
- Duration: 1 hour (matches session timeout)
- Type: Application-based cookies

### Auto-Scaling

Scale based on metrics:

- **Active sessions**: Scale when sessions > threshold
- **CPU usage**: Scale when CPU > 70%
- **Request rate**: Scale when requests/sec > threshold
- **Response time**: Scale when p95 latency > target

**Example Kubernetes HPA:**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ltcg-mcp-server
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ltcg-mcp-server
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Security Best Practices

### 1. Always Use HTTPS in Production

```bash
# Never deploy with plain HTTP
# ❌ Bad
http://mcp.example.com

# ✅ Good
https://mcp.example.com
```

### 2. Implement Rate Limiting

Protect against DDoS and abuse:

```typescript
import rateLimit from 'hono-rate-limiter';

app.use('/mcp', rateLimit({
  windowMs: 60 * 1000,      // 1 minute
  max: 100,                  // 100 requests per window
  message: 'Too many requests'
}));
```

### 3. Validate Input Thoroughly

Never trust client input:

```typescript
// Validate JSON-RPC structure
if (!body.jsonrpc || body.jsonrpc !== '2.0') {
  return error('Invalid JSON-RPC version');
}

// Validate method names (prevent injection)
const allowedMethods = ['initialize', 'tools/list', 'tools/call'];
if (!allowedMethods.includes(body.method)) {
  return error('Method not allowed');
}
```

### 4. Set Security Headers

```typescript
app.use('*', async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  return next();
});
```

### 5. Monitor and Log Security Events

Log authentication failures, invalid sessions, and suspicious activity:

```typescript
console.error('[SECURITY] Invalid API key attempt from:', clientIP);
console.error('[SECURITY] Session ID not found:', sessionId);
console.error('[SECURITY] Origin not allowed:', origin);
```

### 6. Implement Request Signing (Advanced)

For highly sensitive deployments, implement HMAC request signing:

```typescript
const signature = crypto
  .createHmac('sha256', secretKey)
  .update(JSON.stringify(requestBody))
  .digest('hex');

headers['X-Request-Signature'] = signature;
```

### 7. Regular Security Audits

- Update dependencies regularly: `bun update`
- Scan for vulnerabilities: `npm audit` or `snyk test`
- Review access logs for suspicious patterns
- Rotate API keys every 30-90 days

---

For deployment guides and platform-specific configuration, see [DEPLOYMENT.md](./DEPLOYMENT.md).

For general MCP server documentation, see [README.md](../README.md).
