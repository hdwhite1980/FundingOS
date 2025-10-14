// app/api/ai/extract-compliance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

/**
 * Extract compliance requirements, deadlines, and reporting obligations from application documents
 * POST /api/ai/extract-compliance
 */
export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      return NextResponse.json(
        { 
          success: false,
          error: 'AI service not configured. Please contact support.',
          complianceData: {
            compliance_tracking_items: [],
            compliance_documents: [],
            compliance_recurring: [],
            critical_deadlines: [],
            special_conditions: [],
            summary: {
              total_requirements: 0,
              required_items: 0,
              optional_items: 0,
              reporting_frequency: 'unknown',
              audit_required: false,
              complexity_level: 'unknown'
            }
          }
        },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

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

    console.log('📝 Processing compliance extraction...');
    console.log('Document text length:', documentText?.length || 0);
    console.log('Form structure provided:', !!formStructure);

    // Construct the analysis prompt
    const analysisPrompt = `You are a compliance expert analyzing grant/funding application documents. Extract EVERY compliance requirement, document, deadline, and reporting obligation from this application.

🎯 EXTRACTION STRATEGY:
- Extract ALL items mentioned, whether explicitly required or optional
- Include items from "Required Attachments", "Supporting Documents", "Optional Materials" sections
- Capture conditional requirements (e.g., "if applicable", "as needed by grantmaker")
- Note requirements that may vary by grantmaker
- Include both pre-award (application) and post-award (grant management) requirements

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

📋 COMPREHENSIVE EXTRACTION CHECKLIST:

1. DOCUMENT REQUIREMENTS - Extract ALL mentioned documents:
   ✅ Tax-exempt status letters (IRS determination letters)
   ✅ Board lists and governance documents
   ✅ Financial statements (audited, unaudited, Form 990)
   ✅ Budget documents (organizational, project, line-item)
   ✅ Annual reports and organizational materials
   ✅ Letters of support/commitment/collaboration
   ✅ Certificates of insurance
   ✅ Audit reports (A-133, single audit, etc.)
   ✅ Registration documents (SAM.gov, state registrations)
   ✅ Grant agreements and contracts
   ✅ Other attachments (as specified by grantmaker)
   
   CATEGORIZATION:
   - Mark as "required: true" if explicitly required or marked with asterisk/*
   - Mark as "required: false" if labeled optional, "if available", "if applicable", or "as requested"
   - For conditional items, set required: false and note the condition

2. POST-AWARD COMPLIANCE & REPORTING:
   ✅ Progress reports (frequency, format, content requirements)
   ✅ Financial reports (expense reports, reimbursement requests)
   ✅ Performance/outcome reports
   ✅ Site visits or monitoring requirements
   ✅ Grant agreement compliance
   ✅ Record retention requirements
   ✅ Final reports or closeout requirements

3. RECURRING OBLIGATIONS:
   ✅ Monthly, quarterly, or annual reporting schedules
   ✅ Financial reconciliations
   ✅ Review meetings or check-ins
   ✅ License or registration renewals

4. CRITICAL DEADLINES:
   ✅ Application submission deadlines
   ✅ Project period start/end dates
   ✅ Report submission deadlines
   ✅ Document expiration dates
   ✅ Renewal deadlines

5. SPECIAL CONDITIONS:
   ✅ Matching fund requirements
   ✅ Spending restrictions or allowable costs
   ✅ Anti-terrorism compliance
   ✅ Procurement requirements
   ✅ Audit thresholds
   ✅ Legal or regulatory compliance

Return your analysis in the following JSON format:
{
  "compliance_tracking_items": [
    {
      "title": "Quarterly Progress Report",
      "compliance_type": "grant_reporting",
      "description": "Submit detailed progress report covering project milestones and outcomes",
      "priority": "high",
      "is_required": true,
      "deadline_date": "2025-12-31",
      "frequency": "quarterly",
      "estimated_hours": 8,
      "notes": "Must include financial data and performance metrics"
    }
  ],
  "compliance_documents": [
    {
      "document_type": "tax_exempt_status",
      "document_name": "IRS Letter of Determination",
      "is_required": true,
      "expiration_date": "N/A",
      "notes": "Copy of current IRS determination letter"
    },
    {
      "document_type": "organizational_budget",
      "document_name": "Current Year Organizational Operating Budget",
      "is_required": false,
      "expiration_date": "Annual",
      "notes": "Optional - may be requested by some grantmakers"
    }
  ],
  "compliance_recurring": [
    {
      "name": "Monthly Financial Report",
      "compliance_type": "grant_reporting",
      "description": "Monthly financial reconciliation and expense report",
      "is_required": true,
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
    "required_items": 10,
    "optional_items": 5,
    "reporting_frequency": "quarterly",
    "audit_required": true,
    "complexity_level": "moderate"
  }
}

IMPORTANT NOTES:
- Set "is_required": true for explicitly required items (marked with asterisk, labeled "required", or critical for grant eligibility)
- Set "is_required": false for optional items (labeled "if available", "optional", "as requested by grantmaker", or conditional)
- For document_type, use snake_case identifiers like: tax_exempt_status, board_list, financial_statements, organizational_budget, project_budget, annual_report, letters_of_support, insurance_certificate, audit_report, grant_agreement, other
- For priority, use: critical (must have), high (strongly recommended), medium (recommended), low (nice to have)
- Extract EVERY document mentioned in sections like "Required Attachments", "Supporting Documents", "Optional Materials", etc.
- Include items that vary by grantmaker - mark them as optional with notes about conditions

Be thorough and extract every compliance requirement mentioned. If specific dates aren't mentioned, note the timing relative to award (e.g., "30 days after award", "quarterly").`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a compliance expert who extracts and categorizes compliance requirements from grant application documents. Always respond with valid JSON. If no specific compliance requirements are found, infer common requirements based on typical grant post-award obligations.'
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent extraction
      response_format: { type: "json_object" }
    });

    // Extract the response text
    const responseText = completion.choices[0]?.message?.content || '{}';
    
    console.log('🤖 AI Response length:', responseText.length);
    console.log('📊 First 500 chars of response:', responseText.substring(0, 500));

    // Parse JSON response
    let complianceData;
    try {
      complianceData = JSON.parse(responseText);
      console.log('✅ Parsed compliance data:', {
        trackingItems: complianceData.compliance_tracking_items?.length || 0,
        documents: complianceData.compliance_documents?.length || 0,
        recurring: complianceData.compliance_recurring?.length || 0,
        deadlines: complianceData.critical_deadlines?.length || 0,
      });
    } catch (parseError) {
      console.error('❌ Failed to parse compliance JSON:', parseError);
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
            required_items: 0,
            optional_items: 0,
            reporting_frequency: 'unknown',
            audit_required: false,
            complexity_level: 'unknown'
          }
        }
      });
    }

    // Ensure all required fields exist and calculate summary
    const allItems = [
      ...(complianceData.compliance_tracking_items || []),
      ...(complianceData.compliance_documents || []),
      ...(complianceData.compliance_recurring || [])
    ];
    
    const requiredCount = allItems.filter(item => item.is_required === true).length;
    const optionalCount = allItems.filter(item => item.is_required === false).length;
    
    const normalizedData = {
      compliance_tracking_items: complianceData.compliance_tracking_items || [],
      compliance_documents: complianceData.compliance_documents || [],
      compliance_recurring: complianceData.compliance_recurring || [],
      critical_deadlines: complianceData.critical_deadlines || [],
      special_conditions: complianceData.special_conditions || [],
      summary: complianceData.summary || {
        total_requirements: allItems.length,
        required_items: requiredCount,
        optional_items: optionalCount,
        reporting_frequency: 'unknown',
        audit_required: false,
        complexity_level: 'unknown'
      }
    };

    return NextResponse.json({
      success: true,
      complianceData: normalizedData,
      usage: {
        prompt_tokens: completion.usage?.prompt_tokens || 0,
        completion_tokens: completion.usage?.completion_tokens || 0,
        total_tokens: completion.usage?.total_tokens || 0,
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
