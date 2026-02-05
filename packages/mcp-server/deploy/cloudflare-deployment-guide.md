# Cloudflare Workers Deployment Guide

Deploy the MCP server on Cloudflare Workers for global edge computing with ultra-low latency.

## Quick Start (10 minutes)

1. **Create Worker Project**
   ```bash
   npm install -g @cloudflare/wrangler
   wrangler init mcp-server
   ```

2. **Create Proxy Worker**
   ```bash
   wrangler create mcp-proxy
   ```

3. **Configure `wrangler.toml`**
   ```toml
   name = "mcp-proxy"
   main = "src/index.ts"
   compatibility_date = "2025-02-01"
   ```

4. **Add Environment Variables**
   ```bash
   wrangler secret put LTCG_API_KEY
   ```

5. **Deploy**
   ```bash
   wrangler deploy
   ```

## Detailed Setup

### Prerequisites

- Cloudflare account
- Wrangler CLI installed
- Node.js 16+ or Bun
- Domain on Cloudflare (optional)

### Installation

```bash
# Install Wrangler
npm install -g @cloudflare/wrangler

# Or with Bun
bun install -g @cloudflare/wrangler

# Verify installation
wrangler --version
```

### Authentication

```bash
# Login to Cloudflare
wrangler login

# Creates ~/.wrangler/config.toml with API token
# Grant permissions: Account: Workers Scripts, Zones: All

# Check authentication
wrangler whoami
```

### Project Structure

Create project:

```bash
wrangler init mcp-proxy

# Choose:
# - Language: TypeScript
# - Create a new project: Yes
```

Project structure:

```
mcp-proxy/
├── wrangler.toml
├── src/
│   ├── index.ts      # Main worker code
│   └── types.ts      # TypeScript definitions
├── package.json
├── tsconfig.json
└── .gitignore
```

## Worker Implementation

### Basic Proxy

Create `src/index.ts`:

```typescript
interface Env {
  // Secrets (set via `wrangler secret put`)
  LTCG_API_KEY: string;
  MCP_API_KEY?: string;
  LTCG_API_URL?: string;

  // KV namespace (optional)
  MCP_CACHE?: KVNamespace;

  // Durable Objects (optional)
  MCP_STATE?: DurableObjectNamespace;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // Routes
    if (url.pathname === "/health") {
      return handleHealth(env);
    }

    if (url.pathname.startsWith("/mcp")) {
      return handleMCP(request, env);
    }

    return new Response("Not Found", { status: 404 });
  },

  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    // Periodic tasks (health checks, cache cleanup, etc.)
    console.log("Scheduled event triggered");
  },
};

async function handleHealth(env: Env): Promise<Response> {
  return new Response(
    JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

async function handleMCP(
  request: Request,
  env: Env
): Promise<Response> {
  // Authentication
  const authHeader = request.headers.get("Authorization");
  if (env.MCP_API_KEY) {
    const expectedAuth = `Bearer ${env.MCP_API_KEY}`;
    if (authHeader !== expectedAuth) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // Forward to backend MCP server
  const backendUrl = env.LTCG_API_URL || "https://lunchtable.cards";

  try {
    const response = await fetch(`${backendUrl}/mcp`, {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        "X-Forwarded-By": "cloudflare-worker",
        "X-Forwarded-For": request.headers.get("CF-Connecting-IP") || "",
      },
      body: request.method === "GET" ? undefined : request.body,
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        "Access-Control-Allow-Origin": "*",
        "X-Cache": response.headers.get("X-Cache") || "MISS",
      },
    });
  } catch (error) {
    console.error("MCP error:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

### Advanced: With KV Caching

Add caching layer:

Update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "MCP_CACHE"
id = "your-kv-namespace-id"
preview_id = "your-kv-preview-namespace-id"
```

Create KV namespace:

```bash
wrangler kv:namespace create "MCP_CACHE"
wrangler kv:namespace create "MCP_CACHE" --preview
```

