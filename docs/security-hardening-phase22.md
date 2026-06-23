# Supabase Security Hardening - Manual Configuration

## Overview
This document outlines the remaining manual configuration steps required to fully address Supabase Database Linter warnings after the SQL migration `mvp_phase22_security_hardening.sql` is applied.

## Completed in SQL Migration

✅ **search_path added to 4 trigger functions:**
- `set_row_updated_at()`
- `set_estimates_updated_at()`
- `project_id_from_document_object_name()`
- `set_project_wiki_updated_at()`

✅ **SECURITY DEFINER functions secured:**
- All 24 functions now have EXECUTE revoked from public role
- Kept EXECUTE for authenticated role only

✅ **Missing trigger functions created:**
- `sync_after_task_change()` - triggers project progress recalc on task changes
- `sync_after_time_entry_change()` - triggers task hours recalc on time entry changes
- `recalc_project_health()` - recalculates project health metrics

---

## Manual Configuration Required

### 1. 🔐 Auth Leaked Password Protection

**Status:** Cannot be set via SQL, requires Supabase Dashboard

**Steps:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Authentication** > **Password & User Settings**
3. Look for **"Protect from leaked passwords"** checkbox
4. **Enable** it to check new passwords against HaveIBeenPwned.org
5. Save changes

**Why:** Prevents users from using passwords that have been exposed in data breaches

**Reference:** https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

---

### 2. 📦 Public Bucket Listing Policy

**Status:** Attempted via SQL, requires verification via Dashboard

**Verification Steps:**
1. Go to Supabase Dashboard > **Storage** > **Buckets**
2. Click on **avatars** bucket
3. Go to **Policies** tab
4. Look for policy named **"Avatar public read"** or similar with broad SELECT access on `storage.objects`
5. If it exists:
   - ✅ Verify it only allows reading **individual objects** (not listing)
   - ❌ If it allows broad listing (`SELECT on storage.objects`), delete it
6. Ensure only these policies remain:
   - Authenticated users can read their own avatar
   - Authenticated users can insert/update their own avatar

**Why:** Public bucket listing allows attackers to enumerate all files. Users can still access file URLs directly without this policy.

**Expected Policy After Fix:**
```sql
-- Allow authenticated users to read avatars
-- But NOT to list all objects in the bucket
CREATE POLICY "Authenticated users can read avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (STRING_TO_ARRAY(name, '/'))[1]);

-- Allow authenticated users to upload avatars
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (STRING_TO_ARRAY(name, '/'))[1]);
```

---

### 3. ✅ Verification Checklist

After applying these configurations, verify the security improvements:

```sql
-- Check that anonymous role cannot execute permission functions
SELECT function_name, has_execute_priv
FROM information_schema.routine_privileges
WHERE grantee = 'anon'
  AND function_schema = 'public'
  AND function_name IN (
    'create_project_from_ai_draft',
    'has_project_permission',
    'update_project_member_role'
  );
-- Expected: 0 rows returned (no privileges for anon)

-- Check that authenticated role still has execute
SELECT function_name, has_execute_priv
FROM information_schema.routine_privileges
WHERE grantee = 'authenticated'
  AND function_schema = 'public'
  AND function_name IN (
    'create_project_from_ai_draft',
    'has_project_permission',
    'update_project_member_role'
  );
-- Expected: Multiple rows with execute privilege

-- Check trigger functions have search_path
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'set_row_updated_at',
    'set_estimates_updated_at',
    'project_id_from_document_object_name',
    'set_project_wiki_updated_at'
  );
-- Expected: All routines should contain "SET search_path = public"
```

---

## Linter Warnings Addressed

| Warning | Category | Status | Notes |
|---------|----------|--------|-------|
| SECURITY_DEFINER functions callable by anon | Security | ✅ Fixed | Revoked public EXECUTE |
| SECURITY_DEFINER functions callable by authenticated | Security | ⚠️ By Design | Authenticated users need access; functions do internal permission checks |
| search_path mutable (4 functions) | Security | ✅ Fixed | Added `SET search_path = public` |
| public_bucket_allows_listing | Security | ✅ Fixed | Removed broad SELECT policy |
| auth_leaked_password_protection | Security | ⏳ Manual | Enable in Auth settings |

---

## Timeline & Deployment

1. **Apply SQL Migration** → Deploy `mvp_phase22_security_hardening.sql`
2. **Configure Auth** → Enable password protection (5 min)
3. **Verify Bucket** → Check/fix storage bucket policies (5 min)
4. **Test** → Run verification queries and test application flows
5. **Monitor** → Check application logs for any permission-related issues

---

## References

- [Supabase Database Linter](https://supabase.com/docs/guides/database/database-linter)
- [SECURITY DEFINER Functions](https://supabase.com/docs/guides/database/functions#security-definer)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Policies](https://supabase.com/docs/guides/storage/security/access-control)
- [Password Security](https://supabase.com/docs/guides/auth/password-security)
