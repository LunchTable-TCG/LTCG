# HTTP Client Configuration Examples

This directory contains configuration examples and code samples for connecting MCP clients to the LunchTable-TCG MCP server using HTTP transport.

## Quick Start

### Testing with cURL

The fastest way to test your HTTP MCP server:

```bash
# 1. Health check
curl https://your-mcp-server.com/health

# 2. Initialize session
curl -X POST https://your-mcp-server.com/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MCP_API_KEY" \
  -D headers.txt \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": {
        "name": "curl-test",
        "version": "1.0.0"
      }
    }
  }'

# 3. Extract session ID
SESSION_ID=$(grep -i 'Mcp-Session-Id:' headers.txt | awk '{print $2}' | tr -d '\r')
echo "Session ID: $SESSION_ID"

# 4. List tools
curl -X POST https://your-mcp-server.com/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MCP_API_KEY" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

### TypeScript/JavaScript Client

See [http-client-config.json](./http-client-config.json) for the complete TypeScript implementation.

**Quick example:**

```typescript
import { HttpTransport } from './http-transport'; // See http-client-config.json

const transport = new HttpTransport(
  'https://your-mcp-server.com',
  'your_mcp_api_key'
);

// Initialize
await transport.send({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'my-agent', version: '1.0.0' }
  }
});

// List tools
const tools = await transport.send({
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/list'
});

console.log(tools);

// Clean up
await transport.close();
```

### Python Client

See [http-client-config.json](./http-client-config.json) for the complete Python implementation.

**Quick example:**

```python
from mcp_http_client import McpHttpClient  # See http-client-config.json

client = McpHttpClient(
    base_url='https://your-mcp-server.com',
    api_key='your_mcp_api_key'
)

# Initialize
client.initialize()

# List tools
tools = client.list_tools()
print(tools)

# Call a tool
result = client.call_tool('list_lobbies', {'mode': 'casual'})
print(result)

# Clean up
client.close()
```

## Available Examples

### [http-client-config.json](./http-client-config.json)

Comprehensive JSON file containing:

1. **Claude Desktop Configuration**
   - Remote HTTP server configuration (conceptual)
   - Local HTTP server configuration

2. **Custom Client Implementations**
   - TypeScript/JavaScript HTTP transport class
   - Python client implementation
   - Browser WebSocket client (future)

3. **Testing Examples**
   - cURL commands for all endpoints
   - Postman collection
   - Load balancer configurations

4. **Troubleshooting Guide**
   - Common errors and solutions
   - Best practices
   - Performance tips

## Claude Desktop Configuration

**For Local Development (stdio):**

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "lunchtable-tcg": {
      "command": "node",
      "args": ["/path/to/packages/mcp-server/dist/index.js"],
      "env": {
        "LTCG_API_KEY": "your_api_key_here",
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

**For Local HTTP Testing:**

```json
{
  "mcpServers": {
    "lunchtable-tcg-http": {
      "command": "bun",
      "args": ["run", "start:http"],
      "cwd": "/path/to/packages/mcp-server",
      "env": {
        "LTCG_API_KEY": "your_api_key_here",
        "MCP_TRANSPORT": "http",
        "PORT": "3000"
      }
    }
  }
}
```

> **Note**: Claude Desktop doesn't natively support remote HTTP MCP servers yet. Use stdio transport with a local proxy if needed.

## Postman Setup

1. Open Postman
2. Import → Raw text → Paste the `postman_collection` from [http-client-config.json](./http-client-config.json)
3. Set collection variables:
   - `base_url`: Your MCP server URL
   - `api_key`: Your MCP API key
4. Run "Initialize Session" request first
5. Session ID is automatically saved for subsequent requests

## Common Use Cases

### 1. Testing Production Deployment

```bash
# Check server health
curl https://your-production-server.com/health