Update `src/index.ts`:

```typescript
async function handleMCP(
  request: Request,
  env: Env
): Promise<Response> {
  // Only cache GET requests
  if (request.method === "GET") {
    const cacheKey = `mcp:${request.url}`;
    const cached = await env.MCP_CACHE?.get(cacheKey);

    if (cached) {
      return new Response(cached, {
        headers: {
          "Content-Type": "application/json",
          "X-Cache": "HIT",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  }

  // Forward request
  const response = await forwardToBackend(request, env);

  // Cache successful GET responses for 5 minutes
  if (request.method === "GET" && response.ok) {
    const cacheKey = `mcp:${request.url}`;
    const body = await response.clone().text();
    await env.MCP_CACHE?.put(cacheKey, body, { expirationTtl: 300 });
  }

  return response;
}

async function forwardToBackend(
  request: Request,
  env: Env
): Promise<Response> {
  // ... forwarding logic ...
}
```

### With Rate Limiting

```typescript
interface RateLimit {
  count: number;
  resetTime: number;
}

async function checkRateLimit(
  clientIp: string,
  env: Env,
  limit: number = 100,
  window: number = 60
): Promise<boolean> {
  const key = `rate:${clientIp}`;
  const stored = await env.MCP_CACHE?.get(key);

  let data: RateLimit;
  if (stored) {
    data = JSON.parse(stored);
    if (data.resetTime < Date.now()) {
      data = { count: 0, resetTime: Date.now() + window * 1000 };
    }
  } else {
    data = { count: 0, resetTime: Date.now() + window * 1000 };
  }

  data.count++;
  await env.MCP_CACHE?.put(key, JSON.stringify(data), {
    expirationTtl: window,
  });

  return data.count <= limit;
}
```

## Configuration

### wrangler.toml

Comprehensive configuration:

```toml
name = "mcp-proxy"
main = "src/index.ts"
compatibility_date = "2025-02-01"
compatibility_flags = ["nodejs_compat"]

# Triggers
[triggers]
crons = ["0 */6 * * *"]  # Every 6 hours

# Build configuration
[build]
command = "npm run build"
cwd = "."

[build.upload]
format = "modules"
main = "./src/index.ts"

# Environment variables (non-sensitive)
[env.production]
name = "mcp-proxy-production"
route = "https://mcp.yourdomain.com/*"
zone_id = "your-zone-id"

[env.production.vars]
LTCG_API_URL = "https://api.lunchtable.cards"
DEBUG = "false"

# KV Namespaces
[[kv_namespaces]]
binding = "MCP_CACHE"
id = "kv-namespace-id"
preview_id = "kv-preview-namespace-id"

# Durable Objects
[[durable_objects.bindings]]
name = "MCP_STATE"
class_name = "MCPState"
script_name = "mcp-proxy"
environment = "production"

# Analytics Engine
[[analytics_engine_datasets]]

# Build watch paths
watch_paths = ["src/**/*.ts"]

# Limits
limits = {
  cpu_ms = 50
}
```

### Environment Variables

Set secrets:

```bash
# Production API key
wrangler secret put LTCG_API_KEY

# MCP authentication key
wrangler secret put MCP_API_KEY

# Verify secrets
wrangler secret list

# Delete secret
wrangler secret delete LTCG_API_KEY
```

View secrets (no values shown):

```bash
wrangler secret list

# Output:
# [
#   {
#     "name": "LTCG_API_KEY",
#     "type": "secret_text"
#   },
#   {
#     "name": "MCP_API_KEY",
#     "type": "secret_text"
#   }
# ]
```

## Deployment

### Local Development

```bash
# Start development server (localhost:8787)
wrangler dev

# With debugging
wrangler dev --debug

# Tail live logs
wrangler tail

# Tail specific environment
wrangler tail --env production
```

### Deploy to Staging

```bash
# Deploy with preview environment
wrangler deploy --env staging

# Staging URL appears in output
# https://mcp-proxy-staging.your-worker.dev
```

