# CI/CD Setup Guide

Complete guide for GitHub Actions workflows in the LTCG project.

---

## 🎯 Overview

This project uses **3 GitHub Actions workflows** for continuous integration and deployment:

| Workflow | Trigger | Duration | Purpose |
|----------|---------|----------|---------|
| **CI** | Every PR/Push | ~5-10min | Fast validation (lint, tests, build) |
| **Deploy** | Push to `main` | ~15min | Production deployment |
| **Nightly** | Daily at 2 AM UTC | ~30min | Comprehensive tests + security audit |

---

## 📋 Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggers**: Pull requests and pushes to `main`/`develop`

**Jobs**:
1. **Lint** - Biome format and lint checks
2. **Unit Tests** - Frontend unit tests (74 tests, ~1min)
3. **Type Check** - TypeScript compilation check
4. **Build** - Web app build validation

**Features**:
- ✅ Cancels previous runs on same PR
- ✅ Fast feedback (<10 minutes)
- ✅ Parallel job execution
- ✅ Fails if any job fails

**Status Badge**:
```markdown
![CI](https://github.com/YOUR_ORG/LTCG/actions/workflows/ci.yml/badge.svg)
```

---

### 2. Deploy Workflow (`.github/workflows/deploy.yml`)

**Triggers**:
- Push to `main` branch
- Manual dispatch via GitHub UI

**Jobs**:
1. **Pre-Deploy Tests** - Run unit tests + build validation
2. **Deploy Convex** - Deploy backend to Convex
3. **Deploy Web** - Deploy frontend to Vercel
4. **Health Check** - Verify deployment success
5. **Rollback** - Notify on failure

**Features**:
- ✅ Sequential deployment (backend → frontend)
- ✅ Health checks before marking complete
- ✅ Prevents concurrent deployments
- ✅ Rollback notification on failure

**Manual Deployment**:
```bash
# Via GitHub UI
Actions → Deploy to Production → Run workflow
```

---

### 3. Nightly Workflow (`.github/workflows/nightly.yml`)

**Triggers**:
- Scheduled: Daily at 2 AM UTC
- Manual dispatch via GitHub UI

**Jobs**:
1. **Comprehensive Tests** - Unit + Convex + E2E tests
2. **Coverage Report** - Upload to Codecov
3. **Performance Benchmarks** - Performance metrics
4. **Security Audit** - Dependency security check
5. **Nightly Summary** - Results summary

**Features**:
- ✅ Full test suite including E2E
- ✅ Test artifacts retained for 7 days
- ✅ Coverage tracking
- ✅ Security vulnerability scanning

---

## 🔐 Required Secrets

Configure these secrets in **GitHub Repository Settings → Secrets and Variables → Actions**:

### Convex Secrets

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `CONVEX_DEPLOYMENT` | Production Convex deployment name | `npx convex dev` (from dashboard) |
| `CONVEX_DEPLOY_KEY` | Deployment API key | Convex dashboard → Settings → Deploy Keys |
| `CONVEX_DEPLOYMENT_TEST` | Test environment deployment (optional) | Separate test Convex project |
| `NEXT_PUBLIC_CONVEX_URL` | Public Convex URL | From Convex dashboard |
| `NEXT_PUBLIC_CONVEX_URL_TEST` | Test environment URL (optional) | Test project URL |

### Vercel Secrets

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `VERCEL_TOKEN` | Vercel API token | Vercel → Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel organization ID | `.vercel/project.json` after first deploy |
| `VERCEL_PROJECT_ID` | Vercel project ID | `.vercel/project.json` after first deploy |

### Optional Secrets

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `CODECOV_TOKEN` | Codecov upload token | codecov.io → Repository settings |

---

## 🚀 Getting Started

### Step 1: Configure Secrets

1. Go to GitHub repository → Settings → Secrets and Variables → Actions
2. Click "New repository secret"
3. Add each secret from the table above
4. Verify secrets are listed

### Step 2: Get Convex Deploy Key

```bash
# Login to Convex
npx convex login

# Create deploy key (from Convex dashboard)
# 1. Go to your project
# 2. Settings → Deploy Keys
# 3. Create new key
# 4. Copy and save as CONVEX_DEPLOY_KEY secret
```

### Step 3: Get Vercel IDs

```bash
# Link to Vercel project
cd apps/web
vercel link

# IDs are saved in .vercel/project.json
cat .vercel/project.json
# Copy "orgId" → VERCEL_ORG_ID
# Copy "projectId" → VERCEL_PROJECT_ID
```

### Step 4: Create Vercel Token

1. Go to https://vercel.com/account/tokens
2. Create new token with name "GitHub Actions"
3. Copy token → Save as `VERCEL_TOKEN` secret

### Step 5: Test Workflows

```bash
# Create a test PR to trigger CI
git checkout -b test-ci
git commit --allow-empty -m "test: trigger CI"
git push origin test-ci

# Check GitHub Actions tab for results
```

