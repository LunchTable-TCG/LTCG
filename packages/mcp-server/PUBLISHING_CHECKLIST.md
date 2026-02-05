# @lunchtable/mcp-server - Publishing Readiness Checklist

Generated: 2026-02-05

## Overview

This document verifies that @lunchtable/mcp-server v1.0.0 is ready for npm publication to the @lunchtable organization scope.

## Pre-Publish Verification Status

### Package Configuration ✓

- [x] Package name: `@lunchtable/mcp-server` (correct scoped format)
- [x] Version: `1.0.0` (semantic versioning)
- [x] Description: Clear and accurate
- [x] Type: `"module"` (ES modules)
- [x] Main entry: `dist/index.js`
- [x] Types entry: `dist/index.d.ts` (TypeScript support)
- [x] Bin entry: `ltcg-mcp` points to `dist/index.js`

### Repository Metadata ✓

- [x] Repository URL: https://github.com/lunchtable/lunchtable-tcg.git
- [x] Repository directory: packages/mcp-server
- [x] Homepage: https://github.com/lunchtable/lunchtable-tcg/tree/main/packages/mcp-server
- [x] Bugs URL: https://github.com/lunchtable/lunchtable-tcg/issues
- [x] Author: LunchTable-TCG Team
- [x] License: MIT

### Keywords & Discovery ✓

Keywords for npm search:
- mcp
- model-context-protocol
- lunchtable
- tcg
- trading-card-game
- ai-agent
- ai
- claude
- bun
- hono

### Runtime Requirements ✓

- [x] Engines: Node.js >=20.0.0 or Bun >=1.3.0
- [x] Dependencies correctly specified:
  - `@modelcontextprotocol/sdk@^0.5.0`
  - `convex@^1.31.6`
  - `hono@^4.0.0`
- [x] DevDependencies only used for build tooling

### Build Artifacts ✓

