// pages/api/debug/env-check.js
// Debug endpoint to check environment variables in production

export default function handler(req, res) {
  // Security check - only allow in development or if specific debug header is present
  const isDev = process.env.NODE_ENV === 'development'
  const debugKey = req.headers['x-debug-key']
  const allowDebug = isDev || debugKey === 'fundingos-debug-2024'

  if (!allowDebug) {
    return res.status(403).json({ error: 'Debug endpoint not accessible' })
  }

  const envStatus = {
    NODE_ENV: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    vercel: {
      isVercel: !!process.env.VERCEL,
      region: process.env.VERCEL_REGION || 'unknown',
      env: process.env.VERCEL_ENV || 'unknown'
    },
    supabase: {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      anonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      anonKeyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
    },
    validation: {
      urlIsValid: false,
      anonKeyIsValid: false,
      valuesLookReal: false
    }
  }

  // Validate URL format
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
      envStatus.validation.urlIsValid = true
      envStatus.supabase.urlHost = url.host
    } catch (error) {
      envStatus.validation.urlError = 'Invalid URL format'
    }
  }

  // Validate anon key format (should be a JWT)
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    envStatus.validation.anonKeyIsValid = anonKey.startsWith('eyJ') && anonKey.length > 100
    
    if (!envStatus.validation.anonKeyIsValid) {
      if (anonKey === 'anon-key') {
        envStatus.validation.anonKeyError = 'Using placeholder value "anon-key"'
      } else if (anonKey.length < 100) {
        envStatus.validation.anonKeyError = 'Key too short - likely placeholder'
      } else if (!anonKey.startsWith('eyJ')) {
        envStatus.validation.anonKeyError = 'Does not look like JWT token'
      }
    }
  }

  // Check if values look real
  envStatus.validation.valuesLookReal = 
    envStatus.validation.urlIsValid && 
    envStatus.validation.anonKeyIsValid &&
    process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('.supabase.co')

  // Test Supabase connection if values look valid
  if (envStatus.validation.valuesLookReal) {
    envStatus.connectionTest = 'Values look valid - connection test would be performed here'
  } else {
    envStatus.connectionTest = 'Cannot test - invalid values detected'
  }

  // Add specific error diagnosis
  envStatus.diagnosis = []
  
  if (!envStatus.supabase.hasUrl) {
    envStatus.diagnosis.push('❌ NEXT_PUBLIC_SUPABASE_URL is missing')
  } else if (!envStatus.validation.urlIsValid) {
    envStatus.diagnosis.push('❌ NEXT_PUBLIC_SUPABASE_URL has invalid format')
  } else if (!process.env.NEXT_PUBLIC_SUPABASE_URL.includes('.supabase.co')) {
    envStatus.diagnosis.push('⚠️ NEXT_PUBLIC_SUPABASE_URL does not point to Supabase')
  } else {
    envStatus.diagnosis.push('✅ NEXT_PUBLIC_SUPABASE_URL looks valid')
  }

  if (!envStatus.supabase.hasAnonKey) {
    envStatus.diagnosis.push('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing')
  } else if (!envStatus.validation.anonKeyIsValid) {
    envStatus.diagnosis.push(`❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is invalid: ${envStatus.validation.anonKeyError}`)
  } else {
    envStatus.diagnosis.push('✅ NEXT_PUBLIC_SUPABASE_ANON_KEY looks valid')
  }

  if (!envStatus.validation.valuesLookReal) {
    envStatus.diagnosis.push('🔧 SOLUTION: Update environment variables in Vercel with real Supabase credentials')
    envStatus.diagnosis.push('📍 Get credentials from: https://supabase.com/dashboard → Your Project → Settings → API')
  }

  res.status(200).json(envStatus)
}