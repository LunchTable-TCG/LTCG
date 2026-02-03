# Audit Logging - Quick Start Guide

## ⚡ 3 Steps to Enable Audit Logging

### 1️⃣ Generate Types
```bash
bun run dev:convex
```
Wait for Convex to regenerate types (includes new `auditLog` table).

### 2️⃣ Update Mutation Imports

Find all mutation files:
```bash
grep -r "from.*_generated/server" convex/ | grep mutation
```

Update each file:
```typescript
// Change this:
import { mutation } from "./_generated/server";

// To this:
import { mutation } from "./functions";
// Or from subdirectories: import { mutation } from "../functions";
```

### 3️⃣ Test It Works

```typescript
import { api } from "../convex/_generated/api";
import { useQuery } from "convex/react";

// View recent audit logs
const logs = useQuery(api.infrastructure.auditLog.getRecentAuditLogs, {
  limit: 10
});

console.log(logs);
```

## 📊 What Gets Audited (Automatically)

- ✅ **users** table - All user account changes
- ✅ **tokenTransactions** table - All economy changes
- ✅ **moderationActions** table - All admin actions

## 🔍 Query Audit Logs

```typescript
import { api } from "../convex/_generated/api";

// Recent logs
api.infrastructure.auditLog.getRecentAuditLogs({ limit: 50 })

// By table
api.infrastructure.auditLog.getAuditLogsByTable({
  table: "users",
  limit: 100
})

// Document history
api.infrastructure.auditLog.getAuditLogsByDocument({
  table: "users",
  documentId: userId
})

// User's actions
api.infrastructure.auditLog.getAuditLogsByUser({
  userId: userId
})

// Statistics
api.infrastructure.auditLog.getAuditStatistics({
  startTime: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
  endTime: Date.now()
})
```

## ⚠️ Important

Triggers **ONLY** work with wrapped mutations:
```typescript
import { mutation } from "./functions"; // ✅ Works
import { mutation } from "./_generated/server"; // ❌ Doesn't work
```

## 📖 Full Documentation

- `SETUP_SUMMARY.md` - Complete setup guide
- `TRIGGERS_README.md` - Comprehensive documentation
- `triggers.ts` - Trigger configuration
- `auditLog.ts` - Query functions