# Full test workflow
./test-http-mcp.sh https://your-production-server.com YOUR_API_KEY
```

### 2. Building a Custom Agent

```typescript
class LunchTableAgent {
  private transport: HttpTransport;

  constructor(serverUrl: string, apiKey: string) {
    this.transport = new HttpTransport(serverUrl, apiKey);
  }

  async initialize() {
    await this.transport.send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: {
          name: 'lunchtable-agent',
          version: '1.0.0'
        }
      }
    });
  }

  async findGame() {
    return await this.transport.send({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'list_lobbies',
        arguments: { mode: 'casual' }
      }
    });
  }

  async cleanup() {
    await this.transport.close();
  }
}
```

### 3. Load Testing

```bash
# Using Apache Bench
ab -n 1000 -c 10 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -p init-request.json \
  https://your-mcp-server.com/mcp

# Using wrk
wrk -t4 -c100 -d30s \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  --script test.lua \
  https://your-mcp-server.com/mcp
```

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to remote server

```bash
# Check DNS resolution
nslookup your-mcp-server.com

# Check if port is accessible
nc -zv your-mcp-server.com 443

# Test with verbose curl
curl -v https://your-mcp-server.com/health
```

**Solution**: Verify DNS, firewall rules, and SSL certificate.

### Authentication Errors

**Problem**: 401 Unauthorized

```bash
# Test without authentication (if server allows)
curl https://your-mcp-server.com/health

# Test with authentication
curl -H "Authorization: Bearer YOUR_KEY" \
  https://your-mcp-server.com/mcp \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize",...}'
```

**Solution**: Check API key format, ensure no extra whitespace, verify server configuration.

### Session Expiry

**Problem**: Session expires after 1 hour

**Solution**: Implement automatic session renewal:

```typescript
class SessionManager {
  private sessionId?: string;
  private lastActivity: number = Date.now();
  private readonly SESSION_TIMEOUT = 3500000; // 58 minutes

  async renewIfNeeded() {
    const now = Date.now();
    if (now - this.lastActivity > this.SESSION_TIMEOUT) {
      await this.initialize(); // Re-initialize session
    }
    this.lastActivity = now;
  }
}
```

## Performance Tips

1. **Connection Reuse**: Use keep-alive connections
2. **Request Batching**: Send multiple requests in one HTTP call
3. **Caching**: Cache tool/prompt lists locally
4. **Timeout Handling**: Set appropriate timeouts (30s recommended)
5. **Error Retry**: Implement exponential backoff for retries

## Security Best Practices

1. **HTTPS Only**: Never use HTTP in production
2. **API Key Storage**: Use environment variables, not hardcoded values
3. **Session Security**: Store session IDs securely (not in localStorage for sensitive apps)
4. **Certificate Validation**: Always validate SSL certificates
5. **Timeout Configuration**: Set timeouts to prevent hanging connections

## Additional Resources

- [HTTP Transport Documentation](../docs/HTTP_TRANSPORT.md)
- [Deployment Guide](../docs/DEPLOYMENT.md)
- [Main README](../README.md)
- [MCP Specification](https://spec.modelcontextprotocol.io)

## Examples Directory Structure

```
examples/
├── HTTP_CLIENT_EXAMPLES.md          (this file)
├── http-client-config.json          (comprehensive client examples)
├── claude-desktop.json              (stdio config)
├── cline.json                       (Cline config)
├── vscode.json                      (VS Code config)
├── schema.json                      (MCP schema reference)
├── setup.sh                         (setup script)
├── INDEX.md                         (examples index)
├── README.md                        (general examples guide)
└── SETUP.md                         (setup instructions)
```

## Contributing

Found a better way to connect to the HTTP MCP server? Please contribute your example!

1. Add your implementation to `http-client-config.json`
2. Document any special setup requirements
3. Include error handling and best practices
4. Submit a pull request

---

**Need help?** Check the [troubleshooting section in http-client-config.json](./http-client-config.json) or visit our [Discord](https://discord.gg/lunchtable).
