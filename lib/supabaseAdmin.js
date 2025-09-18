// lib/supabaseAdmin.js
// Server-side Supabase client using service role key (no RLS restrictions).
// NEVER import this in client components.

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL for admin client')
}
if (!serviceRoleKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY not set – admin operations will fail')
}

export const supabaseAdmin = createClient(url, serviceRoleKey || 'invalid-key', {
  auth: { autoRefreshToken: false, persistSession: false }
})
