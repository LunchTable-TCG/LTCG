# LunchTable-TCG MCP Server Documentation

Comprehensive documentation for deploying and using the LunchTable-TCG MCP server with HTTP transport.

## Documentation Index

### Core Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| [../README.md](../README.md) | Main README with quick start and overview | All users |
| [HTTP_TRANSPORT.md](./HTTP_TRANSPORT.md) | Deep dive on HTTP transport protocol | Developers, DevOps |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Platform-specific deployment guides | DevOps, Production deployments |

### Examples and Configuration

| Document | Purpose | Audience |
|----------|---------|----------|
| [../examples/HTTP_CLIENT_EXAMPLES.md](../examples/HTTP_CLIENT_EXAMPLES.md) | HTTP client implementations and examples | Developers |
| [../examples/http-client-config.json](../examples/http-client-config.json) | Ready-to-use client code and configurations | All users |
| [../examples/INDEX.md](../examples/INDEX.md) | Index of all configuration examples | All users |

### Additional Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| [../PROMPTS.md](../PROMPTS.md) | Custom MCP prompts/slash commands | MCP users |
| [../QUICKSTART.md](../QUICKSTART.md) | Quick start guide | First-time users |
| [../IMPLEMENTATION_SUMMARY.md](../IMPLEMENTATION_SUMMARY.md) | Technical implementation details | Developers |

## Quick Navigation

### I want to...

**Deploy to production**
1. Read [DEPLOYMENT.md](./DEPLOYMENT.md) for your platform (Vercel, Railway, Docker, etc.)
2. Configure environment variables
3. Deploy and verify with health check

**Understand HTTP transport**
1. Read [HTTP_TRANSPORT.md](./HTTP_TRANSPORT.md) for protocol details
2. Learn about session management, authentication, and CORS
3. Review security best practices

**Build a custom client**
1. See [../examples/HTTP_CLIENT_EXAMPLES.md](../examples/HTTP_CLIENT_EXAMPLES.md) for examples
2. Copy TypeScript or Python implementation from [http-client-config.json](../examples/http-client-config.json)
3. Customize for your use case

**Test HTTP mode locally**
1. Set `MCP_TRANSPORT=http` in environment
2. Run `bun run start:http`
3. Test with cURL (see [HTTP_CLIENT_EXAMPLES.md](../examples/HTTP_CLIENT_EXAMPLES.md))

**Set up Claude Desktop (local)**
1. Read [../examples/SETUP.md](../examples/SETUP.md)
2. Configure with stdio transport
3. Restart Claude Desktop

## Transport Mode Comparison

| Feature | Stdio Transport | HTTP Transport |
|---------|----------------|----------------|
| **Best for** | Local development | Remote/cloud deployment |
| **Latency** | Minimal (local) | Network dependent |
| **Scalability** | Single client | Multiple clients, load balanced |
| **Security** | OS-level | HTTPS, API key auth |
| **Setup** | Simple | Requires deployment |
| **Cost** | Free (local) | Cloud hosting fees |
| **Use with** | Claude Desktop, Cline | Any HTTP client, custom agents |

## Architecture Overview

### Stdio Mode (Local)

```
┌─────────────────┐
│  Claude Desktop │
│  (MCP Client)   │
└────────┬────────┘
         │ stdio (process communication)
         │
┌────────▼────────┐
│  MCP Server     │ (Local process)
│  (stdio mode)   │
└────────┬────────┘
         │ LTCG API calls
         │
┌────────▼────────┐
│  LunchTable-TCG │
│  Backend API    │
└─────────────────┘
```

### HTTP Mode (Remote)

```
┌─────────────────┐      ┌─────────────────┐
│  Custom Agent   │      │  Web Browser    │
│  (Your code)    │      │  (JavaScript)   │
└────────┬────────┘      └────────┬────────┘
         │                         │
         │ HTTPS + JSON-RPC        │
         └────────┬────────────────┘
                  │
         ┌────────▼────────┐
         │  Load Balancer  │ (Optional)
         │  (Nginx, HAProxy)│
         └────────┬────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼────┐   ┌───▼────┐   ┌───▼────┐
│ MCP #1 │   │ MCP #2 │   │ MCP #3 │
└───┬────┘   └───┬────┘   └───┬────┘
    │            │            │
    └────────────┼────────────┘
                 │
         ┌───────▼────────┐
         │  Redis/DB      │ (Session storage)
         └───────┬────────┘
                 │
         ┌───────▼────────┐
         │ LunchTable-TCG │
         │  Backend API   │
         └────────────────┘
```

## Documentation by Role

### For End Users

1. [Main README](../README.md) - Overview and features
2. [Quick Start Guide](../QUICKSTART.md) - Get started quickly
3. [Setup Examples](../examples/SETUP.md) - Claude Desktop configuration
4. [Prompts Documentation](../PROMPTS.md) - Available slash commands

### For Developers

