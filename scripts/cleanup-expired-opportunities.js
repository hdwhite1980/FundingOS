// scripts/cleanup-expired-opportunities.js
// Removes or hides expired grants from the shared opportunities table

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function cleanupExpiredOpportunities() {
  try {
    // Find all opportunities with a fixed deadline in the past
    const { data: expired, error } = await supabase
      .from('opportunities')
      .select('id, deadline_date, status')
      .eq('deadline_type', 'fixed')
      .lt('deadline_date', new Date().toISOString())
      .eq('status', 'active')

    if (error) {
      console.error('Error finding expired opportunities:', error)
      return
    }

    if (expired.length === 0) {
      console.log('No expired opportunities to clean up.')
      return
    }

    // Mark expired opportunities as inactive
    const ids = expired.map(o => o.id)
    const { error: updateError } = await supabase
      .from('opportunities')
      .update({ status: 'expired' })
      .in('id', ids)

    if (updateError) {
      console.error('Error updating expired opportunities:', updateError)
    } else {
      console.log(`Marked ${ids.length} expired opportunities as inactive.`)
    }
  } catch (error) {
    console.error('Cleanup error:', error)
  }
}

cleanupExpiredOpportunities()
