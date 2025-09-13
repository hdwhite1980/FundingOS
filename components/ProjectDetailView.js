'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Target, 
  DollarSign, 
  Calendar, 
  Users, 
  TrendingUp, 
  FileText, 
  Award, 
  Building2, 
  PieChart, 
  BarChart3,
  Activity,
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Plus,
  Filter,
  Bookmark,
  Download
} from 'lucide-react'
import { directUserServices } from '../lib/supabase'

export default function ProjectDetailView({ 
  project, 
  onBack 
}) {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({
    appliedOpportunities: [],
    savedOpportunities: [],
    campaigns: [],
    angelInvestments: [],
    reits: [],
    directDonations: [],
    metrics: {}
  })

  // Load real project data instead of mock data
  useEffect(() => {
    const fetchProjectData = async () => {
      if (!project?.id) return
      
      setLoading(true)
      
      try {
        // Get real data from database
        const [applications, savedOpportunities, campaigns, angelInvestments, reits, directDonations] = await Promise.allSettled([
          directUserServices.applications.getApplications(project.user_id, { projectId: project.id }),
          directUserServices.opportunities.getSavedOpportunities(project.user_id),
          directUserServices.campaigns.getCampaignsByProject(project.id),
          directUserServices.investors.getInvestmentsByProject(project.id),
          [], // REITs functionality not yet implemented
          directUserServices.donors.getDonationsByProject(project.id)
        ])

        // Calculate metrics from real data
        const applicationData = applications.status === 'fulfilled' ? applications.value : []
        const savedOppsData = savedOpportunities.status === 'fulfilled' ? savedOpportunities.value.filter(opp => opp.project_id === project.id) : []
        const campaignData = campaigns.status === 'fulfilled' ? campaigns.value : []
        const donationData = directDonations.status === 'fulfilled' ? directDonations.value : []
        
        const metrics = {
          totalFunding: (applicationData.reduce((sum, app) => sum + (app.awarded_amount || 0), 0) + 
                        donationData.reduce((sum, don) => sum + (don.amount || 0), 0)),
          activeApplications: applicationData.filter(app => ['submitted', 'in_review', 'approved'].includes(app.status)).length,
          successRate: applicationData.length > 0 ? 
            (applicationData.filter(app => app.status === 'approved').length / applicationData.length * 100) : 0,
          avgProcessingTime: 45, // This would need to be calculated from actual data
          totalRaised: campaignData.reduce((sum, camp) => sum + (camp.current_amount || 0), 0)
        }

        setData({
          appliedOpportunities: applicationData,
          savedOpportunities: savedOppsData,
          campaigns: campaignData,
          angelInvestments: angelInvestments.status === 'fulfilled' ? angelInvestments.value : [],
          reits: [],
          directDonations: donationData,
          metrics
        })
      } catch (error) {
        console.error('Error fetching project data:', error)
        // Set empty data on error
        setData({
          appliedOpportunities: [],
          savedOpportunities: [],
          campaigns: [],
          angelInvestments: [],
          reits: [],
          directDonations: [],
          metrics: {
            totalFunding: 0,
            activeApplications: 0,
            successRate: 0,
            avgProcessingTime: 0,
            totalRaised: 0
          }
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProjectData()
  }, [project?.id, project?.user_id])

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Target },
    { id: 'opportunities', label: 'Saved Opportunities', icon: Bookmark },
    { id: 'applications', label: 'Grant Applications', icon: FileText },
    { id: 'crowdfunding', label: 'Crowdfunding', icon: Users },
    { id: 'angel-investors', label: 'Angel Investors', icon: TrendingUp },
    { id: 'reits', label: 'REITs', icon: Building2 },
    { id: 'direct-donations', label: 'Direct Donations', icon: DollarSign }
  ]

  const exportData = () => {
    const exportObj = {
      project: project.name || project.title,
      exportDate: new Date().toISOString(),
      summary: data.metrics,
      applications: data.appliedOpportunities,
      savedOpportunities: data.savedOpportunities,
      campaigns: data.campaigns,
      angelInvestments: data.angelInvestments,
      reits: data.reits,
      directDonations: data.directDonations
    }

    const dataStr = JSON.stringify(exportObj, null, 2)
    const dataBlob = new Blob([dataStr], {type: 'application/json'})
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${project.name || project.title}-project-report.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
      case 'funded':
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'submitted':
      case 'in_review':
        return 'bg-blue-100 text-blue-800'
      case 'rejected':
      case 'declined':
        return 'bg-red-100 text-red-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleNewApplication = () => {
    setActiveTab('applications')
    // This could trigger opening the application tracker
    // onNewApplication?.()
  }

  const handleFindOpportunities = () => {
    setActiveTab('opportunities')
    // This could trigger the opportunity search
    // onFindOpportunities?.()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading project details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-slate-900">
                  {project.name || project.title}
                </h1>
                <p className="text-sm text-slate-600">
                  {project.project_type?.replace('_', ' ')} project
                </p>
              </div>
            </div>
            <button
              onClick={exportData}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 border">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Funding</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${data.metrics.totalFunding?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Applications</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.metrics.activeApplications || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(data.metrics.successRate || 0)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-orange-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Campaign Funding</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${data.metrics.totalRaised?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                  {tab.id === 'applications' && data.appliedOpportunities.length > 0 && (
                    <span className="ml-2 bg-gray-100 text-gray-900 rounded-full px-2 py-0.5 text-xs font-medium">
                      {data.appliedOpportunities.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-4">Project Overview</h2>
                  <div className="bg-slate-50 rounded-lg p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-medium text-slate-900 mb-2">Project Details</h3>
                        <dl className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-slate-600">Type:</dt>
                            <dd className="text-slate-900">{project.project_type?.replace('_', ' ') || 'Not specified'}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-slate-600">Location:</dt>
                            <dd className="text-slate-900">{project.location || 'Not specified'}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-slate-600">Funding Needed:</dt>
                            <dd className="text-slate-900">${project.funding_needed?.toLocaleString() || 'Not specified'}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-slate-600">Created:</dt>
                            <dd className="text-slate-900">{project.created_at ? new Date(project.created_at).toLocaleDateString() : 'Unknown'}</dd>
                          </div>
                        </dl>
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900 mb-2">Description</h3>
                        <p className="text-sm text-slate-600">
                          {project.description || 'No description provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={handleNewApplication}
                    className="p-4 border border-dashed border-gray-300 rounded-lg text-left hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
                  >
                    <Plus className="w-5 h-5 text-emerald-600 mb-2" />
                    <h3 className="font-medium text-slate-900">Start New Application</h3>
                    <p className="text-sm text-slate-600">Apply to funding opportunities</p>
                  </button>
                  <button
                    onClick={handleFindOpportunities}
                    className="p-4 border border-dashed border-gray-300 rounded-lg text-left hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <Target className="w-5 h-5 text-blue-600 mb-2" />
                    <h3 className="font-medium text-slate-900">Find Opportunities</h3>
                    <p className="text-sm text-slate-600">Discover new funding sources</p>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'applications' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Grant Applications</h2>
                  <button 
                    onClick={handleNewApplication}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    New Application
                  </button>
                </div>
                <div className="space-y-4">
                  {data.appliedOpportunities.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">No applications yet</h3>
                      <p className="text-slate-600 mb-4">Start by creating your first application</p>
                      <button
                        onClick={handleNewApplication}
                        className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md hover:bg-emerald-700"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Create Application
                      </button>
                    </div>
                  ) : (
                    data.appliedOpportunities.map((app) => (
                      <div key={app.id} className="bg-white border rounded-lg p-6 hover:shadow-sm transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-gray-900">{app.opportunity_title || app.title}</h3>
                            <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                              <span className="flex items-center">
                                <DollarSign className="w-4 h-4 mr-1" />
                                ${app.submitted_amount?.toLocaleString() || 'Amount not specified'}
                              </span>
                              <span className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                Submitted: {app.submission_date ? new Date(app.submission_date).toLocaleDateString() : 'Date unknown'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(app.status)}`}>
                                {app.status?.replace('_', ' ') || 'Unknown'}
                              </span>
                              {app.ai_completion_data?.completionPercentage && (
                                <div className="mt-1 text-sm text-gray-500">
                                  {app.ai_completion_data.completionPercentage}% AI completed
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {app.notes && (
                          <div className="mt-3 text-sm text-gray-600">
                            <strong>Notes:</strong> {app.notes}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'opportunities' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Saved Opportunities</h2>
                  <button 
                    onClick={handleFindOpportunities}
                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md hover:bg-emerald-700"
                  >
                    <Target className="w-4 h-4 mr-1" />
                    Find More
                  </button>
                </div>
                <div className="space-y-4">
                  {data.savedOpportunities.length === 0 ? (
                    <div className="text-center py-8">
                      <Bookmark className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">No saved opportunities</h3>
                      <p className="text-slate-600 mb-4">Save opportunities that match your project</p>
                      <button
                        onClick={handleFindOpportunities}
                        className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md hover:bg-emerald-700"
                      >
                        <Target className="w-4 h-4 mr-1" />
                        Discover Opportunities
                      </button>
                    </div>
                  ) : (
                    data.savedOpportunities.map((opp) => (
                      <div key={opp.id} className="bg-white border rounded-lg p-6 hover:shadow-sm transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-gray-900">{opp.title}</h3>
                            <p className="text-sm text-gray-600">{opp.funder_name}</p>
                            <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                              <span className="flex items-center">
                                <DollarSign className="w-4 h-4 mr-1" />
                                ${opp.amount_min?.toLocaleString()} - ${opp.amount_max?.toLocaleString()}
                              </span>
                              <span className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                Deadline: {new Date(opp.deadline_date).toLocaleDateString()}
                              </span>
                              {opp.fit_score && (
                                <span className="flex items-center">
                                  <Target className="w-4 h-4 mr-1" />
                                  {opp.fit_score}% match
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(opp.status)}`}>
                              {opp.status?.replace('_', ' ') || 'Unknown'}
                            </span>
                            <button className="p-2 hover:bg-gray-100 rounded-full">
                              <ExternalLink className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Placeholder tabs for other funding types */}
            {(activeTab === 'crowdfunding' || activeTab === 'angel-investors' || 
              activeTab === 'reits' || activeTab === 'direct-donations') && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  {activeTab === 'crowdfunding' && <Users className="w-6 h-6 text-slate-600" />}
                  {activeTab === 'angel-investors' && <TrendingUp className="w-6 h-6 text-slate-600" />}
                  {activeTab === 'reits' && <Building2 className="w-6 h-6 text-slate-600" />}
                  {activeTab === 'direct-donations' && <DollarSign className="w-6 h-6 text-slate-600" />}
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  {tabs.find(t => t.id === activeTab)?.label} data will appear here
                </h3>
                <p className="text-slate-600">
                  Real data from {tabs.find(t => t.id === activeTab)?.label.toLowerCase()} will be displayed when available
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}