### Deploy to Production

```bash
# Deploy to production
wrangler deploy --env production

# Verify deployment
curl https://mcp.yourdomain.com/health

# View production logs
wrangler tail --env production
```

### Rollback

Cloudflare Workers automatically versions deployments:

```bash
# View deployment history
wrangler deployments list

# View specific deployment details
wrangler deployments view <id>

# Automatic rollback: Deploy previous version
git checkout <previous-commit>
wrangler deploy
```

## Custom Domain

### Setup

1. **Add domain to Cloudflare**
   - Go to cloudflare.com/dashboard
   - Add Site
   - Update nameservers at registrar
   - Wait for SSL activation

2. **Route to Worker**
   - Update `wrangler.toml`:
     ```toml
     [env.production]
     route = "https://mcp.yourdomain.com/*"
     zone_id = "your-zone-id"
     ```

3. **Get Zone ID**
   ```bash
   # From Cloudflare dashboard: Account Home → Select domain → Right sidebar
   # Or via API:
   curl https://api.cloudflare.com/client/v4/zones \
     -H "Authorization: Bearer YOUR_TOKEN" | jq '.result[] | {name: .name, id: .id}'
   ```

4. **Redeploy**
   ```bash
   wrangler deploy --env production
   ```

## Monitoring

### Logs

```bash
# Real-time tail
wrangler tail

# Tail specific worker
wrangler tail mcp-proxy

# Tail production environment
wrangler tail --env production

# Export logs
wrangler tail > logs.txt

# Filter by status
wrangler tail --status 500
```

### Analytics

Access in Cloudflare dashboard:

- Workers → mcp-proxy → Analytics
- Request count, errors, response times
- CPU time usage
- Cache hit ratio

### Errors

```bash
# View recent errors
wrangler tail --status 400-599

# Debug specific error
wrangler dev --debug
# Make request that causes error
# View stack trace
```

## Performance Optimization

### KV Cache Strategy

```typescript
// Cache GET requests only
if (request.method === "GET") {
  const cached = await env.MCP_CACHE?.get(cacheKey);
  if (cached) return cached;
}

// Different TTL for different endpoints
const ttl = url.pathname.includes("/health") ? 60 : 300;
await env.MCP_CACHE?.put(key, value, { expirationTtl: ttl });
```

### Request Size Optimization

Cloudflare has size limits. Optimize responses:

```typescript
// Gzip compression (auto-handled by Cloudflare)
// But you can control:
const response = new Response(compressedBody, {
  headers: {
    "Content-Encoding": "gzip",
    "Content-Type": "application/json",
  },
});
```

### Execution Time

Cloudflare timeout: 50ms free tier (upgrade for more)

Optimize:

1. Move heavy computation to backend
2. Cache aggressively
3. Use KV for state
4. Minimize external API calls

```typescript
// Timeout-safe wrapper
async function withTimeout<T>(
  promise: Promise<T>,
  ms: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), ms)
    ),
  ]);
}

const response = await withTimeout(
  forwardToBackend(request, env),
  40 // Leave 10ms buffer
);
```

## Cost Analysis

**Cloudflare Workers Pricing (as of 2025):**

- Free tier: 100,000 requests/day
- Paid tier ($5/month): 10 million requests/month
- Per-request: Free tier unlimited, paid tier $0.50/million extra

**Bandwidth:**
- Ingress: Free
- Egress: Included in Workers plan (varies by tier)

**Additional Services:**
- KV Storage: $0.50/million reads, $5/million writes
- Durable Objects: $0.15/hour

**Example Calculation (Small Deployment):**
- 1M requests/month
- Average 100KB response (Egress: ~100 GB)
- KV: 1M reads/month, 100K writes/month
- **Total: $5 (Workers) + $0.50 (KV) + $10 (Egress) = ~$15.50/month**

Compare to alternatives:
- Vercel: $20-100/month for equivalent
- Railway: $10-15/month for equivalent
- AWS Lambda: $10-50/month for equivalent

