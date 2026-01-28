# Authentication Security Guide

## Overview

This document outlines the security measures implemented in the authentication system to protect against common attack vectors and ensure production-ready security.

**Last Updated:** 2026-01-28

---

## Security Features Implemented

### 1. Password Requirements ✅

**Server-Side Validation** ([convex/auth.ts:16-48](../convex/auth.ts#L16-L48))

Enforced requirements:
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- Blocked common passwords (password, 12345678, etc.)

**Client-Side Validation** ([AuthForm.tsx:28-37](../apps/web/src/components/auth/AuthForm.tsx#L28-L37))

Pre-submission checks matching server requirements to provide immediate feedback.

**Password Reset** ([reset-password/page.tsx:33-51](../apps/web/app/(auth)/reset-password/page.tsx#L33-L51))

Same validation applied to password reset flow.

---

### 2. Username Validation ✅

**Server-Side Validation** ([convex/auth.ts:54-65](../convex/auth.ts#L54-L65))

Format requirements:
- 3-20 characters
- Alphanumeric only (a-z, A-Z, 0-9)
- No spaces or special characters
- Prevents XSS injection via usernames

**Client-Side Validation** ([AuthForm.tsx:28-37](../apps/web/src/components/auth/AuthForm.tsx#L28-L37))

HTML5 pattern attribute + JavaScript validation before submission.

---

### 3. Rate Limiting ✅

**Configuration** ([convex/lib/rateLimit.ts:23-49](../convex/lib/rateLimit.ts#L23-L49))

Token bucket rate limits:
- **Sign Up**: 3 attempts per hour per IP
- **Sign In**: 10 attempts per 15 minutes per IP
- Protects against brute force attacks
- Automatic retry-after headers

**Implementation**

Uses `convex-helpers/server/rateLimit` with per-operation token buckets.

Rate limiting is automatically disabled in local development (`CONVEX_CLOUD_URL` check).

---

### 4. Secure Error Messages ✅

**Protection Against User Enumeration** ([AuthForm.tsx:44-74](../apps/web/src/components/auth/AuthForm.tsx#L44-L74))

Generic error messages:
- Sign In: "Invalid email or password" (doesn't reveal if user exists)
- Sign Up: "Could not create account" (doesn't reveal if email taken)
- Only show specific errors for validation failures (safe to display)

**Secure Password Reset**

Forgot password flow never reveals if email exists in system.

---

### 5. Input Sanitization ✅

**Email Normalization** ([convex/auth.ts:88-89](../convex/auth.ts#L88-L89))
- Trimmed and lowercased
- Prevents case-sensitivity issues
- Reduces duplicate accounts

**XSS Protection** ([apps/web/src/lib/sanitize.ts](../apps/web/src/lib/sanitize.ts))

Comprehensive sanitization utilities:
- `sanitizeText()` - Strips all HTML
- `sanitizeHTML()` - Allows safe formatting only
- `sanitizeChatMessage()` - For chat/comments
- `sanitizeURL()` - Blocks dangerous protocols (javascript:, data:)

**Content Security**

Uses DOMPurify for robust XSS protection across all user-generated content.

---

### 6. Session Management ✅

**Convex Auth Session Handling** ([convex/auth.config.ts](../convex/auth.config.ts))

Security features:
- httpOnly cookies (not accessible via JavaScript)
- Secure flag in production (HTTPS only)
- SameSite=Lax (CSRF protection)
- Server-side session validation
- Automatic token refresh

**Session Validation**

Every protected query/mutation validates session via `getAuthUserId(ctx)`.

---

### 7. HTTPS Enforcement

**Production Configuration**

- `CONVEX_SITE_URL` must use HTTPS in production
- Cookies only sent over secure connections
- No mixed content allowed

---

## Attack Vector Protections

### ✅ Brute Force Attacks

**Mitigation:**
- Rate limiting on auth endpoints
- Account lockout after repeated failures
- Progressive delay between attempts

### ✅ User Enumeration

**Mitigation:**
- Generic error messages for auth failures
- Same response time regardless of user existence
- Forgot password doesn't reveal if email exists

### ✅ Cross-Site Scripting (XSS)

**Mitigation:**
- DOMPurify sanitization on all user input
- Username validation blocks HTML/script tags
- Content Security Policy headers

### ✅ SQL Injection

**Mitigation:**
- Convex ORM prevents SQL injection (no raw SQL)
- All queries parameterized by design

### ✅ Session Hijacking

**Mitigation:**
- httpOnly cookies prevent JavaScript access
- Secure cookies over HTTPS only
- SameSite protection against CSRF

### ✅ CSRF (Cross-Site Request Forgery)

**Mitigation:**
- Built-in CSRF protection via Convex Auth
- SameSite cookie attribute
- Origin validation

### ✅ Weak Passwords

**Mitigation:**
- Strong password requirements enforced
- Common password blacklist
- Minimum complexity requirements

---

## Environment Variables

### Required Variables

```bash
# Production deployment URL (MUST be HTTPS)
CONVEX_SITE_URL=https://your-deployment.convex.site

# Convex deployment (automatically set)
CONVEX_DEPLOYMENT=your-deployment-name
```

### Security Checklist

- [ ] `CONVEX_SITE_URL` uses HTTPS in production
- [ ] No secrets committed to version control
- [ ] Environment variables properly configured in hosting platform
- [ ] Rate limiting enabled in production

---

## Testing Authentication

### Manual Testing Checklist

**Sign Up Flow:**
- [ ] Rejects weak passwords (< 8 chars, no uppercase, etc.)
- [ ] Rejects invalid usernames (special chars, spaces, too short)
- [ ] Shows specific validation errors
- [ ] Creates account successfully with valid input
- [ ] Normalizes email to lowercase

**Sign In Flow:**
- [ ] Shows generic error for wrong password
- [ ] Shows generic error for non-existent user
- [ ] Rate limits after 10 failed attempts
- [ ] Successful login redirects to /lunchtable

**Password Reset Flow:**
- [ ] Forgot password never reveals if email exists
- [ ] Reset code validates correctly
- [ ] New password must meet requirements
- [ ] Successfully resets password

**Security Testing:**
- [ ] XSS attempts in username blocked
- [ ] SQL injection attempts fail gracefully
- [ ] Session cookies are httpOnly and Secure
- [ ] Rate limiting triggers after threshold

### Automated Tests

See [e2e/auth.spec.ts](../e2e/auth.spec.ts) for comprehensive auth flow tests.

---

## Monitoring & Logging

### What to Monitor

1. **Failed Authentication Attempts**
   - Track failed login attempts per user/IP
   - Alert on unusual patterns

2. **Rate Limit Triggers**
   - Monitor rate limit violations
   - Identify potential attack sources

3. **Account Creation Spikes**
   - Unusual signup patterns may indicate bot activity

4. **Password Reset Requests**
   - Monitor for password reset abuse

### Logging Best Practices

**DO Log:**
- Authentication events (success/failure)
- Rate limit violations
- Security-relevant errors
- IP addresses for failed attempts

**DO NOT Log:**
- Plain text passwords
- Session tokens
- Password reset codes
- Personal identifiable information (PII) unnecessarily

---

## Compliance

### OWASP Top 10 Coverage

- ✅ **A01: Broken Access Control** - Session validation on all protected endpoints
- ✅ **A02: Cryptographic Failures** - Passwords hashed via @convex-dev/auth, HTTPS enforced
- ✅ **A03: Injection** - Parameterized queries, input sanitization
- ✅ **A04: Insecure Design** - Rate limiting, secure defaults
- ✅ **A05: Security Misconfiguration** - Secure cookie settings, HTTPS enforcement
- ✅ **A06: Vulnerable Components** - Dependencies regularly updated
- ✅ **A07: Authentication Failures** - Strong passwords, rate limiting, secure sessions

---

## Maintenance

### Regular Tasks

**Weekly:**
- Review failed authentication logs
- Check for unusual rate limit triggers

**Monthly:**
- Update dependencies (`bun update`)
- Review and update common password blacklist
- Audit new OWASP vulnerabilities

**Quarterly:**
- Full security audit
- Penetration testing
- Review and update this documentation

---

## Resources

### Documentation

- [Convex Auth Docs](https://labs.convex.dev/auth)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

### Internal Docs

- [Testing Guide](./testing.md)
- [Deployment Guide](./deployment.md)

---

## Support

For security concerns or vulnerabilities, please contact: [security@yourdomain.com]

**DO NOT** disclose security vulnerabilities publicly.
