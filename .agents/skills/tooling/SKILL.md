---
name: tooling
description: Package management, project setup, and development tooling standards. Use this when users need guidance on using pnpm for package management, setting up new projects with automated scripts, configuring environment variables with dotenv, or initializing development tooling for React and React Native projects.
license: MIT - Complete terms in LICENSE.txt
---

# Tooling Skills & Best Practices

Package management, project setup, and development tooling standards.

## Table of Contents

- [Package Management](#package-management)
- [Project Setup](#project-setup)
- [Environment Variables](#environment-variables)

---

## Package Management

### pnpm

- **MUST use pnpm** (version >= 10.0.0) as the package manager for all projects - this is a strict requirement
- Never use npm or yarn
- pnpm provides faster installs and better disk space efficiency
- Use `pnpm install` instead of `npm install`
- Use `pnpm add <package>` to add dependencies
- Use `pnpm run <script>` to run scripts
- Leverage pnpm's workspace feature for monorepos

**Node.js Version Requirement:**
- **MUST use Node.js 22.x LTS**

**Benefits:**
- Faster installation times
- Efficient disk space usage (hard links)
- Strict dependency resolution
- Better monorepo support

---

## Project Setup

### Automated Setup

Use the provided `setup.sh` script to automatically configure your project:

```bash
chmod +x setup.sh
./setup.sh
```

The script will handle:
- Prerequisites checking (Node.js, pnpm)
- Installing dependencies and tools
- Setting up git hooks with Lefthook
- Creating configuration files from templates
- Setting up project structure (domain-driven design)
- Initializing TypeScript, Biome, and Jest

See `SETUP_SCRIPT.md` for detailed documentation.

### Initial Setup Checklist

When starting a new project (or if not using the automated script):

1. ✅ Initialize project with appropriate framework (Next.js, Expo SDK 54.x, etc.)
2. ✅ Set up TypeScript (latest stable, 5.x) with strict configuration
3. ✅ Configure Biome (latest stable) for linting and formatting
4. ✅ Set up Jest (latest stable) for testing
5. ✅ Organize project structure using Domain-Driven Design principles (guideline)
6. ✅ Initialize pnpm (>= 10.0.0) and configure package.json
7. ✅ Configure git hooks with pre-commit and pre-push hooks (strict requirements)
8. ✅ Create `.gitignore` with standard exclusions
9. ✅ Set up GitHub Actions workflow for PR checks (strict requirements)
10. ✅ Configure SonarQube project (if applicable)
11. ✅ Create PR template in `.github/pull_request_template.md`
12. ✅ Set up Docker and Docker Compose
13. ✅ Configure environment variables with dotenv (`.env.example`) (strict requirements)

---

## Environment Variables

**Strict Requirements:**

- **MUST use dotenv** for environment variable management - this is a strict requirement
- **MUST always include `.env.example`** with required variables (no secrets) - this is a strict requirement
- **MUST NEVER commit `.env` files** to version control - this is a strict requirement
- **MUST validate required environment variables** at application startup - this is a strict requirement
- Document all environment variables in README
- Use validation libraries (e.g., `zod`, `joi`) to ensure required variables are present
- Load environment variables using `dotenv` at application startup
- Use different `.env` files for different environments (`.env.development`, `.env.production`, etc.)

---

## Additional Resources

- [pnpm Documentation](https://pnpm.io/)
- [dotenv Documentation](https://github.com/motdotla/dotenv)

---

## Notes

- This document should be reviewed and updated regularly as best practices evolve
- Team-specific additions and modifications are encouraged
- When in doubt, refer to official documentation and community standards