**Recommendation:** Cloudflare best for:
- Low to moderate traffic
- Global low-latency requirement
- Budget-conscious deployments

## Scaling Strategy

### Horizontal Scaling

Cloudflare automatically distributes:
- Requests across global edge network (200+ data centers)
- Automatic load balancing
- No configuration needed

Check distribution in dashboard:
- Workers → Analytics → Requests by Region

### Vertical Scaling

Upgrade Workers plan:
- Free: 100K requests/day
- Paid: 10M requests/month, priority execution, higher CPU limits

### Backend Scaling

If worker becomes bottleneck:

1. Keep heavy computation in backend
2. Cache aggressively in KV
3. Use Durable Objects for stateful processing
4. Consider hybrid deployment:
   - Worker handles requests
   - Backend does heavy lifting
   - KV provides distributed cache

## Advanced Features

### Durable Objects

For stateful operations (session management, rate limiting):

```typescript
export class MCPState {
  state: any;
  env: any;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    // Handle request, maintain state
    return new Response("OK");
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const id = env.MCP_STATE?.idFromName("default");
    const stub = env.MCP_STATE?.get(id);
    return stub?.fetch(request);
  },
};
```

### Analytics Engine

Send custom analytics:

```typescript
const analytics = {
  endpoint: url.pathname,
  method: request.method,
  status: response.status,
  duration: Date.now() - start,
};

// Send to Analytics Engine
// Available in paid plans
```

### Page Rules

Configure caching behavior:

- Dashboard → Rules → Page Rules
- Cache level, TTL, browser caching
- Bypass cache for specific paths

## Troubleshooting

### Deploy Fails

**Error:** "Unable to upload script"

Solution:
- Check file size (< 1 MB)
- Remove large dependencies
- Use build optimization

### Worker Times Out

**Error:** "Script execution exceeded resource limits"

Solution:
- Reduce computation in worker
- Use KV caching
- Defer to backend service

### Rate Limiting Issues

**Error:** "Too many requests"

Solution:
- Check Cloudflare rate limits
- Implement exponential backoff
- Upgrade plan

### KV Quota Exceeded

**Error:** "KV quota exceeded"

Solution:
- Clean up old entries
- Reduce TTL
- Upgrade plan

## Success Indicators

Your deployment is working when:

1. **Health Check Passes**
   ```bash
   curl https://mcp.yourdomain.com/health
   # Returns: { "status": "ok" }
   ```

2. **Dashboard Shows Activity**
   - Workers → Analytics
   - Requests visible
   - No errors

3. **Global Latency Low**
   - Test from different regions
   - Response times < 100ms typically

4. **Log Tail Shows Requests**
   ```bash
   wrangler tail
   # Requests visible
   ```

## Next Steps

1. **Monitor Performance**
   ```bash
   wrangler tail
   ```

2. **Optimize Cache Hit Rate**
   - Adjust TTL
   - Analyze miss patterns
   - Add KV caching

3. **Add Advanced Features**
   - Rate limiting
   - Authentication
   - Request logging

4. **Scale Backend**
   - If worker becomes bottleneck
   - Upgrade backend infrastructure

## FAQ

**Q: Can I run the full MCP server on Workers?**
A: Not directly (50ms timeout). Use as proxy only.

**Q: What's the execution limit?**
A: 50ms free tier, 30s paid tier.

**Q: Can I use databases?**
A: Yes, via Cloudflare D1 (SQLite) or external APIs.

**Q: Is there a free tier?**
A: Yes, 100K requests/day free.

**Q: Can I use custom domains?**
A: Yes, requires Cloudflare nameservers.

**Q: How do I debug?**
A: Use `wrangler dev` for local testing.

## Support

- **Docs:** https://developers.cloudflare.com/workers
- **Community:** https://community.cloudflare.com
- **Discord:** Cloudflare Workers Discord
- **Support:** https://support.cloudflare.com
