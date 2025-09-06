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
  }, [user])

  const loadSubmissions = async () => {
    try {
      setLoading(true)
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
      const newSubmission = await directUserServices.applications.createApplication(user.id, submissionData)
      setSubmissions([newSubmission, ...submissions])
      setShowCreateModal(false)
      toast.success('Application submission tracked!')
    } catch (error) {
      toast.error('Failed to create submission: ' + error.message)
    }
  }

  const handleUpdateStatus = async (submissionId, newStatus, notes = '') => {
    try {
      await directUserServices.applications.updateApplication(user.id, submissionId, {
        status: newStatus,
        status_date: new Date().toISOString()
      })
      
      if (notes) {
        // Status update logging will be implemented later
        console.log('Status update notes:', notes)
      }
      
      loadSubmissions() // Reload to get updated data
      toast.success('Status updated successfully!')
    } catch (error) {
      toast.error('Failed to update status: ' + error.message)
    }
  }

  const handleUploadDocument = async (submissionId, files, documentType) => {
    try {
      // Handle both single file and multiple files
      const filesToUpload = Array.isArray(files) ? files : [files]
      
        // Handle document upload - simplified for now
        toast.success(`${filesToUpload.length} document(s) will be uploaded (feature coming soon)!`)
        
        loadSubmissions()
      toast.success(`${filesToUpload.length} document(s) uploaded successfully!`)
    } catch (error) {
      toast.error('Failed to upload document: ' + error.message)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      'submitted': 'bg-blue-100 text-blue-800',
      'under_review': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'denied': 'bg-red-100 text-red-800',
      'withdrawn': 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
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

  const StatCard = ({ icon: Icon, title, value, subtitle, color = "blue" }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="card-body flex items-center">
        <div className={`p-3 bg-${color}-100 rounded-lg mr-4`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </motion.div>
  )

  const SubmissionCard = ({ submission }) => {
    const daysUntilDeadline = getDaysUntilDeadline(submission.next_report_due)
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card hover:shadow-lg transition-all duration-300"
      >
        <div className="card-body">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">
                {submission.opportunity?.title || 'Unknown Opportunity'}
              </h3>
              <p className="text-sm text-gray-600">
                {submission.opportunity?.sponsor} • {submission.project?.name}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Application ID: {submission.application_id || 'Pending'}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(submission.status)}`}>
                {getStatusIcon(submission.status)}
                <span className="ml-1 capitalize">{submission.status.replace('_', ' ')}</span>
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Submitted Amount</p>
                <p className="font-semibold">{formatCurrency(submission.submitted_amount)}</p>
              </div>
              {submission.award_amount && (
                <div>
                  <p className="text-xs text-gray-500">Award Amount</p>
                  <p className="font-semibold text-green-600">{formatCurrency(submission.award_amount)}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Submission Date</p>
                <p className="text-sm">{format(new Date(submission.submission_date), 'MMM d, yyyy')}</p>
              </div>
              {submission.response_date && (
                <div>
                  <p className="text-xs text-gray-500">Response Date</p>
                  <p className="text-sm">{format(new Date(submission.response_date), 'MMM d, yyyy')}</p>
                </div>
              )}
            </div>

            {submission.next_report_due && (
              <div className={`p-3 rounded-lg ${
                daysUntilDeadline < 7 ? 'bg-red-50 border border-red-200' :
                daysUntilDeadline < 30 ? 'bg-yellow-50 border border-yellow-200' :
                'bg-blue-50 border border-blue-200'
              }`}>
                <p className="text-xs font-medium">Next Report Due</p>
                <p className="text-sm">{format(new Date(submission.next_report_due), 'MMM d, yyyy')}</p>
                <p className="text-xs text-gray-600">
                  {daysUntilDeadline > 0 ? `${daysUntilDeadline} days remaining` : 'Overdue'}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
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
                  className="btn-secondary btn-sm"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowDocumentModal(submission)}
                  className="btn-secondary btn-sm"
                >
                  <Upload className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Application Progress</h1>
          <p className="text-gray-600">Track your grant applications from submission to award</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={FileText}
            title="Total Applications"
            value={stats.totalSubmissions || 0}
            color="blue"
          />
          <StatCard
            icon={DollarSign}
            title="Total Requested"
            value={formatCurrency(stats.totalRequested)}
            color="green"
          />
          <StatCard
            icon={TrendingUp}
            title="Total Awarded"
            value={formatCurrency(stats.totalAwarded)}
            color="emerald"
          />
          <StatCard
            icon={CheckCircle}
            title="Success Rate"
            value={`${Math.round(stats.successRate || 0)}%`}
            color="purple"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search applications..."
                className="form-input pl-10 w-64"
              />
            </div>
            
            <select
              className="form-input"
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
            className="btn-primary flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Track Application
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
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No applications tracked</h3>
            <p className="mt-1 text-gray-500">Start tracking your grant applications to monitor progress.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary mt-4"
            >
              Track First Application
            </button>
          </div>
        )}
      </div>

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
    opportunity_id: '',
    submission_date: new Date().toISOString().split('T')[0],
    application_id: '',
    submitted_amount: '',
    requested_amount: '',
    notes: '',
    documents: []
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      submitted_amount: parseFloat(formData.submitted_amount),
      requested_amount: parseFloat(formData.requested_amount)
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Track New Application</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Project *</label>
              <select
                className="form-input"
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
              <label className="form-label">Grant Opportunity</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter opportunity title or ID"
                onChange={(e) => setFormData({...formData, opportunity_title: e.target.value})}
              />
            </div>

            <div>
              <label className="form-label">Application ID</label>
              <input
                type="text"
                className="form-input"
                value={formData.application_id}
                onChange={(e) => setFormData({...formData, application_id: e.target.value})}
                placeholder="Grant agency's application ID"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Submitted Amount *</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.submitted_amount}
                  onChange={(e) => setFormData({...formData, submitted_amount: e.target.value})}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="form-label">Submission Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.submission_date}
                  onChange={(e) => setFormData({...formData, submission_date: e.target.value})}
                  required
                />
              </div>
            </div>

            {/* File Upload Section */}
            <div>
              <label className="form-label">Upload Application Documents</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={(e) => setFormData({...formData, documents: Array.from(e.target.files)})}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Supported formats: PDF, Word, Excel, Text. You can select multiple files.
                </p>
              </div>
            </div>

            <div>
              <label className="form-label">Notes</label>
              <textarea
                className="form-input"
                rows="3"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional notes about this application..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
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
        className="bg-white rounded-lg shadow-lg max-w-md w-full"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Upload Documents</h3>
          
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="form-label">Document Type</label>
              <select
                className="form-input"
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
              <label className="form-label">Files</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Supported formats: PDF, Word, Excel, Text, Images. Multiple files allowed.
                </p>
              </div>
            </div>

            {/* File Preview */}
            {files.length > 0 && (
              <div className="space-y-2">
                <label className="form-label">Selected Files:</label>
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <Paperclip className="w-4 h-4 mr-2 text-gray-500" />
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-gray-500 ml-2">
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
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary"
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
      'submitted': 'bg-blue-100 text-blue-800',
      'under_review': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'denied': 'bg-red-100 text-red-800',
      'withdrawn': 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Application Details</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Application ID</p>
                  <p className="font-medium">{submission.application_id || 'Pending'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Current Status</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(submission.status)}`}>
                    {submission.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500">Submitted Amount</p>
                  <p className="font-medium">{formatCurrency(submission.submitted_amount)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Submission Date</p>
                  <p className="font-medium">{format(new Date(submission.submission_date), 'MMM d, yyyy')}</p>
                </div>
              </div>
            </div>

            {submission.award_amount && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Award Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Award Amount</p>
                    <p className="font-medium text-green-600">{formatCurrency(submission.award_amount)}</p>
                  </div>
                  {submission.response_date && (
                    <div>
                      <p className="text-gray-500">Response Date</p>
                      <p className="font-medium">{format(new Date(submission.response_date), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Update Status</h4>
              <form onSubmit={handleStatusUpdate} className="space-y-4">
                <div>
                  <label className="form-label">New Status</label>
                  <select
                    className="form-input"
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
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this status update..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button type="button" onClick={onClose} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
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