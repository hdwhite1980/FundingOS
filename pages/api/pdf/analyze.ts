import { NextApiRequest, NextApiResponse } from 'next'
import pdfParse from 'pdf-parse'
import { IncomingForm } from 'formidable'
import fs from 'fs'
import aiProviderService from '../../../lib/aiProviderService'

export const config = {
  api: {
    bodyParser: false,
  },
}

// Helper function to clean JSON from markdown formatting
function cleanJsonFromMarkdown(text: string): string {
  if (!text) return text
  
  // Remove markdown code blocks
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*$/g, '')
  
  // Remove any remaining markdown markers
  cleaned = cleaned.replace(/^```/gm, '').replace(/```$/gm, '')
  
  // Trim whitespace
  cleaned = cleaned.trim()
  
  return cleaned
}

// AI Form Analysis Function
async function analyzeFormStructure(documentText: string, context: any) {
  try {
    const prompt = buildFormAnalysisPrompt(documentText, context.userProfile, context.projectData)
    
    const response = await aiProviderService.generateCompletion(
      'smart-form-completion',
      [
        {
          role: 'system',
          content: 'You are an expert grant application assistant. Analyze application forms and extract their structure. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      {
        maxTokens: 4000,
        temperature: 0.2,
        responseFormat: 'json_object'
      }
    )

    if (!response?.content) {
      throw new Error('No response from AI provider')
    }

    // Clean and parse the AI response
    let analysis
    try {
      const cleanedResponse = cleanJsonFromMarkdown(response.content)
      analysis = JSON.parse(cleanedResponse)
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      console.error('Raw AI response:', response.content?.substring(0, 500))
      throw new Error('Invalid AI response format')
    }
    
    return {
      success: true,
      data: {
        formStructure: analysis,
        extractionMetadata: {
          confidence: analysis.extractionConfidence || 0.7,
          analyzedAt: new Date().toISOString(),
          provider: response.provider,
          model: response.model
        }
      }
    }
  } catch (error) {
    console.error('AI form analysis error:', error)
    throw error
  }
}

function buildFormAnalysisPrompt(formContent: string, userProfile: any, projectData: any) {
  const textContent = typeof formContent === 'string' ? formContent : JSON.stringify(formContent)
  
  return `
CRITICAL: This is a FORM TEMPLATE EXTRACTION task. Extract the exact form structure and fields from this document.

APPLICATION FORM CONTENT:
${textContent.substring(0, 12000)}

TASK: Extract the form template structure from this document so it can be used to generate filled applications.

ANALYSIS REQUIREMENTS:

1. FORM FIELD EXTRACTION (MOST IMPORTANT):
   - Identify ALL form fields, labels, and input areas
   - Look for patterns like: "Field Name: ___", "Field Name: $_____", checkboxes, text areas
   - Extract field types: text, textarea, email, phone, date, currency, select, checkbox
   - Determine which fields are required vs optional
   - Identify field groupings and sections

2. FORM STRUCTURE:
   - Extract section headers and organization
   - Identify field dependencies and relationships
   - Note any special formatting or constraints
   - Extract validation rules or field limits

3. METADATA:
   - Form title and version
   - Instructions or guidelines
   - Submission requirements
   - Contact information

USER PROFILE FOR CONTEXT:
${JSON.stringify(userProfile || {}, null, 2)}

PROJECT DATA FOR CONTEXT:
${JSON.stringify(projectData || {}, null, 2)}

REQUIRED JSON RESPONSE FORMAT:
{
  "formFields": {
    "field_name": {
      "label": "Exact Label Text",
      "type": "text|textarea|email|phone|date|currency|select|checkbox",
      "required": true|false,
      "section": "Section Name",
      "placeholder": "hint text if any",
      "validation": "any constraints",
      "options": ["for select fields"]
    }
  },
  "formSections": [
    {
      "title": "Section Title",
      "fields": ["field_name1", "field_name2"],
      "order": 1
    }
  ],
  "formMetadata": {
    "title": "Form Title",
    "version": "version if specified",
    "totalFields": number,
    "requiredFields": number,
    "documentType": "application|guidelines|requirements"
  },
  "extractionConfidence": number (0-1),
  "detectedFormType": "missouri_grant|federal_grant|foundation|corporate|other"
}

FOCUS: Extract the actual form structure so it can be used as a template for document generation. This is NOT about filling out the form - it's about understanding the form's structure.
  `
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const form = new IncomingForm()
    
    const parseForm = () => {
      return new Promise<{ fields: any, files: any }>((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err)
          else resolve({ fields, files })
        })
      })
    }

    const { fields, files } = await parseForm()
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file
    if (!file) {
      return res.status(400).json({ success: false, error: 'No PDF file provided' })
    }

    const contextString = Array.isArray(fields.context) ? fields.context[0] : fields.context || '{}'
    let context = {}
    try {
      context = JSON.parse(contextString)
    } catch (e) {
      console.warn('Failed to parse context:', e)
    }

    const fileName = file.originalFilename || file.newFilename || 'unknown.pdf'
    const fileBuffer = fs.readFileSync(file.filepath)
    const pdfData = await pdfParse(fileBuffer)
    const extractedText = pdfData.text

    console.log('📄 Processing PDF:', fileName, 'Pages:', pdfData.numpages)
    console.log('🔍 Extracted text length:', extractedText.length, 'characters')

    // Call AI form analysis directly instead of HTTP request to avoid serverless issues
    let analysisResult
    try {
      console.log('🤖 Starting AI form analysis...')
      const aiAnalysis = await analyzeFormStructure(extractedText, context)
      
      if (aiAnalysis?.data?.formStructure) {
        console.log('✅ AI Analysis successful:', {
          fieldsFound: Object.keys(aiAnalysis.data.formStructure?.formFields || {}).length,
          sectionsFound: aiAnalysis.data.formStructure?.formSections?.length || 0
        })
        
        // Convert AI analysis to expected format
        analysisResult = {
          formTitle: aiAnalysis.data.formStructure?.formMetadata?.title || fileName.replace('.pdf', '').replace(/_/g, ' '),
          formType: aiAnalysis.data.formStructure?.formMetadata?.detectedFormType || 'application',
          confidence: aiAnalysis.data.extractionMetadata?.confidence || 0.7,
          sections: aiAnalysis.data.formStructure?.formSections?.map(section => ({
            id: section.id || section.title?.toLowerCase().replace(/\s+/g, '_'),
            title: section.title,
            description: section.description || `${section.title} section`,
            order: section.order || 1,
            type: 'form_section'
          })) || [{
            id: 'section_1',
            title: 'Application Form',
            description: 'PDF form extracted successfully',
            order: 1,
            type: 'application'
          }],
          fields: Object.entries(aiAnalysis.data.formStructure?.formFields || {}).map(([fieldId, field]: [string, any]) => ({
            id: fieldId,
            label: field.label,
            type: field.type || 'text',
            required: field.required || false,
            section: field.section || 'section_1',
            canAutoFill: false,
            question: field.placeholder || field.label
          })),
          requirements: [],
          attachments: [],
          deadlines: []
        }
      } else {
        throw new Error('AI analysis returned invalid structure')
      }
    } catch (error) {
      console.warn('⚠️ Using fallback analysis due to:', error.message)
      // Fallback to basic analysis
      analysisResult = {
        formTitle: fileName.replace('.pdf', '').replace(/_/g, ' '),
        formType: 'application',
        confidence: 0.7,
        sections: [
          {
            id: 'section_1',
            title: 'Application Form',
            description: 'PDF form extracted successfully',
            order: 1,
            type: 'application'
          }
        ],
        fields: [
          {
            id: 'pdf_content',
            label: 'Form Content',
            type: 'textarea',
            required: true,
            section: 'section_1',
            canAutoFill: false,
            question: 'Review and complete the form content'
          }
        ],
        requirements: [],
        attachments: [],
        deadlines: []
      }
    }

    const structuredResult = {
      success: true,
      data: {
        formAnalysis: {
          fileName: fileName,
          formTitle: analysisResult.formTitle,
          formType: analysisResult.formType,
          totalPages: pdfData.numpages,
          extractedText: extractedText,
          confidence: analysisResult.confidence
        },
        formStructure: {
          sections: analysisResult.sections,
          fields: analysisResult.fields,
          requirements: analysisResult.requirements,
          attachments: analysisResult.attachments,
          deadlines: analysisResult.deadlines,
          metadata: {
            totalFields: analysisResult.fields.length,
            requiredFields: analysisResult.fields.filter(f => f.required).length,
            sectionsCount: analysisResult.sections.length,
            complexity: 'moderate'
          }
        },
        walkthrough: {
          estimatedTime: '30-60 minutes',
          totalSteps: analysisResult.sections.length,
          canAutoFill: 0
        }
      }
    }

    // Clean up temporary file
    try {
      fs.unlinkSync(file.filepath)
    } catch (cleanupError) {
      console.warn('Failed to clean up temporary file:', cleanupError)
    }

    console.log('✅ PDF analysis complete:', fileName)
    return res.status(200).json(structuredResult)

  } catch (error) {
    console.error('PDF analysis error:', error)
    return res.status(500).json({
      success: false, 
      error: error.message || 'PDF analysis failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}