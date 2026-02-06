#!/bin/bash
set -e

echo "🎴 LunchTable-TCG → ClawHub Submission"
echo "======================================"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) not found. Installing..."
    brew install gh
fi

# Authenticate with GitHub
echo "✓ Checking GitHub authentication..."
if ! gh auth status &> /dev/null; then
    echo "⚠️  Please login to GitHub:"
    gh auth login
fi

# Fork the clawhub repo
echo "✓ Forking openclaw/clawhub..."
gh repo fork openclaw/clawhub --clone=false || echo "Already forked"

# Clone your fork
echo "✓ Cloning your fork..."
GITHUB_USER=$(gh api user -q .login)
cd /tmp
rm -rf clawhub
gh repo clone $GITHUB_USER/clawhub

# Copy skill
echo "✓ Copying LunchTable-TCG skill..."
cd clawhub
mkdir -p skills
cp -r /Users/home/Desktop/LTCG/skills/lunchtable skills/

# Create branch
echo "✓ Creating feature branch..."
git checkout -b add-lunchtable-tcg

# Commit
echo "✓ Committing changes..."
git add skills/lunchtable
git commit -m "Add LunchTable-TCG skill

Adds OpenClaw skill for playing LunchTable-TCG, a Yu-Gi-Oh-inspired online TCG.

Features:
- Complete REST API integration (24 endpoints)
- Chain system support
- Full documentation and examples
- TypeScript and Python reference implementations
- Webhook support for real-time notifications

Skill metadata:
- Name: lunchtable-tcg
- Author: lunchtable
- Version: 1.0.0
- License: MIT

All validation checks pass."

# Push
echo "✓ Pushing to your fork..."
git push -u origin add-lunchtable-tcg

# Create PR
echo "✓ Creating Pull Request..."
gh pr create \
  --repo openclaw/clawhub \
  --title "Add LunchTable-TCG Trading Card Game Skill" \
  --body "$(cat << 'PRBODY'
# Add LunchTable-TCG Trading Card Game Skill

## Description
Adds OpenClaw skill for playing LunchTable-TCG, a Yu-Gi-Oh-inspired online trading card game.

## Features
- ✅ Complete REST API integration (24 game action endpoints)
- ✅ Chain system support for spell/trap responses
- ✅ Full documentation and examples
- ✅ TypeScript and Python reference implementations
- ✅ Webhook support for real-time notifications
- ✅ Strategic gameplay guides and tutorials

## Skill Metadata
- **Name:** lunchtable-tcg
- **Author:** lunchtable
- **Version:** 1.0.0
- **License:** MIT
- **Homepage:** https://lunchtable.cards

## Game Features
Players can:
- Create and join games
- Execute all Yu-Gi-Oh-style actions (summon, set, flip, attack, activate spells/traps)
- Use chain system for strategic responses
- Manage game phases
- Play complete competitive games autonomously

## Testing
All validation checks pass (verified with `.validate.sh`):
- ✅ Required files present
- ✅ YAML frontmatter valid
- ✅ JSON files valid
- ✅ Directory structure correct

## Documentation
Complete documentation included:
- SKILL.md - Main skill file
- README.md - Overview
- INSTALLATION.md - Setup guide
- examples/ - Working code examples (TypeScript, Python)
- scenarios/ - Use case tutorials

## Repository
https://github.com/lunchtable/ltcg
PRBODY
)"

echo ""
echo "✅ SUCCESS! Pull Request created!"
echo ""
gh pr view --web

