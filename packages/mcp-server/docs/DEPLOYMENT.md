# Production Deployment Guide

This guide covers deploying the LunchTable-TCG MCP server to various cloud platforms with production-ready configurations.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Vercel Deployment](#vercel-deployment)
- [Railway Deployment](#railway-deployment)
- [Docker Deployment](#docker-deployment)
- [Fly.io Deployment](#flyio-deployment)
- [AWS EC2 Deployment](#aws-ec2-deployment)
- [Environment Configuration](#environment-configuration)
- [Custom Domain Setup](#custom-domain-setup)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Monitoring and Logging](#monitoring-and-logging)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying, ensure you have:

1. **LunchTable-TCG API Key** - Obtain from [lunchtable.cards](https://lunchtable.cards)
2. **MCP Server Built** - Run `bun run build` in the package directory
3. **Git Repository** - Code pushed to GitHub, GitLab, or Bitbucket
4. **Node.js/Bun** - For local testing before deployment

### Pre-Deployment Checklist

- [ ] API keys generated and stored securely
- [ ] Environment variables documented
- [ ] Project built successfully (`bun run build`)
- [ ] HTTP mode tested locally (`MCP_TRANSPORT=http bun run start:http`)
- [ ] CORS origins configured for production domains
- [ ] Health check endpoint tested (`/health`)

## Vercel Deployment

Vercel provides serverless deployment with automatic scaling and global edge network.

### Step-by-Step Deployment

**1. Install Vercel CLI**

```bash
npm install -g vercel
# or
bun add -g vercel
```

**2. Login to Vercel**

```bash
vercel login
```

**3. Initialize Project**

```bash
cd packages/mcp-server
vercel init
```

**4. Configure Environment Variables**

```bash
# Required variables
vercel env add LTCG_API_KEY production
# Enter your API key when prompted

vercel env add MCP_TRANSPORT production
# Enter: http

# Optional: API key authentication
vercel env add MCP_API_KEY production
# Enter: your_generated_mcp_key

# Optional: CORS configuration
vercel env add ALLOWED_ORIGINS production
# Enter: https://your-frontend.com,https://app.example.com
```

**5. Deploy to Production**

```bash
vercel --prod
```

**6. Verify Deployment**

```bash
# Test health endpoint
curl https://your-project.vercel.app/health

# Test MCP endpoint
curl -X POST https://your-project.vercel.app/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MCP_API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'
```

### Vercel Configuration File

Create `vercel.json` in the package root:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/health",
      "dest": "dist/index.js"
    },
    {
      "src": "/mcp",
      "dest": "dist/index.js",
      "methods": ["GET", "POST", "DELETE", "OPTIONS"]
    }
  ],
  "env": {
    "MCP_TRANSPORT": "http"
  }
}
```

### Vercel Limitations

- **Serverless Functions**: 10-second timeout (Hobby), 60-second timeout (Pro)
- **Cold Starts**: Initial requests may be slower
- **Memory**: 1024 MB default (configurable up to 3008 MB on Pro)
- **Stateless**: Sessions require external storage (Redis) for multi-region

### Vercel Best Practices

1. **Use Edge Functions** for lowest latency (if supported)
2. **Configure regions** close to your users
3. **Enable caching** for static responses
4. **Monitor function execution** in Vercel dashboard
5. **Set up alerts** for errors and high latency

## Railway Deployment

Railway provides container-based hosting with built-in databases and automatic deployments.

### Step-by-Step Deployment

**1. Install Railway CLI**

```bash
npm install -g railway
# or
brew install railway
```

**2. Login to Railway**

```bash
railway login
```

**3. Initialize Project**

```bash
cd packages/mcp-server
railway init
```

**4. Link to GitHub Repository (Optional but Recommended)**

```bash
railway link
```

**5. Configure Environment Variables**

```bash
# Set environment variables
railway variables set LTCG_API_KEY=your_api_key_here
railway variables set MCP_TRANSPORT=http
railway variables set PORT=3000
railway variables set MCP_API_KEY=your_mcp_key
railway variables set ALLOWED_ORIGINS=https://app.example.com
```

**6. Deploy**

```bash
# Manual deployment
railway up

# Or enable automatic deployments from GitHub
# (Configured in Railway dashboard)
```

**7. Get Deployment URL**

```bash
railway domain
```

**8. Verify Deployment**

```bash
curl https://your-project.railway.app/health
```

### Railway Configuration File

Create `railway.json` in the package root:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "bun install && bun run build"
  },
  "deploy": {
    "startCommand": "bun run start:http",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### Adding Redis for Distributed Sessions (Optional)

```bash
# Add Redis service
railway add redis

# Update environment variable to use Redis URL
railway variables set REDIS_URL=${{Redis.REDIS_URL}}
```

### Railway Best Practices

1. **Use private networking** for internal services
2. **Enable auto-deploy** from GitHub for CI/CD
3. **Set up health checks** for automatic recovery
4. **Monitor metrics** in Railway dashboard
5. **Use Railway volumes** for persistent storage if needed

## Docker Deployment

Deploy as a containerized application for maximum portability.

### Dockerfile

The package includes a production-ready `Dockerfile`:

```dockerfile
FROM oven/bun:1 as builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Build TypeScript
RUN bun run build

# Production image
FROM oven/bun:1-slim

WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 bunjs

USER bunjs

EXPOSE 3000

ENV MCP_TRANSPORT=http
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["bun", "run", "start:http"]
```

### Build and Run

```bash
# Build image
docker build -t ltcg-mcp-server .

# Run container
docker run -d \
  -p 3000:3000 \
  -e LTCG_API_KEY=your_api_key_here \
  -e MCP_TRANSPORT=http \
  -e PORT=3000 \
  -e MCP_API_KEY=your_mcp_key \
  -e ALLOWED_ORIGINS=https://app.example.com \
  --name ltcg-mcp \
  ltcg-mcp-server

# View logs
docker logs -f ltcg-mcp

# Health check
curl http://localhost:3000/health
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mcp-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - LTCG_API_KEY=${LTCG_API_KEY}
      - MCP_TRANSPORT=http
      - PORT=3000
      - MCP_API_KEY=${MCP_API_KEY}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - mcp-server
    restart: unless-stopped

volumes:
  redis-data:
```

Run with Docker Compose:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f mcp-server

# Stop services
docker-compose down
```

### Nginx Reverse Proxy

Create `nginx.conf`:

```nginx
events {
  worker_connections 1024;
}

http {
  upstream mcp_backend {
    server mcp-server:3000;
  }

  # Rate limiting
  limit_req_zone $binary_remote_addr zone=mcp_limit:10m rate=10r/s;

  server {
    listen 80;
    server_name mcp.example.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
  }

  server {
    listen 443 ssl http2;
    server_name mcp.example.com;

    # SSL configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    # Logging
    access_log /var/log/nginx/mcp_access.log;
    error_log /var/log/nginx/mcp_error.log;

    location /health {
      proxy_pass http://mcp_backend/health;
      access_log off;
    }

    location /mcp {
      # Rate limiting
      limit_req zone=mcp_limit burst=20 nodelay;

      proxy_pass http://mcp_backend/mcp;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;

      # CORS headers (if not handled by app)
      add_header Access-Control-Allow-Origin $http_origin always;
      add_header Access-Control-Allow-Methods "GET, POST, DELETE, OPTIONS" always;
      add_header Access-Control-Allow-Headers "Content-Type, Authorization, Mcp-Session-Id" always;
      add_header Access-Control-Expose-Headers "Mcp-Session-Id" always;
    }
  }
}
```

## Fly.io Deployment

Fly.io provides global edge deployment with automatic scaling.

### Step-by-Step Deployment

**1. Install Fly CLI**

```bash
curl -L https://fly.io/install.sh | sh
```

**2. Login to Fly.io**

```bash
fly auth login
```

**3. Initialize App**

```bash
fly launch --name ltcg-mcp-server --region ord
```

**4. Configure Environment Variables**

```bash
fly secrets set LTCG_API_KEY=your_api_key_here
fly secrets set MCP_TRANSPORT=http
fly secrets set MCP_API_KEY=your_mcp_key
fly secrets set ALLOWED_ORIGINS=https://app.example.com
```

**5. Deploy**

```bash
fly deploy
```

**6. Scale Instances (Optional)**

```bash
# Scale to 2 instances in multiple regions
fly scale count 2
fly scale regions ord,iad
```

### Fly.io Configuration

Create `fly.toml`:

```toml
app = "ltcg-mcp-server"
primary_region = "ord"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1

  [[http_service.checks]]
    interval = "30s"
    timeout = "5s"
    grace_period = "10s"
    method = "GET"
    path = "/health"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256

[env]
  MCP_TRANSPORT = "http"
  PORT = "3000"
```

## AWS EC2 Deployment

Deploy on a traditional VPS for full control.

### Step-by-Step Deployment

**1. Launch EC2 Instance**

- **AMI**: Ubuntu 22.04 LTS
- **Instance Type**: t3.micro (or larger for production)
- **Security Group**: Allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS)

**2. Connect to Instance**

```bash
ssh -i your-key.pem ubuntu@ec2-xx-xx-xx-xx.compute.amazonaws.com
```

**3. Install Dependencies**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Install Node.js (fallback)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Git
sudo apt install -y git

# Install Nginx
sudo apt install -y nginx

# Install Certbot (for SSL)
sudo apt install -y certbot python3-certbot-nginx
```

**4. Clone and Build Project**

```bash
# Clone repository
git clone https://github.com/your-org/ltcg.git
cd ltcg/packages/mcp-server

# Install dependencies
bun install

# Build project
bun run build
```

**5. Configure Environment Variables**

```bash
# Create .env file
cat > .env << EOF
LTCG_API_KEY=your_api_key_here
MCP_TRANSPORT=http
PORT=3000
MCP_API_KEY=your_mcp_key
ALLOWED_ORIGINS=https://app.example.com
EOF

# Secure the .env file
chmod 600 .env
```

**6. Create Systemd Service**

```bash
sudo nano /etc/systemd/system/ltcg-mcp.service
```

Add:

```ini
[Unit]
Description=LunchTable-TCG MCP Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/ltcg/packages/mcp-server
EnvironmentFile=/home/ubuntu/ltcg/packages/mcp-server/.env
ExecStart=/home/ubuntu/.bun/bin/bun run start:http
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**7. Start Service**

```bash
sudo systemctl daemon-reload
sudo systemctl enable ltcg-mcp
sudo systemctl start ltcg-mcp
sudo systemctl status ltcg-mcp
```

**8. Configure Nginx**

```bash
sudo nano /etc/nginx/sites-available/ltcg-mcp
```

Add:

```nginx
server {
    listen 80;
    server_name mcp.example.com;

    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }

    location /mcp {
        proxy_pass http://localhost:3000/mcp;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/ltcg-mcp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**9. Setup SSL with Let's Encrypt**

```bash
sudo certbot --nginx -d mcp.example.com
```

**10. Verify Deployment**

```bash
curl https://mcp.example.com/health
```

## Environment Configuration

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `LTCG_API_KEY` | API key for LunchTable-TCG backend | `ltcg_live_abc123...` |
| `MCP_TRANSPORT` | Transport mode (must be "http") | `http` |

### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `LTCG_API_URL` | Backend API URL | `https://lunchtable.cards` | `https://api.lunchtable.cards` |
| `PORT` | HTTP server port | `3000` | `8080` |
| `MCP_API_KEY` | MCP client authentication key | (disabled) | `mcp_secret_key_here` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `*` | `https://app.example.com,https://agent.example.com` |

### Environment Variable Best Practices

1. **Never commit `.env` files** - Add to `.gitignore`
2. **Use secrets management** - AWS Secrets Manager, Railway Secrets, etc.
3. **Rotate keys regularly** - Every 30-90 days
4. **Different keys per environment** - Separate dev/staging/production
5. **Document all variables** - Maintain `.env.example` file
6. **Validate at startup** - Use `validateConfig()` function

## Custom Domain Setup

### DNS Configuration

**A Record (for VPS/EC2):**

```
Type: A
Name: mcp
Value: 203.0.113.42 (your server IP)
TTL: 3600
```

**CNAME Record (for cloud platforms):**

```
Type: CNAME
Name: mcp
Value: your-project.vercel.app
TTL: 3600
```

### Platform-Specific Instructions

**Vercel:**

```bash
vercel domains add mcp.example.com
```

Follow instructions to verify domain ownership.

**Railway:**

1. Go to Railway dashboard
2. Settings → Domains
3. Add custom domain: `mcp.example.com`
4. Update DNS records as shown

**Fly.io:**

```bash
fly domains add mcp.example.com
fly certs create mcp.example.com
```

## SSL/TLS Configuration

### Let's Encrypt (Free SSL)

**Using Certbot (Nginx):**

```bash
sudo certbot --nginx -d mcp.example.com
```

**Auto-renewal:**

```bash
sudo certbot renew --dry-run
```

### Cloudflare SSL

1. Add domain to Cloudflare
2. Set SSL/TLS mode to "Full (strict)"
3. Enable "Always Use HTTPS"
4. Configure origin certificates in Cloudflare dashboard

### SSL Best Practices

1. **Use TLS 1.2+** - Disable older protocols
2. **Strong ciphers only** - Disable weak ciphers
3. **Enable HSTS** - Force HTTPS with Strict-Transport-Security header
4. **Monitor certificate expiry** - Set up alerts
5. **Use certificate pinning** (optional) - For high-security deployments

## Monitoring and Logging

### Health Check Monitoring

Use uptime monitoring services:

- **UptimeRobot** - Free tier available
- **Pingdom** - Comprehensive monitoring
- **StatusCake** - Multi-location checks

**Example UptimeRobot Setup:**

```
Monitor Type: HTTP(s)
URL: https://mcp.example.com/health
Interval: 5 minutes
Alert When: Down
```

### Application Monitoring

**Sentry (Error Tracking):**

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

app.onError((err, c) => {
  Sentry.captureException(err);
  return c.json({ error: err.message }, 500);
});
```

**DataDog (Metrics):**

```typescript
import { StatsD } from 'hot-shots';

const statsd = new StatsD({
  host: 'localhost',
  port: 8125,
});

// Track active sessions
statsd.gauge('mcp.sessions.active', sessions.size);

// Track request duration
const start = Date.now();
// ... process request ...
statsd.timing('mcp.request.duration', Date.now() - start);
```

### Logging Best Practices

1. **Structured logging** - Use JSON format
2. **Log levels** - ERROR, WARN, INFO, DEBUG
3. **Correlation IDs** - Track requests across services
4. **Sensitive data** - Never log API keys or credentials
5. **Log rotation** - Prevent disk space issues

**Example Structured Logging:**

```typescript
const log = {
  timestamp: new Date().toISOString(),
  level: 'INFO',
  method: 'tools/call',
  sessionId: sessionId,
  duration: duration,
  statusCode: 200,
};

console.log(JSON.stringify(log));
```

## Performance Optimization

### Caching Strategies

**Response Caching:**

```typescript
const cache = new Map();

app.get('/tools/list', async (c) => {
  const cached = cache.get('tools/list');
  if (cached && Date.now() - cached.timestamp < 60000) {
    return c.json(cached.data);
  }

  const tools = await fetchTools();
  cache.set('tools/list', {
    data: tools,
    timestamp: Date.now(),
  });

  return c.json(tools);
});
```

**CDN Integration:**

Use Cloudflare for caching static responses:

```typescript
c.header('Cache-Control', 'public, max-age=300, s-maxage=600');
```

### Connection Pooling

For external API calls:

```typescript
import { Agent } from 'undici';

const agent = new Agent({
  connections: 100,
  pipelining: 10,
});

fetch(url, { dispatcher: agent });
```

### Database Optimization (if using external storage)

```typescript
// Use connection pooling
const pool = new Pool({
  max: 20,
  min: 5,
  idleTimeoutMillis: 30000,
});

// Create indexes
CREATE INDEX idx_sessions_last_activity ON sessions(last_activity);
```

## Troubleshooting

### Deployment Fails

**Problem:** Build fails during deployment

**Solutions:**
1. Check build logs for specific errors
2. Verify `package.json` scripts are correct
3. Ensure all dependencies are in `package.json`
4. Test build locally: `bun run build`

### Health Check Fails

**Problem:** `/health` endpoint returns 404 or timeout

**Solutions:**
1. Verify `MCP_TRANSPORT=http` is set
2. Check if server is listening on correct port
3. Verify firewall/security group allows traffic
4. Check server logs for startup errors

### CORS Errors

**Problem:** Browser clients receive CORS errors

**Solutions:**
1. Set `ALLOWED_ORIGINS` to include client origin
2. Verify origin header is being sent by client
3. Check Nginx/reverse proxy CORS configuration
4. Test with curl (CORS only affects browsers)

### High Memory Usage

**Problem:** Server uses excessive memory

**Solutions:**
1. Implement session cleanup (current: 5 min interval)
2. Use Redis for session storage instead of in-memory
3. Limit max sessions per instance
4. Enable memory monitoring and alerts
5. Scale horizontally instead of vertically

### SSL Certificate Issues

**Problem:** SSL certificate invalid or expired

**Solutions:**
1. Verify certificate is installed correctly
2. Check certificate expiry: `openssl x509 -in cert.pem -noout -dates`
3. Renew Let's Encrypt cert: `sudo certbot renew`
4. Verify DNS points to correct server
5. Clear browser SSL cache

---

## Additional Resources

- [HTTP Transport Documentation](./HTTP_TRANSPORT.md)
- [Main README](../README.md)
- [MCP Specification](https://spec.modelcontextprotocol.io)
- [Bun Documentation](https://bun.sh/docs)

## Support

For deployment support:

- **Discord**: [discord.gg/lunchtable](https://discord.gg/lunchtable)
- **GitHub Issues**: [github.com/lunchtable/lunchtable-tcg/issues](https://github.com/lunchtable/lunchtable-tcg/issues)
- **Documentation**: [docs.lunchtable.cards](https://docs.lunchtable.cards)
