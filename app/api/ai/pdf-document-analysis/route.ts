/**
 * Enhanced PDF Document Analysis API with Server-side OCR
 * Handles complex documents like grant applications, loan forms, and registration documents
 * Converts PDFs to images for AI vision models in Vercel serverless environment
 */

import { NextRequest, NextResponse } from 'next/server'
import aiProviderService from '../../../../lib/aiProviderService.js'

// PDF to Image conversion for Vercel serverless environment using Puppeteer
async function convertPDFToImages(pdfBuffer: Buffer): Promise<string[]> {
  try {
    // Use Puppeteer which is already in package.json and works in Vercel
    const puppeteer = await import('puppeteer')
    
    console.log('🚀 Starting PDF to image conversion with Puppeteer...')
    
    // Create a temporary HTML page with the PDF embedded
    const pdfBase64 = pdfBuffer.toString('base64')
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { margin: 0; padding: 0; }
          embed { width: 100vw; height: 100vh; }
        </style>
      </head>
      <body>
        <embed src="data:application/pdf;base64,${pdfBase64}" type="application/pdf" />
      </body>
      </html>
    `
    
    // Launch Puppeteer browser
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    })
    
    const page = await browser.newPage()
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 })
    await page.setContent(htmlContent)
    
    // Wait for PDF to load
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Take screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: true,
      encoding: 'base64'
    })
    
    await browser.close()
    
    console.log(`✅ Converted PDF to image (${Math.round(screenshot.length / 1024)}KB)`)
    
    return [screenshot as string]
    
  } catch (error) {
    console.error('PDF to image conversion failed:', error)
    
    // Fallback: Return PDF as is and let the error handling deal with it
    console.log('🔄 Falling back to direct PDF processing (may not work with vision models)')
    const pdfBase64 = pdfBuffer.toString('base64')
    return [pdfBase64]
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const documentType = formData.get('documentType') as string || 'application'
    const extractionMode = formData.get('extractionMode') as string || 'comprehensive'
    const contextString = formData.get('context') as string
    
    let context = {}
    try {
      context = JSON.parse(contextString || '{}')
    } catch (e) {
      console.warn('Failed to parse context:', e)
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    console.log('🔍 Processing PDF file:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      documentType,
      extractionMode
    })

    // Convert file to buffer for PDF processing
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Convert PDF to images first for AI vision models
    console.log('🖼️ Converting PDF to images for AI vision analysis...')
    const pageImages = await convertPDFToImages(buffer)
    
    if (pageImages.length === 0) {
      throw new Error('Failed to convert PDF to images')
    }

    console.log(`✅ Successfully converted PDF to ${pageImages.length} image(s)`)

    // Use enhanced prompts for complex document analysis
    const analysisPrompt = buildEnhancedPDFAnalysisPrompt(documentType, context, file.name)
    
    // Build messages with images instead of direct PDF
    const messages = [
      {
        role: 'system',
        content: analysisPrompt.system
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: analysisPrompt.user
          },
          // Add each page image
          ...pageImages.map(imageBase64 => ({
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${imageBase64}`,
              detail: 'high'
            }
          }))
        ]
      }
    ]

    console.log('🤖 Sending PDF to AI for enhanced OCR and analysis...')
    
    const aiResponse = await aiProviderService.generateCompletion(
      'enhanced-pdf-document-analysis',
      messages,
      {
        temperature: 0.05, // Lower temperature for more consistent extraction
        max_tokens: 8000,  // Increased for complex documents
        response_format: { type: 'json_object' }
      }
    )

    const responseContent = aiResponse?.content || aiResponse
    if (!responseContent) {
      throw new Error('No response from AI service')
    }

    console.log('📄 Raw AI response length:', String(responseContent).length)

    let analysisResult
    try {
      analysisResult = JSON.parse(String(responseContent))
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError)
      
      // Try to extract JSON from response if it's wrapped in other text
      const jsonMatch = String(responseContent).match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          analysisResult = JSON.parse(jsonMatch[0])
        } catch (secondParseError) {
          throw new Error('Invalid AI response format - could not extract valid JSON')
        }
      } else {
        throw new Error('No valid JSON found in AI response')
      }
    }

    // Enhanced validation and structuring
    const structuredResult = buildStructuredResponse(analysisResult, file, documentType, context)

    console.log('✅ Enhanced PDF analysis complete:', {
      documentType: structuredResult.data.analysis.documentType,
      detectedFormType: structuredResult.data.analysis.detectedFormType,
      dataFieldsFound: Object.keys(structuredResult.data.analysis.dataFields || {}).length,
      narrativeFieldsFound: Object.keys(structuredResult.data.analysis.narrativeFields || {}).length,
      sectionsFound: structuredResult.data.analysis.documentSections?.length || 0,
      requirementsFound: structuredResult.data.analysis.requirements?.length || 0,
      confidence: structuredResult.data.analysis.extractionConfidence
    })

    return NextResponse.json(structuredResult)

  } catch (error) {
    console.error('Enhanced PDF document analysis error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Enhanced PDF analysis failed',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

function buildEnhancedPDFAnalysisPrompt(documentType: string, context: any, fileName: string) {
  const isGrantApplication = documentType === 'grant_application' || 
                            fileName.toLowerCase().includes('grant') || 
                            fileName.toLowerCase().includes('cga')
  
  return {
    system: `You are an expert document analyzer specializing in complex form analysis and OCR extraction. You excel at understanding different types of application documents including grant applications, loan applications, and registration forms.

Your enhanced capabilities include:
- High-accuracy OCR text extraction preserving structure and formatting
- Distinction between data entry fields vs. narrative/essay questions
- Complex form section organization and relationship mapping
- Requirements, eligibility criteria, and deadline extraction
- Document-specific field type detection (beyond basic web form fields)
- Understanding of conditional fields and multi-part questions

For grant applications specifically, you recognize:
- Cover sheet data fields (organization info, contact details, amounts)
- Narrative sections requiring paragraph/essay responses
- Multiple choice selections and checkbox groups
- Attachment requirements and submission guidelines
- Evaluation criteria and scoring rubrics
- Multi-section document structure with dependencies

CRITICAL: Always return valid JSON matching this enhanced structure:

{
  "extractedText": "Complete text content with preserved formatting and structure",
  "documentType": "grant_application|loan_application|registration_form|survey|checklist|other",
  "detectedFormType": "missouri_common_grant|federal_grant|sba_loan|nonprofit_registration|survey_form|other",
  "formTitle": "Full title of the document/form",
  "formVersion": "Version number if specified",
  "lastUpdated": "Last updated date if found",
  "confidence": 0.95,
  "documentSections": [
    {
      "sectionId": "unique_section_id",
      "title": "Section Title",
      "description": "Section description or instructions",
      "order": 1,
      "subsections": ["subsection titles if any"],
      "fieldCount": 5,
      "sectionType": "cover_sheet|narrative|requirements|attachments|certification"
    }
  ],
  "dataFields": {
    "field_id": {
      "label": "Exact field label from document",
      "type": "text|textarea|email|phone|date|currency|number|select|checkbox|radio|file_upload",
      "required": true|false,
      "section": "Section ID where field appears",
      "placeholder": "Placeholder text or format hints",
      "validation": "Format requirements or constraints",
      "options": ["array of options for select/radio/checkbox fields"],
      "maxLength": "character or word limits if specified",
      "helpText": "Additional instructions or explanations"
    }
  },
  "narrativeFields": {
    "narrative_id": {
      "question": "Full question text",
      "section": "Section ID",
      "wordLimit": "Word limit if specified",
      "required": true|false,
      "order": 1,
      "relatedFields": ["array of related field IDs"],
      "examples": "Examples provided in the document",
      "scoringCriteria": "How this will be evaluated if mentioned"
    }
  },
  "requirements": [
    {
      "type": "eligibility|submission|attachment|deadline",
      "description": "Detailed requirement description",
      "mandatory": true|false,
      "section": "Where this requirement is mentioned"
    }
  ],
  "attachments": [
    {
      "name": "Required attachment name",
      "description": "Description of what's needed",
      "required": true|false,
      "format": "Acceptable formats (PDF, Word, etc.)",
      "specifications": "Any size, page, or content requirements"
    }
  ],
  "keyInformation": {
    "deadlines": ["Array of important dates"],
    "fundingAmounts": "Funding limits or amounts",
    "contactInfo": {
      "organization": "Issuing organization",
      "email": "Contact email",
      "phone": "Contact phone",
      "website": "Related website"
    },
    "submissionMethod": "How to submit (online, mail, etc.)",
    "reviewProcess": "Description of review process",
    "timeline": "Processing timeline if mentioned"
  },
  "conditionalLogic": [
    {
      "condition": "If X is selected/answered",
      "consequence": "Then Y fields become required/visible",
      "fields": ["affected field IDs"]
    }
  ]
}`,

    user: `Perform comprehensive analysis of this ${documentType} document with enhanced structure recognition.

IMPORTANT: You are analyzing high-resolution images of PDF pages. Each image represents a page from the original document.

Document Context:
- File Name: ${fileName}
- Expected Type: ${documentType}
- Analysis Mode: Enhanced structure extraction from PDF page images
- User Profile: ${context.userProfile ? 'Available for pre-filling' : 'Not provided'}
- Project Data: ${context.projectData ? 'Available for context' : 'Not provided'}

Enhanced Analysis Requirements:
1. **Complete OCR**: Extract ALL text with proper formatting and structure preservation
2. **Field Classification**: Distinguish between:
   - Simple data entry fields (name, email, phone, etc.)
   - Complex narrative questions requiring paragraph responses
   - Multiple choice and checkbox selections
   - File attachment requirements
3. **Section Organization**: Map the document's logical structure and section relationships
4. **Requirements Extraction**: Identify ALL eligibility, submission, and compliance requirements
5. **Conditional Logic**: Detect fields that depend on other field selections
6. **Form Type Detection**: Identify the specific type and version of this form
7. **Submission Guidelines**: Extract instructions for how to complete and submit

${isGrantApplication ? `
GRANT APPLICATION SPECIFIC ANALYSIS:
- Identify cover sheet vs. narrative sections
- Extract funding amounts, deadlines, and contact information
- Map question dependencies and section flow
- Identify attachment requirements and specifications
- Extract evaluation criteria and scoring information
` : ''}

Return complete analysis as valid JSON. Be thorough - this data will be used to recreate the form digitally and guide users through completion.`
  }
}

function buildStructuredResponse(analysisResult: any, file: File, documentType: string, context: any) {
  // Ensure all expected fields exist with defaults
  const analysis = {
    documentType: analysisResult.documentType || documentType,
    detectedFormType: analysisResult.detectedFormType || 'unknown',
    formTitle: analysisResult.formTitle || file.name,
    formVersion: analysisResult.formVersion || null,
    lastUpdated: analysisResult.lastUpdated || null,
    extractionConfidence: analysisResult.confidence || 0.8,
    extractedText: analysisResult.extractedText || '',
    
    // Enhanced structure
    documentSections: analysisResult.documentSections || [],
    dataFields: analysisResult.dataFields || {},
    narrativeFields: analysisResult.narrativeFields || {},
    requirements: analysisResult.requirements || [],
    attachments: analysisResult.attachments || [],
    keyInformation: analysisResult.keyInformation || {},
    conditionalLogic: analysisResult.conditionalLogic || [],
    
    // Legacy compatibility
    formFields: {
      ...analysisResult.dataFields || {},
      ...analysisResult.narrativeFields || {}
    }
  }

  // Calculate enhanced statistics
  const totalDataFields = Object.keys(analysis.dataFields).length
  const totalNarrativeFields = Object.keys(analysis.narrativeFields).length
  const totalRequiredFields = [
    ...Object.values(analysis.dataFields),
    ...Object.values(analysis.narrativeFields)
  ].filter((field: any) => field.required).length

  return {
    success: true,
    data: {
      analysis,
      formStructure: {
        formFields: analysis.formFields,
        dataFields: analysis.dataFields,
        narrativeFields: analysis.narrativeFields,
        formSections: analysis.documentSections,
        formMetadata: {
          title: analysis.formTitle,
          version: analysis.formVersion,
          lastUpdated: analysis.lastUpdated,
          totalFields: totalDataFields + totalNarrativeFields,
          dataFields: totalDataFields,
          narrativeFields: totalNarrativeFields,
          requiredFields: totalRequiredFields,
          sectionsFound: analysis.documentSections.length,
          requirementsFound: analysis.requirements.length,
          attachmentsRequired: analysis.attachments.length,
          documentType: analysis.documentType,
          detectedFormType: analysis.detectedFormType,
          extractionMethod: 'enhanced_ai_vision_ocr',
          hasConditionalLogic: analysis.conditionalLogic.length > 0
        }
      },
      enhancedAnalysis: {
        requirements: analysis.requirements,
        attachments: analysis.attachments,
        keyInformation: analysis.keyInformation,
        conditionalLogic: analysis.conditionalLogic,
        documentSections: analysis.documentSections
      },
      ocrStats: {
        processingTime: Date.now(),
        extractionMethod: 'enhanced_ai_vision',
        confidence: analysis.extractionConfidence,
        fileSize: file.size,
        fileName: file.name,
        documentComplexity: calculateComplexityScore(analysis),
        structureQuality: calculateStructureQuality(analysis)
      }
    }
  }
}

function calculateComplexityScore(analysis: any): string {
  const totalFields = Object.keys(analysis.dataFields).length + Object.keys(analysis.narrativeFields).length
  const sectionsCount = analysis.documentSections.length
  const requirementsCount = analysis.requirements.length
  const hasConditionalLogic = analysis.conditionalLogic.length > 0
  
  const score = totalFields * 0.3 + sectionsCount * 0.2 + requirementsCount * 0.1 + (hasConditionalLogic ? 10 : 0)
  
  if (score < 10) return 'simple'
  if (score < 25) return 'moderate'
  if (score < 50) return 'complex'
  return 'very_complex'
}

function calculateStructureQuality(analysis: any): string {
  const hasStructure = analysis.documentSections.length > 0
  const hasFieldTypes = Object.values(analysis.dataFields).some((field: any) => field.type !== 'text')
  const hasRequirements = analysis.requirements.length > 0
  const hasKeyInfo = Object.keys(analysis.keyInformation).length > 0
  
  const qualityScore = [hasStructure, hasFieldTypes, hasRequirements, hasKeyInfo].filter(Boolean).length
  
  if (qualityScore >= 3) return 'high'
  if (qualityScore >= 2) return 'medium'
  return 'low'
}