---

## 📊 Monitoring

### GitHub Actions Dashboard

View workflow status:
```
https://github.com/YOUR_ORG/LTCG/actions
```

### Workflow Badges

Add to README.md:
```markdown
[![CI](https://github.com/YOUR_ORG/LTCG/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_ORG/LTCG/actions/workflows/ci.yml)
[![Deploy](https://github.com/YOUR_ORG/LTCG/actions/workflows/deploy.yml/badge.svg)](https://github.com/YOUR_ORG/LTCG/actions/workflows/deploy.yml)
```

### Notifications

Set up Slack/Discord notifications:
1. Generate webhook URL from Slack/Discord
2. Add as `SLACK_WEBHOOK` secret
3. Add notification step to workflows:

```yaml
- name: Notify on failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "❌ CI failed on ${{ github.ref }}"
      }
```

---

## 🐛 Troubleshooting

### CI Workflow Fails

**Problem**: Lint or format check fails
```bash
# Fix locally
bun run format
bun run lint:biome:fix

# Commit fixes
git add .
git commit -m "fix: lint and format issues"
```

**Problem**: Unit tests fail
```bash
# Run tests locally
bun run test:unit

# Fix failing tests
# Commit fixes
```

**Problem**: Build fails
```bash
# Build locally to reproduce
bun run build:web

# Check for TypeScript errors
bunx convex typecheck
```

### Deploy Workflow Fails

**Problem**: Convex deployment fails
- Check `CONVEX_DEPLOY_KEY` is valid
- Verify deployment name matches production
- Check Convex dashboard for errors

**Problem**: Vercel deployment fails
- Verify `VERCEL_TOKEN` is valid
- Check `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` match
- Review Vercel dashboard for build logs

**Problem**: Health check fails
- Check production URL is accessible
- Verify environment variables are set
- Review application logs

### Nightly Workflow Fails

**Problem**: E2E tests fail
- Check `CONVEX_DEPLOYMENT_TEST` is configured
- Verify test database has seed data
- Review Playwright test artifacts

**Problem**: Coverage upload fails
- Verify `CODECOV_TOKEN` is set
- Check codecov.io for upload errors

---

## 🔧 Customization

### Modify Test Commands

Update `ci.yml`:
```yaml
- name: Run unit tests
  run: bun run test:unit
  # Change to: bun run test:all for more coverage
```

### Change Deployment Target

Update `deploy.yml`:
```yaml
- name: Deploy to Vercel
  with:
    vercel-args: '--prod'  # Change to '--preview' for staging
```

### Adjust Nightly Schedule

Update `nightly.yml`:
```yaml
schedule:
  - cron: '0 2 * * *'  # Change to '0 14 * * *' for 2 PM UTC
```

---

## 📈 Performance

### CI Workflow Optimization

Current timings:
- Lint: ~30s
- Unit Tests: ~1min
- Type Check: ~45s
- Build: ~3min
- **Total**: ~5-6min

Optimization tips:
- Cache `node_modules` to reduce install time
- Run jobs in parallel where possible
- Use `bun` for faster package installation

### Workflow Caching

Add caching to speed up workflows:
```yaml
- name: Cache dependencies
  uses: actions/cache@v4
  with:
    path: ~/.bun/install/cache
    key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lockb') }}
    restore-keys: |
      ${{ runner.os }}-bun-
```

---

## 🎓 Best Practices

### 1. Branch Protection Rules

Enable on `main` branch:
- ✅ Require status checks to pass (CI workflow)
- ✅ Require branches to be up to date
- ✅ Require pull request reviews
- ✅ Dismiss stale reviews on new commits

### 2. Deployment Strategy

- **Staging**: Deploy PRs to Vercel preview URLs
- **Production**: Deploy only from `main` branch
- **Rollback**: Keep previous deployment ready

### 3. Secret Management

- ✅ Rotate secrets every 90 days
- ✅ Use environment-specific secrets
- ✅ Never commit secrets to code
- ✅ Use GitHub Environments for additional protection

### 4. Monitoring

- Set up Sentry for error tracking
- Monitor deployment success rate
- Track workflow execution times
- Review failed workflow logs weekly

---

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel GitHub Integration](https://vercel.com/docs/concepts/git/vercel-for-github)
- [Convex Deployment Guide](https://docs.convex.dev/production/deployment)
- [Bun CI/CD Guide](https://bun.sh/docs/guides/ci-cd)

---

## ✅ Checklist

Before merging this CI/CD setup:

- [ ] All secrets configured in GitHub
- [ ] CI workflow runs successfully on test PR
- [ ] Deploy workflow tested with manual dispatch
- [ ] Vercel preview deployments working
- [ ] Convex deployment succeeds
- [ ] Status badges added to README
- [ ] Team notified of new workflows
- [ ] Documentation reviewed and approved

---

**Last Updated**: 2026-01-28
**Maintained By**: Engineering Team
**Next Review**: 2026-02-28
