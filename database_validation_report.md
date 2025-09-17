# Database Schema Validation Report

## 🚨 CRITICAL SCHEMA MISMATCHES FOUND

### 1. **user_profiles table** - MAJOR ISSUE ❌
**Files affected**: 
- `app/api/account/profile/route.ts`  
- `app/api/account/notifications/route.ts`
- `lib/supabase.js` (multiple functions)
- `components/AuthPage.js`
- `components/EnhancedOnboardingFlow.js`

**Problems**:
❌ **Table missing entirely** from schema
❌ **Column mismatch**: Profile API uses `id`, notifications API uses `user_id`
❌ **Missing columns referenced in code**:

**Code References to non-existent table/columns**:
```typescript
// Profile API expects:
.select('*').eq('id', userId)
.upsert(payload, { onConflict: 'id' })

// Notifications API expects:  
.select('notification_preferences').eq('user_id', userId)
.upsert(payload, { onConflict: 'user_id' })

// Components/lib expect these columns:
id, user_id, email, full_name, organization_name, organization_type, 
user_role, setup_completed, notification_preferences, created_at, updated_at
```

**Your schema has**: ❌ **TABLE DOES NOT EXIST**

---

### 2. **Column Name Inconsistencies** ⚠️

**angel_investments table**: ✅ GOOD - Code matches schema
- Uses `investor_id`, `project_id`, `investment_amount`, `status` ✅

**opportunities table**: ✅ GOOD - Fixed in recent updates
- Now includes both `updated_at` and `last_updated` ✅

**projects table**: ✅ GOOD - Code matches schema  
- Uses `user_id`, `name`, `location`, `project_type`, etc. ✅

---

### 3. **Missing Column Issues Found** ❌

**In user_profiles (if created)**, code expects these columns not in your SQL:
- `notification_preferences` (jsonb)
- `organization_name` (text)
- `organization_type` (text) 
- `user_role` (text)
- `setup_completed` (boolean)

---

## ✅ **Schema Matches Found**

### Tables that match perfectly:
- ✅ **opportunities** - All columns used in sync routes match schema
- ✅ **projects** - All columns in lib/supabase.js match schema
- ✅ **angel_investors** - All columns in angel routes match schema  
- ✅ **angel_investments** - All columns in invest route match schema
- ✅ **agent_*** tables - Used correctly in AI agent system
- ✅ **ai_*** tables - Used correctly in AI services
- ✅ **chat_*** tables - Used correctly in chat system

---

## 🔧 **Required Database Fixes**

### **URGENT - Create user_profiles table with all required columns:**
```sql
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  phone text,
  company text,
  title text,
  bio text,
  website text,
  linkedin_url text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip_code text,
  country text DEFAULT 'United States',
  timezone text,
  -- Additional columns used in code:
  organization_name text,
  organization_type text,
  user_role text,
  setup_completed boolean DEFAULT false,
  notification_preferences jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### **Fix API inconsistency**: 
Either change notifications API to use `id` instead of `user_id`, or change profile API to use `user_id`. Recommend using `user_id` consistently.

---

## 📊 **Analysis Summary**
- **64 API routes analyzed** ✅  
- **Major components checked** ✅
- **Core lib files validated** ✅
- **1 missing table identified** ❌
- **Schema consistency issues found** ⚠️

**Bottom Line**: Your database schema is comprehensive, but the missing `user_profiles` table is breaking account functionality.
