/**
 * PDF Text Analysis API - Extracts form structure from PDFs using text parsing
 * /api/pdf/analyze
 */

import { NextRequest, NextResponse } from 'next/server'
import pdfParse from 'pdf-parse'
import aiProviderService from '../../../lib/aiProviderService'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const contextString = formData.get('context') as string
    
    let context = {}
    try {
      context = JSON.parse(contextString || '{}')
    } catch (e) {
      console.warn('Failed to parse context:', e)
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No PDF file provided' },
        { status: 400 }
      )
    }

    console.log('📄 Processing PDF file:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })

    // Convert file to buffer and extract text
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Extract text from PDF
    const pdfData = await pdfParse(buffer)
    const extractedText = pdfData.text

    console.log('📝 PDF text extracted:', {
      textLength: extractedText.length,
      pages: pdfData.numpages
    })

    // Use AI to analyze form structure from text
    const analysisPrompt = buildFormAnalysisPrompt(file.name, extractedText, context)
    
    let analysisResult
    try {
      const aiResponse = await aiProviderService.generateCompletion(
        'document-analysis',
        [
          {
            role: 'system',
            content: analysisPrompt.system
          },
          {
            role: 'user',
            content: analysisPrompt.user
          }
        ],
        {
          temperature: 0.1,
          max_tokens: 6000,
          response_format: { type: 'json_object' }
        }
      )

      const responseContent = aiResponse?.content || aiResponse
      if (!responseContent) {
        throw new Error('No response from AI service')
      }

      analysisResult = JSON.parse(String(responseContent))
    } catch (aiError) {
      console.error('AI service error:', aiError)
      
      // Check if this is due to missing API keys
      if (aiError.message.includes('API key') || aiError.message.includes('not configured') || aiError.message.includes('All AI providers failed')) {
        console.log('⚠️ AI service not configured, providing basic text analysis fallback')
        
        // Provide a basic fallback analysis based on text extraction
        analysisResult = {
          formTitle: file.name.replace('.pdf', '').replace(/_/g, ' '),
          formType: 'application',
          confidence: 0.5,
          sections: [
            {
              id: 'section_1',
              title: 'Application Form',
              description: 'Basic application form extracted from PDF',
              order: 1,
              type: 'application'
            }
          ],
          fields: [
            {
              id: 'application_text',
              label: 'Application Content',
              type: 'textarea',
              required: true,
              section: 'section_1',
              canAutoFill: false,
              question: 'Please review and complete the application form content'
            }
          ],
          requirements: [
            {
              type: 'submission',
              description: 'Complete and submit the application form',
              mandatory: true
            }
          ],
          attachments: [],
          deadlines: [],
          keyInformation: {
            submissionMethod: 'Submit through the application portal'
          }
        }
      } else {
        // Re-throw other AI errors
        throw aiError
      }
    }

    // Structure the response
    const structuredResult: any = {
      success: true,
      data: {
        formAnalysis: {
          fileName: file.name,
          formTitle: analysisResult.formTitle || file.name,
          formType: analysisResult.formType || 'application',
          totalPages: pdfData.numpages,
          extractedText: extractedText,
          confidence: analysisResult.confidence || 0.8
        },
        formStructure: {
          sections: analysisResult.sections || [],
          fields: analysisResult.fields || [],
          requirements: analysisResult.requirements || [],
          attachments: analysisResult.attachments || [],
          deadlines: analysisResult.deadlines || [],
          metadata: {
            totalFields: (analysisResult.fields || []).length,
            requiredFields: (analysisResult.fields || []).filter(f => f.required).length,
            sectionsCount: (analysisResult.sections || []).length,
            complexity: calculateFormComplexity(analysisResult)
          }
        },
        walkthrough: {
          estimatedTime: calculateEstimatedTime(analysisResult.fields || []),
          totalSteps: (analysisResult.sections || []).length,
          canAutoFill: (analysisResult.fields || []).filter(f => f.canAutoFill).length
        }
      }
    }

    // Add warning if using fallback analysis
    if (analysisResult.confidence === 0.5) {
      structuredResult.warning = 'AI analysis not available - using basic text extraction. Configure AI API keys for enhanced analysis.'
    }

    console.log('✅ PDF analysis complete:', {
      formTitle: structuredResult.data.formAnalysis.formTitle,
      fieldsFound: structuredResult.data.formStructure.metadata.totalFields,
      sectionsFound: structuredResult.data.formStructure.metadata.sectionsCount
    })

    return NextResponse.json(structuredResult)

  } catch (error) {
    console.error('PDF analysis error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'PDF analysis failed',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

function buildFormAnalysisPrompt(fileName: string, extractedText: string, context: any) {
  return {
    system: `You are an expert form analyst specializing in extracting structured information from application forms, particularly grant applications, loan applications, and registration forms.

Your task is to analyze the text content of a form and extract its complete structure including:
- Form sections and their organization
- Individual form fields with their types and requirements
- Required attachments and documents
- Deadlines and important dates
- Eligibility requirements and submission guidelines

Return your analysis as valid JSON in this exact structure:

{
  "formTitle": "Complete title of the form",
  "formType": "grant_application|loan_application|registration|survey|other",
  "confidence": 0.95,
  "sections": [
    {
      "id": "section_1",
      "title": "Section Title",
      "description": "Section description or instructions",
      "order": 1,
      "type": "cover_sheet|narrative|financial|attachments|certification",
      "fields": ["field_1", "field_2"]
    }
  ],
  "fields": [
    {
      "id": "field_1",
      "label": "Field label as it appears in the form",
      "type": "text|textarea|email|phone|date|currency|number|select|checkbox|radio|file_upload",
      "required": true|false,
      "section": "section_1",
      "placeholder": "Any placeholder or example text",
      "helpText": "Instructions or help text for this field",
      "validation": "Any format requirements",
      "options": ["for select/radio/checkbox fields"],
      "wordLimit": "word/character limits if specified",
      "canAutoFill": true|false,
      "autoFillSource": "organization|project|user|calculated",
      "question": "Full question text for narrative fields"
    }
  ],
  "requirements": [
    {
      "type": "eligibility|submission|documentation|deadline",
      "description": "Detailed requirement description",
      "mandatory": true|false
    }
  ],
  "attachments": [
    {
      "name": "Required attachment name",
      "description": "What needs to be provided",
      "required": true|false,
      "format": "Acceptable file formats"
    }
  ],
  "deadlines": [
    {
      "type": "application|submission|review",
      "description": "Deadline description",
      "importance": "critical|important|optional"
    }
  ],
  "keyInformation": {
    "fundingAmount": "Funding amounts mentioned",
    "contact": "Contact information",
    "submissionMethod": "How to submit",
    "processingTime": "How long review takes"
  }
}`,

    user: `Analyze this form document and extract its complete structure:

File: ${fileName}
Context: ${context.projectData ? 'Project data available' : 'No project data'} | ${context.userProfile ? 'User profile available' : 'No user profile'}

FORM TEXT CONTENT:
${extractedText}

Please:
1. Identify the form type and title
2. Extract all sections and their organization
3. Find all form fields with their types and requirements
4. Identify which fields can be auto-filled from organization/project data
5. Extract requirements, deadlines, and attachment needs
6. Determine the complexity and estimated completion time

Focus on creating a structured walkthrough that can guide users through completion step by step.`
  }
}

function calculateFormComplexity(analysisResult: any): string {
  const fieldCount = (analysisResult.fields || []).length
  const sectionCount = (analysisResult.sections || []).length
  const narrativeFields = (analysisResult.fields || []).filter(f => f.type === 'textarea').length
  
  const score = fieldCount * 0.5 + sectionCount * 2 + narrativeFields * 3
  
  if (score < 15) return 'simple'
  if (score < 35) return 'moderate'
  if (score < 60) return 'complex'
  return 'very_complex'
}

function calculateEstimatedTime(fields: any[]): string {
  const dataFields = fields.filter(f => ['text', 'email', 'phone', 'date', 'number', 'select'].includes(f.type))
  const narrativeFields = fields.filter(f => f.type === 'textarea')
  
  const dataTime = dataFields.length * 2 // 2 minutes per data field
  const narrativeTime = narrativeFields.length * 10 // 10 minutes per narrative field
  
  const totalMinutes = dataTime + narrativeTime
  
  if (totalMinutes < 30) return '15-30 minutes'
  if (totalMinutes < 60) return '30-60 minutes'
  if (totalMinutes < 120) return '1-2 hours'
  return '2+ hours'
}