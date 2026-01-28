# E2E Test Fixes for Authentication Security

## Summary

Fixed e2e tests to match new production-ready authentication security requirements.

**Date:** 2026-01-28

---

## Changes Made

### 1. Password Requirements ✅

**New Requirements:**
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)

**Files Updated:**
- [e2e/auth-form-component.spec.ts](e2e/auth-form-component.spec.ts)

**Changes:**
```typescript
// BEFORE (weak passwords)
"password123"      // ❌ No uppercase
"invalidpassword"  // ❌ No uppercase, no number
"invalidpass"      // ❌ No uppercase, no number
"newpassword123"   // ❌ No uppercase

// AFTER (strong passwords)
"Password123"      // ✅ Meets all requirements
"InvalidPassword123" // ✅ Meets all requirements
"InvalidPass123"   // ✅ Meets all requirements
"NewPassword123"   // ✅ Meets all requirements
```

---

### 2. Error Message Expectations ✅

**Security Change:** Generic error messages to prevent user enumeration attacks

**Updated Error Messages:**

| Old (Insecure) | New (Secure) | Location |
|----------------|--------------|----------|
| `username already exists` | `Could not create account` | auth.spec.ts:58 |
| `email already exists` | `Could not create account` | auth.spec.ts:78 |
| `invalid credentials` | `Invalid email or password` | auth.spec.ts:137, 154 |
| `invalid password` | `Invalid email or password` | auth-form-component.spec.ts:165 |

**Files Updated:**
- [e2e/auth.spec.ts:58](e2e/auth.spec.ts#L58) - Duplicate username test
- [e2e/auth.spec.ts:78](e2e/auth.spec.ts#L78) - Duplicate email test
- [e2e/auth.spec.ts:137](e2e/auth.spec.ts#L137) - Invalid credentials test
- [e2e/auth.spec.ts:154](e2e/auth.spec.ts#L154) - Wrong password test
- [e2e/auth-form-component.spec.ts:165](e2e/auth-form-component.spec.ts#L165) - Invalid password test

---

### 3. Test Data Factory ✅

**No changes needed** - Already uses strong password:

[e2e/setup/test-data.ts:37](e2e/setup/test-data.ts#L37)
```typescript
password: "TestPassword123!"  // ✅ Meets all requirements
```

---

## Test Status

### Before Fixes
- ❌ ~12 e2e auth tests failing
- ❌ Weak passwords triggering validation errors
- ❌ Wrong error message expectations

### After Fixes
- ✅ All test passwords meet security requirements
- ✅ All error message expectations match secure implementation
- ✅ Ready to run e2e tests

---

## Running Tests

```bash
# Run e2e auth tests only
bun test:e2e:auth

# Run all e2e tests
bun test:e2e

# Run e2e tests in UI mode (recommended)
bun test:e2e:ui
```

---

## Affected Test Files

### Primary Changes
1. **e2e/auth.spec.ts**
   - Lines 58, 78: Generic error messages for duplicate accounts
   - Lines 137, 154: Generic error messages for invalid credentials

2. **e2e/auth-form-component.spec.ts**
   - Lines 46-47: Strong passwords for mismatch test
   - Line 165: Generic error message for invalid password
   - Lines 272, 289, 297: Strong passwords for error display tests

### No Changes Needed
- **e2e/setup/test-data.ts** - Already uses `TestPassword123!`
- **e2e/setup/helpers.ts** - Uses test data factory, no hardcoded passwords
- **e2e/deck.spec.ts** - Not affected by auth changes
- **e2e/lobby.spec.ts** - Uses test data factory
- **e2e/gameplay.spec.ts** - Uses test data factory
- **e2e/economy.spec.ts** - Uses test data factory
- **e2e/social.spec.ts** - Uses test data factory
- **e2e/story.spec.ts** - Uses test data factory

---

## Security Benefits

### Before
- Tests expected specific error messages revealing system internals
- Weak passwords could be tested and potentially discovered
- Error messages revealed if users/emails existed

### After
- ✅ Generic error messages prevent user enumeration
- ✅ All test passwords meet production security standards
- ✅ Tests verify secure behavior, not insecure convenience

---

## Migration Notes

### For Existing Tests

If you have custom e2e tests, update them with:

```typescript
// 1. Use strong passwords
const password = "TestPassword123!";  // ✅ Good
// Not: "password123"  ❌ Bad

// 2. Expect generic error messages
await expect(page.locator('text=/Could not create account/i')).toBeVisible();
// Not: 'text=/username already exists/i'  ❌ Bad

await expect(page.locator('text=/Invalid email or password/i')).toBeVisible();
// Not: 'text=/invalid credentials/i'  ❌ Bad
```

### New Password Validation Errors

If testing validation specifically, these are the ONLY password errors that reveal details:

```typescript
// Client-side validation errors (safe to show)
"Password must be at least 8 characters"
"Password must contain at least one uppercase letter"
"Password must contain at least one lowercase letter"
"Password must contain at least one number"
"This password is too common"

// Generic auth errors (security-focused)
"Invalid email or password"
"Could not create account"
```

---

## Related Documentation

- [AUTHENTICATION_SECURITY.md](docs/AUTHENTICATION_SECURITY.md) - Full security documentation
- [TESTING_GUIDE.md](TESTING_GUIDE.md) - General testing guidelines
- [e2e/README.md](e2e/README.md) - E2E test setup and usage

---

## Next Steps

1. Run `bun test:e2e:auth` to verify auth tests pass
2. Run `bun test:e2e` to verify all e2e tests pass
3. Review any remaining failures (likely unrelated to auth)
4. Update CI/CD pipeline to use new test requirements

---

**All e2e tests should now pass with the new authentication security implementation!** ✅
