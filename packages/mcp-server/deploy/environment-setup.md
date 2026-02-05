# Environment Variables & Configuration Guide

Comprehensive guide for setting up environment variables and testing deployed MCP server endpoints.

## Environment Variables Reference

### Required Variables

#### LTCG_API_KEY

**Description:** API key for authenticating with LunchTable-TCG backend

**Type:** String (secret)

**Obtained From:** LunchTable-TCG team

**Example:**
```bash
LTCG_API_KEY=sk_live_2a1b3c4d5e6f7g8h9i0j
```

**How to get:**
1. Contact LunchTable-TCG support
2. Or visit dashboard at https://lunchtable.cards/settings/api-keys
3. Generate new key
4. Store securely

### Optional Variables

#### MCP_TRANSPORT

**Description:** Server transport mode

**Type:** String

**Options:** `stdio` | `http`

**Default:** `stdio`

**Note:** Always set to `http` for cloud deployments

```bash
MCP_TRANSPORT=http
```

#### NODE_ENV

**Description:** Application environment

**Type:** String

**Options:** `development` | `production` | `staging`

**Default:** `development`

**Example:**
```bash
NODE_ENV=production
```

#### PORT

**Description:** HTTP server port

**Type:** Integer

**Default:** `3000`

**Example:**
```bash
PORT=8080
```

**Notes:**
- Cloud platforms often override this
- Vercel: Use dynamic PORT
- Railway: Use PORT (auto-assigned)
- Docker: Expose in Dockerfile

#### LTCG_API_URL

**Description:** Base URL for LunchTable-TCG API

**Type:** URL

**Default:** `https://lunchtable.cards`

**Example:**
```bash
LTCG_API_URL=https://api.lunchtable.cards
LTCG_API_URL=http://localhost:5000  # Local development
```

#### MCP_API_KEY

**Description:** Optional API key for MCP client authentication

**Type:** String (secret)

**Default:** (empty - public access)

**Example:**
```bash
MCP_API_KEY=secret_mcp_key_12345
```

**Usage:**
- If set, all MCP requests must include:
  ```bash
  Authorization: Bearer secret_mcp_key_12345
  ```
- Leave empty for public access (development only)

#### ALLOWED_ORIGINS

**Description:** CORS allowed origins

**Type:** String (comma-separated)

**Default:** `*`

**Examples:**
```bash
# All origins (development)
ALLOWED_ORIGINS=*

# Single origin
ALLOWED_ORIGINS=https://yourdomain.com

# Multiple origins
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com,https://admin.yourdomain.com

# With ports
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

#### DEBUG

**Description:** Debug logging level

**Type:** String

**Default:** (disabled)

**Examples:**
```bash
# All debugging
DEBUG=mcp:*

# Specific module
DEBUG=mcp:http

# Multiple modules
DEBUG=mcp:*,convex:*

# Disable specific module
DEBUG=mcp:*,-mcp:cache
```

## Setting Variables by Platform

### Vercel

**Via Dashboard:**

1. Go to Project Settings
2. Environment Variables
3. Add variable:
   - Name: `LTCG_API_KEY`
   - Value: `your_key_here`
   - Environment: Production / Preview / Development
4. Click "Add"
5. Redeploy

**Via CLI:**

```bash
# Set for all environments
vercel env add LTCG_API_KEY

# Set for production only
vercel env add LTCG_API_KEY --prod

# List variables
vercel env list

# Remove variable
vercel env rm LTCG_API_KEY

# Pull variables locally
vercel env pull

# Creates .env.local with all variables
```

**Mark Sensitive:**

```bash
# For sensitive variables (hidden in logs)
# Use dashboard: click on variable → Edit → mark "Sensitive"
```

### Railway

**Via Dashboard:**

1. Project → Settings
2. Environment
3. Add Variable
   - Key: `LTCG_API_KEY`
   - Value: `your_key_here`
4. Click "Add"

**Via CLI:**

```bash
# Add variable
railway variables set LTCG_API_KEY=your_key

