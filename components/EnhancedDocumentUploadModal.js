/**
 * Enhanced Document Upload Modal with AI Analysis and Form Generation
 * 
 * This modal provides intelligent document upload functionality with real-time
 * AI analysis, document type detection, and automatic form completion/generation.
 * File: components/EnhancedDocumentUploadModal.jsx
 */

'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, 
  FileText, 
  X, 
  Trash2, 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Eye,
  Download,
  Sparkles,
  Zap,
  FileCheck,
  AlertTriangle,
  Info,
  PlayCircle,
  Settings,
  FileOutput
} from 'lucide-react'
import toast from 'react-hot-toast'
import documentAnalysisService from '../lib/documentAnalysisService'
import documentGenerationService from '../lib/documentGenerationService'

export default function EnhancedDocumentUploadModal({ 
  submission, 
  onClose, 
  onUpload,
  userProfile,
  projectData,
  enableAIAnalysis = true 
}) {
  const [files, setFiles] = useState([])
  const [documentType, setDocumentType] = useState('application')
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResults, setAnalysisResults] = useState({})
  const [selectedAnalysis, setSelectedAnalysis] = useState(null)
  const [aiInsights, setAiInsights] = useState(null)
  
  // New states for form generation
  const [generating, setGenerating] = useState(false)
  const [generatedDocuments, setGeneratedDocuments] = useState({})
  const [showGenerationPreview, setShowGenerationPreview] = useState(null)
  const [generationOptions, setGenerationOptions] = useState({
    includeEmptyFields: false,
    addInstructions: true,
    format: 'pdf'
  })

  const documentTypes = [
    { value: 'application', label: 'Application Form', icon: FileText },
    { value: 'rfp', label: 'RFP / Funding Announcement', icon: FileCheck },
    { value: 'guidelines', label: 'Program Guidelines', icon: Info },
    { value: 'proposal', label: 'Project Proposal', icon: FileText },
    { value: 'budget', label: 'Budget Documentation', icon: FileText },
    { value: 'narrative', label: 'Project Narrative', icon: FileText },
    { value: 'correspondence', label: 'Email/Correspondence', icon: FileText },
    { value: 'award_letter', label: 'Award Letter', icon: CheckCircle },
    { value: 'report', label: 'Progress Report', icon: FileText },
    { value: 'supporting_documents', label: 'Supporting Documents', icon: FileText },
    { value: 'other', label: 'Other', icon: FileText }
  ]

  useEffect(() => {
    // Auto-analyze files when uploaded if AI is enabled
    if (enableAIAnalysis && files.length > 0) {
      const unanalyzedFiles = files.filter(file => !analysisResults[file.name])
      if (unanalyzedFiles.length > 0) {
        analyzeDocuments(unanalyzedFiles)
      }
    }
  }, [files, enableAIAnalysis])

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files)
    const validFiles = selectedFiles.filter(file => {
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'image/jpeg',
        'image/png'
      ]
      return validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024 // 10MB limit
    })

    if (validFiles.length !== selectedFiles.length) {
      toast.error('Some files were skipped due to invalid format or size (max 10MB)')
    }

    setFiles(prev => [...prev, ...validFiles])
  }

  const analyzeDocuments = async (filesToAnalyze) => {
    setAnalyzing(true)
    const newResults = { ...analysisResults }

    try {
      for (const file of filesToAnalyze) {
        try {
          // Simulate reading file content (in real implementation, you'd use appropriate parsers)
          const content = await readFileContent(file)
          
          const analysis = await documentAnalysisService.analyzeDocument(
            content, 
            documentType,
            { userProfile, projectData }
          )

          // For application forms, also try dynamic form analysis
          let dynamicFormStructure = null
          if (documentType === 'application' && content && content.length > 100) {
            try {
              const formAnalysisResponse = await fetch('/api/ai/dynamic-form-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  documentContent: content,
                  documentType: 'grant_application',
                  extractionMode: 'comprehensive',
                  context: {
                    fileName: file.name,
                    userProfile,
                    projectData
                  }
                })
              })
              
              if (formAnalysisResponse.ok) {
                const formResult = await formAnalysisResponse.json()
                if (formResult.success && formResult.data?.formStructure) {
                  dynamicFormStructure = formResult.data.formStructure
                  console.log(`📝 Extracted dynamic form structure from ${file.name} with ${Object.keys(formResult.data.formStructure.formFields || {}).length} fields`)
                }
              }
            } catch (formError) {
              console.warn('Dynamic form analysis failed for', file.name, formError)
            }
          }

          newResults[file.name] = {
            ...analysis,
            fileName: file.name,
            fileSize: file.size,
            status: 'analyzed',
            dynamicFormStructure // Include extracted form structure
          }
        } catch (error) {
          console.error(`Failed to analyze ${file.name}:`, error)
          newResults[file.name] = {
            error: error.message,
            fileName: file.name,
            fileSize: file.size,
            status: 'error'
          }
        }
      }

      setAnalysisResults(newResults)
      
      // Generate consolidated insights if we have multiple analyses
      if (Object.keys(newResults).length > 1) {
        generateConsolidatedInsights(Object.values(newResults))
      }

    } catch (error) {
      console.error('Document analysis failed:', error)
      toast.error('Failed to analyze documents: ' + error.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const generateCompletedForm = async (fileName) => {
    const analysis = analysisResults[fileName]
    if (!analysis?.dynamicFormStructure) {
      toast.error('No form structure available for generation')
      return
    }

    setGenerating(true)
    try {
      // Call the document generation API
      const response = await fetch('/api/ai/document-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formStructure: analysis.dynamicFormStructure,
          userData: {
            organization: userProfile?.organization || {},
            project: projectData || {},
            user: userProfile || {}
          },
          options: generationOptions,
          action: 'generate'
        })
      })

      if (!response.ok) {
        throw new Error('Generation API failed')
      }

      const result = await response.json()
      if (result.success) {
        // Generate client-side PDF
        const generatedDoc = await documentGenerationService.generateCompletedForm(
          analysis.dynamicFormStructure,
          {
            organization: userProfile?.organization || {},
            project: projectData || {},
            user: userProfile || {}
          },
          {
            fieldMappings: result.data.fieldMappings,
            styles: generationOptions
          }
        )

        if (generatedDoc.success) {
          setGeneratedDocuments(prev => ({
            ...prev,
            [fileName]: {
              document: generatedDoc.document,
              metadata: generatedDoc.metadata,
              completionStats: result.data.completionStats,
              generatedAt: new Date().toISOString()
            }
          }))

          toast.success(`Completed form generated for ${fileName}!`)
        } else {
          throw new Error(generatedDoc.error)
        }
      } else {
        throw new Error(result.message || 'Generation failed')
      }
    } catch (error) {
      console.error('Form generation failed:', error)
      toast.error('Failed to generate completed form: ' + error.message)
    } finally {
      setGenerating(false)
    }
  }

  const previewGeneration = async (fileName) => {
    const analysis = analysisResults[fileName]
    if (!analysis?.dynamicFormStructure) {
      toast.error('No form structure available for preview')
      return
    }

    try {
      const response = await fetch('/api/ai/document-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formStructure: analysis.dynamicFormStructure,
          userData: {
            organization: userProfile?.organization || {},
            project: projectData || {},
            user: userProfile || {}
          },
          options: generationOptions,
          action: 'preview'
        })
      })

      if (!response.ok) {
        throw new Error('Preview API failed')
      }

      const result = await response.json()
      if (result.success) {
        setShowGenerationPreview(result.data)
      } else {
        throw new Error(result.message || 'Preview failed')
      }
    } catch (error) {
      console.error('Generation preview failed:', error)
      toast.error('Failed to preview form generation: ' + error.message)
    }
  }

  const downloadGeneratedDocument = (fileName) => {
    const generated = generatedDocuments[fileName]
    if (generated?.document) {
      documentGenerationService.downloadPDF(
        generated.document,
        `completed-${fileName.replace(/\.[^/.]+$/, '')}.pdf`
      )
      toast.success('Document downloaded!')
    }
  }

  const generateConsolidatedInsights = async (analyses) => {
    try {
      const validAnalyses = analyses.filter(a => !a.error)
      if (validAnalyses.length === 0) return

      const insights = await documentAnalysisService.generateBatchSummary(validAnalyses)
      setAiInsights(insights)
    } catch (error) {
      console.error('Failed to generate insights:', error)
    }
  }

  const readFileContent = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        // In a real implementation, you'd use proper parsers for different file types
        // For now, just handle text files
        if (file.type === 'text/plain') {
          resolve(e.target.result)
        } else {
          // For other file types, you'd extract text using appropriate libraries
          resolve(`[Content of ${file.name} - ${file.type}]`)
        }
      }
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (files.length === 0) return

    setUploading(true)
    try {
      // Extract dynamic form structures from analysis results
      const dynamicFormStructures = []
      Object.values(analysisResults).forEach(result => {
        if (result.dynamicFormStructure && result.status === 'analyzed') {
          dynamicFormStructures.push({
            fileName: result.fileName,
            formStructure: result.dynamicFormStructure,
            documentType,
            analysisMetadata: {
              confidence: result.metadata?.confidence,
              analyzedAt: new Date().toISOString(),
              extractedFields: Object.keys(result.dynamicFormStructure.formFields || {}).length
            }
          })
        }
      })

      // Include analysis results with upload, including dynamic form structures
      const uploadData = {
        files,
        documentType,
        analysisResults: analysisResults,
        consolidatedInsights: aiInsights,
        dynamicFormStructures, // Include extracted form structures for easy access
        generatedDocuments: generatedDocuments // Include any generated completed forms
      }
      
      console.log(`📤 Uploading ${files.length} files with ${dynamicFormStructures.length} dynamic form structures and ${Object.keys(generatedDocuments).length} generated documents`)
      
      await onUpload(submission.id, uploadData)
      onClose()
      toast.success('Documents uploaded and analyzed successfully!')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload documents')
    } finally {
      setUploading(false)
    }
  }

  const removeFile = (index) => {
    const fileToRemove = files[index]
    setFiles(files.filter((_, i) => i !== index))
    
    // Remove analysis result and generated document
    const newResults = { ...analysisResults }
    delete newResults[fileToRemove.name]
    setAnalysisResults(newResults)

    const newGenerated = { ...generatedDocuments }
    delete newGenerated[fileToRemove.name]
    setGeneratedDocuments(newGenerated)
  }

  const getAnalysisStatusIcon = (fileName) => {
    const analysis = analysisResults[fileName]
    if (!analysis) return <Clock className="w-4 h-4 text-gray-400" />
    if (analysis.error) return <AlertCircle className="w-4 h-4 text-red-500" />
    if (analysis.status === 'analyzed') return <CheckCircle className="w-4 h-4 text-green-500" />
    return <Clock className="w-4 h-4 text-blue-500" />
  }

  const getFileIcon = (file) => {
    if (file.type.includes('pdf')) return '📄'
    if (file.type.includes('word')) return '📝'
    if (file.type.includes('excel')) return '📊'
    if (file.type.includes('image')) return '🖼️'
    return '📋'
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Upload, Analyze & Generate Documents
                </h3>
                <p className="text-sm text-slate-600">
                  Upload documents, get AI insights, and generate completed forms instantly
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Document Type Selection */}
          <div className="mb-6">
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-3 block">
              Document Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {documentTypes.map((type) => {
                const Icon = type.icon
                return (
                  <button
                    key={type.value}
                    onClick={() => setDocumentType(type.value)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      documentType === type.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <div className="text-sm font-medium">{type.label}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* File Upload Area */}
          <div className="mb-6">
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-3 block">
              Upload Files
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors">
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-slate-900 mb-2">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-slate-600">
                  PDF, Word, Excel, Text, or Image files (max 10MB each)
                </p>
              </label>
            </div>
          </div>

          {/* Generation Options */}
          {Object.keys(analysisResults).some(key => analysisResults[key].dynamicFormStructure) && (
            <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="flex items-center space-x-2 mb-3">
                <Settings className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-medium text-indigo-900">Generation Options</h4>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={generationOptions.includeEmptyFields}
                    onChange={(e) => setGenerationOptions(prev => ({
                      ...prev,
                      includeEmptyFields: e.target.checked
                    }))}
                    className="rounded"
                  />
                  <span>Include empty fields</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={generationOptions.addInstructions}
                    onChange={(e) => setGenerationOptions(prev => ({
                      ...prev,
                      addInstructions: e.target.checked
                    }))}
                    className="rounded"
                  />
                  <span>Add completion instructions</span>
                </label>
              </div>
            </div>
          )}

          {/* Uploaded Files List */}
          {files.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-slate-700">
                  Uploaded Files ({files.length})
                </h4>
                {enableAIAnalysis && (analyzing || generating) && (
                  <div className="flex items-center text-sm text-blue-600">
                    <Brain className="w-4 h-4 mr-2 animate-pulse" />
                    {analyzing ? 'Analyzing documents...' : 'Generating forms...'}
                  </div>
                )}
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {files.map((file, index) => {
                  const analysis = analysisResults[file.name]
                  const generated = generatedDocuments[file.name]
                  const hasFormStructure = analysis?.dynamicFormStructure
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-3 flex-1">
                        <span className="text-2xl">{getFileIcon(file)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {file.name}
                            </p>
                            {enableAIAnalysis && getAnalysisStatusIcon(file.name)}
                            {generated && (
                              <CheckCircle className="w-4 h-4 text-green-600" title="Generated" />
                            )}
                          </div>
                          <p className="text-xs text-slate-600">
                            {formatFileSize(file.size)}
                            {hasFormStructure && (
                              <span className="ml-2 text-indigo-600">
                                • {Object.keys(analysis.dynamicFormStructure.formFields || {}).length} fields detected
                              </span>
                            )}
                          </p>
                          
                          {/* Action buttons */}
                          <div className="flex items-center space-x-4 mt-2">
                            {analysis && !analysis.error && (
                              <button
                                onClick={() => setSelectedAnalysis(analysis)}
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View Analysis</span>
                              </button>
                            )}
                            
                            {hasFormStructure && !generated && (
                              <>
                                <button
                                  onClick={() => previewGeneration(file.name)}
                                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                                >
                                  <PlayCircle className="w-3 h-3" />
                                  <span>Preview Generation</span>
                                </button>
                                <button
                                  onClick={() => generateCompletedForm(file.name)}
                                  disabled={generating}
                                  className="text-xs text-green-600 hover:text-green-800 flex items-center space-x-1"
                                >
                                  <FileOutput className="w-3 h-3" />
                                  <span>Generate Form</span>
                                </button>
                              </>
                            )}
                            
                            {generated && (
                              <button
                                onClick={() => downloadGeneratedDocument(file.name)}
                                className="text-xs text-green-600 hover:text-green-800 flex items-center space-x-1"
                              >
                                <Download className="w-3 h-3" />
                                <span>Download PDF ({Math.round(generated.completionStats?.completionPercentage || 0)}% complete)</span>
                              </button>
                            )}
                          </div>
                          
                          {analysis && analysis.error && (
                            <p className="text-xs text-red-600 mt-1">
                              Analysis failed: {analysis.error}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* AI Insights Summary */}
          {aiInsights && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    AI Analysis Summary
                  </h4>
                  {aiInsights.overview && (
                    <p className="text-sm text-blue-800 mb-2">
                      {aiInsights.overview}
                    </p>
                  )}
                  {aiInsights.keyInsights && aiInsights.keyInsights.length > 0 && (
                    <ul className="text-xs text-blue-700 space-y-1">
                      {aiInsights.keyInsights.slice(0, 3).map((insight, i) => (
                        <li key={i} className="flex items-start space-x-2">
                          <span className="text-blue-500">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Upload Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button 
              type="button" 
              onClick={onClose} 
              className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm"
            >
              Cancel
            </button>
            <button 
              onClick={handleUpload}
              className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm flex items-center space-x-2"
              disabled={files.length === 0 || uploading}
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload & Analyze</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Analysis Detail Modal */}
      <AnimatePresence>
        {selectedAnalysis && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4"
            onClick={() => setSelectedAnalysis(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Document Analysis: {selectedAnalysis.fileName}
                  </h3>
                  <button 
                    onClick={() => setSelectedAnalysis(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {selectedAnalysis.keyInformation && (
                    <div>
                      <h4 className="font-medium text-slate-900 mb-3">Key Information</h4>
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {selectedAnalysis.keyInformation.title && (
                            <div>
                              <p className="text-slate-600">Title</p>
                              <p className="font-medium">{selectedAnalysis.keyInformation.title}</p>
                            </div>
                          )}
                          {selectedAnalysis.keyInformation.sponsor && (
                            <div>
                              <p className="text-slate-600">Sponsor</p>
                              <p className="font-medium">{selectedAnalysis.keyInformation.sponsor}</p>
                            </div>
                          )}
                          {selectedAnalysis.keyInformation.fundingAmount && (
                            <div>
                              <p className="text-slate-600">Funding Amount</p>
                              <p className="font-medium">{selectedAnalysis.keyInformation.fundingAmount}</p>
                            </div>
                          )}
                          {selectedAnalysis.keyInformation.deadline && (
                            <div>
                              <p className="text-slate-600">Deadline</p>
                              <p className="font-medium">{selectedAnalysis.keyInformation.deadline}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedAnalysis.requirements && (
                    <div>
                      <h4 className="font-medium text-slate-900 mb-3">Requirements</h4>
                      <div className="space-y-3">
                        {selectedAnalysis.requirements.eligibility && (
                          <div className="bg-green-50 p-3 rounded-lg">
                            <p className="text-sm font-medium text-green-900 mb-2">Eligibility</p>
                            <ul className="text-sm text-green-800 space-y-1">
                              {selectedAnalysis.requirements.eligibility.map((req, i) => (
                                <li key={i} className="flex items-start space-x-2">
                                  <CheckCircle className="w-3 h-3 mt-1 flex-shrink-0" />
                                  <span>{req}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {selectedAnalysis.requirements.documents && (
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-sm font-medium text-blue-900 mb-2">Required Documents</p>
                            <ul className="text-sm text-blue-800 space-y-1">
                              {selectedAnalysis.requirements.documents.map((doc, i) => (
                                <li key={i} className="flex items-start space-x-2">
                                  <FileText className="w-3 h-3 mt-1 flex-shrink-0" />
                                  <span>{doc}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedAnalysis.strategicInsights && (
                    <div>
                      <h4 className="font-medium text-slate-900 mb-3">Strategic Insights</h4>
                      <div className="bg-amber-50 p-4 rounded-lg">
                        {selectedAnalysis.strategicInsights.recommendations && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-amber-900 mb-2">Recommendations</p>
                            <ul className="text-sm text-amber-800 space-y-1">
                              {selectedAnalysis.strategicInsights.recommendations.map((rec, i) => (
                                <li key={i} className="flex items-start space-x-2">
                                  <Zap className="w-3 h-3 mt-1 flex-shrink-0" />
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedAnalysis.metadata && (
                    <div className="pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>
                          Confidence: {Math.round(selectedAnalysis.metadata.confidence * 100)}%
                        </span>
                        <span>
                          Analyzed: {new Date(selectedAnalysis.metadata.analyzedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generation Preview Modal */}
      <AnimatePresence>
        {showGenerationPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4"
            onClick={() => setShowGenerationPreview(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Generation Preview
                  </h3>
                  <button 
                    onClick={() => setShowGenerationPreview(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">Completion Stats</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-green-700">Total Fields</p>
                        <p className="font-medium">{showGenerationPreview.completionStats?.totalFields || 0}</p>
                      </div>
                      <div>
                        <p className="text-green-700">Populated Fields</p>
                        <p className="font-medium">{showGenerationPreview.completionStats?.populatedFields || 0}</p>
                      </div>
                      <div>
                        <p className="text-green-700">Completion Rate</p>
                        <p className="font-medium">{showGenerationPreview.completionStats?.completionPercentage || 0}%</p>
                      </div>
                      <div>
                        <p className="text-green-700">Ready to Generate</p>
                        <p className="font-medium">{showGenerationPreview.previewStats?.readyToGenerate ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                  </div>

                  {showGenerationPreview.sections && (
                    <div>
                      <h4 className="font-medium text-slate-900 mb-3">Form Sections Preview</h4>
                      <div className="space-y-4">
                        {showGenerationPreview.sections.map((section, i) => (
                          <div key={i} className="bg-slate-50 p-4 rounded-lg">
                            <h5 className="font-medium text-slate-800 mb-2">{section.title}</h5>
                            <div className="text-sm text-slate-600 mb-2">
                              {section.completionStats.populated} of {section.completionStats.total} fields populated
                            </div>
                            <div className="space-y-2">
                              {Object.entries(section.fields).slice(0, 3).map(([fieldId, field]) => (
                                <div key={fieldId} className="flex items-center justify-between">
                                  <span className="text-xs text-slate-600">{field.label}</span>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    field.populated 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {field.populated ? 'Populated' : 'Empty'}
                                  </span>
                                </div>
                              ))}
                              {Object.keys(section.fields).length > 3 && (
                                <div className="text-xs text-slate-500">
                                  ...and {Object.keys(section.fields).length - 3} more fields
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}