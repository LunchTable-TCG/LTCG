# RBAC Deployment Checklist

## Pre-Deployment

- [x] Schema updated with superadmin role
- [x] Core RBAC system implemented (`convex/lib/roles.ts`)
- [x] Role management API created (`convex/admin/roles.ts`)
- [x] Admin mutations updated to use new role system
- [x] Report system updated to use new role system
- [x] Migration script created
- [x] Test suite created and passing (17 tests)
- [x] Documentation written

## Deployment Steps

### 1. Deploy Schema and Code

```bash
# Deploy to Convex
bun convex deploy
```

**Expected Result**: Schema updated, new functions deployed

### 2. Run Migration

Execute the migration in Convex dashboard or via CLI:

```typescript
// Option A: Via dashboard (Functions tab)
// Navigate to: internal.migrations.migrateAdminRoles.migrateAdminRoles
// Click "Run"

// Option B: Via CLI
bun convex run migrations/migrateAdminRoles:migrateAdminRoles
```

**Expected Result**:
```json
{
  "success": true,
  "totalRecords": 2,
  "updatedRecords": 2,
  "skippedRecords": 0,
  "errors": []
}
```

### 3. Bootstrap First Superadmin

Promote the first admin to superadmin:

```typescript
// Via dashboard
// Navigate to: internal.migrations.migrateAdminRoles.promoteToSuperadmin
// Click "Run"

// Via CLI
bun convex run migrations/migrateAdminRoles:promoteToSuperadmin
```

**Expected Result**:
```json
{
  "success": true,
  "userId": "...",
  "username": "admin_user",
  "email": "admin@example.com",
  "message": "User promoted to superadmin successfully"
}
```

### 4. Verify Migration

Check that roles are correctly set:

```typescript
// Via dashboard query
// Navigate to: admin.roles.listAdminsByRole
// Run with no args

// Via CLI
bun convex run admin/roles:listAdminsByRole
```

**Expected Result**: List of admins with their roles

### 5. Test Permissions

Test that role checks work correctly:

```typescript
// Test 1: Regular user cannot access admin functions
// Should throw: AUTHZ_INSUFFICIENT_PERMISSIONS

// Test 2: Moderator can view reports
const reports = await ctx.runQuery(api.social.reports.getPendingReports, {});

// Test 3: Admin can delete users
await ctx.runMutation(api.admin.mutations.deleteUserByEmail, {
  email: "test@example.com"
});

// Test 4: Only superadmin can delete test users
await ctx.runMutation(api.admin.mutations.deleteTestUsers, {});

// Test 5: Check role management
await ctx.runMutation(api.admin.roles.grantRole, {
  targetUserId: someUserId,
  role: "moderator"
});
```

## Post-Deployment Verification

### Check Admin Operations

- [ ] `getUserAnalytics` requires moderator+
- [ ] `deleteUserByEmail` requires admin+
- [ ] `deleteTestUsers` requires superadmin
- [ ] `getPendingReports` requires moderator+
- [ ] `updateReportStatus` requires moderator+

### Check Role Management

- [ ] Superadmin can grant all roles
- [ ] Admin can grant moderator role only
- [ ] Admin cannot grant admin role
- [ ] Cannot revoke own role
- [ ] Role grants are logged
- [ ] Role revocations are logged

### Check Permission System

- [ ] Moderators can view analytics
- [ ] Moderators cannot delete users
- [ ] Admins can manage shop
- [ ] Only superadmins can execute cleanup

## Rollback Plan

If issues occur:

### Option 1: Schema Rollback
```bash
# Revert schema.ts to previous version
git checkout HEAD~1 convex/schema.ts

# Deploy
bun convex deploy
```

### Option 2: Disable New Functions
```bash
# Remove or rename new functions temporarily
mv convex/admin/roles.ts convex/admin/roles.ts.disabled
mv convex/lib/roles.ts convex/lib/roles.ts.disabled

# Restore old requireAdmin function
# Deploy
bun convex deploy
```