# Add multiple
railway variables set LTCG_API_KEY=key MCP_API_KEY=key2

# Add secret (hidden in logs)
railway variables set MCP_API_KEY=secret --secret

# List all variables
railway variables list

# Export to .env
railway variables list > .env

# Remove variable
railway variables unset LTCG_API_KEY
```

### Docker

**Command Line:**

```bash
# Pass as environment variables
docker run -e LTCG_API_KEY=your_key \
           -e MCP_TRANSPORT=http \
           lunchtable-mcp:latest

# Multiple variables
docker run -e LTCG_API_KEY=key \
           -e MCP_API_KEY=mcp_key \
           -e ALLOWED_ORIGINS="https://yourdomain.com" \
           lunchtable-mcp:latest
```

**.env File:**

```bash
# Create .env file
LTCG_API_KEY=your_key
MCP_TRANSPORT=http
MCP_API_KEY=mcp_key
ALLOWED_ORIGINS=*

# Run with env file
docker run --env-file .env lunchtable-mcp:latest
```

**Docker Compose:**

```yaml
services:
  mcp-server:
    image: lunchtable-mcp:latest
    environment:
      LTCG_API_KEY: ${LTCG_API_KEY}
      MCP_TRANSPORT: http
      MCP_API_KEY: ${MCP_API_KEY}
      ALLOWED_ORIGINS: "*"
    env_file:
      - .env
```

### Kubernetes

**ConfigMap (non-sensitive):**

```bash
kubectl create configmap mcp-config \
  --from-literal=MCP_TRANSPORT=http \
  --from-literal=NODE_ENV=production
```

**Secret (sensitive):**

```bash
kubectl create secret generic mcp-secrets \
  --from-literal=LTCG_API_KEY=your_key \
  --from-literal=MCP_API_KEY=mcp_key
```

**In manifest:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mcp-server
spec:
  containers:
  - name: mcp-server
    image: lunchtable-mcp:latest
    envFrom:
    - configMapRef:
        name: mcp-config
    - secretRef:
        name: mcp-secrets
    env:
    - name: PORT
      value: "3000"
```

### Cloudflare Workers

**Secrets:**

```bash
# Set secret
wrangler secret put LTCG_API_KEY

# When prompted, paste your key and press Ctrl+D

# List secrets
wrangler secret list

# Remove secret
wrangler secret delete LTCG_API_KEY

# In code access:
// (secret value automatically injected)
const key = env.LTCG_API_KEY;
```

**Environment Variables (visible in code):**

```toml
# wrangler.toml
[env.production.vars]
MCP_TRANSPORT = "http"
NODE_ENV = "production"
LTCG_API_URL = "https://api.lunchtable.cards"
```

Access in code:

```typescript
const transport = env.MCP_TRANSPORT;
```

## Local Development

### .env File

Create `.env` in project root:

```bash
# .env (do NOT commit!)
LTCG_API_KEY=dev_key_here
MCP_TRANSPORT=http
MCP_API_KEY=dev_mcp_key
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
DEBUG=mcp:*
```

Add to `.gitignore`:

```bash
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore
```

### Load Variables

**With Node.js:**

```bash
# Using dotenv
npm install dotenv

# In code:
require('dotenv').config();
const apiKey = process.env.LTCG_API_KEY;
```

**With Bun:**

```typescript
// Bun automatically loads .env
const apiKey = process.env.LTCG_API_KEY;
```

**Command Line:**

```bash
# Load from .env and run
source .env && npm start

# Or on Windows:
# set /p line=<.env && for /f "tokens=1,2 delims==" %a in (.env) do set %a=%b
```

### Override Variables

Command line variables override `.env`:

```bash
# Use development key from .env
npm start

# Override with production key
LTCG_API_KEY=prod_key npm start

# Multiple overrides
LTCG_API_KEY=prod_key MCP_API_KEY=prod_mcp NODE_ENV=production npm start
```

