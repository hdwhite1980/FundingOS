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

  return aiProviderService.safeParseJSON(response.content);
}

function buildEnhancedAnalysisPrompt(text: string, documentType: string, context: any): string {
  const basePrompt = `
ENHANCED DOCUMENT ANALYSIS - PRECISE FORM FIELD EXTRACTION

You are analyzing OCR-extracted text from a form document. Your CRITICAL task is to identify EVERY SINGLE form field exactly as it appears in the original document.

FIELD EXTRACTION STRATEGY - MULTI-PASS ANALYSIS:

PASS 1 - EXPLICIT FIELD PATTERNS:
Look for these EXACT patterns in the OCR text:
- "Field Name: ____________________" (any length of underscores/dashes/dots)
- "Field Name: $_____" (currency fields)
- "Field Name: [____]" (bracketed fields) 
- "Field Name: (" or "Field Name: (_____)" (parenthetical fields)
- "Field Name: □" or "Field Name: ☐" (checkbox fields)
- "Field Name:" followed by blank lines or whitespace
- Table rows with labels and empty cells/spaces

PASS 2 - CONTEXTUAL FIELD DETECTION:
- Lines ending with colons (:) followed by blank space
- Labels adjacent to form elements: "Name [____]", "Address _____"
- Numbered/lettered lists requesting information: "1. Organization Name ____"
- Section headers followed by blank input areas
- Words like "Enter", "Provide", "List" followed by field descriptions
- Date patterns: "Date: ___/___/___" or "MM/DD/YYYY"

PASS 3 - STRUCTURAL FIELD IDENTIFICATION:
- Multi-line fields indicated by multiple blank lines
- Table structures with headers and empty data cells
- Signature lines: "Signature: ________________" 
- Contact information blocks (Name, Address, Phone, Email sections)
- Financial fields grouped together (Budget, Amount, Cost sections)

PASS 4 - VALIDATION AND COMPLETION CHECK:
- Re-scan text for any missed patterns like "Please provide...", "Enter your...", "Attach..."
- Check for fields split across multiple lines due to OCR errors
- Look for fields at document beginning, middle, and end
- Ensure all form sections have corresponding fields extracted

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