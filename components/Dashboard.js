// Dashboard.js - Updated to work with props from HomePage instead of useAuth hook
'use client'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Header from './Header'
import ProjectList from './ProjectList'
import OpportunityList from './OpportunityList'
import DonorManagement from './DonorManagement'
import ApplicationProgress from './ApplicationProgress'
import CreateProjectModal from './CreateProjectModal'
import AIAgentInterface from './AIAgentInterface'
import { 
  directUserServices
} from '../lib/supabase'
import { 
  Plus, 
  Target, 
  Clock, 
  TrendingUp, 
  DollarSign, 
  RefreshCw, 
  Zap, 
  Database,
  Users,
  FileText,
  Heart,
  CheckCircle,
  Brain
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function Dashboard({ user, userProfile: initialUserProfile, onProfileUpdate }) {
  // Remove useAuth dependency - use props instead
  const [userProfile, setUserProfile] = useState(initialUserProfile)
  const [profileLoading, setProfileLoading] = useState(false)
  
  // Dashboard state
  const [projects, setProjects] = useState([])
  const [opportunities, setOpportunities] = useState([])
  const [projectOpportunities, setProjectOpportunities] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  
  // Track if initial load is complete
  const initialLoadComplete = useRef(false)
  
  // Enhanced stats for all features
  const [stats, setStats] = useState({
    // Project stats
    totalProjects: 0,
    activeOpportunities: 0,
    totalFunding: 0,
    successRate: 0,
    // Donor stats
    totalDonors: 0,
    totalDonated: 0,
    avgDonationAmount: 0,
    majorDonors: 0,
    // Application stats
    totalSubmissions: 0,
    totalRequested: 0,
    totalAwarded: 0,
    applicationSuccessRate: 0
  })

  // Updated tabs array with cleaner, more focused navigation
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Target, description: 'Financial summary & insights' },
    { id: 'opportunities', label: 'Funding', icon: Zap, description: 'Available grants & matches' },
    { id: 'applications', label: 'Pipeline', icon: FileText, description: 'Active applications' },
    { id: 'donations', label: 'Donors', icon: Heart, description: 'Donor management & tracking' },
    { id: 'ai-agent', label: 'AI Assistant', icon: Brain, description: 'Intelligent analysis' }
  ]

  // Load dashboard data when user and profile are available
  useEffect(() => {
    if (user && userProfile && !initialLoadComplete.current) {
      console.log('Initial dashboard data load')
      loadDashboardData()
      initialLoadComplete.current = true
    }
  }, [user, userProfile])

  // Update internal profile state when prop changes
  useEffect(() => {
    setUserProfile(initialUserProfile)
  }, [initialUserProfile])

  const handleProfileUpdate = (updatedProfile) => {
    setUserProfile(updatedProfile)
    if (onProfileUpdate) {
      onProfileUpdate(updatedProfile)
    }
    console.log('Profile updated:', updatedProfile)
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      console.log('Loading dashboard data...')
      
      if (!user?.id) {
        console.warn('loadDashboardData: No user.id available')
        setLoading(false)
        return
      }

      console.log('loadDashboardData: Loading data for user:', user.id) // Debug log
      
      // Load core data
      const [userProjects, allOpportunities] = await Promise.all([
        directUserServices.projects.getProjects(user.id),
        directUserServices.opportunities.getOpportunities({
          organizationType: userProfile?.organization_type || 'nonprofit'
        })
      ])
      
      console.log('loadDashboardData: Core data loaded, projects:', userProjects.length, 'opportunities:', allOpportunities.length) // Debug log
      
      setProjects(userProjects)
      setOpportunities(allOpportunities)

      // Set default selected project
      if (userProjects.length > 0 && !selectedProject) {
        setSelectedProject(userProjects[0])
      }

      // Load enhanced stats
      await loadEnhancedStats(userProjects, allOpportunities)
      
    } catch (error) {
      toast.error('Failed to load dashboard data')
      console.error('Dashboard load error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Separate function for refreshing data after sync
  const refreshDataAfterSync = async () => {
    try {
      console.log('Refreshing data after sync...')
      
      // Only reload opportunities, keep other data intact
      const newOpportunities = await directUserServices.opportunities.getOpportunities({
        organizationType: userProfile.organization_type
      })
      setOpportunities(newOpportunities)
      
      // Recalculate stats with new opportunities
      await loadEnhancedStats(projects, newOpportunities)
      
    } catch (error) {
      console.error('Error refreshing data after sync:', error)
    }
  }

  const loadEnhancedStats = async (userProjects, allOpportunities) => {
    try {
      if (!user?.id) {
        console.warn('loadEnhancedStats: No user.id available')
        return
      }

      console.log('loadEnhancedStats: Loading stats for user:', user.id) // Debug log
      
      const [donorStats, applicationStats] = await Promise.all([
        directUserServices.donors.getDonorStats(user.id),
        directUserServices.applications.getSubmissionStats(user.id)
      ])

      console.log('loadEnhancedStats: Stats loaded successfully') // Debug log

      // Calculate project stats
      const totalProjects = userProjects.length
      const activeOpportunities = allOpportunities.filter(opp => 
        !opp.deadline_date || new Date(opp.deadline_date) > new Date()
      ).length
      
      const totalFunding = userProjects.reduce((sum, project) => 
        sum + (project.funding_needed || 0), 0
      )

      setStats({
        // Project stats
        totalProjects,
        activeOpportunities,
        totalFunding,
        successRate: totalProjects > 0 ? Math.round((totalProjects * 0.3)) : 0,
        // Donor stats
        totalDonors: donorStats.totalDonors || 0,
        totalDonated: donorStats.totalRaised || 0,
        avgDonationAmount: donorStats.avgDonationAmount || 0,
        majorDonors: donorStats.majorDonors || 0,
        // Application stats
        totalSubmissions: applicationStats.totalSubmissions || 0,
        totalRequested: applicationStats.totalRequested || 0,
        totalAwarded: applicationStats.totalAwarded || 0,
        applicationSuccessRate: applicationStats.successRate || 0
      })
    } catch (error) {
      console.error('Error loading enhanced stats:', error)
    }
  }

  const handleSyncOpportunities = async () => {
    setSyncing(true)
    const startTime = Date.now()
    
    try {
      const toastId = toast.loading('Connecting to Grants.gov...', {
        style: {
          background: '#1e293b',
          color: '#f8fafc',
          border: '1px solid #334155',
        },
      })
      
      const response = await fetch('/api/sync/grants-gov')
      const result = await response.json()
      
      if (result.success) {
        const syncTime = Math.round((Date.now() - startTime) / 1000)
        setLastSyncTime(new Date())
        
        toast.dismiss(toastId)
        
        const successMessage = (
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            </div>
            <div>
              <div className="font-semibold text-gray-900">Sync Complete!</div>
              <div className="text-sm text-gray-600">
                <strong>{result.imported}</strong> new opportunities imported in <strong>{syncTime}s</strong>
              </div>
              {result.summary?.agencies && (
                <div className="text-xs text-gray-500 mt-1">
                  Sources: {result.summary.agencies.slice(0, 3).join(', ')}
                  {result.summary.agencies.length > 3 && ` +${result.summary.agencies.length - 3} more`}
                </div>
              )}
            </div>
          </div>
        )
        
        toast.success(successMessage, {
          duration: 6000,
          style: {
            background: '#f0fdf4',
            color: '#166534',
            border: '1px solid #bbf7d0',
            minWidth: '320px',
          },
        })
        
        // Only refresh data after successful sync
        await refreshDataAfterSync()
        
        // Show AI matching notification for selected project
        if (selectedProject && result.imported > 0) {
          setTimeout(() => {
            toast.success(
              `AI is analyzing ${result.imported} new opportunities for "${selectedProject.name}"`,
              {
                duration: 4000,
                style: {
                  background: '#eff6ff',
                  color: '#1e40af',
                  border: '1px solid #bfdbfe',
                },
              }
            )
          }, 1000)
        }
        
      } else {
        toast.dismiss(toastId)
        toast.error('Sync failed: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Sync error:', error)
      toast.error('Connection failed')
    } finally {
      setSyncing(false)
    }
  }

  const formatLastSync = (time) => {
    if (!time) return 'Never'
    const now = new Date()
    const diff = Math.round((now - time) / 1000 / 60)
    
    if (diff < 1) return 'Just now'
    if (diff < 60) return `${diff}m ago`
    if (diff < 1440) return `${Math.round(diff / 60)}h ago`
    return time.toLocaleDateString()
  }

  const handleProjectCreated = async (newProject) => {
    const updatedProjects = [newProject, ...projects]
    setProjects(updatedProjects)
    setSelectedProject(newProject)
    setShowCreateModal(false)
    setEditingProject(null)
    toast.success('Project created successfully!')
    
    // Recalculate stats
    await loadEnhancedStats(updatedProjects, opportunities)
    
    // Trigger AI opportunity matching
    setTimeout(() => {
      toast.success('AI is analyzing opportunities for your new project...')
    }, 1000)
  }

  const handleProjectUpdated = async (updatedProject) => {
    const updatedProjects = projects.map(p => p.id === updatedProject.id ? updatedProject : p)
    setProjects(updatedProjects)
    
    if (selectedProject?.id === updatedProject.id) {
      setSelectedProject(updatedProject)
    }
    
    setEditingProject(null)
    setShowCreateModal(false)
    toast.success('Project updated successfully!')
    
    // Recalculate stats
    await loadEnhancedStats(updatedProjects, opportunities)
    
    // Trigger AI re-analysis
    setTimeout(() => {
      toast.success('AI is re-analyzing opportunities based on your project updates...')
    }, 1000)
  }

  const handleProjectEdit = (project) => {
    setEditingProject(project)
    setShowCreateModal(true)
  }

  const handleProjectDelete = async (projectId) => {
    try {
      await directUserServices.projects.deleteProject(projectId, user.id)
      const updatedProjects = projects.filter(p => p.id !== projectId)
      setProjects(updatedProjects)
      
      if (selectedProject?.id === projectId) {
        setSelectedProject(updatedProjects.length > 0 ? updatedProjects[0] : null)
      }
      
      toast.success('Project deleted successfully')
      await loadEnhancedStats(updatedProjects, opportunities)
    } catch (error) {
      toast.error('Failed to delete project: ' + error.message)
    }
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setEditingProject(null)
  }

  const handleProjectSelected = async (project) => {
    setSelectedProject(project)
    
    // Load project opportunities
    try {
      const projOpportunities = await directUserServices.projectOpportunities.getProjectOpportunities(project.id, user.id)
      setProjectOpportunities(projOpportunities)
    } catch (error) {
      console.error('Failed to load project opportunities:', error)
    }
  }

  // Enhanced stat card component with financial focus
  const StatCard = ({ icon: Icon, title, value, subtitle, change, color = "brand", trend, isFinancial = false }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-financial p-6 hover:shadow-lg transition-all duration-300 group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-3">
            <div className={`p-2 bg-${color}-100 rounded-xl mr-3 group-hover:scale-110 transition-transform`}>
              <Icon className={`h-5 w-5 text-${color}-600`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-600">{title}</p>
              {change && (
                <div className={`flex items-center text-xs font-medium ${change.positive ? 'text-financial-success' : 'text-financial-danger'}`}>
                  <TrendingUp className={`w-3 h-3 mr-1 ${change.positive ? '' : 'rotate-180'}`} />
                  {change.value}
                </div>
              )}
            </div>
          </div>
          <div className="mb-2">
            <p className={`text-2xl font-bold ${isFinancial ? 'text-brand-700' : 'text-neutral-900'}`}>
              {isFinancial && typeof value === 'number' ? `$${value.toLocaleString()}` : value}
            </p>
          </div>
          {subtitle && (
            <p className="text-sm text-neutral-500">{subtitle}</p>
          )}
        </div>
      </div>
    </motion.div>
  )

  // AI Agent Status Card component with financial styling
  const AgentStatusCard = ({ userId }) => (
    <StatCard
      icon={Brain}
      title="AI Assistant"
      value="Ready"
      subtitle="Available for analysis"
      color="gold"
    />
  )

  // Show error if no user provided
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in</h2>
          <p className="text-gray-600">You need to be authenticated to access the dashboard.</p>
        </div>
      </div>
    )
  }

  // Show profile loading state
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  // Dashboard loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header user={user} userProfile={userProfile} onProfileUpdate={handleProfileUpdate} />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  // Main dashboard render
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-brand-50/30">
      <Header user={user} userProfile={userProfile} onProfileUpdate={handleProfileUpdate} />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Modern Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-neutral-200">
            <nav className="flex space-x-8">
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group py-4 px-2 border-b-2 font-semibold text-sm flex flex-col items-center transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'border-brand-500 text-brand-600'
                        : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span>{tab.label}</span>
                    <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                      {tab.description}
                    </span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Financial Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                icon={Target}
                title="Active Projects"
                value={stats.totalProjects}
                subtitle={stats.totalFunding > 0 ? `Seeking $${stats.totalFunding.toLocaleString()}` : "No funding requests yet"}
                color="brand"
              />
              <StatCard
                icon={DollarSign}
                title="Funding Secured"
                value={stats.totalAwarded > 0 ? `$${stats.totalAwarded.toLocaleString()}` : "$0"}
                subtitle={stats.totalSubmissions > 0 ? `${stats.applicationSuccessRate}% success rate` : "No applications yet"}
                color="gold"
                isFinancial={true}
              />
              <StatCard
                icon={Zap}
                title="Active Opportunities"
                value={stats.activeOpportunities}
                subtitle={stats.activeOpportunities > 0 ? "Available for matching" : "Sync to discover opportunities"}
                color="brand"
              />
              <AgentStatusCard userId={user.id} />
            </div>

            {/* Enhanced Sync Control Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-financial mb-8 border-gradient-financial"
            >
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center mb-4 lg:mb-0">
                    <div className="p-3 bg-gradient-to-r from-brand-100 to-gold-100 rounded-2xl mr-4">
                      <Database className="h-7 w-7 text-brand-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-neutral-900 mb-1">
                        Federal Grant Database
                      </h3>
                      <p className="text-sm text-neutral-600 flex items-center">
                        <span className={`w-2 h-2 rounded-full mr-2 ${syncing ? 'bg-gold-500 animate-pulse' : 'bg-brand-500'}`}></span>
                        Live connection to federal funding opportunities
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleSyncOpportunities}
                    disabled={syncing}
                    className={`btn-primary btn-lg flex items-center shadow-financial ${syncing ? 'opacity-75' : ''}`}
                  >
                    {syncing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-5 h-5 mr-3" />
                        Refresh Opportunities
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Projects and Opportunities Overview - Cleaner Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              {/* Project Sidebar - More Compact */}
              <div className="xl:col-span-4">
                <div className="card-financial">
                  <div className="p-6 border-b border-neutral-100">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-neutral-900">Your Projects</h2>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn-primary btn-sm shadow-sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        New Project
                      </button>
                    </div>
                    <p className="text-sm text-neutral-600">
                      {projects.length} active • ${stats.totalFunding.toLocaleString()} total funding needed
                    </p>
                  </div>
                  <div className="p-4 max-h-96 overflow-y-auto">
                    <ProjectList
                      projects={projects}
                      selectedProject={selectedProject}
                      onProjectSelect={handleProjectSelected}
                      onProjectEdit={handleProjectEdit}
                      onProjectDelete={handleProjectDelete}
                    />
                  </div>
                </div>
              </div>

              {/* Opportunities - Main Content */}
              <div className="xl:col-span-8">
                <OpportunityList
                  opportunities={opportunities}
                  selectedProject={selectedProject}
                  userProfile={userProfile}
                />
              </div>
            </div>
          </>
        )}

        {/* AI Agent Tab Content */}
        {activeTab === 'ai-agent' && (
          <AIAgentInterface 
            user={user} 
            userProfile={userProfile}
            projects={projects}
            opportunities={opportunities}
          />
        )}

        {activeTab === 'opportunities' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-4">
              <div className="card-financial">
                <div className="p-6 border-b border-neutral-100">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-neutral-900">Filter by Project</h2>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="btn-secondary btn-sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Project
                    </button>
                  </div>
                </div>
                <div className="p-4 max-h-96 overflow-y-auto">
                  <ProjectList
                    projects={projects}
                    selectedProject={selectedProject}
                    onProjectSelect={handleProjectSelected}
                    onProjectEdit={handleProjectEdit}
                    onProjectDelete={handleProjectDelete}
                  />
                </div>
              </div>
            </div>

            <div className="xl:col-span-8">
              <OpportunityList
                opportunities={opportunities}
                selectedProject={selectedProject}
                userProfile={userProfile}
              />
            </div>
          </div>
        )}

        {activeTab === 'applications' && (
          <ApplicationProgress
            user={user}
            userProfile={userProfile}
            projects={projects}
          />
        )}

        {activeTab === 'donations' && (
          <DonorManagement
            user={user}
            userProfile={userProfile}
            projects={projects}
          />
        )}

        {/* Create/Edit Project Modal */}
        {showCreateModal && (
          <CreateProjectModal
            user={user}
            userProfile={userProfile}
            onClose={handleCloseModal}
            onProjectCreated={handleProjectCreated}
            onProjectUpdated={handleProjectUpdated}
            editProject={editingProject}
          />
        )}
      </main>
    </div>
  )
}