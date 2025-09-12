/**
 * Enhanced Application Tracker - Integrates ApplicationAssistant functionality 
 * into the Application Progress workflow for smart form completion
 */

'use client'
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

export default function EnhancedApplicationTracker({ 
  projects, 
  userProfile, 
  onClose, 
  onSubmit 
}) {
  const [step, setStep] = useState('upload') // upload, analyze, complete, review
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [documentAnalysis, setDocumentAnalysis] = useState(null)
  const [formCompletion, setFormCompletion] = useState(null)
  const [filledForm, setFilledForm] = useState({})
  const [missingQuestions, setMissingQuestions] = useState([])
  const [userAnswers, setUserAnswers] = useState({})
  const [selectedProject, setSelectedProject] = useState('')
  const [processing, setProcessing] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(false)

  // Handle file upload and analysis
  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return

    setProcessing(true)
    try {
      const fileArray = Array.from(files)
      setUploadedFiles(fileArray)

      // Analyze documents to extract form structure and requirements
      const analyses = []
      for (const file of fileArray) {
        try {
          const analysis = await documentAnalysisService.analyzeDocument(
            file,
            userProfile,
            { enableFormExtraction: true, enableRequirementAnalysis: true }
          )
          analyses.push({ file: file.name, analysis })
        } catch (error) {
          console.error(`Error analyzing ${file.name}:`, error)
          analyses.push({ 
            file: file.name, 
            analysis: { 
              error: error.message,
              documentType: 'unknown',
              formFields: {},
              requirements: []
            }
          })
        }
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
      setFilledForm(completion.fieldCompletions || {})

      // Generate questions for missing information
      if (completion.missingInformation && completion.missingInformation.length > 0) {
        const questions = await smartFormCompletionService.generateClarifyingQuestions(
          { missing_critical: completion.missingInformation },
          { userProfile, projectData: project, requirements: combinedRequirements }
        )
        setMissingQuestions(questions)
      }

      setStep('complete')
      toast.success('Form analysis complete!')

    } catch (error) {
      console.error('Form completion failed:', error)
      toast.error('Failed to analyze form: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  // Handle user answers to missing information questions
  const handleAnswerQuestion = (questionId, answer) => {
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

  // Finalize and submit the application
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
          className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
        >
          <option value="">Choose project for this application</option>
          {projects.map(project => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-emerald-400 transition-colors">
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt"
          onChange={(e) => handleFileUpload(e.target.files)}
          className="hidden"
          id="document-upload"
          disabled={!selectedProject}
        />
        <label
          htmlFor="document-upload"
          className={`cursor-pointer ${!selectedProject ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-900 mb-1">
            Drop application documents here or click to browse
          </p>
          <p className="text-xs text-slate-500">
            Supports PDF, Word documents, and text files
          </p>
        </label>
      </div>

      {!selectedProject && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-amber-600 mr-2" />
            <p className="text-sm text-amber-800">Please select a project before uploading documents</p>
          </div>
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
        <p className="text-slate-600">We've analyzed your documents and identified the required fields</p>
      </div>

      {documentAnalysis && documentAnalysis.map(({ file, analysis }, index) => (
        <div key={index} className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <FileText className="w-5 h-5 text-slate-400 mr-2" />
              <span className="font-medium text-slate-900">{file}</span>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              analysis.error 
                ? 'bg-red-100 text-red-700'
                : analysis.documentType === 'application'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {analysis.error ? 'Error' : analysis.documentType || 'Analyzed'}
            </span>
          </div>
          
          {analysis.error ? (
            <p className="text-sm text-red-600">{analysis.error}</p>
          ) : (
            <div className="space-y-2">
              {analysis.formFields && Object.keys(analysis.formFields).length > 0 && (
                <p className="text-sm text-slate-600">
                  Found {Object.keys(analysis.formFields).length} form fields
                </p>
              )}
              {analysis.requirements && analysis.requirements.length > 0 && (
                <p className="text-sm text-slate-600">
                  Identified {analysis.requirements.length} requirements
                </p>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="flex justify-between pt-4">
        <button
          onClick={() => setStep('upload')}
          className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm"
        >
          Back
        </button>
        <button
          onClick={handleFormCompletion}
          disabled={processing}
          className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm flex items-center space-x-2"
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span>AI Complete Form</span>
            </>
          )}
        </button>
      </div>
    </div>
  )

  // Render completion step
  const renderCompletionStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
          <Sparkles className="w-6 h-6 text-purple-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Smart Form Completion</h3>
        <p className="text-slate-600">
          AI completed {formCompletion?.completionPercentage || 0}% of the form using your project data
        </p>
      </div>

      {formCompletion && (
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-600">{formCompletion.completionPercentage || 0}%</p>
              <p className="text-xs text-slate-600">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{Object.keys(filledForm).length}</p>
              <p className="text-xs text-slate-600">Fields Filled</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{Math.round((formCompletion.confidence || 0) * 100)}%</p>
              <p className="text-xs text-slate-600">Confidence</p>
            </div>
          </div>
        </div>
      )}

      {/* Show filled form fields */}
      <div className="space-y-3">
        <h4 className="font-medium text-slate-900">Auto-filled Fields</h4>
        <div className="max-h-40 overflow-y-auto space-y-2">
          {Object.entries(filledForm).map(([field, value]) => (
            <div key={field} className="flex items-center justify-between p-2 bg-emerald-50 rounded border border-emerald-200">
              <span className="text-sm font-medium text-slate-700">
                {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
              <span className="text-sm text-slate-600 truncate ml-2">{String(value).substring(0, 50)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Missing information questions */}
      {missingQuestions.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-slate-900 flex items-center">
            <HelpCircle className="w-5 h-5 text-blue-600 mr-2" />
            Additional Information Needed
          </h4>
          {missingQuestions.map((question) => (
            <div key={question.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-slate-900 mb-2">
                {question.question}
              </label>
              {question.helpText && (
                <p className="text-xs text-slate-600 mb-3">{question.helpText}</p>
              )}
              <input
                type="text"
                className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your answer..."
                value={userAnswers[question.id] || ''}
                onChange={(e) => handleAnswerQuestion(question.id, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Strategic recommendations */}
      {formCompletion?.strategicRecommendations && formCompletion.strategicRecommendations.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-slate-900 flex items-center">
            <Lightbulb className="w-5 h-5 text-amber-600 mr-2" />
            AI Recommendations
          </h4>
          {formCompletion.strategicRecommendations.map((rec, index) => (
            <div key={index} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm font-medium text-slate-900">{rec.title}</p>
              <p className="text-sm text-slate-700 mt-1">{rec.description}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button
          onClick={() => setStep('analyze')}
          className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm"
        >
          Back
        </button>
        <button
          onClick={() => setStep('review')}
          className="bg-purple-600 text-white hover:bg-purple-700 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm flex items-center space-x-2"
        >
          <ArrowRight className="w-4 h-4" />
          <span>Review & Submit</span>
        </button>
      </div>
    </div>
  )

  // Render review step
  const renderReviewStep = () => {
    const project = projects.find(p => p.id === selectedProject)
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Review Application Details</h3>
          <p className="text-slate-600">Review the AI-completed information before tracking this application</p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs font-medium text-slate-600">Project</p>
              <p className="font-medium text-slate-900">{project?.name}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs font-medium text-slate-600">Documents Processed</p>
              <p className="font-medium text-slate-900">{documentAnalysis?.length || 0}</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs font-medium text-slate-600">Application Title</p>
            <p className="font-medium text-slate-900">
              {filledForm.opportunity_title || documentAnalysis?.[0]?.analysis?.title || 'AI-Assisted Application'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs font-medium text-slate-600">Requested Amount</p>
              <p className="font-medium text-slate-900">
                ${parseFloat(filledForm.funding_amount || filledForm.budget_amount || filledForm.requested_amount || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs font-medium text-slate-600">AI Completion</p>
              <p className="font-medium text-slate-900">{formCompletion?.completionPercentage || 0}%</p>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <h5 className="font-medium text-slate-900 mb-2 flex items-center">
              <Sparkles className="w-4 h-4 text-emerald-600 mr-2" />
              AI Enhancement Summary
            </h5>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>• Analyzed {documentAnalysis?.length || 0} document(s)</li>
              <li>• Auto-filled {Object.keys(filledForm).length} form fields</li>
              <li>• Answered {Object.keys(userAnswers).length} clarifying question(s)</li>
              <li>• {formCompletion?.completionPercentage || 0}% completion confidence</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <button
            onClick={() => setStep('complete')}
            className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm"
          >
            Back to Edit
          </button>
          <button
            onClick={handleFinalSubmit}
            className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Track Application</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          {/* Header with progress */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">AI-Enhanced Application Tracker</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-center mb-8">
            {['upload', 'analyze', 'complete', 'review'].map((stepName, index) => (
              <div key={stepName} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === stepName
                    ? 'bg-emerald-600 text-white'
                    : index < ['upload', 'analyze', 'complete', 'review'].indexOf(step)
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  {index + 1}
                </div>
                {index < 3 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    index < ['upload', 'analyze', 'complete', 'review'].indexOf(step)
                      ? 'bg-emerald-600'
                      : 'bg-slate-200'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Content based on current step */}
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
              {step === 'complete' && renderCompletionStep()}
              {step === 'review' && renderReviewStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}