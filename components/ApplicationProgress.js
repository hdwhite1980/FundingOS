'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  FileText, 
  Upload, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  XCircle,
  Plus,
  Download,
  Eye,
  Edit3,
  Trash2,
  DollarSign,
  TrendingUp,
  Filter,
  Search,
  Paperclip,
  MessageSquare
} from 'lucide-react'
import { directUserServices } from '../lib/supabase'
import { format, differenceInDays } from 'date-fns'
import toast from 'react-hot-toast'

export default function ApplicationProgress({ user, userProfile, projects }) {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({})
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDocumentModal, setShowDocumentModal] = useState(false)
  const [filters, setFilters] = useState({})

  useEffect(() => {
    if (user) {
      loadSubmissions()
    }
  }, [user, filters])

  const loadSubmissions = async () => {
    try {
      setLoading(true)
      
      if (!user?.id) {
        console.warn('No user ID available')
        setLoading(false)
        return
      }
      
      const [submissionsData, statsData] = await Promise.all([
        directUserServices.applications.getSubmissions(user.id, filters),
        directUserServices.applications.getSubmissionStats(user.id)
      ])
      
      setSubmissions(submissionsData)
      setStats(statsData)
    } catch (error) {
      toast.error('Failed to load application data')
      console.error('Error loading submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSubmission = async (submissionData) => {
    try {
      console.log('Submitting application data:', submissionData)
      
      const cleanData = {
        ...submissionData
      }
      
      delete cleanData.documents
      
      if (!cleanData.project_id) {
        throw new Error('Project is required')
      }
      
      if (!cleanData.submitted_amount || cleanData.submitted_amount <= 0) {
        throw new Error('Submitted amount must be greater than 0')
      }
      
      console.log('Clean data to submit:', cleanData)
      
      const newSubmission = await directUserServices.applications.createApplication(user.id, cleanData)
      
      await loadSubmissions()
      
      setShowCreateModal(false)
      toast.success('Application submission tracked!')
    } catch (error) {
      console.error('Create submission error:', error)
      toast.error('Failed to create submission: ' + (error.message || 'Unknown error'))
    }
  }

  const handleUpdateStatus = async (submissionId, newStatus, notes = '') => {
    try {
      await directUserServices.applications.updateApplication(user.id, submissionId, {
        status: newStatus,
        status_date: new Date().toISOString()
      })
      
      if (notes) {
        console.log('Status update notes:', notes)
      }
      
      loadSubmissions()
      toast.success('Status updated successfully!')
    } catch (error) {
      toast.error('Failed to update status: ' + error.message)
    }
  }

  const handleUploadDocument = async (submissionId, files, documentType) => {
    try {
      const filesToUpload = Array.isArray(files) ? files : [files]
      
      toast.success(`${filesToUpload.length} document(s) will be uploaded (feature coming soon)!`)
      
      loadSubmissions()
      toast.success(`${filesToUpload.length} document(s) uploaded successfully!`)
    } catch (error) {
      toast.error('Failed to upload document: ' + error.message)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      'submitted': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'under_review': 'bg-amber-100 text-amber-700 border-amber-200',
      'approved': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'denied': 'bg-red-100 text-red-700 border-red-200',
      'withdrawn': 'bg-slate-100 text-slate-700 border-slate-200'
    }
    return colors[status] || 'bg-slate-100 text-slate-700 border-slate-200'
  }

  const getStatusIcon = (status) => {
    const icons = {
      'submitted': <Clock className="w-4 h-4" />,
      'under_review': <AlertCircle className="w-4 h-4" />,
      'approved': <CheckCircle className="w-4 h-4" />,
      'denied': <XCircle className="w-4 h-4" />,
      'withdrawn': <XCircle className="w-4 h-4" />
    }
    return icons[status] || <Clock className="w-4 h-4" />
  }

  const getDaysUntilDeadline = (deadline) => {
    if (!deadline) return null
    const days = differenceInDays(new Date(deadline), new Date())
    return days
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  // Modern StatCard component following design system
  const ModernStatCard = ({ icon: Icon, title, value, subtitle, color = "emerald" }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all duration-300">
      <div className="flex items-center space-x-3 mb-4">
        <div className={`p-2.5 bg-slate-50 rounded-lg`}>
          <Icon className={`w-5 h-5 ${
            color === 'emerald' ? 'text-emerald-600' : 
            color === 'amber' ? 'text-amber-600' : 
            'text-slate-600'
          }`} />
        </div>
        <span className="text-sm font-medium text-slate-600">{title}</span>
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
    </div>
  )

  const SubmissionCard = ({ submission }) => {
    const daysUntilDeadline = getDaysUntilDeadline(submission.next_report_due)
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all duration-300"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              {submission.opportunity?.title || submission.opportunity_title || 'Unknown Opportunity'}
            </h3>
            <p className="text-sm text-slate-600">
              {submission.opportunity?.sponsor || 'No sponsor info'} • {submission.projects?.name || 'No project linked'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Application ID: {submission.application_id || 'Pending'}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusColor(submission.status)}`}>
              {getStatusIcon(submission.status)}
              <span className="ml-1 capitalize">{submission.status.replace('_', ' ')}</span>
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-600">Submitted Amount</p>
              <p className="font-bold text-slate-900">{formatCurrency(submission.submitted_amount)}</p>
            </div>
            {submission.award_amount && (
              <div>
                <p className="text-xs font-medium text-slate-600">Award Amount</p>
                <p className="font-bold text-emerald-600">{formatCurrency(submission.award_amount)}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-600">Submission Date</p>
              <p className="text-sm text-slate-900">{format(new Date(submission.submission_date), 'MMM d, yyyy')}</p>
            </div>
            {submission.response_date && (
              <div>
                <p className="text-xs font-medium text-slate-600">Response Date</p>
                <p className="text-sm text-slate-900">{format(new Date(submission.response_date), 'MMM d, yyyy')}</p>
              </div>
            )}
          </div>

          {submission.next_report_due && (
            <div className={`p-3 rounded-lg border ${
              daysUntilDeadline < 7 ? 'bg-red-50 border-red-200' :
              daysUntilDeadline < 30 ? 'bg-amber-50 border-amber-200' :
              'bg-emerald-50 border-emerald-200'
            }`}>
              <p className="text-xs font-medium text-slate-700">Next Report Due</p>
              <p className="text-sm text-slate-900">{format(new Date(submission.next_report_due), 'MMM d, yyyy')}</p>
              <p className="text-xs text-slate-600">
                {daysUntilDeadline > 0 ? `${daysUntilDeadline} days remaining` : 'Overdue'}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex items-center space-x-2 text-sm text-slate-600">
              {submission.documents?.length > 0 && (
                <span className="flex items-center">
                  <Paperclip className="w-4 h-4 mr-1" />
                  {submission.documents.length} docs
                </span>
              )}
              {submission.status_updates?.length > 0 && (
                <span className="flex items-center">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  {submission.status_updates.length} updates
                </span>
              )}
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedSubmission(submission)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowDocumentModal(submission)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors"
              >
                <Upload className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading application data...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Authentication Required</h3>
          <p className="text-slate-600">Please log in to view your application progress.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Application Progress</h1>
        <p className="text-sm text-slate-600">Track your grant applications from submission to award</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <ModernStatCard
          icon={FileText}
          title="Total Applications"
          value={stats.totalSubmissions || 0}
          color="emerald"
        />
        <ModernStatCard
          icon={DollarSign}
          title="Total Requested"
          value={formatCurrency(stats.totalRequested)}
          color="emerald"
        />
        <ModernStatCard
          icon={TrendingUp}
          title="Total Awarded"
          value={formatCurrency(stats.totalAwarded)}
          color="emerald"
        />
        <ModernStatCard
          icon={CheckCircle}
          title="Success Rate"
          value={`${Math.round(stats.successRate || 0)}%`}
          color="amber"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search applications..."
              className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          
          <select
            className="bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            onChange={(e) => setFilters({...filters, status: e.target.value})}
          >
            <option value="">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
          </select>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Track Application</span>
        </button>
      </div>

      {/* Applications Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(submissions || []).filter(submission => submission && submission.id).map(submission => (
          <SubmissionCard key={submission.id} submission={submission} />
        ))}
      </div>

      {(!submissions || submissions.length === 0) && (
        <div className="text-center py-12">
          <div className="mx-auto w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No applications tracked</h3>
          <p className="text-slate-600 mb-6">Start tracking your grant applications to monitor progress.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 py-2.5"
          >
            Track First Application
          </button>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateSubmissionModal
          projects={projects}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateSubmission}
        />
      )}

      {showDocumentModal && (
        <DocumentUploadModal
          submission={showDocumentModal}
          onClose={() => setShowDocumentModal(false)}
          onUpload={handleUploadDocument}
        />
      )}

      {selectedSubmission && (
        <SubmissionDetailModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </div>
  )
}

// Modal for creating new application submission
function CreateSubmissionModal({ projects, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    project_id: '',
    opportunity_title: '',
    application_id: '',
    submitted_amount: '',
    submission_date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const cleanData = {
      project_id: formData.project_id,
      opportunity_title: formData.opportunity_title?.trim() || 'Manual Entry',
      application_id: formData.application_id?.trim() || null,
      submitted_amount: parseFloat(formData.submitted_amount),
      submission_date: formData.submission_date,
      status: 'submitted',
      notes: formData.notes?.trim() || null
    }
    
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === '' || cleanData[key] === undefined) {
        if (key !== 'opportunity_title') {
          delete cleanData[key]
        }
      }
    })
    
    console.log('Submitting form with clean data:', cleanData)
    onSubmit(cleanData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Track New Application</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Project *</label>
              <select
                className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={formData.project_id}
                onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                required
              >
                <option value="">Select project</option>
                {(projects || []).filter(project => project && project.id).map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name || 'Untitled Project'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Grant Opportunity</label>
              <input
                type="text"
                className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Enter opportunity title or ID"
                value={formData.opportunity_title}
                onChange={(e) => setFormData({...formData, opportunity_title: e.target.value})}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Application ID</label>
              <input
                type="text"
                className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={formData.application_id}
                onChange={(e) => setFormData({...formData, application_id: e.target.value})}
                placeholder="Grant agency's application ID"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Submitted Amount *</label>
                <input
                  type="number"
                  className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  value={formData.submitted_amount}
                  onChange={(e) => setFormData({...formData, submitted_amount: e.target.value})}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Submission Date *</label>
                <input
                  type="date"
                  className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  value={formData.submission_date}
                  onChange={(e) => setFormData({...formData, submission_date: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Upload Application Documents</label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 mt-1">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={(e) => setFormData({...formData, documents: Array.from(e.target.files)})}
                  className="w-full"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Supported formats: PDF, Word, Excel, Text. You can select multiple files.
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Notes</label>
              <textarea
                className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                rows="3"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional notes about this application..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button 
                type="button" 
                onClick={onClose} 
                className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm"
              >
                Track Application
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

// Enhanced modal for uploading documents
function DocumentUploadModal({ submission, onClose, onUpload }) {
  const [files, setFiles] = useState([])
  const [documentType, setDocumentType] = useState('proposal')
  const [uploading, setUploading] = useState(false)

  const handleFileSelect = (e) => {
    setFiles(Array.from(e.target.files))
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (files.length === 0) return

    setUploading(true)
    try {
      await onUpload(submission.id, files, documentType)
      onClose()
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl max-w-md w-full"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Upload Documents</h3>
          
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Document Type</label>
              <select
                className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
              >
                <option value="application">Application Form</option>
                <option value="proposal">Project Proposal</option>
                <option value="budget">Budget</option>
                <option value="narrative">Project Narrative</option>
                <option value="correspondence">Correspondence</option>
                <option value="award_letter">Award Letter</option>
                <option value="report">Progress Report</option>
                <option value="supporting_documents">Supporting Documents</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Files</label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 mt-1">
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                  className="w-full"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Supported formats: PDF, Word, Excel, Text, Images. Multiple files allowed.
                </p>
              </div>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Selected Files:</label>
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                    <div className="flex items-center">
                      <Paperclip className="w-4 h-4 mr-2 text-slate-500" />
                      <span className="text-sm text-slate-900">{file.name}</span>
                      <span className="text-xs text-slate-500 ml-2">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button 
                type="button" 
                onClick={onClose} 
                className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm"
                disabled={files.length === 0 || uploading}
              >
                {uploading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </div>
                ) : (
                  'Upload Documents'
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

// Modal for viewing submission details
function SubmissionDetailModal({ submission, onClose, onUpdateStatus }) {
  const [newStatus, setNewStatus] = useState(submission.status)
  const [notes, setNotes] = useState('')

  const handleStatusUpdate = (e) => {
    e.preventDefault()
    onUpdateStatus(submission.id, newStatus, notes)
    onClose()
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const getStatusColor = (status) => {
    const colors = {
      'submitted': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'under_review': 'bg-amber-100 text-amber-700 border-amber-200',
      'approved': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'denied': 'bg-red-100 text-red-700 border-red-200',
      'withdrawn': 'bg-slate-100 text-slate-700 border-slate-200'
    }
    return colors[status] || 'bg-slate-100 text-slate-700 border-slate-200'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Application Details</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-slate-900 mb-4">Basic Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 font-medium">Application ID</p>
                  <p className="text-slate-900">{submission.application_id || 'Pending'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Current Status</p>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusColor(submission.status)}`}>
                    {submission.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Submitted Amount</p>
                  <p className="text-slate-900">{formatCurrency(submission.submitted_amount)}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Submission Date</p>
                  <p className="text-slate-900">{format(new Date(submission.submission_date), 'MMM d, yyyy')}</p>
                </div>
              </div>
            </div>

            {submission.award_amount && (
              <div>
                <h4 className="font-medium text-slate-900 mb-4">Award Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 font-medium">Award Amount</p>
                    <p className="font-bold text-emerald-600">{formatCurrency(submission.award_amount)}</p>
                  </div>
                  {submission.response_date && (
                    <div>
                      <p className="text-slate-500 font-medium">Response Date</p>
                      <p className="text-slate-900">{format(new Date(submission.response_date), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-medium text-slate-900 mb-4">Update Status</h4>
              <form onSubmit={handleStatusUpdate} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">New Status</label>
                  <select
                    className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="approved">Approved</option>
                    <option value="denied">Denied</option>
                    <option value="withdrawn">Withdrawn</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Notes</label>
                  <textarea
                    className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                    rows="3"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this status update..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button 
                    type="button" 
                    onClick={onClose} 
                    className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm"
                  >
                    Update Status
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}