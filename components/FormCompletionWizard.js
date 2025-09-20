'use client'

/**
 * AI Form Completion Wizard - Main component for guided form completion
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
  ArrowRight,
  ArrowLeft,
  Edit,
  Save,
  Download,
  Clock,
  HelpCircle,
  Lightbulb,
  Settings,
  User,
  Building
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function FormCompletionWizard({ 
  projects, 
  userProfile, 
  companySettings,
  onClose, 
  onSave 
}) {
  const [step, setStep] = useState('upload') // upload, analyze, walkthrough, complete, export
  const [uploadedFile, setUploadedFile] = useState(null)
  const [formAnalysis, setFormAnalysis] = useState(null)
  const [walkthrough, setWalkthrough] = useState(null)
  const [selectedProject, setSelectedProject] = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  const [completedData, setCompletedData] = useState({})
  const [processing, setProcessing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [aiAssistanceData, setAiAssistanceData] = useState({})

  // Handle file upload and analysis
  const handleFileUpload = async (file) => {
    if (!file) return

    setProcessing(true)
    setUploadProgress(0)
    setUploadedFile(file)

    try {
      // Animate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('context', JSON.stringify({
        fileName: file.name,
        userProfile,
        projectData: projects.find(p => p.id === selectedProject),
        companySettings
      }))

      const response = await fetch('/api/pdf/analyze', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Analysis failed')
      }

      setFormAnalysis(result.data)
      setStep('analyze')
      toast.success('Form analyzed successfully!')

    } catch (error) {
      console.error('File upload/analysis failed:', error)
      toast.error('Failed to analyze form: ' + error.message)
    } finally {
      setProcessing(false)
      setUploadProgress(0)
    }
  }

  // Generate walkthrough
  const handleGenerateWalkthrough = async () => {
    if (!formAnalysis || !selectedProject) {
      toast.error('Please select a project and ensure form is analyzed')
      return
    }

    setProcessing(true)
    try {
      const project = projects.find(p => p.id === selectedProject)
      
      const response = await fetch('/api/ai/generate-walkthrough', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formStructure: formAnalysis.formStructure,
          userProfile,
          projectData: project,
          companySettings
        })
      })

      if (!response.ok) {
        throw new Error('Walkthrough generation failed')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Walkthrough generation failed')
      }

      setWalkthrough(result.data)
      
      // Initialize completed data with auto-fill suggestions
      const initialData = {}
      Object.entries(result.data.autoFillData.suggestions || {}).forEach(([fieldId, suggestion]) => {
        if (suggestion.confidence > 0.7) {
          initialData[fieldId] = suggestion.value
        }
      })
      setCompletedData(initialData)
      
      setStep('walkthrough')
      toast.success('Walkthrough generated! Ready to start completion.')

    } catch (error) {
      console.error('Walkthrough generation failed:', error)
      toast.error('Failed to generate walkthrough: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  // Handle field completion
  const handleFieldUpdate = (fieldId, value) => {
    setCompletedData(prev => ({
      ...prev,
      [fieldId]: value
    }))
  }

  // Get AI assistance for a field
  const handleGetAIAssistance = async (field, assistanceType = 'general') => {
    setProcessing(true)
    try {
      const project = projects.find(p => p.id === selectedProject)
      
      const response = await fetch('/api/ai/assist-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field,
          question: field.question || field.label,
          userInput: completedData[field.id] || '',
          projectData: project,
          userProfile,
          assistanceType,
          context: {
            formType: formAnalysis?.formAnalysis?.formType,
            otherFields: completedData
          }
        })
      })

      if (!response.ok) {
        throw new Error('AI assistance failed')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'AI assistance failed')
      }

      // Store AI assistance data for the field
      setAiAssistanceData(prev => ({
        ...prev,
        [field.id]: result.data.assistance
      }))

      // If it's a draft generation, update the field value
      if (result.data.assistance.type === 'draft_response') {
        handleFieldUpdate(field.id, result.data.assistance.response)
      }

      toast.success('AI assistance provided!')
      return result.data.assistance

    } catch (error) {
      console.error('AI assistance failed:', error)
      toast.error('Failed to get AI assistance: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  // Export completed form
  const handleExport = async (format = 'pdf') => {
    setProcessing(true)
    try {
      const response = await fetch('/api/form/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formStructure: formAnalysis.formStructure,
          completedData,
          exportFormat: format,
          options: {
            includeEmptyFields: true,
            autoFilledFields: walkthrough?.autoFillData?.autoFilled || []
          }
        })
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Export failed')
      }

      // Download the file
      const link = document.createElement('a')
      link.href = result.data.data
      link.download = result.data.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`Form exported as ${format.toUpperCase()}!`)

    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export form: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  // Render upload step
  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Upload className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Application Form</h2>
        <p className="text-gray-600">Upload your PDF application form and we'll help you complete it with AI</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">What our AI can help with:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-800">
          <div className="flex items-center">
            <Building className="w-4 h-4 mr-2" />
            Auto-fill organization details
          </div>
          <div className="flex items-center">
            <User className="w-4 h-4 mr-2" />
            Auto-fill contact information
          </div>
          <div className="flex items-center">
            <Brain className="w-4 h-4 mr-2" />
            Generate narrative responses
          </div>
          <div className="flex items-center">
            <Edit className="w-4 h-4 mr-2" />
            Improve existing answers
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Project *</label>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Choose a project...</option>
          {(projects || []).map(project => (
            <option key={project.id} value={project.id}>
              {project.name || project.title || 'Untitled Project'}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Upload Application Form</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-all">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => handleFileUpload(e.target.files[0])}
            className="hidden"
            id="file-upload"
            disabled={!selectedProject || processing}
          />
          <label 
            htmlFor="file-upload" 
            className={`cursor-pointer ${!selectedProject || processing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Drop PDF here or click to upload
            </h4>
            <p className="text-gray-600">
              Supports PDF application forms and documents
            </p>
          </label>
          
          {processing && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-600">
                  Analyzing form structure...
                </span>
                <span className="text-sm text-gray-500">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {uploadedFile && !processing && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span className="font-medium text-green-900">File uploaded: {uploadedFile.name}</span>
          </div>
        </div>
      )}
    </div>
  )

  // Render analysis step
  const renderAnalysisStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Brain className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Form Analysis Complete</h2>
        <p className="text-gray-600">AI has analyzed your form structure and identified completion opportunities</p>
      </div>

      {formAnalysis && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 mb-4">Analysis Results</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {formAnalysis.formStructure?.metadata?.totalFields || 0}
              </div>
              <div className="text-sm text-gray-600">Total Fields</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formAnalysis.walkthrough?.canAutoFill || 0}
              </div>
              <div className="text-sm text-gray-600">Auto-fillable</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {formAnalysis.walkthrough?.estimatedTime || 'Unknown'}
              </div>
              <div className="text-sm text-gray-600">Est. Time</div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Form Details:</h4>
            <div className="text-sm space-y-1">
              <p><span className="font-medium">Title:</span> {formAnalysis.formAnalysis?.formTitle}</p>
              <p><span className="font-medium">Type:</span> {formAnalysis.formAnalysis?.formType}</p>
              <p><span className="font-medium">Sections:</span> {formAnalysis.formStructure?.metadata?.sectionsCount || 0}</p>
              <p><span className="font-medium">Complexity:</span> <span className="capitalize">{formAnalysis.formStructure?.metadata?.complexity}</span></p>
            </div>
          </div>
        </div>
      )}

      <div className="flex space-x-4">
        <button
          onClick={() => setStep('upload')}
          className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back to Upload
        </button>
        <button
          onClick={handleGenerateWalkthrough}
          disabled={processing}
          className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {processing ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Zap className="w-5 h-5" />
          )}
          <span>{processing ? 'Generating...' : 'Start Guided Completion'}</span>
        </button>
      </div>
    </div>
  )

  // Render walkthrough step
  const renderWalkthroughStep = () => {
    if (!walkthrough?.walkthrough?.steps) return <div>Loading walkthrough...</div>

    const steps = walkthrough.walkthrough.steps
    const currentStepData = steps[currentStep]
    
    if (!currentStepData) return <div>No step data available</div>

    const progress = ((currentStep + 1) / steps.length) * 100
    const isLastStep = currentStep === steps.length - 1

    return (
      <div className="space-y-6">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Step {currentStep + 1} of {steps.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Current step */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">{currentStepData.title}</h3>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-500">{currentStepData.estimatedTime}</span>
            </div>
          </div>
          
          <p className="text-gray-600 mb-6">{currentStepData.description}</p>

          {currentStepData.instructions && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
              <p className="text-blue-800 text-sm">{currentStepData.instructions}</p>
            </div>
          )}

          {/* Render fields for this step */}
          <div className="space-y-6">
            {(currentStepData.fields || []).map(fieldId => {
              const field = formAnalysis.formStructure.fields?.find(f => f.id === fieldId)
              if (!field) return null

              return (
                <FieldInput
                  key={fieldId}
                  field={field}
                  value={completedData[fieldId] || ''}
                  onChange={(value) => handleFieldUpdate(fieldId, value)}
                  onAIAssist={(assistanceType) => handleGetAIAssistance(field, assistanceType)}
                  aiAssistance={aiAssistanceData[fieldId]}
                  autoFilled={walkthrough.autoFillData?.autoFilled?.includes(fieldId)}
                  processing={processing}
                />
              )
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : setStep('analyze')}
            className="flex items-center space-x-2 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>
          
          <button
            onClick={() => isLastStep ? setStep('export') : setCurrentStep(currentStep + 1)}
            className="flex items-center space-x-2 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span>{isLastStep ? 'Review & Export' : 'Next'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // Render export step
  const renderExportStep = () => {
    const completedFields = Object.keys(completedData).length
    const totalFields = formAnalysis?.formStructure?.metadata?.totalFields || 0
    const completionPercentage = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Complete</h2>
          <p className="text-gray-600">Review your completed application and export it</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Completion Summary</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{completionPercentage}%</div>
              <div className="text-sm text-gray-600">Complete</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{completedFields}</div>
              <div className="text-sm text-gray-600">Fields Filled</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {walkthrough?.autoFillData?.autoFilled?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Auto-filled</div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Export Options:</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleExport('pdf')}
                disabled={processing}
                className="flex items-center justify-center space-x-2 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Download className="w-5 h-5 text-gray-600" />
                <span>Export as PDF</span>
              </button>
              
              <button
                onClick={() => handleExport('html')}
                disabled={processing}
                className="flex items-center justify-center space-x-2 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <FileText className="w-5 h-5 text-gray-600" />
                <span>Export as HTML</span>
              </button>
              
              <button
                onClick={() => handleExport('json')}
                disabled={processing}
                className="flex items-center justify-center space-x-2 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Settings className="w-5 h-5 text-gray-600" />
                <span>Export as JSON</span>
              </button>
              
              <button
                onClick={() => onSave && onSave(completedData)}
                className="flex items-center justify-center space-x-2 p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-5 h-5" />
                <span>Save Progress</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => setStep('walkthrough')}
            className="flex items-center space-x-2 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Completion</span>
          </button>
          
          <button
            onClick={onClose}
            className="py-3 px-6 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Done
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
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">AI Form Completion Wizard</h1>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
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
                {step === 'walkthrough' && renderWalkthroughStep()}
                {step === 'export' && renderExportStep()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// Field Input Component
function FieldInput({ 
  field, 
  value, 
  onChange, 
  onAIAssist, 
  aiAssistance, 
  autoFilled, 
  processing 
}) {
  const [showAIHelp, setShowAIHelp] = useState(false)

  const renderInput = () => {
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
            rows={6}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        )
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select an option...</option>
            {(field.options || []).map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        )
      case 'checkbox':
        return (
          <div className="space-y-2">
            {(field.options || []).map(option => (
              <label key={option} className="flex items-center">
                <input
                  type="checkbox"
                  checked={value?.includes?.(option) || false}
                  onChange={(e) => {
                    const currentValues = value ? value.split(',') : []
                    if (e.target.checked) {
                      onChange([...currentValues, option].join(','))
                    } else {
                      onChange(currentValues.filter(v => v !== option).join(','))
                    }
                  }}
                  className="mr-2"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        )
      default:
        return (
          <input
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        )
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-900">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
          {autoFilled && (
            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
              Auto-filled
            </span>
          )}
        </label>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAIHelp(!showAIHelp)}
            className="text-blue-600 hover:text-blue-700 p-1"
            title="AI Help"
          >
            <Lightbulb className="w-4 h-4" />
          </button>
          
          {field.type === 'textarea' && (
            <button
              onClick={() => onAIAssist('generate_draft')}
              disabled={processing}
              className="text-purple-600 hover:text-purple-700 p-1 disabled:opacity-50"
              title="Generate AI Draft"
            >
              <Brain className="w-4 h-4" />
            </button>
          )}
          
          {value && (
            <button
              onClick={() => onAIAssist('improve_answer')}
              disabled={processing}
              className="text-green-600 hover:text-green-700 p-1 disabled:opacity-50"
              title="Improve with AI"
            >
              <Zap className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {field.helpText && (
        <p className="text-sm text-gray-600">{field.helpText}</p>
      )}

      {renderInput()}

      {field.wordLimit && (
        <div className="flex justify-between text-xs text-gray-500">
          <span>Word limit: {field.wordLimit}</span>
          <span>{value ? value.split(' ').length : 0} words</span>
        </div>
      )}

      {showAIHelp && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-blue-900">AI Assistance Available:</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <button
              onClick={() => onAIAssist('analyze_requirements')}
              disabled={processing}
              className="text-left p-2 text-sm bg-white border border-blue-200 rounded hover:bg-blue-50 disabled:opacity-50"
            >
              <div className="font-medium">Analyze Question</div>
              <div className="text-xs text-gray-600">Understand requirements</div>
            </button>
            
            <button
              onClick={() => onAIAssist('generate_draft')}
              disabled={processing}
              className="text-left p-2 text-sm bg-white border border-blue-200 rounded hover:bg-blue-50 disabled:opacity-50"
            >
              <div className="font-medium">Generate Draft</div>
              <div className="text-xs text-gray-600">AI writes response</div>
            </button>
            
            <button
              onClick={() => onAIAssist('suggest_improvements')}
              disabled={processing || !value}
              className="text-left p-2 text-sm bg-white border border-blue-200 rounded hover:bg-blue-50 disabled:opacity-50"
            >
              <div className="font-medium">Get Suggestions</div>
              <div className="text-xs text-gray-600">Improve current answer</div>
            </button>
          </div>
        </div>
      )}

      {aiAssistance && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">AI Assistance:</h4>
          <div className="text-sm text-green-800">
            {aiAssistance.type === 'draft_response' && (
              <div>
                <p className="mb-2"><strong>Generated Draft:</strong></p>
                <p className="italic">"AI has generated a draft response based on your project information."</p>
              </div>
            )}
            {aiAssistance.suggestions && (
              <div>
                <p className="mb-2"><strong>Suggestions:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  {aiAssistance.suggestions.map((suggestion, idx) => (
                    <li key={idx}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}