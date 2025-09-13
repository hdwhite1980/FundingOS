import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Load environment variables manually from .env.local file
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8')
    const envLines = envContent.split('\n')
    
    envLines.forEach(line => {
      const [key, value] = line.split('=')
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseServiceKey = value
    })
  } catch (error) {
    console.log('Could not read .env.local file, using environment variables')
  }
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  try {
    console.log('🔄 Starting migration: Adding ai_completion_data column...')
    
    // SQL to add the column
    const sql = `
      ALTER TABLE submissions 
      ADD COLUMN IF NOT EXISTS ai_completion_data JSONB 
      DEFAULT '{}'::jsonb;

      COMMENT ON COLUMN submissions.ai_completion_data IS 'AI completion data and form field analysis';
    `
    
    console.log('⚠️  Manual migration required. Please run this SQL in your Supabase dashboard:')
    console.log('---')
    console.log(sql.trim())
    console.log('---')
    console.log('📋 Steps:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy and run the above SQL query')
    console.log('4. This will add the ai_completion_data column to the submissions table')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

runMigration()