## Testing Endpoints

### Health Check

**Local:**

```bash
curl http://localhost:3000/health
```

**Deployed:**

```bash
# Vercel
curl https://your-project.vercel.app/health

# Railway
curl https://your-project.up.railway.app/health

# Docker (port mapping)
curl http://localhost:3000/health

# Cloudflare Worker
curl https://mcp.yourdomain.com/health
```

**Expected Response:**

```json
{
  "status": "ok"
}
```

### Initialize Session

Without authentication:

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
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
```

With authentication (if MCP_API_KEY is set):

```bash
MCP_KEY="your_mcp_api_key"

curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MCP_KEY" \
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
```

### List Tools

```bash
MCP_KEY="your_mcp_api_key"

curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MCP_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
```

### Make Tool Call

Example: Create agent

```bash
MCP_KEY="your_mcp_api_key"

curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MCP_KEY" \
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

## Testing Scripts

### Bash Testing Script

Create `test-endpoints.sh`:

```bash
#!/bin/bash

# Configuration
URL="${1:-http://localhost:3000}"
MCP_KEY="${2:-}"
TIMEOUT=10

# Color output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Testing MCP Server at: $URL${NC}\n"

# Test 1: Health Check
echo -e "${YELLOW}[1] Health Check${NC}"
response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT "$URL/health")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✓ Pass${NC}"
  echo "Response: $body"
else
  echo -e "${RED}✗ Fail${NC} (HTTP $http_code)"
  echo "Response: $body"
fi

echo ""

# Test 2: Initialize
echo -e "${YELLOW}[2] Initialize Session${NC}"

AUTH_HEADER=""
if [ -n "$MCP_KEY" ]; then
  AUTH_HEADER="-H 'Authorization: Bearer $MCP_KEY'"
fi

response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT \
  -X POST "$URL/mcp" \
  -H "Content-Type: application/json" \
  $AUTH_HEADER \
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
  }')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
  echo -e "${GREEN}✓ Pass${NC}"
  echo "Response: $(echo $body | jq -c . 2>/dev/null || echo $body)"
else
  echo -e "${RED}✗ Fail${NC} (HTTP $http_code)"
  echo "Response: $body"
fi

echo ""

# Test 3: List Tools
echo -e "${YELLOW}[3] List Tools${NC}"

response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT \
  -X POST "$URL/mcp" \
  -H "Content-Type: application/json" \
  $AUTH_HEADER \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  tool_count=$(echo $body | jq '.result.tools | length' 2>/dev/null)
  echo -e "${GREEN}✓ Pass${NC}"
  echo "Tools available: $tool_count"
else
  echo -e "${RED}✗ Fail${NC} (HTTP $http_code)"
fi

echo ""
echo -e "${YELLOW}Tests complete!${NC}"
```

Run:

```bash
chmod +x test-endpoints.sh

# Test local server
./test-endpoints.sh http://localhost:3000

# Test with authentication
./test-endpoints.sh http://localhost:3000 "your_mcp_key"

# Test deployed server
./test-endpoints.sh https://your-project.vercel.app

# Test with production key
./test-endpoints.sh https://your-project.vercel.app "your_production_key"
```

### Load Testing

Using Apache Bench:

```bash
# Install Apache Bench
# macOS: brew install httpd
# Linux: apt-get install apache2-utils

# Basic load test (100 requests, 10 concurrent)
ab -n 100 -c 10 http://localhost:3000/health

# With authentication header
ab -n 100 -c 10 -H "Authorization: Bearer your_key" http://localhost:3000/health
```

Using `wrk`:

```bash
# Install wrk
# macOS: brew install wrk
# Linux: apt-get install wrk

# Load test (12 threads, 400 connections, 30 seconds)
wrk -t12 -c400 -d30s http://localhost:3000/health

# With custom script (authentication)
cat > auth.lua << 'EOF'
wrk.headers["Authorization"] = "Bearer your_key"
EOF

wrk -t12 -c400 -d30s -s auth.lua http://localhost:3000/health
```

