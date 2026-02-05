# Railway Deployment Guide

Detailed instructions for deploying the MCP server to Railway.

## Quick Start (5 minutes)

1. **Go to Railway**
   - Visit https://railway.app/dashboard

2. **Create New Project**
   - Click "+ New Project"
   - Select "Deploy from GitHub repo"
   - Authorize and select your repository

3. **Configure**
   - Root path: `packages/mcp-server`
   - Railway auto-detects Bun and `package.json`
   - Build command: `bun run build`
   - Start command: `bun run start:http`

4. **Add Variables**
   - Click "Add Variable"
   - Add `LTCG_API_KEY`, `MCP_TRANSPORT=http`, `NODE_ENV=production`

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your app is live!

## Detailed Setup

### Prerequisites

- GitHub account with repository access
- Railway account (free tier available: $5 credit)
- LunchTable-TCG API key

### Step-by-Step

#### 1. Connect GitHub Repository

1. Go to https://railway.app/dashboard
2. Click "+ New Project"
3. Select "Deploy from GitHub repo"
4. Click "Connect GitHub Account" (if first time)
5. Authorize Railway to access your repositories
6. Search for your repository
7. Click "Deploy Now"

#### 2. Configure Project

Railway automatically detects:
- Node/Bun runtime from `package.json`
- Build process from `package.json` scripts
- Port from `PORT` environment variable

For monorepo:
- Set "Root Directory" or "Source": `packages/mcp-server`
- Or Railway auto-detects from `railway.json`

#### 3. Build Settings

Verify build configuration:

**Build Command:**
```bash
bun run build
```

**Start Command:**
```bash
bun run start:http
```

**Output Directory:**
```
dist/
```

These are typically auto-detected. Manual configuration:

1. Project Settings → Build Configuration
2. Set Start Command: `bun run start:http`
3. Set Build Command: `bun run build`

#### 4. Environment Variables

Add variables via dashboard:

1. Click "Add Variable"
2. Enter key and value
3. Click "Add" to confirm

**Required Variables:**

| Variable | Value |
|----------|-------|
| `LTCG_API_KEY` | Your API key |
| `MCP_TRANSPORT` | `http` |
| `NODE_ENV` | `production` |

**Optional Variables:**

| Variable | Value | Default |
|----------|-------|---------|
| `PORT` | Server port | `3000` |
| `LTCG_API_URL` | API URL | `https://lunchtable.cards` |
| `MCP_API_KEY` | Auth token | (empty) |
| `ALLOWED_ORIGINS` | CORS origins | `*` |

#### 5. Deploy

1. All configuration is complete
2. Click "Deploy"
3. Railway builds and starts your app
4. URL appears in top-right: `https://<project>.up.railway.app`

### Railway CLI Deployment

Alternative: Deploy via command line

```bash
# Install Railway CLI
npm install -g @railway/cli

# Or on macOS
brew install railway

# Login to Railway
railway login

# Initialize in project directory
cd packages/mcp-server
railway init

# Link to existing project
railway link

# Deploy
railway up

# View logs
railway logs --follow

# Check status
railway status

# View environment variables
railway variables list

# Add environment variable
railway variables set LTCG_API_KEY=your_key

# Add secret variable (hidden in logs)
railway variables set MCP_API_KEY=secret_key --secret

# Stop deployment
railway down

# Redeploy
railway up
```

### Custom Domain

1. Go to project settings
2. Click "Custom Domains"
3. Enter your domain
4. Add CNAME record to your DNS provider
5. Railway verifies and activates

```bash
# CLI
railway domain create
railway domain list
railway domain remove
```

### Environment Separation

Create separate environments for production/staging:

**Via Dashboard:**

1. Project Settings → Environments
2. Create "staging" environment
3. Different variables per environment
4. Different domains per environment

**Via CLI:**

```bash
# Create environment
railway environment create staging

# Switch environment
railway environment staging

# Set variables for staging
railway variables set LTCG_API_KEY=staging_key

# Deploy to staging
railway up
```

### Service Linking

Link services together:

1. Create multiple services in one project
2. Services auto-discover via network
3. Environment variables expose service URLs

Example: Link MCP server with database:

```bash
# Add PostgreSQL service
railway add

# Select PostgreSQL
# Railway generates DATABASE_URL automatically

# In your code:
const dbUrl = process.env.DATABASE_URL;
```

### Monitoring

#### Real-Time Logs

```bash
# View logs via CLI
railway logs --follow

# Filter by level
railway logs --follow --level error

# Export logs
railway logs > deployment.log
```

**Via Dashboard:**
- Project → Deployments → Click deployment → View Logs

#### Metrics

```bash
# View resource usage
railway metrics

# Shows: CPU, memory, uptime
```

**Via Dashboard:**
- Project → Metrics tab
- Graphs for CPU, memory, requests, errors

#### Status Page

1. Project Settings → Status Page
2. Enable public status page
3. Share with users at `https://status.yourdomain.com`

#### Logs Export

```bash
# Export to file
railway logs > deployment.log

# Export JSON format
railway logs --json > deployment.json

# Export with timestamp
railway logs --since "1 hour ago" > recent.log
```

### Troubleshooting

#### Build Fails

**Error:** "Cannot find module 'hono'"

Solution: Check `node_modules` in build
- Verify `package.json` has all dependencies
- Check `bun.lock` is committed to git
- Run `bun install` locally

**Error:** "Build timeout"

