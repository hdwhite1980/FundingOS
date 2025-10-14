// Service role API endpoint for application/submission creation
// This bypasses RLS issues by using service role authentication
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Create service role client that bypasses RLS
const getSupabaseServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function POST(request) {
  try {
    console.log('🔧 Application creation API endpoint called')
    
    // Get the request data
    const applicationData = await request.json()
    console.log('📝 Application data received:', applicationData)

    // Get user ID from the request (passed from frontend)
    const { user_id, ...applicationFields } = applicationData
    
    if (!user_id) {
      console.error('❌ No user_id provided')
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Create service role client (bypasses RLS)
    const supabase = getSupabaseServiceClient()
    
    // Handle opportunity_id requirement
    let finalOpportunityId = applicationFields.opportunity_id
    
    if (!finalOpportunityId) {
      console.log('🔍 No opportunity_id provided, finding or creating opportunity')
      
      // Check if this is an AI-Enhanced application with opportunity details
      const isAIEnhanced = applicationFields.opportunity_title?.includes('AI-') || 
                          applicationFields.ai_completion_data
      
      if (isAIEnhanced && applicationFields.opportunity_title && 
          applicationFields.opportunity_title !== 'Manual Entry') {
        // Create opportunity from AI-Enhanced application data
        console.log('🤖 Creating opportunity from AI-Enhanced application:', applicationFields.opportunity_title)
        
        const { data: newOpportunity, error: createError } = await supabase
          .from('opportunities')
          .insert([{
            title: applicationFields.opportunity_title,
            sponsor: applicationFields.sponsor || 'Unknown Sponsor',
            source: 'ai_enhanced_tracker',
            external_id: `ai-enhanced-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            amount_min: applicationFields.submitted_amount ? applicationFields.submitted_amount * 0.8 : 0,
            amount_max: applicationFields.submitted_amount || 1000000,
            description: `AI-Enhanced application tracker submission: ${applicationFields.opportunity_title}`,
            category: 'grant',
            created_at: new Date().toISOString()
          }])
          .select('id')
          .single()
        
        if (createError) {
          console.error('❌ Failed to create AI opportunity:', createError)
          return NextResponse.json(
            { 
              error: 'Failed to create opportunity from application', 
              details: createError.message 
            },
            { status: 500 }
          )
        }
        
        finalOpportunityId = newOpportunity.id
        console.log(`✅ Created AI-Enhanced opportunity: ${finalOpportunityId}`)
      } else {
        // Try to find existing default opportunity
        const { data: defaultOpportunity, error: findError } = await supabase
          .from('opportunities')
          .select('id')
          .eq('title', 'Manual Entry - Default Opportunity')
          .eq('external_id', 'manual-default-opportunity')
          .single()
        
        if (defaultOpportunity && !findError) {
          finalOpportunityId = defaultOpportunity.id
          console.log(`✅ Using existing default opportunity: ${finalOpportunityId}`)
        } else {
          // Create default opportunity
          console.log('➕ Creating default opportunity for manual entries')
          const { data: newOpportunity, error: createError } = await supabase
            .from('opportunities')
            .insert([{
              title: 'Manual Entry - Default Opportunity',
              sponsor: 'Manual Entry',
              source: 'manual',
              external_id: 'manual-default-opportunity', // Use consistent external_id
              amount_min: 0,
              amount_max: 1000000,
              description: 'Default opportunity for manually tracked applications',
              created_at: new Date().toISOString()
            }])
            .select('id')
            .single()
          
          if (createError) {
            console.error('❌ Failed to create default opportunity:', createError)
            return NextResponse.json(
              { 
                error: 'Failed to create default opportunity', 
                details: createError.message 
              },
              { status: 500 }
            )
          }
          
          finalOpportunityId = newOpportunity.id
          console.log(`✅ Created default opportunity: ${finalOpportunityId}`)
        }
      }
    }
    
    // Prepare application data with proper timestamps and required opportunity_id
    const newApplication = {
      ...applicationFields,
      user_id: user_id,
      opportunity_id: finalOpportunityId, // Ensure this is always set
      status: applicationFields.status || 'submitted',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log('💾 Inserting application with service role and opportunity_id:', finalOpportunityId)

    // Insert application using service role (bypasses RLS)
    const { data, error } = await supabase
      .from('submissions')
      .insert([newApplication])
      .select()
      .single()

    if (error) {
      console.error('❌ Application creation error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to create application', 
          details: error.message,
          code: error.code 
        },
        { status: 500 }
      )
    }

    console.log('✅ Application created successfully:', data.id)
    return NextResponse.json({ success: true, application: data })

  } catch (error) {
    console.error('❌ API endpoint error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}