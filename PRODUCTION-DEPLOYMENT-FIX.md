# 🚀 FundingOS Production Deployment Checklist

## 🚫 CURRENT ISSUE: "supabaseKey is required" Error

Your production deployment is failing because the Supabase environment variables are not configured. Here's how to fix it:

## ✅ Step-by-Step Fix

### 1. Get Your Supabase Credentials
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your FundingOS project (or create one if needed)
3. Navigate to **Settings** → **API**
4. Copy these values:
   - **Project URL** (looks like: `https://abc123xyz.supabase.co`)
   - **anon public key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
   - **service_role secret key** (also starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### 2. Configure Environment Variables in Your Deployment Platform

#### For Vercel (Most Common):
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your FundingOS project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
5. Set them for **Production**, **Preview**, and **Development**
6. Click **Save**

#### For Netlify:
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Add the same variables as above
5. Click **Save**

#### For Railway:
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your project
3. Go to **Variables** tab
4. Add the same variables as above

### 3. Redeploy Your Application
After setting the environment variables:
- **Vercel**: Go to **Deployments** tab → Click **Redeploy** on the latest deployment
- **Netlify**: Trigger a new deployment by pushing to your repo or clicking **Deploy site**
- **Railway**: The app will automatically redeploy when you save variables

### 4. Verify the Fix
1. Wait for the deployment to complete
2. Visit your production URL
3. The "supabaseKey is required" error should be gone
4. You should see the FundingOS application loading properly

## 🔧 Additional Configuration (Optional)

### OpenAI API Key (for AI features):
```
OPENAI_API_KEY = sk-your-openai-api-key-here
```

### NextAuth Configuration (if using):
```
NEXTAUTH_URL = https://your-domain.com
NEXTAUTH_SECRET = your-random-secret-string
```

## 🛡️ Security Best Practices

### ✅ DO:
- Set environment variables in your deployment platform
- Use the `service_role` key only for server-side operations
- Keep your `anon` key public-facing (it's designed to be safe)
- Regularly rotate your service role keys

### ❌ DON'T:
- Commit real API keys to Git
- Share your service role key publicly
- Use localhost URLs in production
- Use placeholder values in production

## 🔍 Troubleshooting

### Still getting "supabaseKey is required"?
1. **Check the exact variable names** (they're case-sensitive):
   - `NEXT_PUBLIC_SUPABASE_URL` (not `SUPABASE_URL`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not `SUPABASE_ANON_KEY`)

2. **Verify the values**:
   - URL should start with `https://` and end with `.supabase.co`
   - Keys should start with `eyJhbGciOiJIUzI1NiI...`
   - No extra spaces or quotes around values

3. **Check deployment logs**:
   - Look for environment variable loading messages
   - Verify the variables are being set correctly

4. **Wait for deployment**:
   - Environment changes require a fresh deployment
   - Clear any CDN caches if applicable

### Environment Variable Not Loading?
- Make sure you set variables for the right environment (Production/Preview/Development)
- Some platforms need a manual redeploy after environment changes
- Check your deployment platform's documentation for environment variable specifics

## 📋 Environment Variables Summary

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | Supabase public/anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Supabase server-side key |
| `OPENAI_API_KEY` | ❌ Optional | For AI features |
| `NEXTAUTH_URL` | ❌ Optional | For authentication |

## 🎯 Quick Fix Summary

**The error occurs because your production environment can't connect to Supabase.**

**Fix**: Set the three required Supabase environment variables in your deployment platform, then redeploy.

**Expected result**: The application loads normally without any Supabase connection errors.

---

## 📞 Need Help?

If you're still experiencing issues after following this guide:
1. Check your Supabase project is active and not paused
2. Verify your deployment platform's environment variable documentation
3. Look at the browser developer tools for more specific error messages
4. Check the deployment logs for any environment variable related warnings