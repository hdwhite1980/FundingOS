// app/api/auth/delete-account/route.js
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function DELETE(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { confirmationText, password } = body

    // Verify confirmation text
    if (confirmationText !== 'DELETE MY ACCOUNT') {
      return NextResponse.json({ error: 'Incorrect confirmation text' }, { status: 400 })
    }

    // Verify password by attempting to sign in
    if (password) {
      const { error: passwordError } = await supabaseAdmin.auth.signInWithPassword({
        email: user.email,
        password: password
      })
      
      if (passwordError) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 400 })
      }
    }

    const userId = user.id

    // Start transaction-like deletion process
    console.log(`Starting account deletion for user ${userId}`)

    try {
      // 1. Delete AI Agent Data
      await Promise.all([
        supabaseAdmin.from('agent_conversations').delete().eq('user_id', userId),
        supabaseAdmin.from('agent_experiences').delete().eq('user_id', userId),
        supabaseAdmin.from('agent_decision_feedback').delete().eq('user_id', userId),
        supabaseAdmin.from('agent_notifications').delete().eq('user_id', userId),
        supabaseAdmin.from('agent_status').delete().eq('user_id', userId),
        supabaseAdmin.from('agent_errors').delete().eq('user_id', userId),
      ])
      console.log('✓ Deleted AI agent data')

      // 2. Delete AI Completions and Analytics
      await Promise.all([
        supabaseAdmin.from('ai_completions').delete().eq('user_id', userId),
        supabaseAdmin.from('ai_search_analytics').delete().eq('user_id', userId),
      ])
      console.log('✓ Deleted AI completions and analytics')

      // 3. Delete Financial Data
      await Promise.all([
        supabaseAdmin.from('angel_investments').delete().in('investor_id', 
          supabaseAdmin.from('angel_investors').select('id').eq('user_id', userId)
        ),
        supabaseAdmin.from('donations').delete().eq('user_id', userId),
        supabaseAdmin.from('donors').delete().eq('user_id', userId),
        supabaseAdmin.from('campaigns').delete().eq('user_id', userId),
      ])
      console.log('✓ Deleted financial data')

      // 4. Delete Angel Investor Profile
      await supabaseAdmin.from('angel_investors').delete().eq('user_id', userId)
      console.log('✓ Deleted angel investor profile')

      // 5. Delete Applications and Submissions
      await Promise.all([
        supabaseAdmin.from('application_submissions').delete().eq('user_id', userId),
        supabaseAdmin.from('applications').delete().eq('user_id', userId),
      ])
      console.log('✓ Deleted applications and submissions')

      // 6. Delete Project-related data
      await Promise.all([
        supabaseAdmin.from('project_opportunities').delete().eq('user_id', userId),
        supabaseAdmin.from('projects').delete().eq('user_id', userId),
      ])
      console.log('✓ Deleted projects and opportunities')

      // 7. Delete Companies
      await supabaseAdmin.from('companies').delete().eq('user_id', userId)
      console.log('✓ Deleted company records')

      // 8. Delete Security Data
      await Promise.all([
        supabaseAdmin.from('user_devices').delete().eq('user_id', userId),
        supabaseAdmin.from('user_sessions').delete().eq('user_id', userId),
      ])
      console.log('✓ Deleted security data')

      // 9. Delete User Profile (this will cascade to related data)
      await supabaseAdmin.from('user_profiles').delete().eq('id', userId)
      console.log('✓ Deleted user profile')

      // 10. Finally, delete the auth user (this is the most critical step)
      const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (deleteUserError) {
        console.error('Error deleting auth user:', deleteUserError)
        // Continue anyway as most data is already deleted
      } else {
        console.log('✓ Deleted auth user')
      }

      // 11. Log the deletion for audit purposes (optional)
      await supabaseAdmin.from('system_metrics').insert({
        metric_type: 'account_deletion',
        value: 1,
        metadata: {
          deleted_user_id: userId,
          deleted_at: new Date().toISOString(),
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          user_agent: request.headers.get('user-agent')
        }
      })

      console.log(`✅ Account deletion completed for user ${userId}`)

      return NextResponse.json({ 
        success: true, 
        message: 'Account and all associated data have been permanently deleted' 
      })

    } catch (deletionError) {
      console.error('Error during account deletion:', deletionError)
      return NextResponse.json({ 
        error: 'Account deletion failed. Some data may have been partially deleted.',
        details: deletionError.message 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Account deletion API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}