# Testing with Mock Privy JWTs

This document explains how to use mock Privy JWTs for testing, based on [Privy's official mock JWT documentation](https://docs.privy.io/recipes/mock-jwt).

## Overview

Our testing setup provides utilities for three types of tests:

1. **Convex Backend Tests** - Use `convex-test` with mocked identities
2. **E2E Tests (Playwright)** - Inject mock auth state to bypass login
3. **Frontend Component Tests** - Mock Privy provider with test tokens

## Quick Start

### Convex Backend Tests

```typescript
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { createAuthenticatedUser } from "../helpers/testAuth";
import schema from "@convex/schema";
import { modules } from "@convex/test.setup";

describe("my feature", () => {
  it("works for authenticated users", async () => {
    const t = convexTest(schema, modules);

    // Create user with proper Privy identity
    const { userId, privyId, identity } = await createAuthenticatedUser(t, {
      email: "test@example.com",
      username: "testuser",
    });

    // Use identity with withIdentity()
    const asUser = t.withIdentity(identity);

    // Now run authenticated queries/mutations
    const result = await asUser.query(api.myQuery, {});
    expect(result).toBeDefined();
  });
});
```

### E2E Tests (Playwright)

```typescript
import { test, expect } from "./setup/fixtures";

// Option 1: Use mockAuthPage fixture (fast, bypasses UI login)
test("fast authenticated test", async ({ mockAuthPage, mockTestUser }) => {
  // mockAuthPage already has auth state injected
  await mockAuthPage.goto("/dashboard");

  // Test protected functionality
  await expect(mockAuthPage.locator('[data-testid="user-menu"]')).toBeVisible();
});

// Option 2: Use authenticatedPage fixture (full UI flow)
test("full auth flow test", async ({ authenticatedPage }) => {
  // authenticatedPage went through actual signup
  await authenticatedPage.goto("/binder");
  await expect(authenticatedPage).toHaveURL("/binder");
});
```

### Frontend Component Tests

```typescript
import { render } from "@testing-library/react";
import { TestUserWithPrivy, createMockPrivyToken } from "@/tests/helpers";

test("component with auth", async () => {
  const testUser = TestUserWithPrivy.create();
  const { token } = await createMockPrivyToken({
    privyId: testUser.privyId,
  });

  // Use token in your mocked Privy provider
  render(
    <MockPrivyProvider token={token}>
      <MyComponent />
    </MockPrivyProvider>
  );
});
```

## API Reference

### Mock JWT Creation

```typescript
import { createMockPrivyToken, verifyMockPrivyToken } from "@/tests/helpers";

// Create a mock Privy JWT
const { token, publicKey, claims } = await createMockPrivyToken({
  privyId: "did:privy:test_user_123",
  sessionId: "session_abc",  // optional
  expiresIn: "1h",           // optional, default: 1h
  customClaims: {},          // optional
});

// Verify the token (for testing verification logic)
const result = await verifyMockPrivyToken(token);
// { valid: true, payload: { sub: "did:privy:test_user_123", ... } }
```

### Identity Creation

```typescript
import { createPrivyIdentity, createDeterministicPrivyIdentity } from "@/tests/helpers";

// Random identity (unique per call)
const { identity, privyId } = createPrivyIdentity("test@example.com");

// Deterministic identity (same email = same privyId)
const { identity, privyId } = createDeterministicPrivyIdentity("test@example.com");
// privyId: "did:privy:test_test_example_com"
```

### Test User Factory

```typescript
import { TestUserWithPrivy } from "@/tests/helpers";

// Random test user
const user = TestUserWithPrivy.create();
// { email, username, privyId, identity, password }

// Deterministic test user
const alice = TestUserWithPrivy.createDeterministic("alice@test.com", "alice");
```

### Mock Auth Injection (E2E)

```typescript
import { MockPrivyAuth } from "@/tests/helpers";

// Get injection script for page.addInitScript()
const script = await MockPrivyAuth.getInjectionScript({
  privyId: "did:privy:test_123",
});
await page.addInitScript(script);

// Or inject directly
await MockPrivyAuth.injectAuthState(page, {
  privyId: "did:privy:test_123",
});
```

## How It Works

### JWT Structure

Mock JWTs follow Privy's format:
- **Algorithm**: ES256 (ECDSA with P-256 curve)
- **Issuer**: `privy.io`
- **Audience**: Your Privy App ID
- **Subject**: Privy DID (`did:privy:xxx`)
- **Custom Claims**: `sid` (session ID)

### convex-test Integration

`convex-test` doesn't verify JWTs - it mocks `ctx.auth.getUserIdentity()` directly.
The `withIdentity()` method accepts a partial `UserIdentity` object:

```typescript
interface UserIdentity {
  subject: string;      // Privy DID
  issuer: string;       // "privy.io"
  tokenIdentifier: string;
  // ... other optional fields
}
```

Our helpers create properly formatted identities that match what Convex receives after JWT verification.

### Auth State Injection

For E2E tests, we inject mock auth state into localStorage to simulate a logged-in user:

```javascript
localStorage.setItem("privy:token", "jwt-token-here");
localStorage.setItem("privy:user", JSON.stringify({ id: "did:privy:xxx", ... }));
localStorage.setItem("privy:session", JSON.stringify({ sessionId: "...", ... }));
```

## Best Practices

1. **Use deterministic identities** for tests that need consistent data across runs
2. **Use random identities** for tests that need isolation
3. **Prefer `mockAuthPage`** for E2E tests that don't need to test the login UI
4. **Create users via `createAuthenticatedUser`** to ensure proper database state
5. **Reset keypairs** between test files if needed: `resetTestKeyPair()`

## Files

- `tests/helpers/mockPrivyJwt.ts` - Core mock JWT utilities
- `tests/helpers/index.ts` - Exports for all helpers
- `convex/__tests__/helpers/testAuth.ts` - Convex-specific auth helpers
- `e2e/setup/fixtures.ts` - Playwright fixtures with mock auth
