/**
 * Enhanced Document Processing API with OCR support
 * Handles text extraction from PDFs and images, then performs AI analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import enhancedDocumentProcessor from '../../../../lib/enhancedDocumentProcessor';
import aiProviderService from '../../../../lib/aiProviderService';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const context = JSON.parse(formData.get('context') as string || '{}');
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    console.log(`📄 Processing ${file.name} (${file.type}, ${Math.round(file.size / 1024)}KB)`);

    // Extract text using OCR or PDF parsing
    const extractedText = await enhancedDocumentProcessor.extractText(file, file.type);
    
    if (!extractedText || extractedText.length < 10) {
      return NextResponse.json({
        success: false,
        error: 'No text could be extracted from the document',
        suggestions: [
          'Ensure the document is clearly readable',
          'Try uploading a higher resolution image',
          'Check if the document is properly oriented'
        ]
      }, { status: 400 });
    }

    // Clean up OCR artifacts
    const cleanedText = enhancedDocumentProcessor.cleanOCRText(extractedText);
    
    // Analyze document quality
    const qualityAnalysis = enhancedDocumentProcessor.analyzeQuality(cleanedText, 100);

    console.log(`✅ Extracted ${cleanedText.length} characters. Quality: ${qualityAnalysis.quality}`);

    // Perform AI analysis on the extracted text
    const aiAnalysis = await performAIAnalysis(cleanedText, file.type, context);

    // Combine extraction results with AI analysis
    const result = {
      success: true,
      extraction: {
        originalText: extractedText,
        cleanedText: cleanedText,
        quality: qualityAnalysis,
        metadata: {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          extractedLength: cleanedText.length,
          processedAt: new Date().toISOString()
        }
      },
      analysis: aiAnalysis,
      recommendations: generateRecommendations(aiAnalysis, qualityAnalysis)
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Enhanced document processing error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Document processing failed', 
        message: error instanceof Error ? error.message : 'Unknown error',
        suggestions: [
          'Try a different file format (PDF or common image formats)',
          'Ensure the file is not corrupted',
          'Check that text in the document is clearly readable'
        ]
      },
      { status: 500 }
    );
  }
}

async function performAIAnalysis(text: string, fileType: string, context: any) {
  const documentType = inferDocumentType(text, fileType);
  
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

function inferDocumentType(text: string, fileType: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('application') || lowerText.includes('form')) {
    return 'application';
  } else if (lowerText.includes('rfp') || lowerText.includes('request for proposal')) {
    return 'rfp';
  } else if (lowerText.includes('guidelines') || lowerText.includes('instructions')) {
    return 'guidelines';
  } else if (lowerText.includes('contract') || lowerText.includes('agreement')) {
    return 'contract';
  }
  
  return 'unknown';
}

function buildEnhancedAnalysisPrompt(text: string, documentType: string, context: any): string {
  const basePrompt = `
ENHANCED DOCUMENT ANALYSIS (WITH OCR/PDF EXTRACTION)

This document was processed using OCR/PDF extraction technology. Please provide comprehensive analysis with special attention to form fields and structure.

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
  return `You are an expert document analysis AI with specialized expertise in processing OCR-extracted text from funding and grant documents.

Your task is to analyze documents that have been processed through OCR/PDF extraction and provide comprehensive, structured analysis focusing heavily on form field extraction and completion guidance.

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

function generateRecommendations(analysis: any, qualityAnalysis: any): string[] {
  const recommendations: string[] = [];

  // Quality-based recommendations
  if (qualityAnalysis.quality === 'poor') {
    recommendations.push('⚠️ Document quality is low - consider rescanning with higher resolution');
    recommendations.push('📸 Ensure document is well-lit and properly aligned when scanning');
  }

  // Analysis-based recommendations
  if (analysis.formFields && Object.keys(analysis.formFields).length > 0) {
    const emptyFields = Object.keys(analysis.formFields).length;
    recommendations.push(`📝 ${emptyFields} form fields detected - AI can help complete them`);
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