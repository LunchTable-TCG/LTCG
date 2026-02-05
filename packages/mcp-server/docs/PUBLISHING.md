# Publishing @lunchtable/mcp-server to npm

This document outlines the process for publishing the MCP server to the npm registry under the @lunchtable organization.

## Prerequisites

1. **npm Account**: Create an account at [npmjs.com](https://npmjs.com)
2. **Organization Membership**: Must be a member of the @lunchtable organization with publish permissions
3. **Local Setup**:
   ```bash
   npm login
   ```
   Provide your npm credentials (username, password, one-time password if 2FA enabled)

## Pre-Publish Checklist

Before publishing, verify the following:

### Code Quality
- [ ] All tests pass: `npm test` (when tests are added)
- [ ] TypeScript compiles without errors: `npm run build`
- [ ] No linting errors: `npm run lint` (when linter is configured)
- [ ] Code follows project style guidelines

### Package Configuration
- [ ] `package.json` has correct version number (follows semver)
- [ ] `package.json` name is `@lunchtable/mcp-server`
- [ ] `description` is clear and accurate
- [ ] `keywords` are relevant for discovery
- [ ] `repository`, `homepage`, `bugs` URLs are correct
- [ ] `engines` field specifies supported Node/Bun versions
- [ ] `files` array includes necessary files (dist/, README.md, LICENSE, CHANGELOG.md)
- [ ] `publishConfig` is set to public access

### Dependencies
- [ ] All runtime dependencies are in `dependencies` (not `devDependencies`)
- [ ] devDependencies contains only development tools
- [ ] No unnecessary dependencies
- [ ] Dependencies have reasonable version ranges

### Documentation
- [ ] README.md is complete and accurate
- [ ] CHANGELOG.md documents all changes for this version
- [ ] API documentation is up-to-date
- [ ] Examples are working and tested

### Build Artifacts
- [ ] `dist/` directory exists and is properly built
- [ ] `dist/` contains all necessary compiled files (`.js` and `.d.ts`)
- [ ] No stale files in `dist/` from previous builds

### Distribution
- [ ] `.npmignore` excludes unnecessary files
- [ ] `files` field is not too restrictive
- [ ] Package size is reasonable (< 5MB typically)

### Git & Version Control
- [ ] Working directory is clean (no uncommitted changes)
- [ ] Latest changes are committed and pushed
- [ ] Version tag will be created after publishing

## Publishing Steps

### 1. Verify Build

```bash
cd packages/mcp-server
npm run build
```

Ensure the dist/ directory contains compiled JavaScript files.

### 2. Check Package Contents

See what will be published:

```bash
npm pack --dry-run
```

Review the list and ensure all necessary files are included.

### 3. Update Version

If this is a new release, update the version in package.json following semantic versioning:

```bash
npm version patch    # 1.0.0 → 1.0.1 (bug fixes)
npm version minor    # 1.0.0 → 1.1.0 (new features, backwards compatible)
npm version major    # 1.0.0 → 2.0.0 (breaking changes)
```

This automatically commits and tags in git.

### 4. Update CHANGELOG.md

Add entries for the new version at the top of CHANGELOG.md:

```markdown
## [1.0.1] - 2026-02-06

### Fixed
- Bug fix description

### Changed
- Change description
```

Commit this change:

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for v1.0.1"
```

### 5. Publish to npm

```bash
npm publish
```

If 2FA is enabled, you'll be prompted for a one-time password.

**Expected output:**
```
npm notice
npm notice 📦  @lunchtable/mcp-server@1.0.0
npm notice === Tarball Contents ===
npm notice ...
npm notice === Tarball Details ===
npm notice name:          @lunchtable/mcp-server
npm notice version:       1.0.0
npm notice filename:      lunchtable-mcp-server-1.0.0.tgz
npm notice ...
npm notice 📦  @lunchtable/mcp-server@1.0.0
```

### 6. Verify Publication

Check that the package is published:

```bash
npm view @lunchtable/mcp-server
```

Should show the version you just published.

### 7. Create GitHub Release

Create a release on GitHub matching the version:

1. Go to [Releases](https://github.com/lunchtable/lunchtable-tcg/releases)
2. Click "Draft a new release"
3. Tag: `mcp-server@1.0.0`
4. Title: `MCP Server v1.0.0`
5. Description: Copy from CHANGELOG.md for this version
6. Publish release

## Versioning Strategy

This project uses [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes in the API, tool parameters, or output format
- **MINOR** (1.0.0 → 1.1.0): New features, backward compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, documentation updates

### When to bump versions:

**MAJOR**:
- Removing tools
- Changing required parameters
- Changing output schema in incompatible way
- Dropping support for Node/Bun versions

**MINOR**:
- Adding new tools
- Adding optional parameters
- Performance improvements
- New optional configuration options

**PATCH**:
- Bug fixes
- Documentation updates
- Security patches
- Dependency updates (if compatible)

## Testing Before Publishing

### Manual Testing (Local)

```bash
# Test stdio mode
MCP_TRANSPORT=stdio node dist/index.js

# Test HTTP mode
MCP_TRANSPORT=http PORT=3000 node dist/http-server.js

# Test in another terminal
curl http://localhost:3000/health
```

### Using MCP Inspector

```bash
npm install -g @modelcontextprotocol/inspector
mcp-inspector ltcg-mcp
```

This opens a browser interface to test tools and prompts.

### Test Installation from npm (Dry Run)

Create a test directory and install locally:

```bash
mkdir /tmp/test-mcp-server
cd /tmp/test-mcp-server
npm install /path/to/packages/mcp-server

# Verify the command works
./node_modules/.bin/ltcg-mcp --help  # If implemented
```

## Troubleshooting

### "You do not have permission to publish to this package"

- Verify you're logged in: `npm whoami`
- Check organization membership: Ensure you're a member of @lunchtable org with publish role
- Check scope: Package name should be `@lunchtable/mcp-server`

### "The name '@lunchtable/mcp-server' is already taken"

- This is expected if published before. Use `npm version patch` to increment.

### "dist/ directory is empty or missing"

- Run `npm run build` first
- Check that TypeScript compiled successfully: `ls dist/`

### "npm ERR! 403 Forbidden"

- Verify 2FA token if enabled
- Check organization access token settings
- Ensure package is not under embargo or hold

### "Package appears broken after publishing"

- Check that `main` field in package.json points to correct file
- Verify `types` field exists (for TypeScript support)
- Test installation in fresh directory

## Rollback Procedure

If a problematic version is published, you can unpublish it (within 72 hours):

```bash
npm unpublish @lunchtable/mcp-server@1.0.0
```

Then fix the issue and publish again with a patch version.

**Note**: Unpublishing removes the version from npm, but users who already installed it will keep it. Publish a fixed patch version instead.

## Continuous Integration (Optional)

To automate publishing:

1. Create GitHub Actions workflow
2. Publish on version tag: `mcp-server@*`
3. Generate npm token with publish permission
4. Store as `NPM_TOKEN` secret in GitHub

Example workflow snippet:

```yaml
- name: Publish to npm
  run: npm publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Additional Resources

- [npm Publishing Guide](https://docs.npmjs.com/cli/v10/commands/npm-publish)
- [Scoped Packages](https://docs.npmjs.com/cli/v10/using-npm/scope)
- [package.json Reference](https://docs.npmjs.com/cli/v10/configuring-npm/package-json)
- [Semantic Versioning](https://semver.org/)
- [MCP Specification](https://spec.modelcontextprotocol.io)

## Questions or Issues?

Reach out in the [LunchTable Discord](https://discord.gg/lunchtable) or open an issue on GitHub.