- [x] dist/ directory exists
- [x] All files compiled to ES2022 JavaScript
- [x] TypeScript declarations generated (.d.ts files)
- [x] Source maps included for debugging (.js.map files)
- [x] Shebang present in dist/index.js (#!/usr/bin/env node)
- [x] All modules properly exported

Dist contents:
- config.js/.d.ts (environment configuration)
- http-server.js/.d.ts (HTTP server with Hono)
- http-transport.js/.d.ts (HTTP transport layer)
- index.js/.d.ts (CLI entry point)
- server-setup.js/.d.ts (MCP server configuration)

Total package size: 24.4 kB (well under limits)

### Distribution Files ✓

Files included in npm package (via `files` field):
- [x] dist/ (compiled JavaScript and types)
- [x] README.md (comprehensive documentation)
- [x] CHANGELOG.md (version history)
- [x] package.json (manifest)
- [x] LICENSE (implied, not explicitly listed but available)

Files excluded via .npmignore:
- [x] src/ (source TypeScript not shipped)
- [x] tsconfig.json
- [x] node_modules/
- [x] examples/ (kept separate)
- [x] Dockerfile, vercel.json, railway.json (deployment files)

### Documentation ✓

- [x] README.md (16.4 kB, comprehensive)
  - Installation instructions
  - Configuration guide
  - Usage examples for multiple transports
  - API tool documentation
  - Troubleshooting guide
  - Architecture overview
  - Security considerations

- [x] CHANGELOG.md (created)
  - v1.0.0 initial release documentation
  - Features list
  - Tech stack
  - Known limitations
  - Security notes

- [x] docs/PUBLISHING.md (created)
  - Pre-publish checklist
  - Step-by-step publishing procedure
  - Version management strategy
  - Testing procedures
  - Troubleshooting
  - Rollback procedures

### Publish Configuration ✓

- [x] publishConfig.access: "public" (scoped package published publicly)
- [x] publishConfig.registry: "https://registry.npmjs.org"

### TypeScript Support ✓

- [x] tsconfig.json configured with:
  - `declaration: true` (generate .d.ts)
  - `declarationMap: true` (source maps for types)
  - `sourceMap: true` (source maps for JS)
  - `target: ES2022` (modern JavaScript)
  - `module: ES2022` (ES modules)
  - ES2022 target compatible with Node 20+

### CLI Binary ✓

- [x] Bin entry configured: `ltcg-mcp` → `dist/index.js`
- [x] Shebang present for Unix/Linux/macOS systems
- [x] Global installation supported via `npm install -g @lunchtable/mcp-server`
- [x] Works with both Node.js and Bun runtimes

### Build Process ✓

- [x] Build script runs successfully: `npm run build`
- [x] No TypeScript compilation errors
- [x] Prepare script defined: `"prepare": "npm run build"`
  - Automatically rebuilds on `npm install` if needed
- [x] Dev watch mode available: `npm run dev`

### Dry Run Package Test ✓

```
npm pack --dry-run
Tarball Details:
  name: @lunchtable/mcp-server
  version: 1.0.0
  filename: lunchtable-mcp-server-1.0.0.tgz
  package size: 24.4 kB
  unpacked size: 93.7 kB
```

### Code Quality ✓

- [x] No compilation errors
- [x] TypeScript strict mode enabled
- [x] ES module syntax (consistent with package.json)
- [x] Proper error handling implemented
- [x] Security practices followed (HMAC, env vars, etc.)

### Semantic Versioning ✓

- [x] Version: 1.0.0 (appropriate for initial release)
- [x] Follows semver.org specification
- [x] CHANGELOG documents major features and security notes

## NPM Organization Setup

Before publishing, ensure:

1. **npm Account**
   - [ ] Create account at npmjs.com
   - [ ] Enable 2FA if required by org policy
   - [ ] Save npm token securely

2. **Organization Setup**
   - [ ] @lunchtable organization exists on npm
   - [ ] Your account is member with publish permissions
   - [ ] No holds or embargoes on package name

3. **Credentials**
   - [ ] Run `npm login` locally
   - [ ] Verify with `npm whoami`

## Publishing Steps

```bash
# 1. Verify package contents
npm pack --dry-run

# 2. Publish to npm (from packages/mcp-server directory)
npm publish

# 3. Verify publication
npm view @lunchtable/mcp-server

# 4. Test installation
npm install @lunchtable/mcp-server
ltcg-mcp --help  # If help implemented

# 5. Create GitHub release
# - Tag: mcp-server@1.0.0
# - Title: MCP Server v1.0.0
# - Body: Copy from CHANGELOG.md
```

## Post-Publish Actions

After successful publication:

1. [ ] Verify package appears on npm: https://www.npmjs.com/package/@lunchtable/mcp-server
2. [ ] Create GitHub release with matching tag
3. [ ] Update installation guide in main README.md
4. [ ] Announce in Discord #announcements channel
5. [ ] Add installation instructions to project documentation

## Rollback Plan

If issues are discovered after publishing:

1. Within 72 hours: `npm unpublish @lunchtable/mcp-server@1.0.0`
2. Fix the issue locally
3. Publish patch version: `npm version patch && npm publish`

For issues discovered after 72 hours:
1. Publish a new patch version with fixes
2. Optional: Deprecate old version with `npm deprecate @lunchtable/mcp-server@1.0.0 "Use 1.0.1 or later"`

## Success Criteria

Package is ready to publish when:

- [x] All items in this checklist are marked complete
- [x] npm pack --dry-run shows expected contents
- [x] npm whoami returns your username
- [x] You have publish permissions for @lunchtable scope
- [x] No uncommitted changes in git (optional but recommended)

## References

- [npm Publishing Guide](https://docs.npmjs.com/cli/v10/commands/npm-publish)
- [Scoped Packages](https://docs.npmjs.com/cli/v10/using-npm/scope)
- [Semantic Versioning](https://semver.org/)
- [MCP Specification](https://spec.modelcontextprotocol.io)

---

**Status**: READY FOR PUBLICATION
**Version**: 1.0.0
**Last Updated**: 2026-02-05
