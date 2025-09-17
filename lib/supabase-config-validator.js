// lib/supabase-config-validator.js
// Enhanced Supabase configuration with better error handling

export function validateSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // Check if variables exist
  if (!supabaseUrl) {
    throw new Error(
      '🚫 MISSING ENVIRONMENT VARIABLE: NEXT_PUBLIC_SUPABASE_URL\n' +
      'This should be your Supabase project URL (e.g., https://your-project.supabase.co)\n' +
      'Get it from: https://supabase.com/dashboard → Your Project → Settings → API'
    )
  }
  
  if (!supabaseAnonKey) {
    throw new Error(
      '🚫 MISSING ENVIRONMENT VARIABLE: NEXT_PUBLIC_SUPABASE_ANON_KEY\n' +
      'This should be your Supabase anonymous/public key\n' +
      'Get it from: https://supabase.com/dashboard → Your Project → Settings → API'
    )
  }
  
  // Check if variables are placeholder values
  const isUrlPlaceholder = supabaseUrl.includes('localhost') || 
                           supabaseUrl.includes('placeholder') || 
                           supabaseUrl === 'http://localhost:54321'
                           
  const isKeyPlaceholder = supabaseAnonKey === 'anon-key' || 
                          supabaseAnonKey.includes('placeholder') ||
                          supabaseAnonKey.length < 10
  
  if (process.env.NODE_ENV === 'production') {
    if (isUrlPlaceholder) {
      throw new Error(
        '🚫 PRODUCTION ERROR: NEXT_PUBLIC_SUPABASE_URL contains placeholder value\n' +
        `Current value: ${supabaseUrl}\n` +
        'You need to set the real Supabase URL in your production environment.\n' +
        'This should look like: https://your-project-id.supabase.co'
      )
    }
    
    if (isKeyPlaceholder) {
      throw new Error(
        '🚫 PRODUCTION ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY contains placeholder value\n' +
        `Current value: ${supabaseAnonKey}\n` +
        'You need to set the real Supabase anonymous key in your production environment.\n' +
        'Get it from: https://supabase.com/dashboard → Your Project → Settings → API'
      )
    }
  }
  
  // Validate URL format
  try {
    new URL(supabaseUrl)
  } catch (error) {
    throw new Error(
      `🚫 INVALID SUPABASE URL: ${supabaseUrl}\n` +
      'The NEXT_PUBLIC_SUPABASE_URL must be a valid URL\n' +
      'Example: https://your-project-id.supabase.co'
    )
  }
  
  // Check if URL points to Supabase
  if (process.env.NODE_ENV === 'production' && !supabaseUrl.includes('.supabase.co') && !supabaseUrl.includes('localhost')) {
    console.warn(
      `⚠️  WARNING: NEXT_PUBLIC_SUPABASE_URL doesn't appear to be a Supabase URL: ${supabaseUrl}\n` +
      'Expected format: https://your-project-id.supabase.co'
    )
  }
  
  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    isValid: true,
    isProduction: process.env.NODE_ENV === 'production',
    usingPlaceholders: isUrlPlaceholder || isKeyPlaceholder
  }
}

export function getSupabaseConfig() {
  try {
    return validateSupabaseConfig()
  } catch (error) {
    // In development, show helpful error message
    if (process.env.NODE_ENV !== 'production') {
      console.error('\n' + '='.repeat(60))
      console.error('🔧 SUPABASE CONFIGURATION ERROR')
      console.error('='.repeat(60))
      console.error(error.message)
      console.error('\n📋 TO FIX THIS:')
      console.error('1. Create a Supabase project at https://supabase.com')
      console.error('2. Go to Settings → API in your Supabase dashboard')
      console.error('3. Copy the Project URL and anon key')
      console.error('4. Set them in your environment variables')
      console.error('5. For local development, update .env.local')
      console.error('6. For production, set them in your deployment platform')
      console.error('='.repeat(60) + '\n')
    }
    
    // Re-throw the error to stop execution
    throw error
  }
}