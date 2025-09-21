import { NextRequest, NextResponse } from 'next/server'
import aiProviderService from '../../../../lib/aiProviderService'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

// AI-powered field analyzer endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fieldName, formContext = {}, userContext = {}, userId } = body

    if (!fieldName) {
      return NextResponse.json({ 
        success: false, 
        error: 'fieldName is required' 
      }, { status: 400 })
    }

    console.log(`Field analyzer request: "${fieldName}" with context:`, { formContext, userContext })

    // Check cache first
    const cacheKey = normalizeFieldName(fieldName)
    const cachedDefinition = await getCachedDefinition(cacheKey)
    
    if (cachedDefinition && !isStale(cachedDefinition)) {
      console.log(`Using cached definition for: ${fieldName}`)
      
      // Update usage count
      await updateUsageCount(cacheKey)
      
      return NextResponse.json({ 
        success: true, 
        analysis: cachedDefinition.definition,
        cached: true,
        lastUpdated: cachedDefinition.last_updated
      })
    }

    // Generate new definition with AI
    const systemPrompt = `You are an expert in grant applications and form completion. Analyze the field name and provide a helpful definition.

Context about this field:
- Field name: "${fieldName}"
- Form type: ${formContext?.formType || 'Unknown'}
- Available fields: ${formContext?.availableFields?.slice(0, 10).join(', ') || 'Unknown'}
- User's organization: ${userContext?.organizationType || 'Unknown'}
- User's project type: ${userContext?.projectType || 'Unknown'}
- Organization name: ${userContext?.organizationName || 'Unknown'}
- Has EIN: ${userContext?.hasEIN ? 'Yes' : 'No'}

Provide a JSON response with:
{
  "definition": "Clear, concise explanation of what this field means (2-3 sentences max)",
  "purpose": "Why this field exists in the form (1-2 sentences)", 
  "expectedFormat": "What format/type of answer should go here",
  "commonExamples": ["specific example 1", "specific example 2"],
  "tips": ["actionable tip 1", "actionable tip 2", "actionable tip 3"],
  "relatedFields": ["field1", "field2"],
  "contextSpecificGuidance": "Advice specific to their organization/project type"
}

Focus on being specific and actionable, not generic. If this is a common grant field, reference standard practices. Make tips concrete and implementable.`

    const userPrompt = `Analyze this field: "${fieldName}"`

    try {
      console.log('Calling AI for field analysis...')
      
      const response = await aiProviderService.generateCompletion('field-analysis', [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], { 
        temperature: 0.3, 
        maxTokens: 600 
      })

      if (!response || !response.content) {
        throw new Error('No response from AI provider')
      }

      // Parse AI response
      const analysis = aiProviderService.safeParseJSON(response.content)
      
      if (!analysis || typeof analysis !== 'object') {
        throw new Error('Failed to parse AI response as JSON')
      }

      // Validate required fields
      if (!analysis.definition || !analysis.purpose) {
        throw new Error('AI response missing required fields')
      }

      // Cache the result
      await cacheFieldDefinition(cacheKey, analysis, userId)
      
      console.log(`Generated and cached field definition for: ${fieldName}`)
      
      return NextResponse.json({ 
        success: true, 
        analysis,
        cached: false,
        generatedAt: new Date().toISOString()
      })

    } catch (aiError) {
      console.warn('AI field analysis failed, using fallback:', aiError.message)
      
      // Generate fallback definition
      const fallback = generateFallbackDefinition(fieldName, formContext, userContext)
      
      // Cache fallback with lower priority
      await cacheFieldDefinition(cacheKey, fallback, userId, true)
      
      return NextResponse.json({ 
        success: true, 
        analysis: fallback,
        cached: false,
        fallback: true,
        aiError: aiError.message
      })
    }

  } catch (error: any) {
    console.error('Field analyzer error:', error)
    
    const fallbackFieldName = request ? await request.json().catch(() => ({})).then(b => b?.fieldName) : null
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to analyze field',
      fallback: generateFallbackDefinition(fallbackFieldName || 'unknown_field')
    }, { status: 500 })
  }
}

// Normalize field names for consistent caching
function normalizeFieldName(fieldName: string): string {
  return fieldName.toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

// Get cached definition
async function getCachedDefinition(cacheKey: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('field_definitions_cache')
      .select('*')
      .eq('field_name', cacheKey)
      .single()
    
    if (error) return null
    return data
  } catch (error) {
    console.warn('Failed to get cached definition:', error)
    return null
  }
}

// Check if cached definition is stale (older than 7 days)
function isStale(cachedDefinition: any): boolean {
  if (!cachedDefinition.last_updated) return true
  
  const lastUpdated = new Date(cachedDefinition.last_updated)
  const now = new Date()
  const daysDiff = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
  
  return daysDiff > 7
}

// Update usage count for cached items
async function updateUsageCount(cacheKey: string) {
  try {
    await supabaseAdmin
      .from('field_definitions_cache')
      .update({ 
        usage_count: supabaseAdmin.rpc('increment_usage_count'),
        last_accessed: new Date().toISOString()
      })
      .eq('field_name', cacheKey)
  } catch (error) {
    console.warn('Failed to update usage count:', error)
  }
}

