// app/api/ai/extract-compliance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Extract compliance requirements, deadlines, and reporting obligations from application documents
 * POST /api/ai/extract-compliance
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      documentText,
      formStructure,
      applicationData,
      opportunityInfo
    } = body;

    if (!documentText && !formStructure) {
      return NextResponse.json(
        { error: 'Document text or form structure is required' },
        { status: 400 }
      );
    }

    // Construct the analysis prompt
    const analysisPrompt = `You are a compliance expert analyzing grant/funding application documents. Extract ALL compliance requirements, deadlines, and reporting obligations from this application.

APPLICATION INFORMATION:
${opportunityInfo ? `
Opportunity: ${opportunityInfo.title || 'Unknown'}
Funder: ${opportunityInfo.funder || 'Unknown'}
Amount: ${opportunityInfo.amount || 'Unknown'}
` : ''}

DOCUMENT CONTENT:
${documentText || JSON.stringify(formStructure, null, 2)}

${applicationData ? `
SUBMITTED APPLICATION DATA:
${JSON.stringify(applicationData, null, 2)}
` : ''}

Please analyze this document and extract:

1. POST-AWARD COMPLIANCE REQUIREMENTS
   - Report types required (progress reports, financial reports, etc.)
   - Reporting frequency (monthly, quarterly, annually)
   - Specific deadlines or due dates
   - Required documentation
   - Performance metrics that must be tracked

2. DOCUMENT REQUIREMENTS
   - Required certificates or registrations (SAM.gov, DUNS, etc.)
   - Insurance requirements
   - Audit requirements
   - Licenses or permits needed
   - Expiration dates for any documents

3. RECURRING OBLIGATIONS
   - Regular reporting schedules
   - Review meetings or check-ins
   - Site visits or monitoring requirements
   - Renewal requirements

4. CRITICAL DEADLINES
   - Application submission deadlines
   - Project start/end dates
   - Report submission dates
   - Any other time-sensitive requirements

5. SPECIAL CONDITIONS OR RESTRICTIONS
   - Spending restrictions
   - Procurement requirements
   - Record retention requirements
   - Matching fund requirements

Return your analysis in the following JSON format:
{
  "compliance_tracking_items": [
    {
      "title": "Quarterly Progress Report",
      "compliance_type": "grant_reporting",
      "description": "Submit detailed progress report covering project milestones and outcomes",
      "priority": "high",
      "deadline_date": "2025-12-31",
      "frequency": "quarterly",
      "estimated_hours": 8,
      "notes": "Must include financial data and performance metrics"
    }
  ],
  "compliance_documents": [
    {
      "document_type": "sam_registration",
      "document_name": "SAM.gov Active Registration",
      "is_required": true,
      "expiration_date": "2026-06-30",
      "notes": "Must maintain active registration throughout grant period"
    }
  ],
  "compliance_recurring": [
    {
      "name": "Monthly Financial Report",
      "compliance_type": "grant_reporting",
      "description": "Monthly financial reconciliation and expense report",
      "frequency": "monthly",
      "frequency_interval": 1,
      "reminder_days": 7,
      "estimated_hours": 4
    }
  ],
  "critical_deadlines": [
    {
      "deadline": "2025-11-15",
      "description": "Application submission deadline",
      "type": "application_deadline"
    }
  ],
  "special_conditions": [
    {
      "condition": "Match requirement",
      "description": "25% cash match required",
      "category": "financial"
    }
  ],
  "summary": {
    "total_requirements": 15,
    "reporting_frequency": "quarterly",
    "audit_required": true,
    "complexity_level": "moderate"
  }
}

Be thorough and extract every compliance requirement mentioned. If specific dates aren't mentioned, note the timing relative to award (e.g., "30 days after award", "quarterly"). For priorities, use: low, medium, high, or critical based on consequences of missing the requirement.`;

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.3, // Lower temperature for more consistent extraction
      messages: [
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
    });

    // Extract the response text
    const responseText = message.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

    // Parse JSON response
    let complianceData;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                       responseText.match(/```\n([\s\S]*?)\n```/);
      
      const jsonText = jsonMatch ? jsonMatch[1] : responseText;
      complianceData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse compliance JSON:', parseError);
      console.error('Response text:', responseText);
      
      // Return a structured error response
      return NextResponse.json({
        success: false,
        error: 'Failed to parse AI response',
        rawResponse: responseText,
        complianceData: {
          compliance_tracking_items: [],
          compliance_documents: [],
          compliance_recurring: [],
          critical_deadlines: [],
          special_conditions: [],
          summary: {
            total_requirements: 0,
            reporting_frequency: 'unknown',
            audit_required: false,
            complexity_level: 'unknown'
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      complianceData,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
    });

  } catch (error: any) {
    console.error('Compliance extraction error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to extract compliance requirements',
      },
      { status: 500 }
    );
  }
}
