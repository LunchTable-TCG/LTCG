# Game API Middleware

## Authentication Middleware

The `auth.ts` middleware provides API key-based authentication for game API endpoints.

### Usage Example

```typescript
import { authenticateRequest, isAuthError } from "../middleware/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Authenticate the request
  const authResult = await authenticateRequest(req);

  // Check if authentication failed
  if (isAuthError(authResult)) {
    return authResult.error; // Returns standardized error response
  }

  // Authentication successful - extract agent info
  const { userId, agentId, apiKeyId } = authResult.data;

  // Your endpoint logic here
  return NextResponse.json({
    success: true,
    message: "Authenticated successfully",
    agentId,
  });
}
```

### Request Format

Clients must include an Authorization header with a Bearer token:

```
Authorization: Bearer ltcg_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

#### Error Codes

- `MISSING_API_KEY` (401) - No Authorization header or malformed format
- `INVALID_API_KEY_FORMAT` (401) - API key doesn't match expected format
- `INVALID_API_KEY` (401) - API key is invalid or inactive
- `AUTHENTICATION_ERROR` (500) - Server error during authentication

### Success Response

On successful authentication, the middleware returns an object containing:

```typescript
{
  userId: Id<"users">;
  agentId: Id<"agents">;
  apiKeyId: Id<"apiKeys">;
}
```

These IDs can be used to perform authorized operations in the endpoint.
