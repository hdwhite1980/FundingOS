import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Supabase environment variables are not set')
}

const supabase = createClient(
  supabaseUrl,
  supabaseServiceRoleKey
)

export async function POST(request) {
  try {
    const { userId, companyId, investmentAmount } = await request.json()

    if (!userId || !companyId || !investmentAmount) {
      return NextResponse.json({ 
        error: 'User ID, company ID, and investment amount required' 
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
      .single()

    if (investorError) {
      return NextResponse.json({ error: 'Investor not found' }, { status: 404 })
    }

    // Check if investor is accredited (optional business rule)
    if (!investor.accredited_status) {
      console.warn(`Non-accredited investor ${investor.id} attempting investment`)
      // You can choose to block this or allow with warnings
    }

    // Get company details
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (companyError) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Validate company is seeking investment
    if (!company.seeking_investment) {
      return NextResponse.json({ 
        error: 'Company is not currently seeking investment' 
      }, { status: 400 })
    }

    // Validate minimum investment amount
    if (company.minimum_investment && investmentAmount < company.minimum_investment) {
      return NextResponse.json({ 
        error: `Minimum investment is $${company.minimum_investment.toLocaleString()}` 
      }, { status: 400 })
    }

    // Check if funding goal would be exceeded
    const newTotalRaised = (company.amount_raised || 0) + investmentAmount
    if (company.funding_goal && newTotalRaised > company.funding_goal) {
      return NextResponse.json({ 
        error: 'Investment would exceed funding goal' 
      }, { status: 400 })
    }

    // Check for duplicate investments (optional business rule)
    const { data: existingInvestment } = await supabase
      .from('angel_investments')
      .select('id')
      .eq('investor_id', investor.id)
      .eq('company_id', companyId)
      .single()

    if (existingInvestment) {
      return NextResponse.json({ 
        error: 'You have already invested in this company' 
      }, { status: 400 })
    }

    // Create investment record
    const { data: investment, error: investmentError } = await supabase
      .from('angel_investments')
      .insert({
        investor_id: investor.id,
        company_id: companyId,
        investment_amount: investmentAmount,
        current_value: investmentAmount, // Initial value equals investment
        roi_percentage: 0,
        status: 'active'
      })
      .select()
      .single()

    if (investmentError) {
      return NextResponse.json({ error: investmentError.message }, { status: 400 })
    }

    // Update company's raised amount
    const { error: updateCompanyError } = await supabase
      .from('companies')
      .update({
        amount_raised: newTotalRaised
      })
      .eq('id', companyId)

    if (updateCompanyError) {
      console.error('Failed to update company raised amount:', updateCompanyError)
    }

    // Send notification email (integrate with your existing email service)
    try {
      await sendInvestmentConfirmationEmail(investor.email, company.name, investmentAmount)
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError)
      // Don't fail the investment for email errors
    }

    // Log the investment for analytics
    console.log(`Investment completed: ${investor.name} invested $${investmentAmount} in ${company.name}`)

    return NextResponse.json({ 
      success: true, 
      investment,
      message: 'Investment completed successfully',
      company: {
        name: company.name,
        newTotalRaised
      }
    })

  } catch (error) {
    console.error('Investment API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Helper function for email notifications
async function sendInvestmentConfirmationEmail(investorEmail, companyName, amount) {
  // Integrate with your existing email service (SendGrid, AWS SES, etc.)
  const emailContent = {
    to: investorEmail,
    subject: `Investment Confirmation - ${companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Investment Confirmed</h2>
        <p>Your investment of <strong>$${amount.toLocaleString()}</strong> in <strong>${companyName}</strong> has been successfully processed.</p>
        <p>You can track your investment performance in your FundingOS angel investor dashboard.</p>
        <div style="margin-top: 30px; padding: 20px; background-color: #f3f4f6; border-radius: 8px;">
          <h3 style="margin: 0 0 10px 0; color: #374151;">Next Steps:</h3>
          <ul style="margin: 0; color: #6b7280;">
            <li>Monitor your investment performance in the dashboard</li>
            <li>Receive regular updates from ${companyName}</li>
            <li>Access quarterly reports and company updates</li>
          </ul>
        </div>
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
          Thank you for investing with FundingOS!
        </p>
      </div>
    `
  }
  
  // Replace this with your actual email service implementation
  // await sendEmail(emailContent)
  console.log('Investment confirmation email queued for:', investorEmail)
}