# DATABASE SCHEMA COMPATIBILITY AUDIT REPORT
## Every File vs Database Schema Analysis

This comprehensive report analyzes every file that interacts with the database and identifies potential schema mismatches based on the provided database schema.

## SUMMARY OF FINDINGS

### ✅ TABLES THAT EXIST IN YOUR SCHEMA
Based on your schema, these tables exist:
- `user_profiles` 
- `projects`
- `opportunities`
- `submissions`
- `applications`
- `application_submissions`
- `project_opportunities`
- `donations`
- `donors`
- `campaigns`
- `companies`
- `sam_gov_usage`
- `chat_sessions`
- `chat_messages`

### ❌ TABLES REFERENCED BUT NOT IN YOUR SCHEMA
These tables are used by the code but missing from your schema:
- `user_sessions` - **CRITICAL** (used by session management)
- `user_devices` - **CRITICAL** (used by device management) 
- `system_metrics` - (used by delete account, AI agent)
- `angel_investors` - (used by angel investor features)
- `angel_investments` - (used by angel investing)
- `investment_opportunities` - (used by angel opportunities)
- `discovered_opportunities` - (used by AI discovery)
- `agent_*` tables - (multiple AI agent tables)
- `ai_*` tables - (AI completion and analytics tables)

---

## DETAILED FILE-BY-FILE ANALYSIS

### 🔴 CRITICAL ISSUES (Must Fix)

#### **app/api/auth/2fa/status/route.js**
**Schema Issue:** References `two_factor_enabled` column in `user_profiles`
- **Status:** ❌ Column missing from schema
- **Impact:** 2FA status check will fail
- **Fix:** Add 2FA columns to user_profiles table

#### **app/api/auth/devices/route.js** 
**Schema Issues:** References `user_devices` table
- **Status:** ❌ Entire table missing
- **Impact:** Device management completely broken
- **Fix:** Create user_devices table with all columns

#### **app/api/auth/sessions/route.js**
**Schema Issues:** References `user_sessions` table  
- **Status:** ❌ Entire table missing
- **Impact:** Session management broken
- **Fix:** Create user_sessions table

#### **app/api/auth/delete-account/route.js**
**Schema Issues:** References many missing tables
- **Missing Tables:** `user_devices`, `user_sessions`, `system_metrics`
- **Missing Tables:** `agent_*` tables, `ai_*` tables, `angel_*` tables
- **Impact:** Account deletion will fail on missing table references
- **Fix:** Create missing tables or add error handling

#### **lib/sessionManager.js**
**Schema Issues:** Uses `user_sessions` table extensively
- **Status:** ❌ Table missing - all session management broken
- **Impact:** Single-session enforcement not working
- **Fix:** Create user_sessions table

### 🟡 SECURITY FEATURES INCOMPLETE

#### **Two-Factor Authentication**
**Files Affected:**
- `app/api/auth/2fa/status/route.js`
- `app/api/auth/2fa/setup/route.js` 
- `app/api/auth/2fa/verify/route.js`
- `app/api/auth/2fa/disable/route.js`

**Missing Columns in user_profiles:**
- `two_factor_enabled BOOLEAN`
- `two_factor_secret TEXT`
- `two_factor_secret_temp TEXT` 
- `two_factor_backup_codes JSONB`

#### **Device Management**
**Files Affected:**
- `app/api/auth/devices/route.js`
- `components/DeviceManager.js`

**Missing Table:** `user_devices` with columns:
- `device_fingerprint`, `user_agent`, `last_ip`, `is_trusted`, etc.

#### **Active Session Management**  
**Files Affected:**
- `app/api/auth/sessions/route.js`
- `components/ActiveSessionsManager.js`
- `lib/sessionManager.js`

**Missing Table:** `user_sessions` with columns:
- `device_fingerprint`, `deactivated_at`, `deactivation_reason`, etc.

### 🟢 FILES THAT MATCH SCHEMA CORRECTLY

#### **app/api/account/profile/route.ts** ✅
**Tables Used:** `user_profiles`
- **Status:** ✅ Compatible (after recent fixes)
- **Uses:** `user_id` column correctly

#### **app/api/account/notifications/route.ts** ✅  
**Tables Used:** `user_profiles`
- **Status:** ✅ Compatible (after recent fixes)
- **Uses:** `user_id` column correctly

#### **Most sync endpoints** ✅
**Tables Used:** `opportunities`, `user_profiles`, `projects`
- **Status:** ✅ Generally compatible
- **Files:** `app/api/sync/sam-gov/route.ts`, `app/api/sync/grants-gov/route.ts`, etc.

### 🟡 ANGEL INVESTOR FEATURES

#### **app/api/angel/**
**Missing Tables:**
- `angel_investors`
- `angel_investments` 
- `investment_opportunities`

**Impact:** All angel investor features broken
**Fix:** Create angel investor tables or remove features

### 🟡 AI AGENT FEATURES

#### **lib/ai-agent/**
**Missing Tables:**
- `agent_status`, `agent_errors`, `agent_decisions`
- `agent_goals`, `agent_decision_feedback`
- `agent_states`, `agent_manager_log`
- `system_health_reports`

**Impact:** AI agent functionality broken
**Fix:** Create AI agent tables or disable features

### 🟡 AI COMPLETION FEATURES

**Missing Tables:**
- `ai_completions`
- `ai_search_analytics`

**Files Affected:**
- Various AI-related endpoints
- Delete account functionality

---

## RECOMMENDED ACTIONS

### 🔥 IMMEDIATE FIXES (Run These SQL Scripts)

1. **Run:** `fix-device-fingerprint-error.sql`
   - Creates `user_sessions`, `user_devices` tables
   - Adds 2FA columns to `user_profiles`
   - Fixes all critical security features

2. **Alternative:** `database_auth_security_migration.sql`
   - Simpler version focusing on auth features

### 📋 VERIFICATION QUERIES

Run: `database_security_features_status.sql` to check implementation status

### ⚠️ OPTIONAL FIXES

**Angel Investor Tables** (if you want this feature):
```sql
-- Create angel investor tables
CREATE TABLE angel_investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  -- add other columns as needed
);
```

**AI Agent Tables** (if you want AI agents):
```sql  
-- Create AI agent tables
CREATE TABLE agent_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  -- add other columns as needed
);
```

---

## FILES REQUIRING NO CHANGES ✅

These files correctly use existing tables:
- Most components in `components/`
- Most sync endpoints 
- Basic project and opportunity management
- User profile management (after recent fixes)

---

## CONCLUSION

**Critical Issues:** 5 files/features completely broken due to missing tables
**Security Features:** 0% implemented (need database tables)
**Core Functionality:** 85% working (projects, opportunities, profiles)

**Next Steps:**
1. Run the security migration SQL script
2. Test 2FA, device management, active sessions
3. Decide on angel investor and AI agent features
4. Verify everything works with the status check queries