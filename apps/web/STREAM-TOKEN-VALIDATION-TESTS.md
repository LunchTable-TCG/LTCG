# Stream Overlay Token Validation - Testing Guide

## Overview

Server-side JWT token validation has been implemented for stream overlay pages (`/stream/overlay`). This prevents unauthorized access to stream content.

## Implementation Summary

### Files Created/Modified

1. **`middleware.ts`** - Enhanced with JWT validation logic
   - Added `verifyOverlayToken()` function for edge runtime
   - Validates tokens before allowing access to `/stream/overlay`
   - Checks that sessionId matches the token payload
   - Redirects invalid requests to `/unauthorized`

2. **`app/unauthorized/page.tsx`** - New unauthorized access page
   - User-friendly error messages
   - Displays specific error reasons
   - Styled to match stream overlay theme

### Security Features

- **Token Expiration**: Tokens expire after 24 hours
- **Session Validation**: Ensures token's sessionId matches URL parameter
- **Encryption**: Uses HS256 algorithm with STREAMING_JWT_SECRET
- **Edge Runtime**: Runs in Next.js middleware for low latency

## Testing Scenarios

### 1. Valid Token Access

**Test**: Access overlay with valid token and sessionId

```bash
# Start a stream via API
curl -X POST http://localhost:3000/api/streaming/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "streamType": "user",
    "platform": "twitch",
    "streamKey": "test_key",
    "streamTitle": "Test Stream"
  }'

# Response includes overlayUrl with valid token:
# http://localhost:3000/stream/overlay?sessionId=xxx&token=yyy

# Access the overlay URL - should load successfully
```

**Expected**: Overlay page loads with stream content

### 2. Missing Token

**Test**: Access overlay without token parameter

```bash
# Visit without token
http://localhost:3000/stream/overlay?sessionId=jh7...abc
```

**Expected**:
- Redirects to `/unauthorized?reason=missing_credentials`
- Shows "Missing Credentials" error message

### 3. Missing SessionId

**Test**: Access overlay without sessionId parameter

```bash
# Visit without sessionId
http://localhost:3000/stream/overlay?token=eyJhbGc...
```

**Expected**:
- Redirects to `/unauthorized?reason=missing_credentials`
- Shows "Missing Credentials" error message

### 4. Invalid/Malformed Token

**Test**: Access overlay with invalid JWT token

```bash
# Visit with malformed token
http://localhost:3000/stream/overlay?sessionId=jh7...abc&token=invalid_token_xyz
```

**Expected**:
- Redirects to `/unauthorized?reason=invalid_token`
- Shows "Invalid Token" error message

### 5. Expired Token

**Test**: Access overlay with expired token (after 24 hours)

```bash
# Generate token, wait 24+ hours, then access
http://localhost:3000/stream/overlay?sessionId=xxx&token=expired_token
```

**Expected**:
- Redirects to `/unauthorized?reason=invalid_token`
- Shows "Invalid or expired access token" message

### 6. Mismatched SessionId

**Test**: Access overlay with valid token but wrong sessionId

```bash
# Use token from session A with sessionId from session B
http://localhost:3000/stream/overlay?sessionId=wrong_session&token=valid_token_for_different_session
```

**Expected**:
- Redirects to `/unauthorized?reason=invalid_token`
- Shows "Invalid Token" error message

### 7. Tampered Token

**Test**: Access overlay with modified token payload

```bash
# Modify token payload (e.g., change sessionId in JWT)
# Visit with tampered token
http://localhost:3000/stream/overlay?sessionId=xxx&token=tampered_token
```

**Expected**:
- Signature verification fails
- Redirects to `/unauthorized?reason=verification_failed`
- Shows "Verification Failed" error message

## Manual Testing Steps

### Step 1: Setup Environment

```bash
# Ensure STREAMING_JWT_SECRET is set in .env
STREAMING_JWT_SECRET=your_secret_key_here_minimum_32_characters
```

### Step 2: Start the Application

```bash
cd apps/web
bun run dev
```

### Step 3: Create a Test Stream

Use the API or admin interface to start a stream and obtain the overlay URL.

