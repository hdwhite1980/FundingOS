/**
 * Enhanced Document Processing API - Text Analysis Only
 * Performs AI analysis on pre-extracted text from client-side OCR
 */

import { NextRequest, NextResponse } from 'next/server';
import aiProviderService from '../../../../lib/aiProviderService';

export async function POST(request: NextRequest) {
  try {
    const { extractedText, documentType, context } = await request.json();
    
    if (!extractedText || typeof extractedText !== 'string') {
      return NextResponse.json(
        { error: 'Extracted text is required' },
        { status: 400 }
      );
    }

    if (extractedText.length < 10) {
      return NextResponse.json({
        success: false,
        error: 'Text too short for meaningful analysis',
        suggestions: [
          'Ensure the document contains readable text',
          'Try uploading a higher quality image',
          'Check if OCR extraction was successful'
        ]
      }, { status: 400 });
    }

    console.log(`🤖 Analyzing ${extractedText.length} characters of extracted text`);

    // Perform AI analysis on the extracted text
    const aiAnalysis = await performAIAnalysis(extractedText, documentType || 'unknown', context || {});

    const result = {
      success: true,
      analysis: aiAnalysis,
      metadata: {
        textLength: extractedText.length,
        documentType: documentType || 'unknown',
        processedAt: new Date().toISOString()
      },
      recommendations: generateRecommendations(aiAnalysis)
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Document analysis error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Document analysis failed', 
        message: error instanceof Error ? error.message : 'Unknown error',
        suggestions: [
          'Ensure the text was properly extracted',
          'Try with a different document',
          'Check that the document contains meaningful content'
        ]
      },
      { status: 500 }
    );
  }
}

