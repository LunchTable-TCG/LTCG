# MCP Server Deployment Guide

This guide provides comprehensive instructions for deploying the LunchTable-TCG MCP HTTP server to various cloud platforms.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Vercel Deployment](#vercel-deployment)
- [Railway Deployment](#railway-deployment)
- [Docker Deployment](#docker-deployment)
- [Cloudflare Workers Deployment](#cloudflare-workers-deployment)
- [Environment Variables](#environment-variables)
- [Testing Deployed Endpoints](#testing-deployed-endpoints)
- [Monitoring and Debugging](#monitoring-and-debugging)
- [Scaling Considerations](#scaling-considerations)

---

## Prerequisites

Before deploying to any platform, ensure you have:

1. **LunchTable-TCG API Key** - Request from the LunchTable-TCG team
2. **Git repository** - Push code to GitHub, GitLab, or similar
3. **Platform account** - Vercel, Railway, Docker Hub, or Cloudflare
4. **Node.js/Bun runtime** - All platforms support Node.js 20+
5. **Build artifacts** - Run `bun run build` locally to verify builds succeed

### Local Verification

Before deploying, test the build locally:

```bash
cd packages/mcp-server

# Install dependencies
bun install

# Build TypeScript
bun run build

# Start HTTP server
MCP_TRANSPORT=http \
LTCG_API_KEY=test_key \
PORT=3000 \
bun run start:http

# Test in another terminal
curl http://localhost:3000/health
```

---

## Vercel Deployment

Vercel provides serverless Node.js deployment with automatic scaling.

### Option 1: Deploy from GitHub (Recommended)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to https://vercel.com/new
   - Select "Import Git Repository"
   - Choose your GitHub repo
   - Framework: Next.js (or Other)
   - Root Directory: `packages/mcp-server`

3. **Configure Build Settings**
   - Build Command: `bun run build`
   - Output Directory: `dist`
   - Install Command: `bun install`

4. **Add Environment Variables**
   - Click "Environment Variables"
   - Add the following:
     - `LTCG_API_KEY` (required) - Your API key
     - `LTCG_API_URL` (optional) - Default: `https://lunchtable.cards`
     - `MCP_API_KEY` (optional) - For client authentication
     - `ALLOWED_ORIGINS` (optional) - Default: `*`

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your server will be live at `https://<project-name>.vercel.app`

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from project root
cd /path/to/project
vercel

# Deploy specific package
vercel deploy packages/mcp-server

# Set environment variables
vercel env add LTCG_API_KEY
vercel env add LTCG_API_URL
vercel env add MCP_API_KEY
vercel env add ALLOWED_ORIGINS

# Deploy with production environment
vercel --prod
```

### Vercel Configuration

The `vercel.json` file handles:
- Node.js runtime configuration
- HTTP request routing to `http-server.js`
- Environment variables
- Build process

### Vercel Limitations

- **Request timeout:** 60 seconds (adjust if games take longer)
- **Payload size:** 4.5 MB max
- **Serverless function limits:** Cold starts may occur under low traffic
- **Streaming:** SSE not supported on free tier

### Vercel Monitoring

- **Logs:** https://vercel.com/dashboard → Select project → Deployments → View logs
- **Analytics:** Dashboard shows requests, response times, and errors
- **Error tracking:** Failed requests visible in logs

### Example: Production Deployment

```bash
# Set production environment variables
vercel env add LTCG_API_KEY --prod
vercel env add MCP_API_KEY --prod

# Deploy to production
vercel --prod

# Verify deployment
curl https://<project-name>.vercel.app/health
```

---

## Railway Deployment

Railway provides simple, developer-friendly deployments with excellent Bun support.

### Option 1: Deploy from GitHub

1. **Go to Railway**
   - https://railway.app/dashboard

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Authorize Railway to access your GitHub account
   - Select your repository

3. **Configure Deploy**
   - Railway auto-detects `package.json`
   - Root path: `packages/mcp-server`
   - Build command: Automatically detected as `bun run build`
   - Start command: `bun run start:http`

4. **Add Environment Variables**
   - Click "Add Variable"
   - Add:
     - `MCP_TRANSPORT=http`
     - `NODE_ENV=production`
     - `PORT=3000`
     - `LTCG_API_KEY=<your-api-key>`
     - `LTCG_API_URL=https://lunchtable.cards`
     - `MCP_API_KEY=<optional-key>`
     - `ALLOWED_ORIGINS=*`

5. **Deploy**
   - Railway automatically builds and deploys
   - Your app is live at `https://<project-name>.up.railway.app`

### Option 2: Deploy via Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link project
cd packages/mcp-server
railway link

# Add environment variables
railway variables set LTCG_API_KEY=your_key
railway variables set MCP_API_KEY=your_mcp_key

# Deploy
railway up

# View logs
railway logs --follow

# Monitor status
railway status
```

### Railway Configuration

The `railway.json` file specifies:
- NIXPACKS builder (auto-detects Node/Bun environment)
- Start command: `bun run start:http`
- Restart policy with automatic retries
- Environment variable templates

### Railway Features

- **Auto-restart:** Failed containers automatically restart
- **Persistent logs:** Up to 30 days of history
- **Custom domains:** Easily add your own domain
- **Environment separation:** Dev, staging, and production
- **Webhooks:** Deploy on GitHub push

### Railway Monitoring

```bash
# View real-time logs
railway logs --follow

# Check deployment status
railway status

# View environment variables
railway variables list

# Connect to container shell
railway shell
```

### Example: Production Setup

```bash
# Create separate production environment
railway environment create production

# Switch to production
railway environment production

# Set production variables
railway variables set LTCG_API_KEY=prod_key
railway variables set MCP_API_KEY=prod_mcp_key
railway variables set ALLOWED_ORIGINS="https://your-domain.com,https://api.your-domain.com"

# Deploy to production
railway up

# Monitor
railway logs --follow
```

---

## Docker Deployment

Deploy the MCP server as a Docker container on any infrastructure.

### Build Locally

```bash
# Navigate to MCP server directory
cd packages/mcp-server

# Build Docker image
docker build -t lunchtable-mcp:latest .

# Verify image
docker images | grep lunchtable-mcp

# Test locally
docker run -p 3000:3000 \
  -e LTCG_API_KEY=test_key \
  -e MCP_TRANSPORT=http \
  lunchtable-mcp:latest

# Test health check
curl http://localhost:3000/health
```

### Push to Docker Hub

```bash
# Tag image for Docker Hub
docker tag lunchtable-mcp:latest <username>/lunchtable-mcp:latest

# Login to Docker Hub
docker login

# Push image
docker push <username>/lunchtable-mcp:latest

# Pull on deployment server
docker pull <username>/lunchtable-mcp:latest
```

### Deploy on Docker

```bash
# Create container from image
docker run -d \
  --name mcp-server \
  -p 3000:3000 \
  -e LTCG_API_KEY=your_api_key \
  -e MCP_TRANSPORT=http \
  -e ALLOWED_ORIGINS=* \
  --restart unless-stopped \
  <username>/lunchtable-mcp:latest

# View logs
docker logs -f mcp-server

# Monitor status
docker ps | grep mcp-server

# Stop container
docker stop mcp-server

# Remove container
docker rm mcp-server
```

### Docker Compose

Create a `docker-compose.yml` for easier management:

```yaml
version: '3.8'

services:
  mcp-server:
    image: lunchtable-mcp:latest
    container_name: lunchtable-mcp
    ports:
      - "3000:3000"
    environment:
      MCP_TRANSPORT: http
      NODE_ENV: production
      PORT: 3000
      LTCG_API_KEY: ${LTCG_API_KEY}
      LTCG_API_URL: https://lunchtable.cards
      MCP_API_KEY: ${MCP_API_KEY}
      ALLOWED_ORIGINS: "*"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - mcp-network

networks:
  mcp-network:
    driver: bridge
```

Start with Docker Compose:

```bash
# Create .env file
echo "LTCG_API_KEY=your_api_key" > .env
echo "MCP_API_KEY=your_mcp_key" >> .env

# Start services
docker-compose up -d

# View logs
docker-compose logs -f mcp-server

# Stop services
docker-compose down
```

### Deploy on Kubernetes

Create `mcp-deployment.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mcp-config
data:
  MCP_TRANSPORT: "http"
  NODE_ENV: "production"
  LTCG_API_URL: "https://lunchtable.cards"
  ALLOWED_ORIGINS: "*"

---
apiVersion: v1
kind: Secret
metadata:
  name: mcp-secrets
type: Opaque
stringData:
  LTCG_API_KEY: "your_api_key"
  MCP_API_KEY: "your_mcp_key"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mcp-server
  template:
    metadata:
      labels:
        app: mcp-server
    spec:
      containers:
      - name: mcp-server
        image: lunchtable-mcp:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: mcp-config
        - secretRef:
            name: mcp-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

---
apiVersion: v1
kind: Service
metadata:
  name: mcp-server-service
spec:
  selector:
    app: mcp-server
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

Deploy to Kubernetes:

```bash
# Apply configuration
kubectl apply -f mcp-deployment.yaml

# Check deployment status
kubectl get deployments
kubectl get pods
kubectl get services

# View logs
kubectl logs -f deployment/mcp-server

# Scale deployment
kubectl scale deployment/mcp-server --replicas=3
```

### Dockerfile Details

The `Dockerfile` uses multi-stage builds:

1. **Builder stage:** Installs dependencies and compiles TypeScript
2. **Runtime stage:** Contains only compiled code and runtime dependencies
3. **Health checks:** Automatic health monitoring
4. **Optimized size:** Slim Bun image reduces container size

---

## Cloudflare Workers Deployment

Deploy on Cloudflare Workers for ultra-low latency global edge computing.

### Prerequisites

```bash
# Install Wrangler CLI
npm install -g @cloudflare/wrangler

# Login to Cloudflare
wrangler login
```

### Create Worker Project

```bash
# Create new worker project
wrangler init mcp-server-worker

# Choose options:
# - What type of application? → "Hello World" example
# - Which package manager? → bun or npm
```

### Wrangler Configuration

Create `wrangler.toml`:

```toml
name = "lunchtable-mcp-server"
main = "src/index.ts"
compatibility_date = "2025-02-01"

[env.production]
name = "lunchtable-mcp-server-prod"
route = "https://mcp.yourdomain.com/*"

[env.staging]
name = "lunchtable-mcp-server-staging"
route = "https://mcp-staging.yourdomain.com/*"

[[triggers.crons]]
cron = "0 */6 * * *"  # Health check every 6 hours

[build]
command = "bun run build"
cwd = "."
watch_paths = ["src/**/*.ts"]

[build.upload]
format = "service-worker"

[env.production.vars]
MCP_TRANSPORT = "http"
LTCG_API_URL = "https://lunchtable.cards"

[env.production.secrets]
LTCG_API_KEY = "your-production-key"
MCP_API_KEY = "your-production-mcp-key"
```

### Worker Code

Create `src/index.ts`:

```typescript
interface Env {
  LTCG_API_KEY: string;
  MCP_API_KEY?: string;
  LTCG_API_URL?: string;
  MCP_TRANSPORT: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Route to local MCP server or handle requests
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.startsWith("/mcp")) {
      // Authentication check
      if (env.MCP_API_KEY) {
        const auth = request.headers.get("Authorization");
        if (auth !== `Bearer ${env.MCP_API_KEY}`) {
          return new Response("Unauthorized", { status: 401 });
        }
      }

      // Forward to backend or handle MCP requests
      return new Response(JSON.stringify({ error: "Not implemented" }), {
        status: 501,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404 });
  },

  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    // Periodic health check to keep workers warm
    console.log("Scheduled health check");
  },
};
```

### Deploy to Cloudflare

```bash
# Deploy to staging
wrangler deploy --env staging

# Deploy to production
wrangler deploy --env production

# View deployment logs
wrangler tail --env production

# Check deployed worker
curl https://mcp.yourdomain.com/health
```

### Cloudflare KV Storage (Optional)

Add caching layer:

```toml
[[kv_namespaces]]
binding = "MCP_CACHE"
id = "your-kv-namespace-id"
```

Use in worker:

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cacheKey = `${request.method} ${request.url}`;

    // Try cache first
    const cached = await env.MCP_CACHE.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        headers: { "X-Cache": "HIT" },
      });
    }

    // Handle request
    const response = await handleRequest(request, env);

    // Cache successful responses for 5 minutes
    if (response.ok) {
      await env.MCP_CACHE.put(cacheKey, response.clone(), {
        expirationTtl: 300,
      });
    }

    return response;
  },
};

async function handleRequest(request: Request, env: Env) {
  // Your MCP server logic here
  return new Response("OK", { status: 200 });
}
```

### Cloudflare Advantages

- **Global edge network:** Automatic deployment to 200+ data centers
- **Zero cold starts:** Workers always ready
- **Low latency:** Serves from closest location to user
- **Unlimited scaling:** Automatic load balancing
- **CORS handling:** Native support for cross-origin requests

### Cloudflare Limitations

- **Execution time:** 50ms timeout on free tier (can extend with $5/mo)
- **Memory:** 128 MB limit
- **Large payloads:** Complex game states may exceed limits
- **Persistent connections:** WebSocket support limited

---

## Environment Variables

### Required Variables

```bash
# Your LunchTable-TCG API key (obtained from team)
LTCG_API_KEY=sk_live_xxxxxxxxxxxxx

# MCP server transport mode (always "http" for cloud)
MCP_TRANSPORT=http

# Node environment
NODE_ENV=production
```

### Optional Variables

```bash
# Base URL for LunchTable-TCG API
LTCG_API_URL=https://lunchtable.cards

# Optional API key to require for MCP clients
MCP_API_KEY=secret_key_for_clients

# CORS origins allowed (comma-separated)
ALLOWED_ORIGINS=https://client1.com,https://client2.com

# Server port (default: 3000)
PORT=3000

# For detailed logging
DEBUG=mcp:*
```

### Environment Variable Priority

1. **Platform-specific UI** (Vercel, Railway dashboards)
2. **Environment files** (`.env.production`, `.env.local`)
3. **Command-line flags** (when starting server)
4. **Default values** (specified in code)

### Securing Sensitive Variables

```bash
# Vercel - mark as sensitive
vercel env add LTCG_API_KEY --sensitive

# Railway - secret variables
railway variables set LTCG_API_KEY=value --secret

# Docker - use secrets file
docker run --secret ltcg_api_key \
  -e LTCG_API_KEY=/run/secrets/ltcg_api_key \
  lunchtable-mcp:latest

# Kubernetes - sealed secrets
kubectl create secret generic mcp-secrets \
  --from-literal=LTCG_API_KEY=value
```

---

## Testing Deployed Endpoints

### Health Check

```bash
# Basic health check
curl https://your-deployed-url.com/health

# Expected response:
# { "status": "ok" }
```

### Initialize MCP Session

```bash
# With authentication
curl -X POST https://your-deployed-url.com/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MCP_API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'

# Without authentication
curl -X POST https://your-deployed-url.com/mcp \
  -H "Content-Type: application/json" \
  -d '{ /* same payload */ }'
```

### List Available Tools

```bash
curl -X POST https://your-deployed-url.com/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MCP_API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
```

### Call MCP Tool

```bash
# Example: create_agent
curl -X POST https://your-deployed-url.com/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MCP_API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "create_agent",
      "arguments": {
        "name": "TestAgent",
        "starterDeckCode": "fire"
      }
    }
  }'
```

### Load Testing

```bash
# Using Apache Bench (ab)
ab -n 100 -c 10 https://your-deployed-url.com/health

# Using wrk (high-performance)
wrk -t12 -c400 -d30s https://your-deployed-url.com/health

# Using k6 (advanced)
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  let response = http.get('https://your-deployed-url.com/health');
  check(response, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
EOF

k6 run load-test.js
```

### Monitor Response Times

```bash
# Simple timing script
for i in {1..10}; do
  time curl -s https://your-deployed-url.com/health > /dev/null
done

# With curl timing details
curl -w "Time: %{time_total}s\n" https://your-deployed-url.com/health

# Monitor continuously
watch -n 1 'curl -w "Status: %{http_code} Time: %{time_total}s\n" -s -o /dev/null https://your-deployed-url.com/health'
```

---

## Monitoring and Debugging

### Vercel Monitoring

```bash
# View real-time logs
vercel logs --follow

# Download logs
vercel logs > deployment.log

# Check deployment status
vercel status

# View builds
vercel builds
```

### Railway Monitoring

```bash
# Real-time logs
railway logs --follow

# View metrics
railway metrics

# Check deployment status
railway status

# SSH into container
railway shell
```

### Docker Monitoring

```bash
# View container logs
docker logs -f mcp-server

# Monitor resource usage
docker stats mcp-server

# Inspect container
docker inspect mcp-server

# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Error Debugging

**Common Issues:**

1. **LTCG_API_KEY not set**
   ```
   Error: LTCG_API_KEY is required
   ```
   Solution: Add environment variable to platform

2. **Port already in use**
   ```
   Error: listen EADDRINUSE: address already in use :::3000
   ```
   Solution: Change PORT or stop conflicting service

3. **Timeout errors**
   ```
   Error: Request timeout after 60s
   ```
   Solution: Increase platform timeout or optimize query

4. **Memory limit exceeded**
   ```
   Error: JavaScript heap out of memory
   ```
   Solution: Increase memory allocation or optimize code

---

## Scaling Considerations

### Horizontal Scaling

**Vercel:**
- Automatic: Vercel scales across multiple serverless functions
- No configuration needed

**Railway:**
- Manual: `railway scale --replicas 3`
- Or in UI: Settings → Replica Count

**Docker/Kubernetes:**
- `docker-compose up -d --scale mcp-server=3`
- `kubectl scale deployment/mcp-server --replicas=3`

### Vertical Scaling

Increase resources per instance:

**Railway:**
- Dashboard → Settings → Memory/CPU

**Kubernetes:**
```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

### Database Connection Pooling

For Convex connections, configure connection limits:

```typescript
// In http-server.ts or http-transport.ts
const convexClient = new ConvexHttpClient(config.apiUrl);

// Reuse same client instance across requests
// Don't create new instances per request
```

### Caching Strategy

Implement caching to reduce API calls:

```typescript
const cache = new Map<string, { data: unknown; expiry: number }>();

function getCached(key: string) {
  const entry = cache.get(key);
  if (entry && entry.expiry > Date.now()) {
    return entry.data;
  }
  return null;
}

function setCached(key: string, data: unknown, ttl: number) {
  cache.set(key, { data, expiry: Date.now() + ttl });
}
```

### Rate Limiting

Add rate limiting to prevent abuse:

```bash
# Using express-rate-limit
npm install express-rate-limit

# Or Railway/Vercel built-in rate limiting
```

---

## Summary

| Platform | Pros | Cons | Best For |
|----------|------|------|----------|
| **Vercel** | Easy GitHub integration, auto-scaling, free tier | 60s timeout, serverless overhead | Simple deployments, public APIs |
| **Railway** | Excellent Bun support, simple UI, persistent logs | Smaller community, fewer integrations | Production workloads, simplicity |
| **Docker** | Full control, portable, Kubernetes-ready | Requires infrastructure management | Custom deployments, enterprise |
| **Cloudflare** | Global edge, zero cold starts, ultra-fast | Limited execution time and memory | Low-latency services, high traffic |

Choose based on:
- **Simplicity:** Vercel or Railway
- **Cost:** Docker (self-hosted) or Cloudflare (free tier)
- **Performance:** Cloudflare Workers
- **Control:** Docker or Kubernetes
- **Enterprise:** Railway or self-hosted Docker

For most use cases, **Railway** provides the best balance of simplicity, performance, and features.

---

## Support

- **Issues:** GitHub Issues
- **Documentation:** https://docs.lunchtable.cards/deploy
- **Discord:** https://discord.gg/lunchtable
- **Email:** support@lunchtable.cards
