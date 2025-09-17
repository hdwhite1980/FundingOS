// Test API endpoint to verify Vercel environment variables
export default function handler(req, res) {
  try {
    const result = {
      // Environment info
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      
      // Supabase variables (boolean check)
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      
      // Partial values for verification (safe to show)
      supabaseUrlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 25) + '...',
      anonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      
      // Other important variables
      hasOpenAiKey: !!process.env.OPENAI_API_KEY,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      
      // Status summary
      supabaseConfigured: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      allRequiredVarsPresent: !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL && 
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && 
        process.env.SUPABASE_SERVICE_ROLE_KEY &&
        process.env.OPENAI_API_KEY &&
        process.env.NEXTAUTH_SECRET
      )
    };
    
    // Add diagnostic info
    if (!result.supabaseConfigured) {
      result.error = 'Supabase environment variables are missing or incomplete';
      result.diagnosis = 'This is likely why you are getting "supabaseKey is required" error';
    } else {
      result.success = 'Supabase configuration appears correct';
    }
    
    res.status(200).json(result);
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to check environment variables',
      message: error.message 
    });
  }
}