// fix-environment-variables.js
// Script to diagnose and fix environment variable issues

const fs = require('fs')
const path = require('path')

console.log('🔧 FundingOS Environment Variables Fix Script\n')

// 1. Check if environment files exist
console.log('1. Checking environment files...')
const envFiles = ['.env', '.env.local', '.env.production', '.env.development']
const envData = {}

envFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file)
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      envData[file] = content
      console.log(`  ✅ Found ${file}`)
    } catch (err) {
      console.log(`  ❌ Error reading ${file}: ${err.message}`)
    }
  } else {
    console.log(`  ⚠️  ${file} not found`)
  }
})

// 2. Load environment variables manually for this script
console.log('\n2. Loading environment variables from .env.local...')
const envLocalPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8')
  const lines = envContent.split('\n')
  
  lines.forEach(line => {
    line = line.trim()
    if (line && !line.startsWith('#')) {
      const [key, value] = line.split('=')
      if (key && value) {
        process.env[key] = value
        console.log(`  Set ${key}=${value}`)
      }
    }
  })
} else {
  console.log('  .env.local not found')
}

// 3. Test Supabase client creation
console.log('\n3. Testing Supabase client creation...')
try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log(`  URL: ${supabaseUrl}`)
  console.log(`  Key: ${supabaseAnonKey}`)
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('  ❌ Missing required variables')
  } else if (supabaseUrl.includes('localhost') || supabaseAnonKey === 'anon-key') {
    console.log('  ⚠️  Using placeholder values - this will fail in production')
  } else {
    console.log('  ✅ Environment variables look valid')
  }
  
  // Try creating the client
  const { createClient } = require('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  console.log('  ✅ Supabase client created successfully')
  
} catch (error) {
  console.log(`  ❌ Error creating Supabase client: ${error.message}`)
}

// 4. Create production-ready environment template
console.log('\n4. Creating production environment template...')
const productionTemplate = `# Production Environment Variables
# Copy these to your deployment platform (Vercel, Netlify, etc.)

# Supabase Configuration
# Get these from: https://supabase.com/dashboard → Your Project → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# OpenAI Configuration (Optional, for AI features)
OPENAI_API_KEY=sk-your-openai-key-here

# NextAuth Configuration (Optional)
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-random-secret-here

# Other Configuration
NODE_ENV=production
`

fs.writeFileSync('.env.production.template', productionTemplate)
console.log('  ✅ Created .env.production.template')

// 5. Create working development environment
console.log('\n5. Creating working development environment...')
const devEnv = `# Development Environment Variables
# These are placeholder values for local development

NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key
OPENAI_API_KEY=sk-placeholder
NEXTAUTH_URL=http://localhost:3000

# Enable development mode
NODE_ENV=development
`

fs.writeFileSync('.env.development', devEnv)
console.log('  ✅ Created .env.development')

// 6. Provide deployment instructions
console.log('\n6. Deployment Instructions...')
console.log(`
📋 TO FIX THE PRODUCTION ERROR:

1. Get your real Supabase credentials:
   • Go to https://supabase.com/dashboard
   • Select your project
   • Go to Settings → API
   • Copy the Project URL and anon key

2. Set environment variables in your deployment platform:

   For Vercel:
   • Go to vercel.com/dashboard
   • Select your project
   • Go to Settings → Environment Variables
   • Add:
     - NEXT_PUBLIC_SUPABASE_URL = your-real-supabase-url
     - NEXT_PUBLIC_SUPABASE_ANON_KEY = your-real-anon-key
     - SUPABASE_SERVICE_ROLE_KEY = your-real-service-role-key

   For Netlify:
   • Go to app.netlify.com
   • Select your site
   • Go to Site settings → Environment variables
   • Add the same variables

3. Redeploy your application

4. Test that the error is resolved

🔍 CURRENT ISSUE:
The error "supabaseKey is required" happens because your production
environment doesn't have the real Supabase credentials configured.
The app is trying to connect to Supabase but can't find valid keys.

⚠️  NEVER commit real API keys to Git!
Only use the placeholder values in .env.local for development.
`)

console.log('\n✅ Environment fix script completed!')
console.log('Check the files created: .env.production.template and .env.development')