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
ENHANCED DOCUMENT ANALYSIS - FORM FIELD EXTRACTION

You are analyzing OCR-extracted text from a form document. Your primary task is to identify ALL form fields exactly as they appear in the original document.

CRITICAL FIELD EXTRACTION REQUIREMENTS:

1. EXACT FIELD IDENTIFICATION:
   Look for these specific patterns in the OCR text:
   - "Field Name: ____" or "Field Name: _______" or "Field Name: ________________"
   - "Field Name: $______" (currency fields)
   - "[ ] Option Name" or "☐ Option Name" (checkboxes)
   - "Field Name: ( ) Option1 ( ) Option2" (radio buttons)
   - Lines with colons followed by blank space or underscores
   - Numbered or bulleted form sections
   - Table-like structures with labels and blank spaces

2. FIELD STRUCTURE PRESERVATION:
   - Extract the EXACT field label/name as written in the document
   - Identify the field type based on context (text, number, date, currency, email, phone, select, checkbox, textarea)
   - Note if field appears required (*, "required", "mandatory")
   - Preserve any validation hints or instructions near the field
   - Maintain the original field order and grouping

3. COMMON OCR FIELD PATTERNS:
   - Text may have spacing issues: "Organization Name: ______" might appear as "Organization Name:______" 
   - Underscores may appear as other characters: "____" might be "----" or "......."
   - Checkbox symbols may be OCR'd as "[  ]", "[ ]", "□", or "☐"
   - Dollar signs and number fields: "$______" or "Amount: $______"
   - Date fields often have format hints: "Date (MM/DD/YYYY): ______"

4. SECTION ORGANIZATION:
   - Group fields by document sections (Applicant Information, Project Details, Budget, etc.)
   - Preserve section headers and subheaders
   - Note any conditional fields or dependencies

5. VALIDATION AND QUALITY:
   - If you find fewer than 5 fields in a form document, re-examine the text more carefully
   - Look for fields that might be spread across multiple lines due to OCR
   - Check for fields near the beginning, middle, and end of the document

RETURN FORMAT:
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