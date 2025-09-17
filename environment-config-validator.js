// environment-config-validator.js
// Script to validate production environment configuration

console.log('🔧 FundingOS Production Environment Configuration Validator\n')

// Required Environment Variables
const requiredVars = {
  'NEXT_PUBLIC_SUPABASE_URL': {
    description: 'Supabase project URL',
    required: true,
    example: 'https://your-project.supabase.co'
  },
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': {
    description: 'Supabase anonymous/public key',
    required: true,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  'SUPABASE_SERVICE_ROLE_KEY': {
    description: 'Supabase service role key (for server-side operations)',
    required: true,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  'OPENAI_API_KEY': {
    description: 'OpenAI API key for AI features',
    required: false,
    example: 'sk-...'
  },
  'NEXTAUTH_URL': {
    description: 'NextAuth URL for authentication',
    required: false,
    example: 'https://your-domain.com'
  }
}

console.log('1. Checking Environment Variables...')
let missingRequired = []
let foundVars = []

Object.entries(requiredVars).forEach(([varName, config]) => {
  const value = process.env[varName]
  const exists = !!value
  const isPlaceholder = value && (value.includes('placeholder') || value.includes('localhost') || value === 'anon-key' || value === 'service-role-key')
  
  if (exists && !isPlaceholder) {
    foundVars.push(`✅ ${varName}: Set (${value.substring(0, 20)}...)`)
  } else if (exists && isPlaceholder) {
    foundVars.push(`⚠️  ${varName}: Placeholder value detected`)
    if (config.required) {
      missingRequired.push(varName)
    }
  } else {
    foundVars.push(`❌ ${varName}: Missing`)
    if (config.required) {
      missingRequired.push(varName)
    }
  }
})

foundVars.forEach(status => console.log(`  ${status}`))

console.log('\n2. Environment Status Summary...')
if (missingRequired.length === 0) {
  console.log('✅ All required environment variables are properly configured!')
} else {
  console.log('❌ Missing or invalid required environment variables:')
  missingRequired.forEach(varName => {
    const config = requiredVars[varName]
    console.log(`\n  ${varName}:`)
    console.log(`    Description: ${config.description}`)
    console.log(`    Example: ${config.example}`)
  })
}

console.log('\n3. Production Deployment Requirements...')
const deploymentSteps = [
  'Set NEXT_PUBLIC_SUPABASE_URL to your Supabase project URL',
  'Set NEXT_PUBLIC_SUPABASE_ANON_KEY to your Supabase anon key',
  'Set SUPABASE_SERVICE_ROLE_KEY to your Supabase service role key',
  'Ensure all environment variables are added to your deployment platform',
  'Redeploy your application after setting environment variables'
]

deploymentSteps.forEach((step, index) => {
  console.log(`  ${index + 1}. ${step}`)
})

console.log('\n4. Platform-Specific Instructions...')

const platformInstructions = {
  'Vercel': [
    'Go to your Vercel dashboard',
    'Navigate to your project settings',
    'Go to Environment Variables section',
    'Add each required variable with production values',
    'Redeploy your application'
  ],
  'Netlify': [
    'Go to your Netlify dashboard',
    'Navigate to Site settings > Environment variables',
    'Add each required variable',
    'Trigger a new deployment'
  ],
  'Railway': [
    'Go to your Railway dashboard',
    'Navigate to your project',
    'Go to Variables tab',
    'Add each required environment variable',
    'Redeploy'
  ]
}

Object.entries(platformInstructions).forEach(([platform, steps]) => {
  console.log(`\n${platform}:`)
  steps.forEach((step, index) => {
    console.log(`  ${index + 1}. ${step}`)
  })
})

console.log('\n5. Supabase Configuration...')
console.log('To get your Supabase credentials:')
console.log('  1. Go to https://supabase.com/dashboard')
console.log('  2. Select your project')
console.log('  3. Go to Settings > API')
console.log('  4. Copy the Project URL and anon/service_role keys')

console.log('\n6. Error Context...')
console.log('The error "supabaseKey is required" occurs when:')
console.log('  • NEXT_PUBLIC_SUPABASE_ANON_KEY is missing')
console.log('  • NEXT_PUBLIC_SUPABASE_ANON_KEY is empty or placeholder')
console.log('  • Environment variables are not loaded in production')

console.log('\n7. Next Steps...')
if (missingRequired.length > 0) {
  console.log('❌ Action Required: Configure missing environment variables')
  console.log('   Without these variables, the application cannot connect to Supabase')
} else {
  console.log('✅ Environment looks good! Try redeploying the application.')
}

// Output current environment type
const isProduction = process.env.NODE_ENV === 'production'
const isVercel = process.env.VERCEL === '1'
const isNetlify = process.env.NETLIFY === 'true'

console.log('\n8. Current Environment Context...')
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`)
console.log(`  Platform: ${isVercel ? 'Vercel' : isNetlify ? 'Netlify' : 'Unknown/Local'}`)
console.log(`  Is Production: ${isProduction}`)

// Create sample .env file content
console.log('\n9. Sample .env Configuration...')
console.log('Create a .env.local file (for development) or set these in production:')
console.log()
Object.entries(requiredVars).forEach(([varName, config]) => {
  console.log(`${varName}=${config.example}`)
})

console.log('\n⚠️  SECURITY NOTE: Never commit real keys to version control!')
console.log('   Use .env.local for development and platform environment variables for production.')