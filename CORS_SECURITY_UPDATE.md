# CORS Security Update

## Overview

Updated the CORS configuration in `convex/http/middleware/responses.ts` to use environment-based allowed origins instead of the wildcard `"*"` for improved security.

## Changes Made

### 1. Environment-Based Configuration

The middleware now reads allowed origins from environment variables:

- `CONVEX_SITE_URL` - Convex site URL (already configured)
- `FRONTEND_URL` - Main frontend application URL
- `ADMIN_DASHBOARD_URL` - Admin dashboard URL (if applicable)

### 2. Development vs Production Behavior

**Production Mode** (when `CONVEX_CLOUD_URL` is set):
- Only explicitly configured origins are allowed
- Strict origin validation

**Development Mode** (when `CONVEX_CLOUD_URL` is not set):
- Configured origins are allowed
- Localhost variants automatically included:
  - `http://localhost:3000`
  - `http://localhost:5173`
  - `http://localhost:8080`
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:5173`
  - `http://127.0.0.1:8080`
- Additional localhost ports are accepted dynamically

### 3. Updated Functions

All response functions now accept an optional `request` parameter for origin validation:

```typescript
// Success responses
successResponse(data, status?, request?)

// Error responses
errorResponse(code, message, status?, details?, request?)

// CORS preflight
corsPreflightResponse(request?)

// Validation helpers
validateRequiredFields(body, requiredFields, request?)
```

## Backward Compatibility

**All changes are fully backward compatible.** The `request` parameter is optional on all functions, so existing code continues to work without modifications:

```typescript
// Old code - still works (falls back to first allowed origin or "*")
return successResponse({ data: "hello" });
return errorResponse("ERROR", "Something went wrong");
return corsPreflightResponse();

// New code - validates origin from request header
return successResponse({ data: "hello" }, 200, request);
return errorResponse("ERROR", "Something went wrong", 400, undefined, request);
return corsPreflightResponse(request);
```

## Configuration

### Required Environment Variables

Add to your `.env` file and Convex dashboard:

```bash
# CORS Configuration
FRONTEND_URL=https://your-frontend-domain.com
ADMIN_DASHBOARD_URL=https://your-admin-domain.com  # Optional
```

### Setting in Convex

Use the Convex CLI or dashboard to set environment variables:

```bash
npx convex env set FRONTEND_URL https://your-frontend-domain.com
npx convex env set ADMIN_DASHBOARD_URL https://your-admin-domain.com
```

## Migration Guide

### Optional: Update Endpoints for Enhanced Security

While not required, you can update HTTP endpoints to pass the request object for strict origin validation:

**Before:**
```typescript
export const myEndpoint = authHttpAction(async (ctx, request, auth) => {
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  try {
    const data = await someOperation();
    return successResponse(data);
  } catch (error) {
    return errorResponse("ERROR", "Failed", 500);
  }
});
```

**After:**
```typescript
export const myEndpoint = authHttpAction(async (ctx, request, auth) => {
  if (request.method === "OPTIONS") {
    return corsPreflightResponse(request); // Pass request
  }

  try {
    const data = await someOperation();
    return successResponse(data, 200, request); // Pass request
  } catch (error) {
    return errorResponse("ERROR", "Failed", 500, undefined, request); // Pass request
  }
});
```

## Security Benefits

1. **Origin Whitelisting**: Only approved origins can access the API
2. **Environment-Aware**: Different configurations for development and production
3. **Defense in Depth**: Validates origin on every request
4. **Audit Trail**: Clear configuration of allowed origins in environment variables

## How It Works

### Origin Validation Flow

1. Extract `Origin` header from request
2. Check if origin is in allowed list
3. In development mode, allow any localhost origin
4. If origin is not allowed:
   - Return first configured origin
   - Fall back to `"*"` if no origins configured (backward compatibility)

### Example Scenarios

**Scenario 1: Production with configured origins**
```
FRONTEND_URL=https://app.example.com
Request Origin: https://app.example.com
Result: ✅ Allowed (exact match)
```

**Scenario 2: Production with unknown origin**
```
FRONTEND_URL=https://app.example.com
Request Origin: https://malicious.com
Result: ❌ Rejected (returns https://app.example.com in header, browser blocks)
```

**Scenario 3: Development mode**
```
FRONTEND_URL=https://app.example.com
Request Origin: http://localhost:3000
Result: ✅ Allowed (development localhost exception)
```

**Scenario 4: No configuration (backward compatible)**
```
No environment variables set
Request Origin: https://any-domain.com
Result: ✅ Allowed (falls back to "*" for compatibility)
```

## Testing

### Test CORS in Development

```bash
# Test from localhost
curl -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  -X OPTIONS \
  https://your-deployment.convex.site/api/agents/status

# Should return:
# Access-Control-Allow-Origin: http://localhost:3000
```

### Test CORS in Production

```bash
# Test with allowed origin
curl -H "Origin: https://app.example.com" \
  -H "Content-Type: application/json" \
  -X OPTIONS \
  https://your-deployment.convex.site/api/agents/status

# Should return:
# Access-Control-Allow-Origin: https://app.example.com

# Test with disallowed origin
curl -H "Origin: https://malicious.com" \
  -H "Content-Type: application/json" \
  -X OPTIONS \
  https://your-deployment.convex.site/api/agents/status

# Should return:
# Access-Control-Allow-Origin: https://app.example.com (NOT malicious.com)
```

## Files Modified

- `convex/http/middleware/responses.ts` - Added CORS configuration and validation
- `.env.example` - Added CORS environment variable documentation

## Rollback

If you need to rollback to wildcard CORS:

1. Remove environment variables: `FRONTEND_URL`, `ADMIN_DASHBOARD_URL`
2. The system will fall back to `"*"` for backward compatibility

Or explicitly set:
```bash
npx convex env set FRONTEND_URL "*"
```

## Next Steps

1. **Set environment variables** in your Convex deployment
2. **Test** the CORS configuration with your frontend
3. **Optionally migrate** endpoints to pass `request` parameter for enhanced validation
4. **Monitor** for any CORS-related errors in production

## Support

For issues or questions:
1. Check browser console for CORS errors
2. Verify environment variables are set correctly: `npx convex env list`
3. Test with curl to isolate client vs server issues