// Cache field definition with learning capabilities
async function cacheFieldDefinition(
  cacheKey: string, 
  analysis: any, 
  userId?: string, 
  isFallback: boolean = false
) {
  try {
    // Get existing cache to preserve usage count
    const existing = await getCachedDefinition(cacheKey)
    
    await supabaseAdmin
      .from('field_definitions_cache')
      .upsert({
        field_name: cacheKey,
        definition: analysis,
        last_updated: new Date().toISOString(),
        last_accessed: new Date().toISOString(),
        usage_count: (existing?.usage_count || 0) + 1,
        user_id: userId || null,
        is_fallback: isFallback,
        quality_score: isFallback ? 0.5 : 0.9
      })
  } catch (error) {
    console.warn('Failed to cache field definition:', error)
  }
}

// Generate intelligent fallback definitions
function generateFallbackDefinition(
  fieldName: string, 
  formContext: any = {}, 
  userContext: any = {}
): any {
  const normalized = fieldName.toLowerCase()
  
  // Pattern-based fallbacks for common field types
  if (normalized.includes('submit') || normalized.includes('status')) {
    return {
      definition: `The "${fieldName}" field tracks submission or status information for your application.`,
      purpose: 'Helps manage application workflow and tracking',
      expectedFormat: 'Select from dropdown options or enter status update',
      commonExamples: ['Submitted', 'In Review', 'Draft', 'Approved'],
      tips: [
        'Update this field to reflect current status',
        'Be accurate with dates and status changes',
        'Keep status information current for tracking'
      ],
      relatedFields: ['submission_date', 'review_status'],
      contextSpecificGuidance: 'Check with your organization\'s process for status updates'
    }
  }
  
  if (normalized.includes('period') || normalized.includes('duration') || normalized.includes('timeline')) {
    return {
      definition: `The "${fieldName}" field specifies a time period or duration for your project.`,
      purpose: 'Defines timeframes for project planning and funding allocation',
      expectedFormat: 'Date ranges, number of months/years, or specific periods',
      commonExamples: ['12 months', 'January 2025 - December 2025', '18-month period'],
      tips: [
        'Be realistic with timelines based on project scope',
        'Align with project milestones and deliverables',
        'Consider approval and setup time in your timeline'
      ],
      relatedFields: ['start_date', 'end_date', 'project_timeline'],
      contextSpecificGuidance: `For ${userContext.projectType || 'your project'} projects, typical durations range from 6-24 months`
    }
  }
  
  if (normalized.includes('budget') || normalized.includes('amount') || normalized.includes('cost')) {
    return {
      definition: `The "${fieldName}" field requires financial information related to your project budget.`,
      purpose: 'Provides funding details necessary for grant evaluation and award decisions',
      expectedFormat: 'Dollar amounts, budget breakdowns, or cost estimates',
      commonExamples: ['$50,000', '$125,500 (Personnel: $100,000, Equipment: $25,500)', 'Total Project Cost: $200,000'],
      tips: [
        'Provide detailed budget justification when possible',
        'Ensure amounts are realistic and well-researched',
        'Include matching funds or in-kind contributions if applicable'
      ],
      relatedFields: ['total_budget', 'matching_funds', 'cost_breakdown'],
      contextSpecificGuidance: `${userContext.organizationType || 'Organizations'} typically include indirect costs of 10-25%`
    }
  }
  
  if (normalized.includes('description') || normalized.includes('summary') || normalized.includes('narrative')) {
    return {
      definition: `The "${fieldName}" field requires a detailed description or narrative about your project.`,
      purpose: 'Provides reviewers with essential information to understand and evaluate your proposal',
      expectedFormat: 'Clear, compelling narrative with specific details and examples',
      commonExamples: ['Project addresses urban food insecurity by...', 'Our organization will implement...'],
      tips: [
        'Be specific about goals, methods, and expected outcomes',
        'Include quantifiable metrics and target populations',
        'Tell a compelling story while staying factual'
      ],
      relatedFields: ['project_goals', 'target_population', 'expected_outcomes'],
      contextSpecificGuidance: `For ${userContext.projectType || 'your'} projects, focus on community impact and measurable results`
    }
  }
  
  if (normalized.includes('organization') || normalized.includes('applicant')) {
    return {
      definition: `The "${fieldName}" field requires information about your organization or entity applying for funding.`,
      purpose: 'Establishes your organization\'s identity, credibility, and eligibility for the grant',
      expectedFormat: 'Official organization name, details, and identifying information',
      commonExamples: [userContext.organizationName || 'Your Organization Name', 'EIN: 12-3456789', 'Nonprofit 501(c)(3)'],
      tips: [
        'Use your organization\'s legal, registered name',
        'Ensure information matches your tax documents',
        'Include relevant certifications or designations'
      ],
      relatedFields: ['ein', 'organization_type', 'tax_status'],
      contextSpecificGuidance: `As a ${userContext.organizationType || 'organization'}, include your EIN and tax-exempt status if applicable`
    }
  }
  
  // Generic fallback for unrecognized fields
  return {
    definition: `The "${fieldName}" field requires specific information for your grant application.`,
    purpose: 'Provides necessary details for complete application evaluation',
    expectedFormat: 'Follow any specific formatting requirements or examples provided',
    commonExamples: ['Refer to form instructions for examples'],
    tips: [
      'Check form instructions for specific requirements',
      'Be clear, specific, and accurate in your response',
      'Review similar successful applications if available'
    ],
    relatedFields: [],
    contextSpecificGuidance: 'Consult the grant guidelines or contact the funder for clarification if needed'
  }
}