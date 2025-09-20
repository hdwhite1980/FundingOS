import { NextApiRequest, NextApiResponse } from 'next'
import pdfParse from 'pdf-parse'
import { IncomingForm } from 'formidable'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: false,
  },
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

    // Call the AI document analysis service to properly analyze form structure
    let analysisResult
    try {
      const documentAnalysisResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ai/document-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentContent: extractedText,
          documentType: 'application',
          userProfile: (context as any).userProfile || null,
          projectData: (context as any).projectData || null
        })
      })

      if (documentAnalysisResponse.ok) {
        const aiAnalysis = await documentAnalysisResponse.json()
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
        console.warn('❌ AI Analysis failed, using fallback')
        throw new Error('AI analysis failed')
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