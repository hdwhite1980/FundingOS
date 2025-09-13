'use client'

/**
 * Enhanced Application Tracker - Integrates ApplicationAssistant functionality 
 * into the Application Progress workflow for smart form completion
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
  Download
} from 'lucide-react'
import toast from 'react-hot-toast'
import smartFormCompletionService from '../lib/smartFormCompletionService'
import documentAnalysisService from '../lib/documentAnalysisService'
import MissingInfoCollector from './MissingInfoCollector'
import AIAnalysisModal from './AIAnalysisModal'

export default function EnhancedApplicationTracker({ 
  projects, 
  userProfile, 
  onClose, 
  onSubmit 
}) {
  const [step, setStep] = useState('upload') // upload, analyze, missing_info, complete, review
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [documentAnalysis, setDocumentAnalysis] = useState(null)
  const [formCompletion, setFormCompletion] = useState(null)
  const [filledForm, setFilledForm] = useState({})
  const [missingQuestions, setMissingQuestions] = useState([])
  const [userAnswers, setUserAnswers] = useState({})
  const [selectedProject, setSelectedProject] = useState('')
  const [processing, setProcessing] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [showMissingInfo, setShowMissingInfo] = useState(false)
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentFileName, setCurrentFileName] = useState('')
  const [showAIAnalysisModal, setShowAIAnalysisModal] = useState(false)
  const [analysisData, setAnalysisData] = useState(null)

  // Handle file upload and analysis
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
        
        const reader = new FileReader()
        const fileContent = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target.result)
          reader.readAsText(file)
        })

        if (fileContent) {
          const analysis = await documentAnalysisService.analyzeDocument(
            fileContent, 
            file.type || 'application/pdf',
            {
              userProfile,
              projectData: projects.find(p => p.id === selectedProject),
              analysisType: 'application_form'
            }
          )
          
          analyses.push({
            fileName: file.name,
            analysis,
            fileSize: file.size,
            fileType: file.type
          })
        }
        
        setUploadProgress(((i + 1) / totalFiles) * 100)
      }

      setDocumentAnalysis(analyses)
      setAnalysisComplete(true)
      setStep('analyze')
      toast.success(`Analyzed ${fileArray.length} document(s)`)

    } catch (error) {
      console.error('Document upload/analysis failed:', error)
      toast.error('Failed to analyze documents: ' + error.message)
    } finally {
      setProcessing(false)
      setUploadProgress(0)
      setCurrentFileName('')
    }
  }

  // AI form completion based on analysis and user profile
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

      // Combine form fields from all analyzed documents
      const combinedFormFields = {}
      const combinedRequirements = []

      documentAnalysis.forEach(({ analysis }) => {
        if (analysis.formFields) {
          Object.assign(combinedFormFields, analysis.formFields)
        }
        if (analysis.requirements) {
          combinedRequirements.push(...analysis.requirements)
        }
      })

      // Use smart form completion service to fill out the form
      const completion = await smartFormCompletionService.analyzeAndCompleteForm(
        combinedFormFields,
        userProfile,
        project,
        [] // previousApplications - empty for now
      )

      setFormCompletion(completion)
      setFilledForm(completion.filledForm || completion.fieldCompletions || {})
      
      // Create mock opportunity data for AI analysis
      const mockOpportunity = {
        id: `ai-generated-${Date.now()}`,
        title: completion.opportunityTitle || 'AI-Analyzed Grant Opportunity',
        description: completion.opportunityDescription || 'Opportunity analyzed from uploaded documents',
        sponsor: completion.sponsor || 'Various Sponsors',
        amount_min: completion.amountMin || 0,
        amount_max: completion.amountMax || 50000,
        deadline_date: completion.deadline || null,
        eligibility_requirements: completion.requirements || 'Standard requirements apply'
      }

      // Prepare analysis data for the modal
      const analysisDataForModal = {
        opportunity: mockOpportunity,
        project: project,
        userProfile: userProfile,
        analysis: {
          fitScore: completion.completionPercentage || 75,
          strengths: completion.strengths || ['Document analysis completed', 'Form fields identified'],
          challenges: completion.challenges || ['Some information may need verification'],
          recommendations: completion.recommendations || ['Review generated content', 'Customize for specific requirements'],
          nextSteps: completion.nextSteps || ['Review application', 'Submit to grant agency'],
          confidence: completion.confidence || 0.8,
          reasoning: completion.reasoning || 'Analysis based on document content and project information'
        },
        quickMatchScore: completion.completionPercentage || 75
      }

      setAnalysisData(analysisDataForModal)
      setShowAIAnalysisModal(true)
      
      // Check if we have a blank application that needs missing info collection
      if (completion.formStatus?.isBlank && completion.questionsForUser?.length > 0) {
        setAiAnalysisResult(completion)
        setShowMissingInfo(true)
        setStep('missing_info')
        toast.info('We detected a blank application. Let\'s collect the required information.')
      } else {
        // Generate questions for missing information if needed
        if (completion.missingInformation && completion.missingInformation.length > 0) {
          const questions = await smartFormCompletionService.generateClarifyingQuestions(
            { missing_critical: completion.missingInformation },
            { userProfile, projectData: project, requirements: combinedRequirements }
          )
          setMissingQuestions(questions)
        }

        setStep('complete')
        toast.success('Form analysis complete!')
      }

    } catch (error) {
      console.error('Form completion failed:', error)
      toast.error('Failed to analyze form: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  // Handle answers to missing info questions
  const handleQuestionAnswer = (questionId, answer) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))

    // Update filled form with the answer
    const question = missingQuestions.find(q => q.id === questionId)
    if (question) {
      setFilledForm(prev => ({
        ...prev,
        [question.field || questionId]: answer
      }))
    }
  }

  // Handle completion of missing info collection
  const handleInfoCollected = async (completedData) => {
    setUserAnswers(completedData.collectedInfo)
    
    // Merge collected information with auto-fill suggestions
    const updatedForm = { ...filledForm }
    
    // Apply auto-fill suggestions
    Object.entries(completedData.autoFillSuggestions).forEach(([fieldName, suggestion]) => {
      if (suggestion.confidence > 0.8) { // High confidence auto-fill
        updatedForm[fieldName] = suggestion.value
      }
    })
    
    // Apply collected user answers
    Object.entries(completedData.collectedInfo).forEach(([fieldName, info]) => {
      updatedForm[fieldName] = info.answer
    })
    
    setFilledForm(updatedForm)
    setShowMissingInfo(false)
    setStep('complete')
    
    toast.success('Information collected! Your application is now ready for review.')
  }

  // Handle cancellation of missing info collection
  const handleInfoCancelled = () => {
    setShowMissingInfo(false)
    setStep('analyze')
    toast.info('Info collection cancelled. You can try again when ready.')
  }

  // Handle download of generated application
  const handleDownloadApplication = async () => {
    try {
      setProcessing(true)
      
      const project = projects.find(p => p.id === selectedProject)
      const mockOpportunity = {
        id: `ai-generated-${Date.now()}`,
        title: filledForm.opportunity_title || 'AI-Generated Application',
        description: 'Generated from uploaded documents',
        sponsor: filledForm.sponsor || 'Various Sponsors',
        amount_min: parseFloat(filledForm.funding_amount || filledForm.budget_amount || 0),
        amount_max: parseFloat(filledForm.funding_amount || filledForm.budget_amount || 50000),
        deadline_date: filledForm.deadline || null,
        eligibility_requirements: filledForm.requirements || 'Standard requirements apply'
      }

      const applicationData = {
        opportunity: mockOpportunity,
        project: project,
        userProfile: userProfile,
        analysis: {
          fitScore: formCompletion?.completionPercentage || 75,
          strengths: formCompletion?.strengths || ['Application generated successfully'],
          challenges: formCompletion?.challenges || [],
          recommendations: formCompletion?.recommendations || ['Review and customize as needed'],
          nextSteps: formCompletion?.nextSteps || ['Submit to grant agency'],
          confidence: formCompletion?.confidence || 0.8,
          reasoning: formCompletion?.reasoning || 'AI-generated application'
        },
        applicationDraft: '',
        createdAt: new Date().toISOString()
      }

      const response = await fetch('/api/ai/generate-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationData,
          documentType: 'grant-application'
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate document')
      }

      const result = await response.json()
      
      // Create and download the document
      const blob = new Blob([result.document], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `${project.name}_${mockOpportunity.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_application.docx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)

      toast.success('Application document downloaded successfully!')
      
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download application: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }
  const handleFinalSubmit = () => {
    const finalData = {
      project_id: selectedProject,
      opportunity_title: filledForm.opportunity_title || documentAnalysis?.[0]?.analysis?.title || 'AI-Assisted Application',
      application_id: filledForm.application_id || '',
      submitted_amount: parseFloat(filledForm.funding_amount || filledForm.budget_amount || filledForm.requested_amount || 0),
      submission_date: new Date().toISOString().split('T')[0],
      status: 'submitted',
      notes: `AI-assisted completion with ${formCompletion?.completionPercentage || 0}% completeness`,
      ai_completion_data: {
        completionPercentage: formCompletion?.completionPercentage,
        confidence: formCompletion?.confidence,
        analysisDate: formCompletion?.analysisDate,
        documentsAnalyzed: documentAnalysis?.length || 0,
        questionsAnswered: Object.keys(userAnswers).length
      }
    }

    onSubmit(finalData)
  }

  // Render upload step
  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
          <Scan className="w-6 h-6 text-emerald-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Application Documents</h3>
        <p className="text-slate-600">Upload blank application forms and we'll help you fill them out using your project information</p>
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
          </label>
          
          {/* Upload Progress Bar */}
          {processing && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-emerald-600">
                  {currentFileName ? `Analyzing: ${currentFileName}` : 'Processing...'}
                </span>
                <span className="text-sm text-slate-500">{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-500 mt-2">AI is analyzing your documents...</p>
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

  // Render analysis step
  const renderAnalysisStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
          <Brain className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Document Analysis Complete</h3>
        <p className="text-slate-600">AI has analyzed your documents. Ready to generate intelligent form completion?</p>
      </div>

      {documentAnalysis && (
        <div className="bg-slate-50 rounded-lg p-6 space-y-4">
          <h4 className="font-medium text-slate-900">Analysis Results:</h4>
          {documentAnalysis.map((doc, index) => (
            <div key={index} className="border border-slate-200 rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-slate-900">{doc.fileName}</h5>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-emerald-600">Analyzed</span>
                </div>
              </div>
              <div className="text-sm text-slate-600">
                <p><strong>Type:</strong> {doc.analysis?.documentType || 'Unknown'}</p>
                <p><strong>Fields Found:</strong> {Object.keys(doc.analysis?.formFields || {}).length}</p>
                <p><strong>Requirements:</strong> {doc.analysis?.requirements?.length || 0} found</p>
              </div>
            </div>
          ))}
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
          disabled={processing}
          className="flex-1 py-3 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {processing ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Zap className="w-5 h-5" />
          )}
          <span>{processing ? 'Analyzing...' : 'Generate Smart Completion'}</span>
        </button>
      </div>
    </div>
  )

  // Render completion step
  const renderCompletionStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
          <CheckCircle className="w-6 h-6 text-emerald-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Form Completion Ready</h3>
        <p className="text-slate-600">AI has analyzed and pre-filled your application form</p>
      </div>

      {formCompletion && (
        <div className="bg-emerald-50 rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
          </div>
          
          {Object.keys(filledForm).length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-slate-900">Pre-filled Fields:</h4>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {Object.entries(filledForm).slice(0, 10).map(([field, value]) => (
                  <div key={field} className="flex justify-between text-sm">
                    <span className="text-slate-600 capitalize">{field.replace(/_/g, ' ')}:</span>
                    <span className="text-slate-900 font-medium truncate max-w-xs">
                      {typeof value === 'string' ? value.substring(0, 50) + (value.length > 50 ? '...' : '') : String(value)}
                    </span>
                  </div>
                ))}
                {Object.keys(filledForm).length > 10 && (
                  <div className="text-xs text-slate-500">
                    +{Object.keys(filledForm).length - 10} more fields
                  </div>
                )}
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
            Answer these questions to complete your application:
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
          className="flex-1 py-3 px-4 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Back to Analysis
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

  // Render review step
  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
          <Save className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Review Your Application</h3>
        <p className="text-slate-600">Final review before submission</p>
      </div>

      <div className="bg-slate-50 rounded-lg p-6 space-y-4">
        <h4 className="font-medium text-slate-900">Application Summary:</h4>
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
              ${filledForm.funding_amount || filledForm.budget_amount || filledForm.requested_amount || '0'}
            </div>
          </div>
          <div>
            <span className="text-slate-600">Documents Analyzed:</span>
            <div className="font-medium text-slate-900">{documentAnalysis?.length || 0}</div>
          </div>
          <div>
            <span className="text-slate-600">Completion:</span>
            <div className="font-medium text-slate-900">{formCompletion?.completionPercentage || 0}%</div>
          </div>
        </div>
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
          disabled={processing}
          className="py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download className="w-5 h-5" />
          )}
          <span>{processing ? 'Generating...' : 'Download Application'}</span>
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
            <h2 className="text-xl font-bold text-slate-900">AI-Enhanced Application Tracker</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-center mb-8">
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

      {/* AI Analysis Modal */}
      {showAIAnalysisModal && analysisData && (
        <AIAnalysisModal
          opportunity={analysisData.opportunity}
          project={analysisData.project}
          userProfile={analysisData.userProfile}
          quickMatchScore={analysisData.quickMatchScore}
          onClose={handleAIAnalysisModalClose}
        />
      )}
    </div>
  )
}