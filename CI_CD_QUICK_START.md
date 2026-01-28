# CI/CD Quick Start

**30-second overview** of the continuous integration and deployment system.

---

## 🚀 What We Have

**3 GitHub Actions workflows** that automatically test and deploy your code:

1. **CI** (Pull Requests) - 5min validation
2. **Deploy** (Main branch) - 15min production deployment
3. **Nightly** (2 AM UTC) - 30min comprehensive tests

---

## ⚡ Quick Commands

```bash
# Run the same tests as CI locally
bun run test:unit              # Unit tests (1min)
bun run format:check           # Format check
bun run lint:biome             # Lint check
bun run build:web              # Build validation

# Full CI suite
bun run test:ci                # Unit tests only (no E2E)
```

---

## 🔐 Required Setup (First Time Only)

### 1. Add GitHub Secrets

Go to: **GitHub Repo → Settings → Secrets → Actions**

Add these secrets:

**Convex**:
- `CONVEX_DEPLOYMENT` - Your production deployment name
- `CONVEX_DEPLOY_KEY` - From Convex dashboard → Settings → Deploy Keys
- `NEXT_PUBLIC_CONVEX_URL` - Your Convex URL

**Vercel**:
- `VERCEL_TOKEN` - From https://vercel.com/account/tokens
- `VERCEL_ORG_ID` - From `.vercel/project.json`
- `VERCEL_PROJECT_ID` - From `.vercel/project.json`

### 2. Get Vercel IDs

```bash
cd apps/web
vercel link
cat .vercel/project.json
# Copy orgId and projectId to GitHub secrets
```

### 3. Test It

```bash
# Create test PR
git checkout -b test-ci
git commit --allow-empty -m "test: CI workflow"
git push origin test-ci

# Check: GitHub → Actions tab
```

---

## 📋 What Each Workflow Does

### CI Workflow (`.github/workflows/ci.yml`)
**Runs on**: Every PR and push to main/develop

**Jobs**:
1. Lint & format check
2. Unit tests (74 tests)
3. TypeScript type check
4. Build verification

**Duration**: ~5-10 minutes

---

### Deploy Workflow (`.github/workflows/deploy.yml`)
**Runs on**: Push to `main` (or manual trigger)

**Steps**:
1. Run pre-deploy tests
2. Deploy Convex backend
3. Deploy web to Vercel
4. Run health checks

**Duration**: ~15 minutes

---

### Nightly Workflow (`.github/workflows/nightly.yml`)
**Runs on**: Daily at 2 AM UTC (or manual trigger)

**Jobs**:
1. Full test suite (unit + E2E)
2. Coverage report
3. Performance benchmarks
4. Security audit

**Duration**: ~30 minutes

---

## ✅ CI Passing Checklist

Before your PR can merge, all these must pass:

- [ ] ✓ Biome format check
- [ ] ✓ Biome lint check
- [ ] ✓ TypeScript compiles
- [ ] ✓ 74 unit tests pass
- [ ] ✓ Build succeeds

---

## 🐛 Fix Common CI Failures

### "Format check failed"
```bash
bun run format
git add .
git commit -m "fix: format code"
```

### "Lint failed"
```bash
bun run lint:biome:fix
git add .
git commit -m "fix: lint issues"
```

### "Unit tests failed"
```bash
bun run test:unit
# Fix the failing test
git add .
git commit -m "fix: failing test"
```

### "Build failed"
```bash
bun run generate:types
bun run build:web
# Fix TypeScript errors
```

---

## 🎯 Manual Deployment

Deploy to production from GitHub UI:

1. Go to **Actions** tab
2. Select **Deploy to Production**
3. Click **Run workflow**
4. Choose `main` branch
5. Click **Run workflow** button

---

## 📊 Monitor Deployments

**GitHub Actions Dashboard**:
```
https://github.com/YOUR_ORG/LTCG/actions
```

**Vercel Deployments**:
```
https://vercel.com/YOUR_ORG/ltcg/deployments
```

**Convex Deployments**:
```
https://dashboard.convex.dev/deployment/YOUR_DEPLOYMENT/logs
```

---

## 🔄 Workflow Files

All workflows are in `.github/workflows/`:

- `ci.yml` - PR validation
- `deploy.yml` - Production deployment
- `nightly.yml` - Comprehensive tests

To modify behavior, edit these files.

---

## 🎓 Best Practices

1. **Always run tests locally before pushing**
   ```bash
   bun run test:unit
   bun run format
   bun run lint:biome:fix
   ```

2. **Check CI status before merging PRs**
   - Green checkmark = ready to merge
   - Red X = needs fixes

3. **Monitor deployments**
   - Check Vercel preview URL on PRs
   - Verify production after merge to main

4. **Review nightly reports**
   - Check Actions tab each morning
   - Address any failures promptly

---

## 📚 More Info

- Full guide: [docs/CI_CD_SETUP.md](./docs/CI_CD_SETUP.md)
- Testing guide: [TESTING_QUICK_START.md](./TESTING_QUICK_START.md)
- Testing docs: [docs/testing.md](./docs/testing.md)

---

## 🆘 Need Help?

1. Check [docs/CI_CD_SETUP.md](./docs/CI_CD_SETUP.md) for troubleshooting
2. Review GitHub Actions logs for error details
3. Ask team in #engineering channel

---

**Status**: ✅ CI/CD Active
**Last Updated**: 2026-01-28
**Workflows**: 3 active (CI, Deploy, Nightly)