async function performAIAnalysis(text: string, documentType: string, context: any) {
  try {
    const analysisPrompt = buildEnhancedAnalysisPrompt(text, documentType, context);
    
    const response = await aiProviderService.generateCompletion(
      'document-analysis',
      [
        {
          role: 'system',
          content: getEnhancedSystemPrompt(documentType)
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      {
        maxTokens: 4000,
        temperature: 0.1,
        responseFormat: 'json_object'
      }
    );

    if (!response?.content) {
      throw new Error('No response received from AI provider');
    }

    const analysis = aiProviderService.safeParseJSON(response.content);
    
    // Validate that we got meaningful field extraction
    if (!analysis.formFields || Object.keys(analysis.formFields).length === 0) {
      console.warn('AI analysis returned no fields, attempting fallback extraction');
      return generateFallbackFormStructure(text, documentType, context);
    }
    
    return analysis;
    
  } catch (error) {
    console.error('AI analysis failed, using fallback:', error);
    return generateFallbackFormStructure(text, documentType, context);
  }
}

function generateFallbackFormStructure(text: string, documentType: string, context: any) {
  console.log('🔄 Generating fallback form structure for document type:', documentType);
  
  // Common Grant Application Form Structure
  const fallbackFields = {
    // Applicant Information Section
    "organization_name": {
      "label": "Organization Name",
      "type": "text",
      "required": true,
      "section": "Applicant Information",
      "validation": "",
      "value": "",
      "placeholder": "Legal name of organization"
    },
    "contact_person": {
      "label": "Contact Person",
      "type": "text",
      "required": true,
      "section": "Applicant Information",
      "validation": "",
      "value": "",
      "placeholder": "Primary contact name"
    },
    "organization_address": {
      "label": "Organization Address",
      "type": "textarea",
      "required": true,
      "section": "Applicant Information",
      "validation": "",
      "value": "",
      "placeholder": "Complete mailing address"
    },
    "phone_number": {
      "label": "Phone Number",
      "type": "phone",
      "required": true,
      "section": "Applicant Information",
      "validation": "",
      "value": "",
      "placeholder": "Primary phone number"
    },
    "email_address": {
      "label": "Email Address",
      "type": "email",
      "required": true,
      "section": "Applicant Information",
      "validation": "",
      "value": "",
      "placeholder": "Primary email contact"
    },
    
    // Project Information Section
    "project_title": {
      "label": "Project Title",
      "type": "text",
      "required": true,
      "section": "Project Information",
      "validation": "",
      "value": "",
      "placeholder": "Descriptive project name"
    },
    "project_description": {
      "label": "Project Description",
      "type": "textarea",
      "required": true,
      "section": "Project Information",
      "validation": "",
      "value": "",
      "placeholder": "Detailed project description"
    },
    "project_start_date": {
      "label": "Project Start Date",
      "type": "date",
      "required": true,
      "section": "Project Information",
      "validation": "",
      "value": "",
      "placeholder": "MM/DD/YYYY"
    },
    "project_end_date": {
      "label": "Project End Date",
      "type": "date",
      "required": true,
      "section": "Project Information",
      "validation": "",
      "value": "",
      "placeholder": "MM/DD/YYYY"
    },
    
    // Financial Information Section
    "total_budget": {
      "label": "Total Project Budget",
      "type": "currency",
      "required": true,
      "section": "Financial Information",
      "validation": "",
      "value": "",
      "placeholder": "Total project cost"
    },
    "amount_requested": {
      "label": "Amount Requested",
      "type": "currency",
      "required": true,
      "section": "Financial Information",
      "validation": "",
      "value": "",
      "placeholder": "Grant amount requested"
    },
    
    // Signature Section
    "authorized_signature": {
      "label": "Authorized Signature",
      "type": "text",
      "required": true,
      "section": "Certification",
      "validation": "",
      "value": "",
      "placeholder": "Signature of authorized official"
    },
    "signature_date": {
      "label": "Date Signed",
      "type": "date",
      "required": true,
      "section": "Certification",
      "validation": "",
      "value": "",
      "placeholder": "MM/DD/YYYY"
    }
  };

  return {
    formFields: fallbackFields,
    documentStructure: {
      title: "Grant Application Form",
      sections: ["Applicant Information", "Project Information", "Financial Information", "Certification"],
      totalFields: Object.keys(fallbackFields).length
    },
    extractionQuality: {
      confidence: 0.5,
      issues: ["Used fallback form structure due to poor OCR quality or analysis failure"],
      fieldCount: Object.keys(fallbackFields).length,
      fallbackUsed: true
    }
  };
}

function buildEnhancedAnalysisPrompt(text: string, documentType: string, context: any): string {
  const basePrompt = `
ENHANCED DOCUMENT ANALYSIS - PRECISE FORM FIELD EXTRACTION

You are analyzing OCR-extracted text from a form document. Your CRITICAL task is to identify EVERY SINGLE form field exactly as it appears in the original document.

⚠️  OCR TEXT QUALITY HANDLING:
The text may contain encoding artifacts, corrupted characters, or poor OCR quality. Your job is to:
1. INTERPRET corrupted text and infer the intended field labels
2. RECONSTRUCT meaningful field names from partial/garbled text
3. FALLBACK to standard form patterns when text is unreadable
4. PROVIDE field structure even with poor input quality

FIELD EXTRACTION STRATEGY - MULTI-PASS ANALYSIS:

PASS 1 - EXPLICIT FIELD PATTERNS (even with OCR artifacts):
Look for these EXACT patterns, accounting for OCR corruption:
- "Field Name: ____________________" (any length of underscores/dashes/dots)
- "Field Name: $_____" (currency fields)
- "Field Name: [____]" or corrupted versions like "[��__]"
- "Field Name: (" or "Field Name: (_____)" (parenthetical fields)
- "Field Name: □" or "Field Name: ☐" (checkbox fields)
- "Field Name:" followed by blank lines or whitespace
- Table rows with labels and empty cells/spaces

PASS 2 - CORRUPTED TEXT INTERPRETATION:
When you see garbled text like "�� d�� { , 9   9 b����", try to identify:
- Common form field words: "Name", "Address", "Organization", "Project", "Date", "Amount"
- Positional clues: text near colons, underscores, or form boundaries
- Contextual patterns: words that typically appear in grant applications
- Length indicators: longer garbled sections likely represent longer field names

PASS 3 - INTELLIGENT FIELD RECONSTRUCTION:
If OCR text is too corrupted, use STANDARD GRANT FORM patterns:
- Applicant Information: Organization Name, Contact Person, Address, Phone, Email
- Project Information: Project Title, Description, Start Date, End Date
- Financial Information: Total Budget, Amount Requested, Match Funding
- Narrative Sections: Project Description, Goals, Outcomes, Evaluation
- Certifications: Authorized Signature, Title, Date

PASS 4 - FALLBACK FIELD GENERATION:
If field extraction fails completely, generate a STANDARD FORM STRUCTURE:
- Use common grant application fields based on document context
- Create logical field groupings and ordering
- Provide appropriate field types for each category
- Ensure comprehensive coverage of typical form sections

OCR ARTIFACT HANDLING:
- Underscores may appear as: "____", "----", "....", "━━━━", "____"  
- Brackets may appear as: "[ ]", "[  ]", "□", "☐", "( )", "[____]"
- Text spacing issues: "Organization Name:____" = "Organization Name: ____"
- Character substitution: "Email:" might be "Ernail:" or "E-mail:"
- Line breaks in field names: "Organization\nName: ____" = "Organization Name: ____"

COMPREHENSIVE FIELD TYPES:
- text: Name, address, description fields
- number: Age, quantity, ID numbers  
- currency: Dollar amounts, budgets, costs
- date: Dates with various formats
- email: Email address fields
- phone: Phone/fax numbers
- select: Dropdown options, multiple choice
- checkbox: Yes/No, selection options
- textarea: Long text, comments, descriptions
- file: Document upload, attachment fields

SECTION ORGANIZATION:
- Preserve exact section headers from document
- Group related fields under appropriate sections
- Maintain original field order within sections
- Identify conditional or dependent fields
You must return a JSON object with this exact structure:
{
  "formFields": {
    "field_key": {
      "label": "Exact field name as it appears",
      "type": "text|number|date|currency|email|phone|select|checkbox|textarea",
      "required": true|false,
      "section": "Document section name",
      "validation": "Any validation hints or format requirements",
      "value": "", 
      "placeholder": "Any placeholder text or instructions"
    }
  },
  "documentStructure": {
    "title": "Document title",
    "sections": ["Section 1", "Section 2", ...],
    "totalFields": 0
  },
  "extractionQuality": {
    "confidence": 0.0-1.0,
    "issues": ["Any problems with field extraction"],
    "fieldCount": 0
  }
}

DOCUMENT TEXT (${text.length} characters):
${text.substring(0, 15000)}${text.length > 15000 ? '...[truncated]' : ''}
`;

  if (context.userProfile || context.project) {
    return basePrompt + `\n\nCONTEXT FOR PERSONALIZED ANALYSIS (for field completion suggestions):\nUser Profile: ${JSON.stringify(context.userProfile, null, 2)}\nProject: ${JSON.stringify(context.project, null, 2)}`;
  }

  return basePrompt;
}

function getEnhancedSystemPrompt(documentType: string): string {
  return `You are an expert document analysis AI specializing in form field extraction from OCR text.

Your primary expertise is in accurately identifying and extracting form fields from documents that have been processed through OCR (Optical Character Recognition).

CORE COMPETENCIES:
1. FORM FIELD PATTERN RECOGNITION - You excel at identifying form fields even when OCR introduces artifacts
2. FIELD TYPE CLASSIFICATION - You accurately determine field types (text, number, date, currency, etc.)
3. STRUCTURE PRESERVATION - You maintain the original document organization and field relationships
4. OCR ERROR HANDLING - You compensate for common OCR issues like character substitution and spacing problems

CRITICAL SUCCESS FACTORS:
- Extract ALL form fields present in the document - missing fields is the primary failure mode
- Preserve exact field labels as they appear in the original document
- Accurately classify field types based on context and validation hints
- Maintain document structure and section organization
- Handle OCR artifacts gracefully (underscores as dashes, spacing issues, symbol substitutions)

FIELD EXTRACTION PRIORITIES:
1. Personal/Organization Information Fields (names, addresses, contact info)
2. Financial Fields (amounts, budgets, funding requests)
3. Project Description Fields (objectives, methods, outcomes)
4. Administrative Fields (dates, signatures, certifications)
5. Checkbox/Selection Fields (eligibility criteria, categories)

RESPONSE REQUIREMENTS:
- Always return valid JSON with the exact structure specified
- Field extraction confidence should be high (>0.8) for forms with clear structure
- If field extraction confidence is low, include specific issues in the response
- Provide accurate field counts and section organization

Remember: Users depend on accurate field extraction to generate completed forms. Missing or incorrectly identified fields directly impact their application success.`;
}

function generateRecommendations(analysis: any): string[] {
  const recommendations: string[] = [];

  // Analysis-based recommendations
  if (analysis.formFields && Object.keys(analysis.formFields).length > 0) {
    const fieldCount = Object.keys(analysis.formFields).length;
    recommendations.push(`📝 ${fieldCount} form fields detected - AI can help complete them`);
    recommendations.push('🤖 Use "Generate Smart Completion" to automatically fill fields based on your profile');
  }

  if (analysis.requirements?.length > 0) {
    recommendations.push(`📋 ${analysis.requirements.length} requirements identified - review for compliance`);
  }

  if (analysis.missingInformation?.length > 0) {
    recommendations.push('❗ Missing information detected - AI recommendations will be provided');
    analysis.missingInformation.forEach((item: string) => {
      recommendations.push(`  • ${item}`);
    });
  }

  // Always add general recommendations
  recommendations.push('🔍 Review all extracted fields for accuracy');
  recommendations.push('✏️ Customize AI-generated content to match your specific situation');

  return recommendations;
}