### Step 4: Test Valid Access

1. Copy the overlay URL from the stream start response
2. Open it in a browser
3. Verify the overlay loads correctly

### Step 5: Test Invalid Access Scenarios

Try each of the scenarios listed above to verify proper error handling.

## Automated Testing

### Unit Test Example (Future Implementation)

```typescript
// middleware.test.ts
import { describe, it, expect } from 'bun:test';
import { verifyOverlayToken } from './middleware';

describe('verifyOverlayToken', () => {
  it('should reject expired tokens', async () => {
    const expiredToken = 'eyJhbGc...expired';
    const result = await verifyOverlayToken(expiredToken);
    expect(result).toBeNull();
  });

  it('should reject malformed tokens', async () => {
    const malformedToken = 'not_a_jwt_token';
    const result = await verifyOverlayToken(malformedToken);
    expect(result).toBeNull();
  });

  it('should accept valid tokens', async () => {
    const validToken = await generateOverlayToken('session123', 'user', 'user456');
    const result = await verifyOverlayToken(validToken);
    expect(result).not.toBeNull();
    expect(result?.sessionId).toBe('session123');
  });
});
```

## Integration Testing

### E2E Test Flow

1. **Start stream** via `/api/streaming/start`
2. **Extract** overlayUrl from response
3. **Parse** token and sessionId from URL
4. **Access** overlay page
5. **Verify** page loads without redirect
6. **Test invalid cases** by modifying parameters
7. **Verify** redirects to `/unauthorized`

### Playwright Test Example

```typescript
// overlay-auth.spec.ts
import { test, expect } from '@playwright/test';

test('valid token allows access', async ({ page }) => {
  // Start stream and get overlay URL
  const response = await page.request.post('/api/streaming/start', {
    data: {
      userId: 'test_user',
      streamType: 'user',
      platform: 'twitch',
      streamKey: 'test_key'
    }
  });

  const { overlayUrl } = await response.json();

  // Access overlay - should load
  await page.goto(overlayUrl);
  await expect(page.locator('.stream-overlay')).toBeVisible();
});

test('invalid token redirects to unauthorized', async ({ page }) => {
  await page.goto('/stream/overlay?sessionId=fake&token=invalid');
  await expect(page).toHaveURL(/\/unauthorized/);
  await expect(page.locator('.unauthorized-title')).toContainText('Invalid Token');
});
```

## Monitoring & Logging

The middleware logs token verification failures with:
- Error type (expired, malformed, invalid signature)
- Timestamp
- Request path

Check server logs for:
```
Token verification failed: JWTExpired
Token verification failed: JWSSignatureVerificationFailed
STREAMING_JWT_SECRET not configured
```

## Security Considerations

1. **Secret Rotation**: When rotating STREAMING_JWT_SECRET, all active tokens become invalid
2. **Token Lifetime**: 24-hour expiration balances security and user experience
3. **HTTPS Required**: Tokens should only be transmitted over HTTPS in production
4. **No Client-Side Validation**: Client checks are bypassed; only server-side validation matters

## Production Checklist

- [ ] STREAMING_JWT_SECRET is set in production environment
- [ ] Secret is at least 32 characters long
- [ ] HTTPS is enforced for all overlay URLs
- [ ] Logging is configured to capture validation failures
- [ ] Rate limiting is applied to prevent token brute force
- [ ] Error messages don't leak sensitive information

## Troubleshooting

### Issue: "STREAMING_JWT_SECRET not configured"
**Solution**: Set the environment variable in `.env` or deployment platform

### Issue: All tokens are rejected
**Solution**: Verify STREAMING_JWT_SECRET matches between token generation and verification

### Issue: Tokens expire too quickly
**Solution**: Adjust expiration time in `lib/streaming/tokens.ts` (line 26)

### Issue: Overlay loads but shows old content
**Solution**: This is not a token issue - check Convex queries and session state

## Next Steps

Consider adding:
1. Token refresh mechanism for long-running streams
2. IP-based rate limiting on token verification
3. Webhook to notify when tokens are rejected
4. Analytics on unauthorized access attempts
5. Token revocation API for emergency shutdowns
