import { NextResponse } from 'next/server'

async function getSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase environment variables are not set')
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey)
}

export async function POST(request) {
  try {
    const supabase = await getSupabaseClient()
    const { userId, projectId, investmentAmount } = await request.json()

    if (!userId || !projectId || !investmentAmount) {
      return NextResponse.json({ 
        error: 'User ID, project ID, and investment amount required' 
      }, { status: 400 })
    }

    // Validate investment amount
    if (investmentAmount <= 0) {
      return NextResponse.json({ 
        error: 'Investment amount must be greater than 0' 
      }, { status: 400 })
    }

    // Get angel investor
    const { data: investor, error: investorError } = await supabase
      .from('angel_investors')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (investorError && investorError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Investor not found' }, { status: 404 })
    }
    if (!investor) {
      return NextResponse.json({ error: 'Investor not found' }, { status: 404 })
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*, companies(*)')
      .eq('id', projectId)
      .maybeSingle()

    if (projectError && projectError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Validate project is seeking investment
    if (!project.seeking_investment) {
      return NextResponse.json({ 
        error: 'Project is not currently seeking investment' 
      }, { status: 400 })
    }

    // Check if funding goal would be exceeded
    const newTotalRaised = (project.amount_raised || 0) + investmentAmount
    if (project.funding_goal && newTotalRaised > project.funding_goal) {
      return NextResponse.json({ 
        error: 'Investment would exceed funding goal' 
      }, { status: 400 })
    }

    // Check for duplicate investments (optional business rule)
    const { data: existingInvestment } = await supabase
      .from('angel_investments')
      .select('id')
      .eq('investor_id', userId)
      .eq('project_id', projectId)
      .maybeSingle()

    if (existingInvestment) {
      return NextResponse.json({ 
        error: 'You have already invested in this project' 
      }, { status: 400 })
    }

    // Create investment record
    const { data: investment, error: investmentError } = await supabase
      .from('angel_investments')
      .insert({
        investor_id: userId,
        project_id: projectId,
        investment_amount: investmentAmount,
        status: 'active'
      })
      .select()
      .single()

    if (investmentError) {
      return NextResponse.json({ error: investmentError.message }, { status: 400 })
    }

    // Update project's raised amount
    const { error: updateProjectError } = await supabase
      .from('projects')
      .update({
        amount_raised: newTotalRaised
      })
      .eq('id', projectId)

    if (updateProjectError) {
      console.error('Failed to update project raised amount:', updateProjectError)
    }

    // Send notification email (integrate with your existing email service)
    try {
      await sendInvestmentConfirmationEmail(investor.email || '', project.name, investmentAmount)
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError)
      // Don't fail the investment for email errors
    }

    // Log the investment for analytics
    console.log(`Investment completed: ${investor.name} invested $${investmentAmount} in ${project.name}`)

    return NextResponse.json({ 
      success: true, 
      investment,
      message: 'Investment completed successfully',
      project: {
        name: project.name,
        newTotalRaised
      }
    })

  } catch (error) {
    console.error('Investment API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Helper function for email notifications
async function sendInvestmentConfirmationEmail(investorEmail, projectName, amount) {
  // Integrate with your existing email service (SendGrid, AWS SES, etc.)
  const emailContent = {
    to: investorEmail,
    subject: `Investment Confirmation - ${projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Investment Confirmed</h2>
        <p>Your investment of <strong>$${amount.toLocaleString()}</strong> in <strong>${projectName}</strong> has been successfully processed.</p>
        <p>You can track your investment performance in your WALI-OS angel investor dashboard.</p>
        <div style="margin-top: 30px; padding: 20px; background-color: #f3f4f6; border-radius: 8px;">
          <h3 style="margin: 0 0 10px 0; color: #374151;">Next Steps:</h3>
          <ul style="margin: 0; color: #6b7280;">
            <li>Monitor your investment performance in the dashboard</li>
            <li>Receive regular updates from ${projectName}</li>
            <li>Access quarterly reports and project updates</li>
          </ul>
        </div>
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
          Thank you for investing with WALI-OS!
        </p>
      </div>
    `
  }
  
  // Replace this with your actual email service implementation
  // await sendEmail(emailContent)
  console.log('Investment confirmation email queued for:', investorEmail)
}