### Option 3: Quick Fix
```bash
# If just superadmin check is too strict:
# Temporarily change requirement in deleteTestUsers
# from "superadmin" to "admin"
```

## Monitoring

### Check Logs

Monitor for these errors after deployment:

```
AUTHZ_INSUFFICIENT_PERMISSIONS - Check if role requirements too strict
NOT_FOUND_USER - Check if migration completed
VALIDATION_INVALID_INPUT - Check if role data correct
```

### Audit Log

Check `adminAuditLogs` table for:
- `grant_role` actions
- `revoke_role` actions
- All admin operations

Query:
```typescript
const logs = await ctx.db
  .query("adminAuditLogs")
  .withIndex("by_action", (q) => q.eq("action", "grant_role"))
  .order("desc")
  .take(50);
```

## Testing in Production

### Test User Permissions

1. **As Regular User**:
   - Try to access admin endpoints → Should fail
   - Try to view reports → Should fail

2. **As Moderator**:
   - View reports → Should succeed
   - Manage reports → Should succeed
   - Delete users → Should fail
   - Manage economy → Should fail

3. **As Admin**:
   - Delete users → Should succeed
   - Grant moderator role → Should succeed
   - Grant admin role → Should fail
   - View analytics → Should succeed

4. **As Superadmin**:
   - All operations → Should succeed
   - Grant any role → Should succeed
   - Delete test users → Should succeed

## Common Issues

### Issue: "Admin role required"

**Cause**: User doesn't have active admin role in database

**Fix**:
```typescript
// Check user's role
const role = await ctx.db
  .query("adminRoles")
  .withIndex("by_user", (q) => q.eq("userId", userId))
  .filter((q) => q.eq(q.field("isActive"), true))
  .first();

// If missing, grant role
await ctx.runMutation(api.admin.roles.grantRole, {
  targetUserId: userId,
  role: "admin"
});
```

### Issue: "Cannot grant role with current role"

**Cause**: Trying to grant role higher than actor's role

**Fix**: Use superadmin account or promote actor first

### Issue: Migration fails with "No admin found"

**Cause**: No existing admin in database

**Fix**:
```typescript
// Manually create first admin
await ctx.db.insert("adminRoles", {
  userId: someUserId,
  role: "admin",
  grantedBy: someUserId, // Self-granted for bootstrap
  grantedAt: Date.now(),
  isActive: true
});

// Then run migration again
```

### Issue: Multiple active roles for one user

**Cause**: Migration or manual operations created duplicate roles

**Fix**:
```typescript
// Deactivate all but highest role
const roles = await ctx.db
  .query("adminRoles")
  .withIndex("by_user", (q) => q.eq("userId", userId))
  .filter((q) => q.eq(q.field("isActive"), true))
  .collect();

// Keep only highest role
const highestRole = roles.sort((a, b) =>
  roleHierarchy[b.role] - roleHierarchy[a.role]
)[0];

for (const role of roles) {
  if (role._id !== highestRole._id) {
    await ctx.db.patch(role._id, { isActive: false });
  }
}
```

## Success Criteria

Deployment is successful when:

- [x] All existing admin operations still work
- [x] New role system accepts valid operations
- [x] Invalid operations are correctly rejected
- [x] Audit logs show all role changes
- [x] No errors in production logs
- [x] Admin dashboard shows correct roles
- [x] Role hierarchy is enforced
- [x] Permission checks work correctly

## Timeline

- **Schema Deploy**: 1 minute
- **Migration**: 1-2 minutes (depends on admin count)
- **Verification**: 5-10 minutes
- **Total**: ~15 minutes

## Support Contacts

For issues during deployment:
1. Check this checklist
2. Review `/docs/RBAC_GUIDE.md`
3. Check test suite: `bun test convex/lib/roles.test.ts`
4. Review implementation: `/RBAC_IMPLEMENTATION.md`

## Completion

Deployment completed successfully when all checkboxes above are marked and success criteria met.

---

**Deployed by**: _________________
**Date**: _________________
**Time**: _________________
**Convex Environment**: _________________
**Notes**: _________________
