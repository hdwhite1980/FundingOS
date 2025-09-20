# FundingOS Assistant Setup Instructions

## 🔑 Required Environment Variables

To enable the WALI-OS Assistant with OpenAI integration, you need to configure these environment variables:

### 1. Supabase Configuration
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 2. OpenAI Configuration
```bash
OPENAI_API_KEY=sk-your-openai-api-key
```

### 3. NextAuth Configuration
```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

## 🚀 Quick Setup Steps

### Step 1: Get Your OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-`)

### Step 2: Get Your Supabase Keys
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy:
   - Project URL (NEXT_PUBLIC_SUPABASE_URL)
   - Project API keys → anon public (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - Project API keys → service_role (SUPABASE_SERVICE_ROLE_KEY)

### Step 3: Update Your Environment File
Replace the placeholder values in `.env.development`:

```bash
# Development Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-proj-abc123...
NEXTAUTH_URL=http://localhost:3000

# Enable development mode
NODE_ENV=development
```

### Step 4: Run the Database Setup
Execute the SQL in `ASSISTANT_MISSING_TABLES.sql` in your Supabase SQL editor to create any missing tables.

### Step 5: Test the Connection
1. Start your development server: `npm run dev`
2. Go to `/api/test-ai` to verify OpenAI connection
3. Open the assistant and ask "what is an EIN" to test

## 🔧 Troubleshooting

### Assistant Shows Template Responses
- **Problem**: Assistant returns "I'll analyze how 'what is an EIN' maps to your funding strategy..."
- **Solution**: OpenAI API key is missing or invalid
- **Fix**: Update `OPENAI_API_KEY` in your environment file

### Assistant Has No Customer Data
- **Problem**: Assistant says "No projects found" when you have projects
- **Solution**: Missing `profiles` or `user_profiles` table, or wrong table references
- **Fix**: Check your Supabase database schema and run missing tables SQL

### Database Connection Errors
- **Problem**: "MISSING ENVIRONMENT VARIABLE: NEXT_PUBLIC_SUPABASE_URL"
- **Solution**: Supabase configuration incomplete
- **Fix**: Update all three Supabase environment variables

## 🎯 Current Assistant Features

Once properly configured, the assistant can:

✅ **Answer EIN Questions**: "What is an EIN?" → Detailed explanation with your org's EIN if available
✅ **Project Information**: "What projects am I working on?" → Lists your active projects
✅ **Address Information**: "Do I have an address?" → Shows your organization address from database
✅ **Opportunity Matching**: "What grants are available?" → Shows matched opportunities
✅ **Application Help**: "Help with my grant application" → Provides step-by-step guidance

## 📊 Database Schema Requirements

The assistant needs these tables in your Supabase database:
- `profiles` or `user_profiles` - User information and organization details
- `projects` - Your funding projects
- `submissions` - Grant applications
- `company_settings` - Organization EIN, address, etc.
- `opportunities` - Available funding opportunities

Most of these should already exist in your database. If any are missing, run the SQL in `ASSISTANT_MISSING_TABLES.sql`.