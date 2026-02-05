# ClawHub Submission Guide

This document outlines how to submit the LunchTable-TCG skill to ClawHub for distribution.

## Pre-Submission Checklist

- [x] SKILL.md with YAML frontmatter
- [x] package.json with OpenClaw metadata
- [x] .clawhub.json with ClawHub configuration
- [x] README.md updated with installation instructions
- [x] INSTALLATION.md for setup guide
- [x] examples/ directory with working examples
- [x] scenarios/ directory with use cases

## File Structure

```
skills/lunchtable/lunchtable-tcg/
├── .clawhub.json          # ClawHub metadata
├── SKILL.md               # Main skill documentation with YAML frontmatter
├── package.json           # npm/OpenClaw package metadata
├── README.md              # User-facing documentation
├── INSTALLATION.md        # Setup instructions
├── SUBMISSION.md          # This file
├── examples/              # Working code examples
│   ├── quickstart.sh
│   ├── ranked-game.sh
│   └── advanced-chains.sh
└── scenarios/             # Use case scenarios
    ├── beginner-game.txt
    ├── competitive-match.txt
    └── advanced-tactics.txt
```

## Submission Process

### 1. Test the Skill Locally

```bash
# Test installation from local directory
cd /path/to/ltcg/skills/lunchtable/lunchtable-tcg
openclaw skill add .

# Verify skill loads correctly
openclaw skills list | grep lunchtable-tcg

# Test skill invocation
openclaw run "/lunchtable-tcg"
```

### 2. Publish to npm (Optional)

If you want to make the skill available via npm:

```bash
cd skills/lunchtable/lunchtable-tcg
npm publish --access public
```

### 3. Submit to ClawHub

#### Option A: Via GitHub

1. Push to GitHub repository:
```bash
git add skills/lunchtable/lunchtable-tcg/
git commit -m "feat: add LunchTable-TCG OpenClaw skill"
git push origin main
```

2. Submit to ClawHub registry:
- Go to https://clawhub.io/submit
- Provide repository URL: `https://github.com/lunchtable/ltcg`
- Specify skill path: `skills/lunchtable/lunchtable-tcg`
- Submit for review

#### Option B: Via ClawHub CLI

```bash
# Install ClawHub CLI
npm install -g clawhub-cli

# Authenticate
clawhub login

# Submit skill
clawhub submit skills/lunchtable/lunchtable-tcg
```

### 4. Verification

After submission, ClawHub will verify:

- ✓ Valid SKILL.md with proper YAML frontmatter
- ✓ Required binaries (curl) are documented
- ✓ OS compatibility listed
- ✓ Environment variables documented
- ✓ Examples are functional
- ✓ License is specified (MIT)

## Post-Submission

Once approved, users can install via:

```bash
openclaw skill install lunchtable-tcg
```

## Updating the Skill

To release updates:

1. Update version in:
   - `SKILL.md` frontmatter (`version: 1.x.x`)
   - `package.json` (`"version": "1.x.x"`)
   - `.clawhub.json` (`"version": "1.x.x"`)

2. Document changes in CHANGELOG.md (create if needed)

3. Publish update:
```bash
git tag v1.x.x
git push origin v1.x.x
clawhub update lunchtable-tcg
```

## Support

For ClawHub submission issues:
- Documentation: https://clawhub.io/docs/submission
- Support: https://clawhub.io/support
- Community: https://discord.gg/clawhub

For LunchTable-TCG skill issues:
- GitHub Issues: https://github.com/lunchtable/ltcg/issues
- Discord: https://discord.gg/lunchtable-tcg
