# Vercel Deployment Guide

Detailed instructions for deploying the MCP server to Vercel.

## Quick Start (5 minutes)

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Add deployment configs"
   git push origin main
   ```

2. **Go to Vercel**
   - Visit https://vercel.com/dashboard
   - Click "Add New..." → "Project"
   - Select your GitHub repository

3. **Configure**
   - Framework: Node.js
   - Root directory: `packages/mcp-server`
   - Build command: `bun run build`
   - Environment variables (click "Environment Variables"):
     - `LTCG_API_KEY` = your API key
     - `MCP_TRANSPORT` = `http`
     - `NODE_ENV` = `production`

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build
   - Your app is live!

## Detailed Setup

### Prerequisites

- GitHub account with repository access
- Vercel account (free tier available)
- LunchTable-TCG API key

### Step-by-Step

#### 1. Prepare Repository

Ensure `vercel.json` exists in `/packages/mcp-server/`:

```json
{
  "version": 2,
  "builds": [{ "src": "dist/http-server.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "dist/http-server.js" }],
  "env": { "MCP_TRANSPORT": "http", "NODE_ENV": "production" }
}
```

#### 2. Connect GitHub Repository

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your repository
4. Vercel detects monorepo structure
5. Set Root Directory: `packages/mcp-server`

#### 3. Build Settings

Configure build process:

- **Build Command:** `bun run build`
- **Output Directory:** `dist`
- **Install Command:** `bun install`

#### 4. Environment Variables

Add variables in the dashboard:

| Variable | Value | Required |
|----------|-------|----------|
| `LTCG_API_KEY` | Your API key | Yes |
| `LTCG_API_URL` | `https://lunchtable.cards` | No |
| `MCP_API_KEY` | Your MCP key | No |
| `ALLOWED_ORIGINS` | `*` or specific domains | No |
| `MCP_TRANSPORT` | `http` | Yes |
| `NODE_ENV` | `production` | Yes |

Click "Add" for each variable.

#### 5. Deploy

1. Click "Deploy"
2. Wait for build to complete
3. URL appears: `https://your-project.vercel.app`

### Environment Variables in Detail

#### LTCG_API_KEY (Required)

Your LunchTable-TCG API credentials:

```bash
# Mark as sensitive (hidden in logs)
# Mark as production-only (not used in preview builds)
```

#### MCP_API_KEY (Optional)

Optional authentication for MCP clients:

```bash
# If set, all MCP requests require:
# Authorization: Bearer <MCP_API_KEY>

# Leave empty for public access
```

#### ALLOWED_ORIGINS (Optional)

CORS allowed origins:

```bash
# Single origin:
ALLOWED_ORIGINS=https://yourdomain.com

# Multiple origins (comma-separated):
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com,http://localhost:3000

# All origins (development):
ALLOWED_ORIGINS=*
```

### Vercel CLI Deployment

Alternative: Deploy via command line

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy from project root
vercel

# Or deploy specific workspace
vercel deploy packages/mcp-server

# Deploy to production
vercel --prod

# View logs
vercel logs

# Set environment variables
vercel env add LTCG_API_KEY
vercel env add MCP_API_KEY

# Redeploy latest code
vercel deploy --prod
```

### Custom Domain

1. Go to Vercel project settings
2. Click "Domains"
3. Enter your domain
4. Add DNS records from Vercel
5. Wait for DNS propagation

### Preview Deployments

Vercel automatically creates preview URLs for pull requests:

- Main branch: `https://your-project.vercel.app`
- PR #123: `https://your-project-pr-123.vercel.app`

Configure preview environment:

```bash
# Use different API key for preview
vercel env add LTCG_API_KEY --environments=preview
```

### Performance Optimization

#### Build Cache

Vercel automatically caches:
- Dependencies (`node_modules`)
- Build artifacts

Clear cache if needed:
- Project Settings → Git → "Clear Build Cache"

#### Serverless Function Optimization

The `vercel.json` configuration:
- Uses Node.js runtime (optimal for Bun binaries)
- Sets appropriate memory allocation
- Configures request routing

#### Concurrency Limits

- Default: 1000 concurrent requests
- Upgrade plan for higher limits
- Per-function timeout: 60 seconds

### Monitoring

#### Real-Time Logs

```bash
# Via CLI
vercel logs --follow

# Or dashboard:
# Project → Deployments → Select deployment → Logs
```

#### Analytics

Dashboard shows:
- Request count
- Response times (p50, p95, p99)
- Error rates
- Request size distribution

#### Error Tracking

Failed requests appear in:
- Project → Deployments → Logs (errors tab)
- View stack traces and error details

### Troubleshooting

#### Build Fails

**Error:** "Command 'bun' not found"

Solution: Vercel must install Bun
- Add `vercel-build.sh` to project:
  ```bash
  #!/bin/bash
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
  bun install
  bun run build
  ```

**Error:** "Module not found"

Solution: Check `package.json` dependencies
- Verify all imports are in `dependencies` (not `devDependencies`)
- Run `bun install` locally to verify

#### Runtime Errors

**Error:** "LTCG_API_KEY is not defined"

Solution: Set environment variable
- Project Settings → Environment Variables
- Add `LTCG_API_KEY`
- Redeploy

**Error:** "Port 3000 already in use"

Solution: Vercel handles port assignment
- Remove `PORT` environment variable
- Let Vercel's system handle it

#### Cold Starts

Vercel Functions have cold starts on free tier:

- First request after inactivity: 1-5 seconds
- Upgrade to Pro for faster cold starts
- Use `railway-deployment-guide.md` for always-warm deployments

### Cost Estimation

**Free Tier:**
- 100 GB-hours/month
- Cold function starts
- Good for development/testing

**Pro Plan ($20/month):**
- 1000 GB-hours/month
- Priority cold starts
- 60 GB-hours always-on compute

**Estimate for MCP Server:**
- Average response time: 200ms
- 1000 daily requests: ~0.06 GB-hours
- Fits comfortably in free tier

### Advanced Features

#### Cron Jobs (Pro)

Schedule health checks:

```json
{
  "version": 2,
  "crons": [
    {
      "path": "/api/health",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

#### Database Connections

For persistent data, connect to:
- Vercel PostgreSQL
- External database with connection pooling
- Convex (recommended for this project)

#### Secrets Rotation

For `LTCG_API_KEY` rotation:

1. Add new key to environment variables
2. Update all deployments
3. Remove old key
4. Vercel tracks changes in audit logs

### Success Indicators

Your deployment is working when:

1. **Health Check Passes**
   ```bash
   curl https://your-project.vercel.app/health
   # Returns: { "status": "ok" }
   ```

2. **MCP Endpoint Responds**
   ```bash
   curl -X POST https://your-project.vercel.app/mcp \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}'
   ```

3. **Logs Show No Errors**
   ```bash
   vercel logs
   # No ERROR messages
   ```

4. **Dashboard Shows Success**
   - Green checkmark on deployment
   - No alerts in monitoring

### Next Steps

1. Test with MCP client:
   ```bash
   # Update Claude Desktop config
   curl http://your-project.vercel.app/health
   ```

2. Monitor in dashboard:
   - Watch analytics
   - Check error logs
   - Monitor response times

3. Set up alerts:
   - Email on deployment failure
   - Slack integration for errors
   - Uptime monitoring

4. Custom domain:
   - Add your domain
   - Configure DNS
   - Use HTTPS

## FAQ

**Q: How long does deployment take?**
A: 2-5 minutes typically. First deployment is slower due to dependency caching.

**Q: Can I deploy from a monorepo?**
A: Yes! Set "Root Directory" to `packages/mcp-server`.

**Q: What's the cost?**
A: Free tier is sufficient for most use cases. See cost estimation above.

**Q: Can I use private GitHub repos?**
A: Yes, Vercel supports private repositories with proper authorization.

**Q: Can I use a custom domain?**
A: Yes, add in Project Settings → Domains.

**Q: How do I rollback a deployment?**
A: Project → Deployments → Click previous deployment → "Redeploy".

**Q: Can I deploy using Git pushes?**
A: Yes, automatic deployments on every push to main (configurable).

## Support

- **Documentation:** https://vercel.com/docs
- **Discord:** Vercel community discord
- **Email:** support@vercel.com
