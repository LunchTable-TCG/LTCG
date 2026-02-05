# MCP Server Deployment Guide Index

Complete deployment configurations and guides for the LunchTable-TCG MCP HTTP server.

## Quick Navigation

### Start Here
- **New to deployments?** → Read [`deploy/README.md`](./deploy/README.md) first
- **Choose your platform** → See platform comparison below
- **Set up environment variables** → See [`deploy/environment-setup.md`](./deploy/environment-setup.md)

### Platform-Specific Guides

| Platform | Setup Time | Best For | Guide |
|----------|-----------|----------|-------|
| **Vercel** | 5 min | Simple, serverless deployments | [`deploy/vercel-deployment-guide.md`](./deploy/vercel-deployment-guide.md) |
| **Railway** | 5 min | Production, always-on, Bun-optimized | [`deploy/railway-deployment-guide.md`](./deploy/railway-deployment-guide.md) |
| **Docker** | 10 min | Custom setups, Kubernetes, enterprises | [`deploy/docker-deployment-guide.md`](./deploy/docker-deployment-guide.md) |
| **Cloudflare Workers** | 10 min | Global edge, low-latency, high-traffic | [`deploy/cloudflare-deployment-guide.md`](./deploy/cloudflare-deployment-guide.md) |

### Configuration Files

| File | Purpose | Platform |
|------|---------|----------|
| [`vercel.json`](./vercel.json) | Vercel deployment config | Vercel |
| [`railway.json`](./railway.json) | Railway deployment config | Railway |
| [`Dockerfile`](./Dockerfile) | Multi-stage Docker build | Docker, Kubernetes, all cloud providers |
| [`.dockerignore`](./.dockerignore) | Docker build exclusions | Docker |
| [`.vercelignore`](./.vercelignore) | Vercel build exclusions | Vercel |

## Deployment Decision Matrix

### By Requirements

**I want the simplest setup:**
- Vercel or Railway
- 5-minute setup
- GitHub integration

**I need production-grade reliability:**
- Railway (recommended)
- Always-on, no cold starts
- $10-15/month

**I need global low-latency:**
- Cloudflare Workers
- Edge computing across 200+ data centers
- $5-10/month

**I need complete control:**
- Docker + Kubernetes
- Custom infrastructure
- Self-hosted or cloud provider of choice

### By Budget

| Budget | Recommended |
|--------|-------------|
| Free | Vercel (100GB-hours/month) or Cloudflare (100K requests/day) |
| $5-10/month | Railway ($5 credit) or Cloudflare Workers ($5/month) |
| $10-20/month | Railway (production plan) or Vercel Pro |
| $20+/month | AWS, Google Cloud, DigitalOcean, or self-hosted |

### By Expected Traffic

| Traffic | Recommended |
|---------|-------------|
| < 1K req/day | Vercel Free or Cloudflare Free |
| 1K-10K req/day | Railway or Vercel Free |
| 10K-1M req/day | Railway or Vercel Pro |
| 1M+ req/day | Cloudflare Workers or custom K8s |

## Getting Started

### Step 1: Choose Platform

Use the decision matrix above to pick your platform.

### Step 2: Set Environment Variables

Read [`deploy/environment-setup.md`](./deploy/environment-setup.md) for:
- Required variables
- Optional variables
- Platform-specific setup
- Local development

Key variables:
- `LTCG_API_KEY` - **Required** - Get from LunchTable-TCG team
- `MCP_TRANSPORT` - Set to `http` for cloud
- `MCP_API_KEY` - Optional for client authentication
- `ALLOWED_ORIGINS` - CORS configuration

### Step 3: Deploy