Solution: Increase build time or optimize
- Complex builds take longer
- Check for circular dependencies
- Optimize `tsconfig.json`

#### Deployment Won't Start

**Error:** "Failed to start application"

Solution: Check logs
```bash
railway logs --follow --level error
```

Common causes:
- Missing environment variable
- Port conflict
- Memory limit exceeded
- Unhandled exception in startup

#### Connection Errors

**Error:** "Cannot connect to Convex"

Solution: Verify configuration
- Check `LTCG_API_KEY` is set
- Check API URL is correct
- Test locally first:
  ```bash
  MCP_TRANSPORT=http LTCG_API_KEY=test bun run start:http
  ```

#### Port Issues

**Error:** "Port 3000 already in use"

Solution:
- Change `PORT` environment variable
- Or check what's using port 3000:
  ```bash
  railway status  # Shows allocated port
  ```

#### Memory Errors

**Error:** "JavaScript heap out of memory"

Solution: Increase memory
- Project Settings → Resources
- Increase memory allocation
- Or optimize code for lower memory

### Scaling

#### Horizontal Scaling (Multiple Instances)

```bash
# Via CLI
railway scale --replicas 3

# Via Dashboard
# Project Settings → Replica Count
```

Load balancer automatically distributes traffic.

#### Vertical Scaling (More Resources)

```bash
# Via CLI
railway scale --memory 1GB --cpu 1000m

# Via Dashboard
# Project Settings → Resources
```

### Performance Optimization

#### Cold Starts

Railway keeps services warm:
- No cold starts (unlike Vercel/AWS Lambda)
- Always-on availability
- Consistent response times

#### Caching

Add Redis for caching:

```bash
# Add Redis service
railway add

# Select Redis
# Railway exposes REDIS_URL environment variable

# Use in code:
const redis = new Redis(process.env.REDIS_URL);
```

#### Connection Pooling

For database connections:

```typescript
// Reuse single connection
const client = new ConvexClient(apiUrl);

// Don't create new clients per request
```

### Cost Estimation

**Pricing Model:**

- $5 base/month
- Pay per usage: $0.000463 per GB-hour
- Outbound bandwidth: $0.10 per GB

**Example Usage (MCP Server):**

- Instance: 256 MB
- Daily requests: 10,000
- Average response: 200ms
- Monthly usage: ~15 GB-hours
- **Total: ~$10-15/month**

**Cost Optimization:**

- Use smaller instance size (256 MB)
- Enable request caching
- Combine with other services in project
- Monitor and scale down if needed

### Advanced Features

#### Webhooks

Deploy on GitHub push:

1. Project Settings → GitHub
2. Webhook auto-configured
3. Every push to main: redeploys

Disable automatic deploys:
- Project Settings → GitHub → Uncheck "Auto Deploy"

#### Build Environment

Customize build environment:

```bash
# View build environment
railway variables list --show-build

# Add build-time variable
railway variables set BUILD_ENV=production
```

#### Registry Integration

Use private npm registry:

```bash
# Set registry credentials
railway variables set NPM_TOKEN=your_token
railway variables set NPM_REGISTRY=https://npm.custom.com
```

#### Deployment Hooks

Trigger external services on deploy:

```bash
# Send webhook after deployment
railway deploy --webhook https://your-service.com/deploy-complete
```

### Success Indicators

Your deployment is working when:

1. **Health Check Passes**
   ```bash
   curl https://your-project.up.railway.app/health
   # Returns: { "status": "ok" }
   ```

2. **Logs Show "Listening on"**
   ```bash
   railway logs
   # Should show: "listening on port 3000"
   ```

3. **Dashboard Shows Green**
   - Project status: green checkmark
   - No error logs
   - CPU/Memory normal

4. **Can Call MCP Endpoint**
   ```bash
   curl -X POST https://your-project.up.railway.app/mcp \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}'
   ```

### Next Steps

1. **Monitor Performance**
   ```bash
   railway metrics  # Check CPU/memory/requests
   ```

2. **Set Up Alerts**
   - Email notifications on failure
   - Slack integration
   - Custom webhooks

3. **Configure Custom Domain**
   ```bash
   railway domain create
   ```

4. **Connect to Other Services**
   ```bash
   railway add  # Add database, Redis, etc.
   ```

5. **Set Up Environment Separation**
   ```bash
   railway environment create production
   ```

## FAQ

**Q: Is there a free tier?**
A: Yes! $5 monthly credit (enough for small deployments).

**Q: How do I scale to production?**
A: Increase replicas, memory, and monitor costs in settings.

**Q: Can I deploy without GitHub?**
A: Yes, use Railway CLI to deploy from local files.

**Q: What's the uptime SLA?**
A: Railway provides 99.9% uptime guarantee on paid plans.

**Q: Can I use a custom domain?**
A: Yes, add CNAME record to your DNS provider.

**Q: How do I rollback a deployment?**
A: Project → Deployments → Click previous → "Redeploy".

**Q: Is my data persistent?**
A: Services have persistent storage. No data loss on redeploy.

**Q: Can I access the server via SSH?**
A: Yes, use `railway shell` to connect.

**Q: How do I set secrets securely?**
A: Use `railway variables set --secret` to hide from logs.

**Q: What happens on account suspension?**
A: Services stop. Reactivate account to resume.

## Support

- **Docs:** https://docs.railway.app
- **Discord:** https://discord.gg/railway
- **Email:** support@railway.app
- **Status:** https://railway-status.page.coop
