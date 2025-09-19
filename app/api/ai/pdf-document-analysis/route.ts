/**
 * Enhanced PDF Document Analysis API (Serverless-safe)
 * - Extracts text from PDFs using pdf-parse (no native deps)
 * - Sends extracted content to AI for structure + field analysis
 * - Avoids image/vision APIs to work reliably on Vercel
 */

import { NextRequest, NextResponse } from 'next/server'
import aiProviderService from '../../../../lib/aiProviderService.js'

// Ensure Node.js runtime for Buffer/pdf-parse support on Vercel
export const runtime = 'nodejs'

// Extract text from PDF with pdf-parse (dynamic import to avoid bundling issues)
async function extractPDFText(pdfBuffer: Buffer): Promise<{ text: string; pages: number; info: any }> {
  try {
    const pdfParse = await import('pdf-parse')
    const data = await pdfParse.default(pdfBuffer)
    return { text: data.text || '', pages: data.numpages || 0, info: data.info || {} }
  } catch (error: any) {
    throw new Error(`PDF text extraction failed: ${error.message || String(error)}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as unknown as File
    const documentType = (formData.get('documentType') as string) || 'application'
    const extractionMode = (formData.get('extractionMode') as string) || 'comprehensive'
    const contextString = (formData.get('context') as string) || '{}'

    let context: any = {}
    try {
      context = JSON.parse(contextString)
    } catch (e) {
      // keep empty context on parse error
    }

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }

    console.log('🔍 Processing PDF file:', {
      fileName: (file as any).name,
      fileSize: (file as any).size,
      fileType: (file as any).type,
      documentType,
      extractionMode
    })

    // Read PDF into Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Extract text (serverless-safe)
    console.log('📄 Extracting text from PDF (pdf-parse)...')
    const { text: extractedText, pages, info } = await extractPDFText(buffer)

    if (!extractedText || extractedText.trim().length < 10) {
      throw new Error('Failed to extract meaningful text from PDF')
    }

    console.log(`✅ Extracted ~${extractedText.length} chars from ${pages} page(s)`)    

    // Build AI prompt/messages
    const analysisPrompt = buildEnhancedPDFAnalysisPrompt(documentType, context, (file as any).name)
    const messages = [
      { role: 'system', content: analysisPrompt.system },
      {
        role: 'user',
        content:
          analysisPrompt.user +
          '\n\nEXTRACTED PDF TEXT (verbatim):\n```\n' +
          extractedText.slice(0, 200000) +
          '\n```' +
          `\n\nMETADATA: pages=${pages}; fileName=${(file as any).name || 'unknown'};`
      }
    ] as any

    console.log('🤖 Sending extracted text to AI for analysis...')
    const aiResponse = await aiProviderService.generateCompletion(
      'enhanced-pdf-document-analysis',
      messages,
      { temperature: 0.1, max_tokens: 6000, response_format: { type: 'json_object' } }
    )

    const responseContent = (aiResponse as any)?.content ?? aiResponse
    if (!responseContent) {
      throw new Error('No response from AI service')
    }

    let analysisResult: any
    try {
      analysisResult = JSON.parse(String(responseContent))
    } catch {
      const jsonMatch = String(responseContent).match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Invalid AI response format')
      analysisResult = JSON.parse(jsonMatch[0])
    }

    const structuredResult = buildStructuredResponse(
      analysisResult,
      file as any,
      documentType,
      context,
      { pages, info }
    )

    console.log('✅ PDF analysis complete:', {
      documentType: structuredResult.data.analysis.documentType,
      detectedFormType: structuredResult.data.analysis.detectedFormType,
      dataFieldsFound: Object.keys(structuredResult.data.analysis.dataFields || {}).length,
      narrativeFieldsFound: Object.keys(structuredResult.data.analysis.narrativeFields || {}).length,
      sectionsFound: structuredResult.data.analysis.documentSections?.length || 0,
      requirementsFound: structuredResult.data.analysis.requirements?.length || 0,
      confidence: structuredResult.data.analysis.extractionConfidence
    })

    return NextResponse.json(structuredResult)
  } catch (error: any) {
    console.error('PDF document analysis error:', error)
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

function buildEnhancedPDFAnalysisPrompt(documentType: string, context: any, fileName: string) {
  const isGrant = documentType === 'grant_application' || fileName?.toLowerCase?.().includes('grant')
  return {
    system: `You are an expert document analyzer who extracts form structure, fields, sections, requirements, and key info from application documents.

Return STRICT JSON only matching this schema:
{
  "extractedText": string,
  "documentType": "grant_application|loan_application|registration_form|survey|other",
  "detectedFormType": string,
  "formTitle": string,
  "confidence": number,
  "documentSections": [ { "sectionId": string, "title": string, "description": string, "order": number, "sectionType": string } ],
  "dataFields": { "field_id": { "label": string, "type": string, "required": boolean, "section": string, "placeholder": string, "validation": string, "options": string[] } },
  "narrativeFields": { "narrative_id": { "question": string, "section": string, "wordLimit": string, "required": boolean, "order": number } },
  "requirements": [ { "type": string, "description": string, "mandatory": boolean, "section": string } ],
  "attachments": [ { "name": string, "description": string, "required": boolean, "format": string } ],
  "keyInformation": { "deadlines": string[], "fundingAmounts": string, "contactInfo": { "organization": string, "email": string, "phone": string, "website": string }, "submissionMethod": string }
}`,
    user: `Analyze the extracted text of this ${documentType} and infer the complete form structure and content.

Context:
- File Name: ${fileName}
- Expected Type: ${documentType}
- User Profile: ${context.userProfile ? 'Available' : 'Not provided'}
- Project Data: ${context.projectData ? 'Available' : 'Not provided'}

${isGrant ? 'Grant-specific: Identify cover sheet vs narrative, deadlines, funding amounts, attachments, eligibility.' : ''}

Be precise. If uncertain, include best-guess with lower confidence. Output valid JSON only.`
  }
}

function buildStructuredResponse(
  analysisResult: any,
  file: File,
  documentType: string,
  context: any,
  meta: { pages: number; info: any }
) {
  const analysis = {
    documentType: analysisResult.documentType || documentType,
    detectedFormType: analysisResult.detectedFormType || 'unknown',
    formTitle: analysisResult.formTitle || (file as any).name || 'Untitled',
    extractionConfidence: analysisResult.confidence ?? 0.8,
    extractedText: analysisResult.extractedText || '',
    documentSections: analysisResult.documentSections || [],
    dataFields: analysisResult.dataFields || {},
    narrativeFields: analysisResult.narrativeFields || {},
    requirements: analysisResult.requirements || [],
    attachments: analysisResult.attachments || [],
    keyInformation: analysisResult.keyInformation || {}
  }

  const totalDataFields = Object.keys(analysis.dataFields).length
  const totalNarrativeFields = Object.keys(analysis.narrativeFields).length
  const totalRequiredFields = [
    ...Object.values<any>(analysis.dataFields),
    ...Object.values<any>(analysis.narrativeFields)
  ].filter((f) => f?.required).length

  return {
    success: true,
    data: {
      analysis,
      formStructure: {
        formFields: { ...analysis.dataFields, ...analysis.narrativeFields },
        dataFields: analysis.dataFields,
        narrativeFields: analysis.narrativeFields,
        formSections: analysis.documentSections,
        formMetadata: {
          title: analysis.formTitle,
          totalFields: totalDataFields + totalNarrativeFields,
          dataFields: totalDataFields,
          narrativeFields: totalNarrativeFields,
          requiredFields: totalRequiredFields,
          sectionsFound: analysis.documentSections.length,
          requirementsFound: analysis.requirements.length,
          attachmentsRequired: analysis.attachments.length,
          documentType: analysis.documentType,
          detectedFormType: analysis.detectedFormType,
          extractionMethod: 'text_extraction_pdf_parse',
          pages: meta.pages
        }
      },
      enhancedAnalysis: {
        requirements: analysis.requirements,
        attachments: analysis.attachments,
        keyInformation: analysis.keyInformation,
        documentSections: analysis.documentSections
      },
      ocrStats: {
        processingTime: Date.now(),
        extractionMethod: 'text_extraction',
        confidence: analysis.extractionConfidence,
        fileSize: (file as any).size,
        fileName: (file as any).name,
        pages: meta.pages
      }
    }
  }
}