Follow your platform's guide:
- [Vercel Quick Start](./deploy/vercel-deployment-guide.md#quick-start-5-minutes)
- [Railway Quick Start](./deploy/railway-deployment-guide.md#quick-start-5-minutes)
- [Docker Quick Start](./deploy/docker-deployment-guide.md#quick-start-10-minutes)
- [Cloudflare Quick Start](./deploy/cloudflare-deployment-guide.md#quick-start-10-minutes)

### Step 4: Test

Use the testing guide in [`deploy/environment-setup.md`](./deploy/environment-setup.md#testing-endpoints):

```bash
# Health check
curl https://your-deployment-url.com/health

# Initialize MCP session
curl -X POST https://your-deployment-url.com/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {...}}'
```

### Step 5: Monitor

Each platform has different monitoring:
- **Vercel:** Dashboard → Logs
- **Railway:** Dashboard → Logs or `railway logs --follow`
- **Docker:** `docker logs -f` or `kubectl logs`
- **Cloudflare:** Dashboard → Analytics or `wrangler tail`

## Quick Reference

### Build & Run Locally

```bash
# Install dependencies
bun install

# Build TypeScript
bun run build

# Run HTTP server
MCP_TRANSPORT=http LTCG_API_KEY=test_key bun run start:http

# Test
curl http://localhost:3000/health
```

### Docker Commands

```bash
# Build image
docker build -t lunchtable-mcp:latest .

# Run container
docker run -p 3000:3000 \
  -e LTCG_API_KEY=your_key \
  lunchtable-mcp:latest

# Push to registry
docker tag lunchtable-mcp:latest <username>/lunchtable-mcp:latest
docker push <username>/lunchtable-mcp:latest
```

### Vercel Deployment

```bash
# Install CLI
npm install -g vercel

# Deploy
vercel deploy packages/mcp-server

# Production
vercel deploy packages/mcp-server --prod

# Set environment
vercel env add LTCG_API_KEY
```

### Railway Deployment

```bash
# Install CLI
npm install -g @railway/cli

# Link project
cd packages/mcp-server && railway link

# Set variables
railway variables set LTCG_API_KEY=your_key

# Deploy
railway up

# View logs
railway logs --follow
```

### Cloudflare Deployment

```bash
# Install CLI
npm install -g @cloudflare/wrangler

# Login
wrangler login

# Create project
wrangler init mcp-proxy

# Set secrets
wrangler secret put LTCG_API_KEY

# Deploy
wrangler deploy
```

## Troubleshooting

### Deployment Fails

1. **Check build logs** - Platform dashboard shows build errors
2. **Verify dependencies** - Run `bun install` locally
3. **Check TypeScript** - Run `bun run build` to verify compilation
4. **Review configuration** - Verify `vercel.json`, `railway.json`, or `Dockerfile`

### Server Won't Start

1. **Check environment variables** - Is `LTCG_API_KEY` set?
2. **Check logs** - View platform logs for error messages
3. **Test locally** - Run server locally first to diagnose

### Requests Fail

1. **Health check** - `curl https://your-url.com/health`
2. **Check API key** - Verify `LTCG_API_KEY` is correct
3. **Check authentication** - If `MCP_API_KEY` set, include `Authorization: Bearer` header
4. **Check CORS** - Verify `ALLOWED_ORIGINS` allows your client

See [`deploy/environment-setup.md`](./deploy/environment-setup.md#troubleshooting) for detailed troubleshooting.

## Features by Platform

### Vercel

✅ Automatic scaling
✅ GitHub integration
✅ Preview deployments
❌ 60-second timeout
❌ Cold starts on free tier

### Railway

✅ No cold starts
✅ Always-on
✅ Great Bun support
✅ Simple UI
✅ Excellent value
❌ Smaller community

### Docker

✅ Full control
✅ Portable
✅ Kubernetes-ready
✅ Cost-effective (self-hosted)
❌ Requires infrastructure
❌ More complex setup

### Cloudflare Workers

✅ Global edge network
✅ Zero cold starts
✅ Ultra-fast
✅ 200+ data centers
❌ 50ms timeout (free tier)
❌ Limited execution time

## Common Tasks

### Scale Deployment

**Vercel:** Automatic - upgrade plan for more concurrent functions

**Railway:**
```bash
railway scale --replicas 3
```

**Docker:**
```bash
docker-compose up -d --scale mcp-server=3
# or
kubectl scale deployment/mcp-server --replicas=3
```

**Cloudflare:** Automatic - spreads across global network

### Update Deployed Code

**Vercel:** Push to main branch - auto-redeploys

**Railway:** Push to main branch - auto-redeploys

**Docker:**
```bash
docker pull <registry>/lunchtable-mcp:latest
docker restart mcp-server
```

**Cloudflare:**
```bash
wrangler deploy
```

### View Live Logs

**Vercel:**
```bash
vercel logs --follow
```

**Railway:**
```bash
railway logs --follow
```

**Docker:**
```bash
docker logs -f mcp-server
```

**Cloudflare:**
```bash
wrangler tail
```

### Rollback Deployment

**Vercel:** Dashboard → Deployments → Click previous → Redeploy

**Railway:** Dashboard → Deployments → Click previous → Redeploy

**Docker:**
```bash
# Restart with previous image
docker run <previous-image-id>
```

**Cloudflare:**
```bash
# Deploy previous commit
git checkout <commit>
wrangler deploy
```

## Performance Tips

1. **Enable caching** - Use platform caching or KV storage
2. **Optimize responses** - Minimize JSON payload size
3. **Connection pooling** - Reuse Convex client across requests
4. **Rate limiting** - Implement to prevent abuse
5. **Monitoring** - Track response times and errors
6. **Region selection** - Deploy close to users (Cloudflare auto-handles)

See specific platform guides for optimization details.

## Security Checklist

- [ ] Never commit `.env` files
- [ ] Use platform's secret management for API keys
- [ ] Mark sensitive variables as "sensitive" in platform
- [ ] Use HTTPS only (all platforms support)
- [ ] Restrict CORS origins in production
- [ ] Rotate API keys periodically
- [ ] Use different keys per environment (dev/staging/prod)
- [ ] Monitor access logs for suspicious activity

## Support & Resources

### Documentation
- [`deploy/README.md`](./deploy/README.md) - Complete deployment guide
- [`deploy/environment-setup.md`](./deploy/environment-setup.md) - Variables & testing
- Platform guides - See Quick Navigation above

### External Resources
- **Vercel Docs:** https://vercel.com/docs
- **Railway Docs:** https://docs.railway.app
- **Docker Docs:** https://docs.docker.com
- **Cloudflare Docs:** https://developers.cloudflare.com/workers

### Getting Help
- **GitHub Issues:** Report bugs
- **Discord:** Community support
- **Email:** support@lunchtable.cards

## File Structure

```
packages/mcp-server/
├── vercel.json              # Vercel configuration
├── railway.json             # Railway configuration
├── Dockerfile               # Docker build
├── .dockerignore             # Docker build exclusions
├── .vercelignore             # Vercel build exclusions
├── DEPLOYMENT.md            # This file
└── deploy/
    ├── README.md            # Main deployment guide
    ├── vercel-deployment-guide.md
    ├── railway-deployment-guide.md
    ├── docker-deployment-guide.md
    ├── cloudflare-deployment-guide.md
    └── environment-setup.md
```

## Next Steps

1. **Read the main guide:** [`deploy/README.md`](./deploy/README.md)
2. **Choose your platform** using the decision matrix
3. **Follow platform-specific guide** for quick deployment
4. **Set environment variables** using [`deploy/environment-setup.md`](./deploy/environment-setup.md)
5. **Test your deployment** using provided test scripts
6. **Monitor your deployment** using platform dashboards

## Questions?

- See the comprehensive guides in the `deploy/` directory
- Check [`deploy/environment-setup.md`](./deploy/environment-setup.md) for common issues
- Contact LunchTable-TCG support: support@lunchtable.cards

---

**Last Updated:** February 2025
**Bun Version:** 1.x
**Node Version:** 20+
**MCP Server:** v1.0.0
