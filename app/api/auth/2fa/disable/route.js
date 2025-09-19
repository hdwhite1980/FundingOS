export const dynamic = 'force-dynamic'
// app/api/auth/2fa/disable/route.js
import { NextResponse } from 'next/server'
import { getVercelAuth } from '../../../../../lib/vercelAuthHelper'

export async function POST(request) {
  try {
    const { supabase, user } = await getVercelAuth()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Disable 2FA for the user
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_backup_codes: null,
        two_factor_secret_temp: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error disabling 2FA:', updateError)
      return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('2FA disable API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}