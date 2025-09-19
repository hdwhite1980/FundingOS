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
ENHANCED DOCUMENT ANALYSIS

Please provide comprehensive analysis of this document with special attention to form fields and structure.

ANALYSIS REQUIREMENTS:

1. FORM FIELD EXTRACTION (CRITICAL):
   - Extract ALL form fields, input areas, and fillable sections
   - Look for patterns: "Field Name: ____", "[ ] checkbox", "Field Name $______", text areas
   - Identify field types: text, number, date, currency, email, phone, select, checkbox, textarea
   - Determine required vs optional fields (look for asterisks, "required", etc.)
   - Group fields by sections/categories

2. DOCUMENT STRUCTURE:
   - Title, version, date information
   - Section headers and organization
   - Instructions and guidelines
   - Submission requirements and deadlines

3. REQUIREMENTS ANALYSIS:
   - Eligibility criteria
   - Supporting documents needed
   - Technical specifications
   - Compliance requirements

4. MISSING INFORMATION DETECTION:
   - Identify blank or unfilled fields
   - Note any incomplete sections
   - Flag areas needing attention

DOCUMENT TEXT (${text.length} characters):
${text.substring(0, 15000)}${text.length > 15000 ? '...[truncated]' : ''}
`;

  if (context.userProfile || context.project) {
    return basePrompt + `\n\nCONTEXT FOR PERSONALIZED ANALYSIS:\n${JSON.stringify(context, null, 2)}`;
  }

  return basePrompt;
}

function getEnhancedSystemPrompt(documentType: string): string {
  return `You are an expert document analysis AI specializing in funding and grant documents.

Your task is to analyze document text and provide comprehensive, structured analysis focusing on form field extraction and completion guidance.

CRITICAL: Pay special attention to identifying ALL form fields and fillable areas in the document. This includes:
- Traditional form fields with labels and blanks
- Checkbox lists and selection options  
- Text areas and description fields
- Numerical inputs (currency, dates, percentages)
- Required vs optional field distinctions
- Field validation rules and constraints

Always respond with valid JSON that includes:
- Detailed form field extraction
- Document structure analysis  
- Requirements and compliance information
- Specific recommendations for missing information
- AI-generated suggestions for how to complete unfilled fields

Focus on being extremely thorough in field extraction as this data will be used to generate intelligent form completions.`;
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