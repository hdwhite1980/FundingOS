/**
 * Enhanced Document Upload Modal with AI Analysis
 * 
 * This modal provides intelligent document upload functionality with real-time
 * AI analysis, document type detection, and extraction of key information.
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
  Info
} from 'lucide-react'
import toast from 'react-hot-toast'
import documentAnalysisService from '../lib/documentAnalysisService'

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

          newResults[file.name] = {
            ...analysis,
            fileName: file.name,
            fileSize: file.size,
            status: 'analyzed'
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
      // Include analysis results with upload
      const uploadData = {
        files,
        documentType,
        analysisResults: analysisResults,
        consolidatedInsights: aiInsights
      }
      
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
    
    // Remove analysis result
    const newResults = { ...analysisResults }
    delete newResults[fileToRemove.name]
    setAnalysisResults(newResults)
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
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
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
                  Upload & Analyze Documents
                </h3>
                <p className="text-sm text-slate-600">
                  Upload documents and get AI-powered insights instantly
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

          {/* Uploaded Files List */}
          {files.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-slate-700">
                  Uploaded Files ({files.length})
                </h4>
                {enableAIAnalysis && analyzing && (
                  <div className="flex items-center text-sm text-blue-600">
                    <Brain className="w-4 h-4 mr-2 animate-pulse" />
                    Analyzing documents...
                  </div>
                )}
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {files.map((file, index) => {
                  const analysis = analysisResults[file.name]
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
                          </div>
                          <p className="text-xs text-slate-600">
                            {formatFileSize(file.size)}
                          </p>
                          {analysis && !analysis.error && (
                            <div className="mt-1">
                              <button
                                onClick={() => setSelectedAnalysis(analysis)}
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View Analysis</span>
                              </button>
                            </div>
                          )}
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
    </div>
  )
}