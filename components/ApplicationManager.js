'use client'

/**
 * Application Manager - Complete implementation example showing integration
 * of the AI Form Completion System
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
  Building,
  User,
  Calendar,
  DollarSign,
  Target,
  BarChart3
} from 'lucide-react'
import toast from 'react-hot-toast'
import FormCompletionWizard from './FormCompletionWizard'
import formCompletionService from '../lib/formCompletionService'

export default function ApplicationManager({
  projects,
  userProfile,
  companySettings,
  onApplicationComplete
}) {
  const [applications, setApplications] = useState([])
  const [filteredApplications, setFilteredApplications] = useState([])
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [showWizard, setShowWizard] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    drafts: 0
  })

  // Load applications on mount
  useEffect(() => {
    loadApplications()
  }, [])

  // Filter applications when search/filter changes
  useEffect(() => {
    filterApplications()
  }, [applications, searchTerm, statusFilter])

  const loadApplications = async () => {
    try {
      setLoading(true)
      // In a real app, this would load from your database
      // For now, we'll load from localStorage or initialize empty
      const saved = localStorage.getItem('form_applications')
      const loadedApplications = saved ? JSON.parse(saved) : []

      setApplications(loadedApplications)
      calculateStats(loadedApplications)
    } catch (error) {
      console.error('Failed to load applications:', error)
      toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (apps) => {
    const stats = {
      total: apps.length,
      completed: apps.filter(app => app.status === 'completed').length,
      inProgress: apps.filter(app => app.status === 'in_progress').length,
      drafts: apps.filter(app => app.status === 'draft').length
    }
    setStats(stats)
  }

  const filterApplications = () => {
    let filtered = applications

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(app =>
        app.formTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.organizationName?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter)
    }

    setFilteredApplications(filtered)
  }

  const handleStartNewApplication = () => {
    setSelectedApplication(null)
    setShowWizard(true)
  }

  const handleEditApplication = (application) => {
    setSelectedApplication(application)
    setShowWizard(true)
  }

  const handleDeleteApplication = async (applicationId) => {
    if (!confirm('Are you sure you want to delete this application?')) return

    try {
      const updatedApplications = applications.filter(app => app.id !== applicationId)
      setApplications(updatedApplications)
      localStorage.setItem('form_applications', JSON.stringify(updatedApplications))
      calculateStats(updatedApplications)
      toast.success('Application deleted')
    } catch (error) {
      console.error('Failed to delete application:', error)
      toast.error('Failed to delete application')
    }
  }

  const handleApplicationSave = async (completedData, applicationData = {}) => {
    try {
      const application = {
        id: selectedApplication?.id || `app_${Date.now()}`,
        formTitle: applicationData.formTitle || selectedApplication?.formTitle || 'Untitled Application',
        projectName: applicationData.projectName || selectedApplication?.projectName,
        organizationName: applicationData.organizationName || selectedApplication?.organizationName,
        status: applicationData.status || 'draft',
        completedData,
        completionPercentage: applicationData.completionPercentage || 0,
        lastModified: new Date().toISOString(),
        createdAt: selectedApplication?.createdAt || new Date().toISOString(),
        formStructure: applicationData.formStructure,
        autoFilledFields: applicationData.autoFilledFields || [],
        aiAssistedFields: applicationData.aiAssistedFields || []
      }

      const updatedApplications = selectedApplication
        ? applications.map(app => app.id === application.id ? application : app)
        : [...applications, application]

      setApplications(updatedApplications)
      localStorage.setItem('form_applications', JSON.stringify(updatedApplications))
      calculateStats(updatedApplications)

      if (onApplicationComplete) {
        onApplicationComplete(application)
      }

      toast.success(selectedApplication ? 'Application updated' : 'Application saved')
      setShowWizard(false)
      setSelectedApplication(null)

    } catch (error) {
      console.error('Failed to save application:', error)
      toast.error('Failed to save application')
    }
  }

  const handleExportApplication = async (application, format = 'pdf') => {
    try {
      if (!application.formStructure || !application.completedData) {
        toast.error('Application data is incomplete')
        return
      }

      const exportResult = await formCompletionService.exportForm(
        application.formStructure,
        application.completedData,
        format,
        {
          includeEmptyFields: true,
          autoFilledFields: application.autoFilledFields || []
        }
      )

      formCompletionService.downloadExportedForm(exportResult)
      toast.success(`Application exported as ${format.toUpperCase()}`)

    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export application')
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-600" />
      case 'draft':
        return <Edit className="w-5 h-5 text-gray-600" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Application Manager</h1>
          <p className="text-gray-600">Manage your grant applications and forms with AI assistance</p>
        </div>
        <button
          onClick={handleStartNewApplication}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>New Application</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <FileText className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Applications</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Edit className="w-8 h-8 text-gray-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Drafts</p>
              <p className="text-2xl font-bold text-gray-900">{stats.drafts}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredApplications.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No applications found</h3>
            <p className="text-gray-600 mb-4">
              {applications.length === 0
                ? "Get started by creating your first application with AI assistance."
                : "Try adjusting your search or filter criteria."
              }
            </p>
            {applications.length === 0 && (
              <button
                onClick={handleStartNewApplication}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Your First Application
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredApplications.map((application) => (
              <div key={application.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(application.status)}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {application.formTitle}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span className="flex items-center">
                          <Building className="w-4 h-4 mr-1" />
                          {application.organizationName || 'No organization'}
                        </span>
                        <span className="flex items-center">
                          <Target className="w-4 h-4 mr-1" />
                          {application.projectName || 'No project'}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(application.lastModified).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                      {application.status.replace('_', ' ').toUpperCase()}
                    </span>

                    <div className="text-sm text-gray-600">
                      {application.completionPercentage}% complete
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditApplication(application)}
                        className="text-blue-600 hover:text-blue-700 p-1"
                        title="Edit Application"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleExportApplication(application, 'pdf')}
                        className="text-green-600 hover:text-green-700 p-1"
                        title="Export PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteApplication(application.id)}
                        className="text-red-600 hover:text-red-700 p-1"
                        title="Delete Application"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Completion Progress</span>
                    <span>{application.completionPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${application.completionPercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* AI Assistance Indicators */}
                {(application.autoFilledFields?.length > 0 || application.aiAssistedFields?.length > 0) && (
                  <div className="flex items-center space-x-4 mt-3 text-sm text-gray-600">
                    {application.autoFilledFields?.length > 0 && (
                      <span className="flex items-center text-green-600">
                        <Zap className="w-4 h-4 mr-1" />
                        {application.autoFilledFields.length} auto-filled
                      </span>
                    )}
                    {application.aiAssistedFields?.length > 0 && (
                      <span className="flex items-center text-purple-600">
                        <BarChart3 className="w-4 h-4 mr-1" />
                        {application.aiAssistedFields.length} AI-assisted
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Completion Wizard Modal */}
      <AnimatePresence>
        {showWizard && (
          <FormCompletionWizard
            projects={projects}
            userProfile={userProfile}
            companySettings={companySettings}
            onClose={() => {
              setShowWizard(false)
              setSelectedApplication(null)
            }}
            onSave={handleApplicationSave}
            initialData={selectedApplication}
          />
        )}
      </AnimatePresence>
    </div>
  )
}