'use client'

/**
 * Enhanced Application Tracker - Updated for improved PDF analysis API
 * Integrates with enhanced document analysis for better form field extraction
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, 
  Zap, 
  FileText, 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  X,
  Plus,
  Sparkles,
  Scan,
  Edit,
  Save,
  ArrowRight,
  Clock,
  HelpCircle,
  Lightbulb,
  Download,
  BookOpen,
  Target,
  Users
} from 'lucide-react'
import toast from 'react-hot-toast'
import smartFormCompletionService from '../lib/smartFormCompletionService'
import documentAnalysisService from '../lib/documentAnalysisService'
import documentGenerationService from '../lib/documentGenerationService'
import MissingInfoCollector from './MissingInfoCollector'
import AIAnalysisModal from './AIAnalysisModal'
import AIDocumentAnalysisModal from './AIDocumentAnalysisModal'

export default function EnhancedApplicationTracker({ 
  projects, 
  userProfile, 
  onClose, 
  onSubmit,
  initialState = null,
  onStateChange = null
}) {
  const [step, setStep] = useState(initialState?.step || 'upload') // upload, analyze, missing_info, complete, review
  const [uploadedFiles, setUploadedFiles] = useState(initialState?.uploadedFiles || [])
  const [documentAnalysis, setDocumentAnalysis] = useState(initialState?.documentAnalysis || null)
  const [formCompletion, setFormCompletion] = useState(initialState?.formCompletion || null)
  const [filledForm, setFilledForm] = useState(initialState?.filledForm || {})
  const [missingQuestions, setMissingQuestions] = useState(initialState?.missingQuestions || [])
  const [userAnswers, setUserAnswers] = useState(initialState?.userAnswers || {})
  const [selectedProject, setSelectedProject] = useState(initialState?.selectedProject || '')
  const [processing, setProcessing] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(initialState?.analysisComplete || false)
  const [showMissingInfo, setShowMissingInfo] = useState(false)
  const [aiAnalysisResult, setAiAnalysisResult] = useState(initialState?.aiAnalysisResult || null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentFileName, setCurrentFileName] = useState('')
  const [showAIAnalysisModal, setShowAIAnalysisModal] = useState(false)
  const [showAIDocumentAnalysisModal, setShowAIDocumentAnalysisModal] = useState(false)
  const [analysisData, setAnalysisData] = useState(null)
  const [enhancedFormStructure, setEnhancedFormStructure] = useState(initialState?.enhancedFormStructure || null) // Updated from dynamicFormStructure

  // Save state when it changes
  useEffect(() => {
    if (onStateChange) {
      const currentState = {
        step,
        uploadedFiles,
        documentAnalysis,
        formCompletion,
        filledForm,
        missingQuestions,
        userAnswers,
        selectedProject,
        analysisComplete,
        aiAnalysisResult,
        enhancedFormStructure
      }
      onStateChange(currentState)
    }
  }, [step, uploadedFiles, documentAnalysis, formCompletion, filledForm, missingQuestions, userAnswers, selectedProject, analysisComplete, aiAnalysisResult, enhancedFormStructure, onStateChange])

  // Enhanced file upload and analysis with better error handling and structure parsing
  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return

    setProcessing(true)
    setUploadProgress(0)
    const fileArray = Array.from(files)
    setUploadedFiles(fileArray)

    try {
      const analyses = []
      const totalFiles = fileArray.length
      
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]
        setCurrentFileName(file.name)
        setUploadProgress(((i) / totalFiles) * 100)
        
        // Enhanced FormData with more context for better analysis
        const formData = new FormData()
        formData.append('file', file)
        formData.append('documentType', 'grant_application')
        formData.append('extractionMode', 'comprehensive')
        formData.append('context', JSON.stringify({
          fileName: file.name,
          userProfile,
          projectData: projects.find(p => p.id === selectedProject),
          analysisMode: 'enhanced_structure_extraction'
        }))

        try {
          console.log(`🔍 Sending ${file.name} to enhanced PDF analysis API...`)
          
          // Call the enhanced PDF analysis API
          const analysisResponse = await fetch('/api/pdf/analyze', {
            method: 'POST',
            body: formData
          })

          if (!analysisResponse.ok) {
            throw new Error(`Analysis failed: ${analysisResponse.statusText}`)
          }

          const analysisResult = await analysisResponse.json()
          
          if (!analysisResult.success) {
            throw new Error(analysisResult.error || 'Analysis failed')
          }

          // Map new API response to expected format
          const formAnalysis = analysisResult.data.formAnalysis
          const formStructure = analysisResult.data.formStructure
          const walkthrough = analysisResult.data.walkthrough

          // Convert new structure to legacy format for compatibility
          const legacyAnalysis = {
            documentType: formAnalysis.formType,
            detectedFormType: formAnalysis.formType,
            title: formAnalysis.formTitle,
            totalPages: formAnalysis.totalPages,
            confidence: formAnalysis.confidence,
            extractionConfidence: formAnalysis.confidence,
            // Convert fields to dataFields and narrativeFields
            dataFields: {},
            narrativeFields: {},
            documentSections: formStructure.sections?.map(section => ({
              title: section.title,
              description: section.description,
              type: section.type,
              order: section.order
            })) || [],
            requirements: formStructure.requirements || [],
            attachments: formStructure.attachments || []
          }

          // Categorize fields into data and narrative
          formStructure.fields?.forEach(field => {
            if (field.type === 'textarea' || field.type === 'narrative') {
              legacyAnalysis.narrativeFields[field.id] = {
                question: field.question || field.label,
                type: field.type,
                required: field.required,
                wordLimit: field.wordLimit,
                helpText: field.helpText,
                canAutoFill: field.canAutoFill,
                section: field.section
              }
            } else {
              legacyAnalysis.dataFields[field.id] = {
                label: field.label,
                type: field.type,
                required: field.required,
                placeholder: field.placeholder,
                validation: field.validation,
                options: field.options,
                canAutoFill: field.canAutoFill,
                section: field.section
              }
            }
          })

          // Create legacy formStructure
          const legacyFormStructure = {
            dataFields: legacyAnalysis.dataFields,
            narrativeFields: legacyAnalysis.narrativeFields,
            formMetadata: {
              detectedFormType: formAnalysis.formType,
              totalFields: formStructure.metadata?.totalFields || 0,
              sectionsFound: formStructure.metadata?.sectionsCount || 0,
              complexity: formStructure.metadata?.complexity || 'moderate'
            },
            enhancedAnalysis: {
              requirements: formStructure.requirements || [],
              attachments: formStructure.attachments || [],
              deadlines: formStructure.deadlines || []
            }
          }

          // Create legacy enhancedAnalysis
          const legacyEnhancedAnalysis = {
            walkthrough: walkthrough,
            keyInformation: {
              estimatedTime: walkthrough.estimatedTime,
              totalSteps: walkthrough.totalSteps,
              canAutoFill: walkthrough.canAutoFill
            }
          }

          // Create ocrStats
          const ocrStats = {
            documentComplexity: formStructure.metadata?.complexity || 'moderate',
            structureQuality: formAnalysis.confidence > 0.8 ? 'high' : 'medium',
            totalFields: formStructure.metadata?.totalFields || 0,
            sectionsFound: formStructure.metadata?.sectionsCount || 0
          }

          console.log('📊 Enhanced analysis result:', {
            documentType: legacyAnalysis.documentType,
            detectedFormType: legacyAnalysis.detectedFormType,
            dataFields: Object.keys(legacyAnalysis.dataFields || {}).length,
            narrativeFields: Object.keys(legacyAnalysis.narrativeFields || {}).length,
            sections: legacyAnalysis.documentSections?.length || 0,
            requirements: legacyAnalysis.requirements?.length || 0,
            attachments: legacyAnalysis.attachments?.length || 0
          })

          // Store enhanced form structure for better processing
          if (legacyFormStructure && (
            Object.keys(legacyFormStructure.dataFields || {}).length > 0 ||
            Object.keys(legacyFormStructure.narrativeFields || {}).length > 0
          )) {
            setEnhancedFormStructure({
              ...legacyFormStructure,
              enhancedAnalysis: legacyEnhancedAnalysis,
              ocrStats: ocrStats
            })
            console.log(`📝 Enhanced form structure extracted with ${
              Object.keys(legacyFormStructure.dataFields || {}).length + 
              Object.keys(legacyFormStructure.narrativeFields || {}).length
            } total fields`)
          }
          
          analyses.push({
            fileName: file.name,
            analysis: {
              ...legacyAnalysis,
              enhancedAnalysis: legacyEnhancedAnalysis
            },
            formStructure: legacyFormStructure,
            fileSize: file.size,
            fileType: file.type,
            ocrStats: ocrStats
          })

        } catch (fileError) {
          console.error(`Failed to process ${file.name}:`, fileError)
          toast.error(`Failed to process ${file.name}: ${fileError.message}`)
          
          analyses.push({
            fileName: file.name,
            analysis: { 
              error: fileError.message, 
              documentType: 'Unknown',
              extractionConfidence: 0
            },
            fileSize: file.size,
            fileType: file.type
          })
        }
        
        setUploadProgress(((i + 1) / totalFiles) * 100)
      }

      setDocumentAnalysis(analyses)
      setAnalysisComplete(true)
      setStep('analyze')
      
      const successfulAnalyses = analyses.filter(a => !a.analysis.error)
      if (successfulAnalyses.length > 0) {
        toast.success(`Successfully analyzed ${successfulAnalyses.length} of ${fileArray.length} document(s)`)
      } else {
        toast.error('All document analyses failed. Please try different files.')
      }

    } catch (error) {
      console.error('Document upload/analysis failed:', error)
      toast.error('Failed to analyze documents: ' + error.message)
    } finally {
      setProcessing(false)
      setUploadProgress(0)
      setCurrentFileName('')
    }
  }

  // Enhanced form completion with better structure handling
  const handleFormCompletion = async () => {
    if (!documentAnalysis || !selectedProject) {
      toast.error('Please select a project and upload application documents')
      return
    }

    setProcessing(true)
    try {
      const project = projects.find(p => p.id === selectedProject)
      if (!project) {
        throw new Error('Selected project not found')
      }

      console.log('📋 Enhanced form completion with data:', {
        projectId: project.id,
        projectName: project.name || project.title,
        enhancedStructure: !!enhancedFormStructure,
        totalFields: enhancedFormStructure ? 
          Object.keys(enhancedFormStructure.dataFields || {}).length + 
          Object.keys(enhancedFormStructure.narrativeFields || {}).length : 0
      })

      // Combine all form fields from enhanced analysis
      const combinedDataFields = {}
      const combinedNarrativeFields = {}
      const combinedRequirements = []
      const combinedAttachments = []

      documentAnalysis.forEach(({ analysis, formStructure }) => {
        if (analysis.dataFields) {
          Object.assign(combinedDataFields, analysis.dataFields)
        }
        if (analysis.narrativeFields) {
          Object.assign(combinedNarrativeFields, analysis.narrativeFields)
        }
        if (analysis.requirements) {
          combinedRequirements.push(...analysis.requirements)
        }
        if (analysis.attachments) {
          combinedAttachments.push(...analysis.attachments)
        }
      })

      console.log('🔄 Calling enhanced smart form completion API:', {
        dataFields: Object.keys(combinedDataFields).length,
        narrativeFields: Object.keys(combinedNarrativeFields).length,
        requirements: combinedRequirements.length,
        attachments: combinedAttachments.length
      })

      // Call enhanced smart form completion API (now generate-walkthrough)
      const completionResponse = await fetch('/api/ai/generate-walkthrough', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formStructure: {
            formTitle: enhancedFormStructure?.formMetadata?.detectedFormType || 'Application Form',
            fields: [
              ...Object.entries(enhancedFormStructure?.dataFields || {}).map(([id, field]) => ({
                id,
                ...field,
                type: field.type || 'text'
              })),
              ...Object.entries(enhancedFormStructure?.narrativeFields || {}).map(([id, field]) => ({
                id,
                ...field,
                type: 'textarea'
              }))
            ],
            sections: enhancedFormStructure?.enhancedAnalysis?.requirements?.map((req, idx) => ({
              id: `section_${idx}`,
              title: req.type || 'Section',
              description: req.description,
              type: req.type
            })) || []
          },
          userProfile: userProfile,
          projectData: project,
          companySettings: userProfile // Use userProfile as company settings fallback
        })
      })

      if (!completionResponse.ok) {
        const errorText = await completionResponse.text()
        console.error('Enhanced form completion API error:', errorText)
        throw new Error(`Form completion failed: ${errorText}`)
      }

      const completion = await completionResponse.json()
      console.log('✅ Enhanced form completion result:', {
        steps: completion.data?.walkthrough?.totalSteps || 0,
        autoFilled: completion.data?.progress?.canAutoFill || 0,
        needsInput: completion.data?.progress?.needsInput || 0,
        aiAssisted: completion.data?.progress?.requiresAI || 0
      })

      // Map new API response to legacy format for compatibility
      const legacyCompletion = {
        completionPercentage: Math.round(((completion.data?.progress?.canAutoFill || 0) / (completion.data?.progress?.totalFields || 1)) * 100),
        confidence: 0.85, // Default confidence for walkthrough
        dataFieldCompletions: {},
        narrativeFieldCompletions: {},
        filledForm: {},
        opportunityTitle: completion.data?.walkthrough?.formTitle || 'AI-Enhanced Application',
        opportunityDescription: `Generated walkthrough with ${completion.data?.walkthrough?.totalSteps || 0} steps`,
        amountMin: project?.funding_needed || 0,
        amountMax: project?.funding_needed || 100000,
        deadline: null,
        strengths: completion.data?.aiAssistance?.recommendations || ['Walkthrough generated successfully'],
        challenges: completion.data?.complexFields?.map(f => f.reason) || [],
        recommendations: completion.data?.aiAssistance?.availableHelp?.map(h => h.description) || [],
        nextSteps: completion.data?.walkthrough?.steps?.map(s => s.title) || [],
        reasoning: 'AI-generated guided completion walkthrough',
        walkthrough: completion.data?.walkthrough,
        autoFillData: completion.data?.autoFillData,
        aiAssistance: completion.data?.aiAssistance
      }

      // Populate filled form from auto-fill suggestions
      if (completion.data?.autoFillData?.suggestions) {
        Object.entries(completion.data.autoFillData.suggestions).forEach(([fieldId, suggestion]) => {
          if (suggestion.confidence > 0.7) {
            legacyCompletion.filledForm[fieldId] = suggestion.value
            // Categorize as data or narrative field
            if (enhancedFormStructure?.dataFields?.[fieldId]) {
              legacyCompletion.dataFieldCompletions[fieldId] = suggestion.value
            } else if (enhancedFormStructure?.narrativeFields?.[fieldId]) {
              legacyCompletion.narrativeFieldCompletions[fieldId] = suggestion.value
            }
          }
        })
      }

      setFormCompletion(legacyCompletion)
      
      // Merge data and narrative field completions
      const mergedFilledForm = {
        ...legacyCompletion.dataFieldCompletions || {},
        ...legacyCompletion.narrativeFieldCompletions || {},
        ...legacyCompletion.filledForm || {} // Legacy compatibility
      }
      setFilledForm(mergedFilledForm)
      
      // Create enhanced opportunity data
      const enhancedOpportunity = {
        id: `ai-enhanced-${Date.now()}`,
        title: legacyCompletion.opportunityTitle || 'AI-Enhanced Grant Opportunity',
        description: legacyCompletion.opportunityDescription || 'Opportunity analyzed from uploaded documents with enhanced structure recognition',
        sponsor: legacyCompletion.sponsor || 'Various Sponsors',
        amount_min: legacyCompletion.amountMin || 0,
        amount_max: legacyCompletion.amountMax || 100000,
        deadline_date: legacyCompletion.deadline || null,
        eligibility_requirements: combinedRequirements.map(r => r.description).join('; ') || 'Standard requirements apply',
        form_type: enhancedFormStructure?.formMetadata?.detectedFormType || 'unknown',
        complexity: enhancedFormStructure?.ocrStats?.documentComplexity || 'moderate'
      }

      // Enhanced analysis data for modal
      const enhancedAnalysisData = {
        opportunity: enhancedOpportunity,
        project: project,
        userProfile: userProfile,
        analysis: {
          fitScore: legacyCompletion.completionPercentage || 75,
          strengths: legacyCompletion.strengths || [
            'Enhanced document structure analysis completed',
            'Form fields automatically categorized',
            'Narrative and data fields distinguished'
          ],
          challenges: legacyCompletion.challenges || ['Some complex fields may need manual review'],
          recommendations: legacyCompletion.recommendations || [
            'Review AI-generated content for accuracy',
            'Complete any missing narrative sections',
            'Verify all data field mappings'
          ],
          nextSteps: legacyCompletion.nextSteps || [
            'Review enhanced application structure',
            'Complete missing information',
            'Download completed application'
          ],
          confidence: legacyCompletion.confidence || 0.85,
          reasoning: legacyCompletion.reasoning || 'Enhanced analysis with structure recognition and field categorization',
          enhancedFeatures: {
            structureAnalysis: true,
            fieldCategorization: true,
            narrativeRecognition: true,
            requirementExtraction: combinedRequirements.length > 0,
            attachmentIdentification: combinedAttachments.length > 0
          }
        },
        quickMatchScore: legacyCompletion.completionPercentage || 75,
        enhancedStructure: enhancedFormStructure
      }

      setAnalysisData(enhancedAnalysisData)
      setStep('complete')
      
      // Handle blank applications or missing info
      if (legacyCompletion.walkthrough?.steps?.some(step => step.type === 'input_required') && legacyCompletion.autoFillData?.needsInput?.length > 0) {
        setAiAnalysisResult(legacyCompletion)
        setShowMissingInfo(true)
        setStep('missing_info')
        try {
          toast?.info?.('Additional information needed for optimal completion.')
        } catch (toastError) {
          console.log('ℹ️ Additional information needed for optimal completion.')
        }
      } else {
        try {
          toast?.success?.('Enhanced form analysis complete!')
        } catch (toastError) {
          console.log('✅ Enhanced form analysis complete!')
        }
      }

    } catch (error) {
      console.error('Enhanced form completion failed:', error)
      try {
        toast?.error?.('Failed to analyze form: ' + error.message)
      } catch (toastError) {
        console.error('❌ Failed to analyze form:', error.message)
      }
    } finally {
      setProcessing(false)
    }
  }

  // Enhanced download with better document generation
  const handleDownloadApplication = async () => {
    try {
      setProcessing(true)
      
      const project = projects.find(p => p.id === selectedProject)
      
      if (!enhancedFormStructure) {
        toast.error('No enhanced form structure available for generation')
        return
      }

      console.log('📥 Generating enhanced application document:', {
        formType: enhancedFormStructure.formMetadata?.detectedFormType,
        totalFields: Object.keys(enhancedFormStructure.dataFields || {}).length + 
                    Object.keys(enhancedFormStructure.narrativeFields || {}).length,
        projectName: project?.name || 'Unknown'
      })

      // Call enhanced document generation API (now form export)
      const response = await fetch('/api/form/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formStructure: enhancedFormStructure,
          completedData: {
            dataFields: formCompletion?.dataFieldCompletions || {},
            narrativeFields: formCompletion?.narrativeFieldCompletions || {},
            userAnswers: userAnswers
          },
          exportFormat: 'pdf',
          options: {
            includeEmptyFields: true,
            addInstructions: true,
            format: 'pdf',
            enhancedGeneration: true,
            preserveStructure: true
          }
        })
      })

      if (!response.ok) {
        throw new Error('Enhanced generation API failed')
      }

      const result = await response.json()
      if (result.success) {
        // Handle the new export API response format
        const exportData = result.data
        
        if (exportData.format === 'pdf' && exportData.data) {
          // Convert data URL to blob and download
          const dataUrl = exportData.data
          const base64Data = dataUrl.split(',')[1]
          const binaryData = atob(base64Data)
          const bytes = new Uint8Array(binaryData.length)
          for (let i = 0; i < binaryData.length; i++) {
            bytes[i] = binaryData.charCodeAt(i)
          }
          const blob = new Blob([bytes], { type: exportData.mimeType || 'application/pdf' })
          
          // Create download link
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = exportData.filename || `enhanced-${enhancedFormStructure.formMetadata?.detectedFormType || 'application'}-${project?.name || 'document'}.pdf`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
          
          toast.success('Enhanced application document downloaded successfully!')
        } else {
          throw new Error('Unsupported export format or missing data')
        }
      } else {
        throw new Error(result.message || 'Enhanced generation failed')
      }
      
    } catch (error) {
      console.error('Enhanced download error:', error)
      toast.error('Failed to download enhanced application: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  // Updated analysis step rendering with enhanced structure display
  const renderAnalysisStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
          <Brain className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Enhanced Document Analysis Complete</h3>
        <p className="text-slate-600">AI has performed enhanced analysis with structure recognition and field categorization</p>
      </div>

      {documentAnalysis && (
        <div className="bg-slate-50 rounded-lg p-6 space-y-4">
          <h4 className="font-medium text-slate-900 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-blue-600" />
            Enhanced Analysis Results:
          </h4>
          {documentAnalysis.map((doc, index) => (
            <div key={index} className="border border-slate-200 rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-slate-900">{doc.fileName}</h5>
                <div className="flex items-center space-x-2">
                  {doc.analysis.error ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-xs text-red-600">Failed</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs text-emerald-600">Enhanced Analysis</span>
                    </>
                  )}
                </div>
              </div>
              
              {!doc.analysis.error && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Type:</span>
                    <div className="font-medium text-slate-900">{doc.analysis.detectedFormType || doc.analysis.documentType || 'Unknown'}</div>
                  </div>
                  <div>
                    <span className="text-slate-600">Data Fields:</span>
                    <div className="font-medium text-blue-600">{Object.keys(doc.analysis.dataFields || {}).length}</div>
                  </div>
                  <div>
                    <span className="text-slate-600">Narrative Fields:</span>
                    <div className="font-medium text-purple-600">{Object.keys(doc.analysis.narrativeFields || {}).length}</div>
                  </div>
                  <div>
                    <span className="text-slate-600">Confidence:</span>
                    <div className="font-medium text-emerald-600">{Math.round((doc.analysis.extractionConfidence || 0) * 100)}%</div>
                  </div>
                </div>
              )}

              {doc.analysis.error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                  <strong>Error:</strong> {doc.analysis.error}
                </div>
              )}

              {doc.analysis.documentSections && doc.analysis.documentSections.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Document Sections:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {doc.analysis.documentSections.slice(0, 5).map((section, idx) => (
                      <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        {section.title}
                      </span>
                    ))}
                    {doc.analysis.documentSections.length > 5 && (
                      <span className="text-xs text-slate-500">+{doc.analysis.documentSections.length - 5} more</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {enhancedFormStructure && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mt-4">
              <h5 className="font-medium text-emerald-900 flex items-center mb-3">
                <Sparkles className="w-4 h-4 mr-2" />
                Enhanced Structure Extracted
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-emerald-700">Form Type:</span>
                  <div className="font-medium text-emerald-900">{enhancedFormStructure.formMetadata?.detectedFormType || 'Unknown'}</div>
                </div>
                <div>
                  <span className="text-emerald-700">Total Fields:</span>
                  <div className="font-medium text-emerald-900">{enhancedFormStructure.formMetadata?.totalFields || 0}</div>
                </div>
                <div>
                  <span className="text-emerald-700">Complexity:</span>
                  <div className="font-medium text-emerald-900 capitalize">{enhancedFormStructure.ocrStats?.documentComplexity || 'Unknown'}</div>
                </div>
                <div>
                  <span className="text-emerald-700">Quality:</span>
                  <div className="font-medium text-emerald-900 capitalize">{enhancedFormStructure.ocrStats?.structureQuality || 'Unknown'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex space-x-4">
        <button
          onClick={() => setStep('upload')}
          className="flex-1 py-3 px-4 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Back to Upload
        </button>
        <button
          onClick={handleFormCompletion}
          disabled={processing || !documentAnalysis?.some(doc => !doc.analysis.error)}
          className="flex-1 py-3 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {processing ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Zap className="w-5 h-5" />
          )}
          <span>{processing ? 'Processing...' : 'Generate Enhanced Completion'}</span>
        </button>
      </div>
    </div>
  )

  // Enhanced completion step rendering
  const renderCompletionStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
          <CheckCircle className="w-6 h-6 text-emerald-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Enhanced Form Completion Ready</h3>
        <p className="text-slate-600">AI has analyzed and intelligently pre-filled your application with structure recognition</p>
      </div>

      {formCompletion && (
        <div className="bg-emerald-50 rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {formCompletion.completionPercentage || 0}%
              </div>
              <div className="text-sm text-slate-600">Complete</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round((formCompletion.confidence || 0) * 100)}%
              </div>
              <div className="text-sm text-slate-600">Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {enhancedFormStructure?.formMetadata?.totalFields || 0}
              </div>
              <div className="text-sm text-slate-600">Fields Found</div>
            </div>
          </div>
          
          {/* Enhanced field completion breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center mb-2">
                <Target className="w-4 h-4 mr-2 text-blue-600" />
                <h5 className="font-medium text-slate-900">Data Fields</h5>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {Object.keys(formCompletion.dataFieldCompletions || {}).length}
              </div>
              <div className="text-sm text-slate-600">Completed automatically</div>
            </div>
            
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center mb-2">
                <BookOpen className="w-4 h-4 mr-2 text-purple-600" />
                <h5 className="font-medium text-slate-900">Narrative Fields</h5>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {Object.keys(formCompletion.narrativeFieldCompletions || {}).length}
              </div>
              <div className="text-sm text-slate-600">Generated intelligently</div>
            </div>
          </div>
          
          {Object.keys(filledForm).length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-slate-900">Edit Application Fields:</h4>
                <span className="text-sm text-slate-500">{Object.keys(filledForm).length} fields detected</span>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-3 border border-slate-200 rounded-lg p-4">
                {Object.entries(filledForm).map(([field, value]) => (
                  <div key={field} className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 capitalize">
                      {field.replace(/_/g, ' ')}:
                    </label>
                    {field.toLowerCase().includes('description') || 
                     field.toLowerCase().includes('narrative') ||
                     field.toLowerCase().includes('summary') ||
                     field.toLowerCase().includes('statement') ||
                     (typeof value === 'string' && value.length > 100) ? (
                      <textarea
                        value={value || ''}
                        onChange={(e) => setFilledForm(prev => ({ ...prev, [field]: e.target.value }))}
                        className="w-full p-3 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                        rows={4}
                        placeholder={`Enter ${field.replace(/_/g, ' ').toLowerCase()}...`}
                      />
                    ) : (
                      <input
                        type={field.toLowerCase().includes('amount') || field.toLowerCase().includes('budget') || field.toLowerCase().includes('funding') ? 'number' : 
                              field.toLowerCase().includes('date') || field.toLowerCase().includes('deadline') ? 'date' : 
                              field.toLowerCase().includes('email') ? 'email' : 
                              field.toLowerCase().includes('phone') ? 'tel' : 'text'}
                        value={value || ''}
                        onChange={(e) => setFilledForm(prev => ({ ...prev, [field]: e.target.value }))}
                        className="w-full p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder={`Enter ${field.replace(/_/g, ' ').toLowerCase()}...`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {missingQuestions.length > 0 && (
        <div className="bg-amber-50 rounded-lg p-4">
          <h4 className="font-medium text-slate-900 mb-2 flex items-center">
            <HelpCircle className="w-4 h-4 mr-2 text-amber-600" />
            Additional Information Needed
          </h4>
          <p className="text-sm text-slate-600 mb-3">
            Answer these questions to enhance your application:
          </p>
          <div className="space-y-3">
            {missingQuestions.slice(0, 3).map((question, index) => (
              <div key={question.id || index} className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  {question.question}
                </label>
                <input
                  type="text"
                  placeholder="Enter your answer..."
                  onChange={(e) => handleQuestionAnswer(question.id, e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex space-x-4">
        <button
          onClick={() => setStep('analyze')}
          className="py-3 px-4 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Back to Analysis
        </button>
        <button
          onClick={handleDownloadApplication}
          disabled={processing || !enhancedFormStructure}
          className="py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {processing ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download className="w-5 h-5" />
          )}
          <span>{processing ? 'Generating...' : 'Download Application'}</span>
        </button>
        <button
          onClick={() => setStep('review')}
          className="flex-1 py-3 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-2"
        >
          <Edit className="w-5 h-5" />
          <span>Review & Submit</span>
        </button>
      </div>
    </div>
  )

  // Enhanced review step with better structure display
  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
          <Save className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Review Enhanced Application</h3>
        <p className="text-slate-600">Final review of your AI-enhanced application</p>
      </div>

      <div className="bg-slate-50 rounded-lg p-6 space-y-6">
        <h4 className="font-medium text-slate-900 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-blue-600" />
          Application Summary:
        </h4>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-600">Project:</span>
            <div className="font-medium text-slate-900">
              {projects.find(p => p.id === selectedProject)?.name || projects.find(p => p.id === selectedProject)?.title || 'Unknown Project'}
            </div>
          </div>
          <div>
            <span className="text-slate-600">Funding Amount:</span>
            <div className="font-medium text-slate-900">
              ${formatFundingAmount()}
            </div>
          </div>
          <div>
            <span className="text-slate-600">Documents Analyzed:</span>
            <div className="font-medium text-slate-900">{documentAnalysis?.length || 0}</div>
          </div>
          <div>
            <span className="text-slate-600">Overall Completion:</span>
            <div className="font-medium text-slate-900">{formCompletion?.completionPercentage || 0}%</div>
          </div>
          <div>
            <span className="text-slate-600">Form Type:</span>
            <div className="font-medium text-slate-900">{enhancedFormStructure?.formMetadata?.detectedFormType || 'Unknown'}</div>
          </div>
          <div>
            <span className="text-slate-600">Complexity:</span>
            <div className="font-medium text-slate-900 capitalize">{enhancedFormStructure?.ocrStats?.documentComplexity || 'Unknown'}</div>
          </div>
        </div>

        {/* Enhanced structure breakdown */}
        {enhancedFormStructure && (
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h5 className="font-medium text-slate-900 mb-3 flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-emerald-600" />
              Enhanced Structure Analysis
            </h5>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center bg-blue-50 rounded p-3">
                <div className="text-xl font-bold text-blue-600">
                  {Object.keys(enhancedFormStructure.dataFields || {}).length}
                </div>
                <div className="text-sm text-slate-600">Data Fields</div>
              </div>
              <div className="text-center bg-purple-50 rounded p-3">
                <div className="text-xl font-bold text-purple-600">
                  {Object.keys(enhancedFormStructure.narrativeFields || {}).length}
                </div>
                <div className="text-sm text-slate-600">Narrative Fields</div>
              </div>
              <div className="text-center bg-emerald-50 rounded p-3">
                <div className="text-xl font-bold text-emerald-600">
                  {enhancedFormStructure.formMetadata?.sectionsFound || 0}
                </div>
                <div className="text-sm text-slate-600">Sections Found</div>
              </div>
            </div>

            {/* Sample fields display */}
            <div className="space-y-3">
              {Object.keys(enhancedFormStructure.dataFields || {}).length > 0 && (
                <div>
                  <h6 className="text-sm font-medium text-slate-700 mb-2">Sample Data Fields:</h6>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(enhancedFormStructure.dataFields).slice(0, 6).map(([fieldId, fieldConfig]) => (
                      <span key={fieldId} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        {fieldConfig.label || fieldId.replace(/_/g, ' ')}
                      </span>
                    ))}
                    {Object.keys(enhancedFormStructure.dataFields).length > 6 && (
                      <span className="text-xs text-slate-500 self-center">
                        +{Object.keys(enhancedFormStructure.dataFields).length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {Object.keys(enhancedFormStructure.narrativeFields || {}).length > 0 && (
                <div>
                  <h6 className="text-sm font-medium text-slate-700 mb-2">Sample Narrative Fields:</h6>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(enhancedFormStructure.narrativeFields).slice(0, 4).map(([fieldId, fieldConfig]) => (
                      <span key={fieldId} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                        {fieldConfig.question?.substring(0, 30) || fieldId.replace(/_/g, ' ')}...
                      </span>
                    ))}
                    {Object.keys(enhancedFormStructure.narrativeFields).length > 4 && (
                      <span className="text-xs text-slate-500 self-center">
                        +{Object.keys(enhancedFormStructure.narrativeFields).length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Completion status */}
        {filledForm && Object.keys(filledForm).length > 0 && (
          <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-4">
            <h5 className="font-medium text-slate-900 mb-3 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
              AI Completion Status
            </h5>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-xl font-bold text-emerald-600">
                  {Object.keys(filledForm).filter(key => filledForm[key] && filledForm[key] !== '[To be completed]').length}
                </div>
                <div className="text-sm text-slate-600">Fields Completed</div>
              </div>
              <div>
                <div className="text-xl font-bold text-amber-600">
                  {Object.keys(filledForm).filter(key => !filledForm[key] || filledForm[key] === '[To be completed]').length}
                </div>
                <div className="text-sm text-slate-600">Fields Pending</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex space-x-4">
        <button
          onClick={() => setStep('complete')}
          className="flex-1 py-3 px-4 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Back to Edit
        </button>
        <button
          onClick={handleDownloadApplication}
          disabled={processing || !enhancedFormStructure}
          className="py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download className="w-5 h-5" />
          )}
          <span>{processing ? 'Generating...' : 'Download Enhanced App'}</span>
        </button>
        <button
          onClick={handleFinalSubmit}
          className="flex-1 py-3 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-2"
        >
          <CheckCircle className="w-5 h-5" />
          <span>Submit Application</span>
        </button>
      </div>
    </div>
  )

  // Enhanced upload step (keep existing but add enhanced indicators)
  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
          <Scan className="w-6 h-6 text-emerald-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Application Documents</h3>
        <p className="text-slate-600">Upload forms for enhanced AI analysis with structure recognition and intelligent field categorization</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 flex items-center mb-2">
          <Sparkles className="w-4 h-4 mr-2" />
          Enhanced Analysis Features
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-blue-800">
          <div className="flex items-center">
            <Target className="w-4 h-4 mr-2" />
            Field categorization
          </div>
          <div className="flex items-center">
            <BookOpen className="w-4 h-4 mr-2" />
            Narrative recognition
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Structure mapping
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-2 block">Select Project *</label>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">Choose a project...</option>
          {(projects || []).filter(project => project && project.id).map(project => (
            <option key={project.id} value={project.id}>
              {project.name || project.title || 'Untitled Project'}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-2 block">
          Upload Application Forms
        </label>
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-emerald-400 hover:bg-emerald-50 transition-all">
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
            id="file-upload"
            disabled={!selectedProject || processing}
          />
          <label 
            htmlFor="file-upload" 
            className={`cursor-pointer ${!selectedProject || processing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-slate-900 mb-2">
              Drop files here or click to upload
            </h4>
            <p className="text-slate-600">
              Supports PDF, Word documents, and text files
            </p>
            <p className="text-xs text-emerald-600 mt-2">
              Enhanced AI will analyze structure, categorize fields, and extract requirements
            </p>
          </label>
          
          {/* Upload Progress Bar */}
          {processing && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-emerald-600">
                  {currentFileName ? `Enhanced analysis: ${currentFileName}` : 'Processing with enhanced AI...'}
                </span>
                <span className="text-sm text-slate-500">{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-500 mt-2">Enhanced AI is analyzing structure and categorizing fields...</p>
            </div>
          )}
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="bg-slate-50 rounded-lg p-4">
          <h4 className="font-medium text-slate-900 mb-2">Uploaded Files:</h4>
          {uploadedFiles.map((file, index) => (
            <div key={index} className="flex items-center space-x-2 text-sm text-slate-600">
              <FileText className="w-4 h-4" />
              <span>{file.name}</span>
              <span className="text-xs">({Math.round(file.size / 1024)}KB)</span>
            </div>
          ))}
        </div>
      )}

      {!selectedProject && (
        <div className="text-center text-amber-600 text-sm">
          Please select a project before uploading documents
        </div>
      )}
    </div>
  )

  // Keep all other helper functions and state management the same...
  const handleQuestionAnswer = (questionId, answer) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))

    const question = missingQuestions.find(q => q.id === questionId)
    if (question) {
      setFilledForm(prev => ({
        ...prev,
        [question.field || questionId]: answer
      }))
    }
  }

  const handleInfoCollected = async (completedData) => {
    setUserAnswers(completedData.collectedInfo)
    
    const updatedForm = { ...filledForm }
    
    Object.entries(completedData.autoFillSuggestions || {}).forEach(([fieldName, suggestion]) => {
      if (suggestion.confidence > 0.8) {
        updatedForm[fieldName] = suggestion.value
      }
    })
    
    Object.entries(completedData.collectedInfo || {}).forEach(([fieldName, info]) => {
      updatedForm[fieldName] = info.answer
    })
    
    setFilledForm(updatedForm)
    setShowMissingInfo(false)
    setStep('complete')
    
    toast.success('Information collected! Your enhanced application is ready for review.')
  }

  const handleInfoCancelled = () => {
    setShowMissingInfo(false)
    setStep('analyze')
    toast.info('Info collection cancelled. You can try again when ready.')
  }

  const handleAIAnalysisModalClose = () => {
    setShowAIAnalysisModal(false)
    setAnalysisData(null)
    if (step === 'analyze') {
      setStep('complete')
    }
  }

  const handleAIDocumentAnalysisModalClose = () => {
    setShowAIDocumentAnalysisModal(false)
    setAnalysisData(null)
  }

  const handleFinalSubmit = () => {
    const fundingAmount = formatFundingAmount().replace(/,/g, '')
    
    const finalData = {
      project_id: selectedProject,
      opportunity_title: filledForm.opportunity_title || documentAnalysis?.[0]?.analysis?.title || 'AI-Enhanced Application',
      application_id: filledForm.application_id || '',
      submitted_amount: parseFloat(fundingAmount || 0),
      submission_date: new Date().toISOString().split('T')[0],
      status: 'submitted',
      notes: `Enhanced AI completion with ${formCompletion?.completionPercentage || 0}% completeness`,
      ai_completion_data: {
        completionPercentage: formCompletion?.completionPercentage,
        confidence: formCompletion?.confidence,
        analysisDate: formCompletion?.analysisDate,
        documentsAnalyzed: documentAnalysis?.length || 0,
        questionsAnswered: Object.keys(userAnswers).length,
        enhancedFeatures: {
          structureRecognition: !!enhancedFormStructure,
          fieldCategorization: true,
          narrativeExtraction: Object.keys(formCompletion?.narrativeFieldCompletions || {}).length > 0
        }
      }
    }

    onSubmit(finalData)
  }

  const formatFundingAmount = () => {
    const currentProject = projects.find(p => p.id === selectedProject)
    
    const formFundingAmount = filledForm.funding_amount || 
                             filledForm.budget_amount || 
                             filledForm.requested_amount ||
                             filledForm.amount_requested ||
                             filledForm.total_budget ||
                             filledForm.project_budget

    if (formFundingAmount && formFundingAmount !== '0' && formFundingAmount !== 0) {
      return Number(formFundingAmount).toLocaleString()
    }
    
    const projectFunding = currentProject?.funding_needed || 
                          currentProject?.total_project_budget || 
                          currentProject?.funding_request_amount ||
                          currentProject?.budget_amount

    if (projectFunding && projectFunding !== 0) {
      return Number(projectFunding).toLocaleString()
    }
    
    if (formCompletion?.amountMax && formCompletion.amountMax > 0) {
      return Number(formCompletion.amountMax).toLocaleString()
    }
    
    if (formCompletion?.amountMin && formCompletion.amountMin > 0) {
      return Number(formCompletion.amountMin).toLocaleString()
    }
    
    return '0'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Enhanced AI Application Tracker</h2>
            <div className="flex items-center space-x-2">
              {(step !== 'upload' || uploadedFiles.length > 0) && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors flex items-center space-x-1"
                >
                  <Save className="w-4 h-4" />
                  <span>Save & Close</span>
                </button>
              )}
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-center px-6 py-4 bg-slate-50">
            {['upload', 'analyze', 'missing_info', 'complete', 'review'].map((stepName, index) => (
              <div key={stepName} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === stepName
                    ? 'bg-emerald-600 text-white'
                    : index < ['upload', 'analyze', 'missing_info', 'complete', 'review'].indexOf(step)
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  {index + 1}
                </div>
                {index < 4 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    index < ['upload', 'analyze', 'missing_info', 'complete', 'review'].indexOf(step)
                      ? 'bg-emerald-600'
                      : 'bg-slate-200'
                  }`} />
                )}
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {step === 'upload' && renderUploadStep()}
                {step === 'analyze' && renderAnalysisStep()}
                {step === 'missing_info' && (
                  <MissingInfoCollector
                    analysisResult={aiAnalysisResult}
                    onInfoCollected={handleInfoCollected}
                    onCancel={handleInfoCancelled}
                    userProfile={userProfile}
                    projectData={projects.find(p => p.id === selectedProject)}
                  />
                )}
                {step === 'complete' && renderCompletionStep()}
                {step === 'review' && renderReviewStep()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Modals */}
      {showAIAnalysisModal && analysisData && (
        <AIAnalysisModal
          opportunity={analysisData.opportunity}
          project={analysisData.project}
          userProfile={analysisData.userProfile}
          quickMatchScore={analysisData.quickMatchScore}
          onClose={handleAIAnalysisModalClose}
        />
      )}

      {showAIDocumentAnalysisModal && analysisData && (
        <AIDocumentAnalysisModal
          opportunity={analysisData.opportunity}
          project={analysisData.project}
          userProfile={analysisData.userProfile}
          onClose={handleAIDocumentAnalysisModalClose}
        />
      )}
    </div>
  )
}