## Troubleshooting

### Variable Not Found Error

**Error:** `LTCG_API_KEY is required but not set`

**Solution:**
1. Check variable is set:
   ```bash
   echo $LTCG_API_KEY
   ```
2. If empty, set it:
   ```bash
   export LTCG_API_KEY=your_key
   ```
3. Or via platform dashboard
4. Restart server after setting

### Authentication Fails

**Error:** `401 Unauthorized`

**Solution:**
1. Verify MCP_API_KEY matches
2. Check Authorization header format:
   ```bash
   # Correct
   Authorization: Bearer your_key_here

   # Incorrect (missing "Bearer")
   Authorization: your_key_here
   ```
3. Verify key in curl command:
   ```bash
   curl -H "Authorization: Bearer $(echo $MCP_API_KEY)" ...
   ```

### CORS Errors

**Error:** `Cross-Origin Request Blocked`

**Browser Console:**
```
Access to XMLHttpRequest at 'https://...' from origin 'https://yourdomain.com'
has been blocked by CORS policy
```

**Solution:**
1. Set ALLOWED_ORIGINS:
   ```bash
   ALLOWED_ORIGINS=https://yourdomain.com
   ```
2. Or allow all (development only):
   ```bash
   ALLOWED_ORIGINS=*
   ```
3. Restart server
4. Test:
   ```bash
   curl -H "Origin: https://yourdomain.com" \
        -v http://localhost:3000/health
   ```

### Environment Variables Not Loaded

**Issue:** Variables work locally but not in cloud

**Solution:**
1. Verify variables in platform dashboard
2. Check for typos
3. Redeploy after setting variables
4. Check restart after deploy:
   ```bash
   # Vercel
   vercel logs --follow

   # Railway
   railway logs --follow
   ```

## Security Best Practices

### Protect Secrets

**Never commit .env:**

```bash
# Add to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore
```

**Verify before commit:**

```bash
# Check no secrets in git
git diff --cached -- "*.env"

# Or use pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
if git diff --cached | grep -E '^\+.*(LTCG_API_KEY|MCP_API_KEY)' > /dev/null; then
  echo "ERROR: Secrets detected in staged files!"
  exit 1
fi
EOF

chmod +x .git/hooks/pre-commit
```

### Use Platform Secrets

Always use platform-native secret management:

- Vercel: Environment Variables (mark sensitive)
- Railway: Secrets
- Docker: Docker secrets or external secret store
- Kubernetes: Kubernetes Secrets
- Cloudflare: Wrangler secrets

### Rotate Keys

Periodically rotate API keys:

```bash
# Create new key
# Update in all deployments
# Remove old key
# Verify all systems working
```

### Audit Access

Check who can access secrets:

- Vercel: Project Settings → Security → Collaborators
- Railway: Project Settings → Members
- Kubernetes: RBAC policies

## FAQ

**Q: Can I use the same key everywhere?**
A: Not recommended. Use different keys per environment (dev, staging, prod).

**Q: What if I accidentally commit a secret?**
A: Immediately rotate the key and revoke the exposed one.

**Q: How often should I rotate keys?**
A: Monthly for high-security deployments, quarterly minimum.

**Q: Can environment variables be different per region?**
A: Limited - most platforms apply globally. Use backend configuration for per-region settings.

**Q: How do I test if variables are loaded?**
A: Add debug logging at startup, check in logs after deploy.

## Support

- **Platform Docs:**
  - Vercel: https://vercel.com/docs/environment-variables
  - Railway: https://docs.railway.app/deploy/environments
  - Docker: https://docs.docker.com/engine/reference/commandline/run/#env
  - Kubernetes: https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/

- **Security:**
  - OWASP: https://owasp.org/www-project-secure-coding-practices/
  - 12 Factor App: https://12factor.net/config