1. [HTTP Transport Deep Dive](./HTTP_TRANSPORT.md) - Protocol details
2. [HTTP Client Examples](../examples/HTTP_CLIENT_EXAMPLES.md) - Client implementations
3. [Implementation Summary](../IMPLEMENTATION_SUMMARY.md) - Technical architecture
4. [API Reference](../README.md#available-tools) - Available MCP tools

### For DevOps/Platform Engineers

1. [Deployment Guide](./DEPLOYMENT.md) - Platform-specific deployments
2. [HTTP Transport](./HTTP_TRANSPORT.md) - Load balancing, scaling, security
3. [Environment Configuration](./DEPLOYMENT.md#environment-configuration) - Env vars
4. [Monitoring and Logging](./DEPLOYMENT.md#monitoring-and-logging) - Observability

## Common Deployment Scenarios

### Scenario 1: Solo Developer (Local)

**Setup**: Stdio mode with Claude Desktop
**Guide**: [../examples/SETUP.md](../examples/SETUP.md)
**Cost**: Free
**Effort**: 5 minutes

### Scenario 2: Team Development (Shared Server)

**Setup**: HTTP mode on Railway/Vercel
**Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
**Cost**: $5-20/month
**Effort**: 15 minutes

### Scenario 3: Production AI Agent

**Setup**: Docker on AWS/GCP with load balancer
**Guide**: [DEPLOYMENT.md → Docker](./DEPLOYMENT.md#docker-deployment)
**Cost**: $50-200/month
**Effort**: 1-2 hours

### Scenario 4: Multi-Region Global Service

**Setup**: Fly.io edge deployment or Kubernetes
**Guide**: [DEPLOYMENT.md → Fly.io](./DEPLOYMENT.md#flyio-deployment)
**Cost**: $100+/month
**Effort**: 2-4 hours

## Security Checklist

When deploying to production:

- [ ] Environment variables stored securely (not in code)
- [ ] HTTPS enabled (not HTTP)
- [ ] MCP_API_KEY configured for authentication
- [ ] ALLOWED_ORIGINS restricted to specific domains (not `*`)
- [ ] Rate limiting configured (via reverse proxy)
- [ ] Health check endpoint monitored
- [ ] Error logging enabled
- [ ] SSL certificate valid and auto-renewing
- [ ] Firewall rules configured (only ports 80/443 exposed)
- [ ] API keys rotated regularly (30-90 days)

See [DEPLOYMENT.md → Security Best Practices](./DEPLOYMENT.md#security-best-practices-for-http-deployment) for details.

## Performance Optimization Checklist

For high-traffic deployments:

- [ ] Connection pooling enabled
- [ ] Response caching implemented
- [ ] CDN configured (Cloudflare, etc.)
- [ ] HTTP/2 or HTTP/3 enabled
- [ ] Session storage externalized (Redis)
- [ ] Load balancer configured with health checks
- [ ] Auto-scaling rules defined
- [ ] Database queries optimized
- [ ] Monitoring and alerting set up
- [ ] Batch request support implemented

See [HTTP_TRANSPORT.md → Performance Considerations](./HTTP_TRANSPORT.md#performance-considerations) for details.

## Troubleshooting Quick Links

| Issue | Documentation |
|-------|---------------|
| Server won't start | [Main README → Troubleshooting](../README.md#troubleshooting) |
| HTTP connection fails | [DEPLOYMENT.md → Troubleshooting](./DEPLOYMENT.md#troubleshooting) |
| CORS errors | [HTTP_TRANSPORT.md → CORS Configuration](./HTTP_TRANSPORT.md#cors-configuration) |
| Session expiry | [HTTP_TRANSPORT.md → Session Management](./HTTP_TRANSPORT.md#session-management) |
| Authentication errors | [HTTP_CLIENT_EXAMPLES.md → Troubleshooting](../examples/HTTP_CLIENT_EXAMPLES.md#troubleshooting) |
| Performance issues | [Main README → Performance Issues](../README.md#performance-issues) |

## Contributing to Documentation

Found an error or want to improve the docs?

1. All documentation is in Markdown
2. Main docs in `/packages/mcp-server/docs/`
3. Examples in `/packages/mcp-server/examples/`
4. Follow existing style and structure
5. Test all code examples before submitting
6. Submit a pull request with clear description

## External Resources

- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io)
- [Bun Documentation](https://bun.sh/docs)
- [Hono Framework](https://hono.dev/)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [LunchTable-TCG Main Repo](https://github.com/lunchtable/lunchtable-tcg)

## Support

- **Discord**: [discord.gg/lunchtable](https://discord.gg/lunchtable)
- **GitHub Issues**: [github.com/lunchtable/lunchtable-tcg/issues](https://github.com/lunchtable/lunchtable-tcg/issues)
- **Documentation**: [docs.lunchtable.cards](https://docs.lunchtable.cards)

---

**Last Updated**: 2026-02-05
**MCP Protocol Version**: 2025-03-26
**Server Version**: 1.0.0
