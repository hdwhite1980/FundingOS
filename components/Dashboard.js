// Dashboard.js - Updated with Modern SaaS Design System
'use client'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Header from './Header'
import ProjectList from './ProjectList'
import OpportunityList from './OpportunityList'
import DonorManagement from './DonorManagement'
// Focused funding source components
import CampaignList from './CampaignList'
import DirectDonationsList from './DirectDonationsList'
import { StatCard } from './ui/StatCard'
import AngelInvestorOpportunities from './AngelInvestorOpportunities'
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
  Brain,
  ArrowUpRight,
  ArrowDownRight
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
  const [activeTab, setActiveTab] = useState('overview')
  const [activeFundingTab, setActiveFundingTab] = useState('grants')
  
  // Modal states for funding tab
  const [showReitsModal, setShowReitsModal] = useState(false)
  
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
    applicationSuccessRate: 0,
    // New combined stats
    totalReceived: 0,
    receivedBreakdown: { funding: 0, donations: 0, campaigns: 0 }
  })

  // Financial insights for information hub
  const [insights, setInsights] = useState([])
  const [aiActivity, setAiActivity] = useState([])

  // Updated tabs array with cleaner, more focused navigation
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Target, description: 'Financial summary & insights' },
    { id: 'opportunities', label: 'Funding', icon: Zap, description: 'Grants, campaigns, investors & REITs' },
    { id: 'applications', label: 'Pipeline', icon: FileText, description: 'Active applications' },
    { id: 'donations', label: 'Donors & Investors', icon: Heart, description: 'Donor & investor management' },
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
      
      const [donorStats, applicationStats, totalReceivedStats, financialInsights] = await Promise.all([
        directUserServices.donors.getDonorStats(user.id),
        directUserServices.applications.getSubmissionStats(user.id),
        directUserServices.donors.getTotalAmountReceived(user.id),
        directUserServices.donors.getFinancialInsights(user.id)
      ])

      console.log('loadEnhancedStats: Stats loaded successfully', { totalReceivedStats }) // Debug log

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
        applicationSuccessRate: applicationStats.successRate || 0,
        // Combined total received stats
        totalReceived: totalReceivedStats.totalReceived || 0,
        receivedBreakdown: totalReceivedStats.breakdown || { funding: 0, donations: 0, campaigns: 0 }
      })

      // Set insights for information hub
      setInsights(financialInsights)

      // Generate AI activity insights
      const aiActivities = []
      if (activeOpportunities > 0 && totalProjects > 0) {
        aiActivities.push({
          type: 'matching',
          title: 'Opportunity Analysis',
          description: `${activeOpportunities} opportunities being analyzed for ${totalProjects} projects`,
          icon: 'zap',
          color: 'blue',
          timestamp: new Date()
        })
      }
      
      if (applicationStats.totalSubmissions > 0) {
        aiActivities.push({
          type: 'tracking',
          title: 'Application Monitoring',
          description: `Tracking ${applicationStats.totalSubmissions} applications with ${applicationStats.successRate}% success rate`,
          icon: 'eye',
          color: 'green',
          timestamp: new Date()
        })
      }
      
      setAiActivity(aiActivities)
      
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
              <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
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

  // Enhanced StatCard wrapper for modern design system
  const ModernStatCard = ({ icon: Icon, title, value, subtitle, change, color = "emerald", trend, isFinancial = false }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2.5 bg-slate-50 rounded-lg">
              <Icon className="w-5 h-5 text-slate-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">{title}</span>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-slate-900">
              {isFinancial && typeof value === 'number' ? `$${value.toLocaleString()}` : value}
            </p>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium ${
            trend === 'up' 
              ? 'bg-emerald-100 text-emerald-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {trend === 'up' ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            <span>{change}</span>
          </div>
        )}
      </div>
    </div>
  )

  // AI Agent Status Card component
  const AgentStatusCard = ({ userId }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all duration-300">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2.5 bg-emerald-50 rounded-lg">
          <Brain className="w-5 h-5 text-emerald-600" />
        </div>
        <span className="text-sm font-medium text-slate-600">AI Assistant</span>
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-slate-900">Ready</p>
        <p className="text-sm text-slate-500">Available for analysis</p>
      </div>
    </div>
  )

  // Show error if no user provided
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Please log in</h2>
          <p className="text-slate-600">You need to be authenticated to access the dashboard.</p>
        </div>
      </div>
    )
  }

  // Show profile loading state
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  // Dashboard loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header user={user} userProfile={userProfile} onProfileUpdate={handleProfileUpdate} />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </div>
    )
  }

  // Main dashboard render
  return (
    <div className="min-h-screen bg-slate-50">
      <Header user={user} userProfile={userProfile} onProfileUpdate={handleProfileUpdate} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Modern Navigation Tabs - iOS Segmented Control Style */}
        <div className="mb-8">
          <nav className="flex space-x-1 bg-slate-100 rounded-lg p-1 max-w-fit">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-md font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Financial Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <ModernStatCard
                icon={Target}
                title="Active Projects"
                value={stats.totalProjects}
                subtitle={stats.totalFunding > 0 ? `Seeking $${stats.totalFunding.toLocaleString()}` : "No funding requests yet"}
                color="emerald"
              />
              <ModernStatCard
                icon={DollarSign}
                title="Total Amount Received"
                value={stats.totalReceived}
                subtitle={
                  stats.totalReceived > 0 
                    ? `$${stats.receivedBreakdown.funding.toLocaleString()} grants + $${stats.receivedBreakdown.donations.toLocaleString()} donations`
                    : "No funding or donations yet"
                }
                color="amber"
                isFinancial={true}
              />
              <ModernStatCard
                icon={Zap}
                title="Active Opportunities"
                value={stats.activeOpportunities}
                subtitle={stats.activeOpportunities > 0 ? "Available for matching" : "Sync to discover opportunities"}
                color="emerald"
              />
              <AgentStatusCard userId={user.id} />
            </div>

            {/* Information Hub Content */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              
              {/* Financial Insights & Recent Activity */}
              <div className="xl:col-span-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  
                  {/* Recent Financial Activity */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border border-slate-200 hover:shadow-md transition-all duration-200"
                  >
                    <div className="p-6">
                      <div className="flex items-center mb-4">
                        <div className="p-2 bg-slate-50 rounded-lg mr-3">
                          <TrendingUp className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
                      </div>
                      <div className="space-y-4">
                        {insights.length > 0 ? (
                          insights.map((insight, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <div className="flex items-center">
                                <div className={`w-2 h-2 rounded-full mr-3 bg-${insight.color}-500`}></div>
                                <div>
                                  <p className="font-medium text-sm text-slate-900">{insight.title}</p>
                                  <p className="text-xs text-slate-600">{insight.description}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6">
                            <p className="text-slate-500 text-sm">No recent activity</p>
                            <p className="text-slate-400 text-xs">Start applying for grants or receiving donations to see updates here</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>

                  {/* AI Assistant Activity */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border border-slate-200 hover:shadow-md transition-all duration-200"
                  >
                    <div className="p-6">
                      <div className="flex items-center mb-4">
                        <div className="p-2 bg-amber-50 rounded-lg mr-3">
                          <Brain className="w-5 h-5 text-amber-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">AI Assistant Updates</h3>
                      </div>
                      <div className="space-y-4">
                        {aiActivity.length > 0 ? (
                          aiActivity.map((activity, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                              <div className="flex items-center">
                                <div className={`w-2 h-2 rounded-full mr-3 bg-${activity.color}-500 animate-pulse`}></div>
                                <div>
                                  <p className="font-medium text-sm text-slate-900">{activity.title}</p>
                                  <p className="text-xs text-slate-600">{activity.description}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6">
                            <p className="text-slate-500 text-sm">AI Assistant Ready</p>
                            <p className="text-slate-400 text-xs">Create projects to start AI-powered opportunity matching</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Project Quick Overview Sidebar */}
              <div className="xl:col-span-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl border border-slate-200 hover:shadow-md transition-all duration-200"
                >
                  <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-slate-900">Quick Overview</h2>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-3 py-1.5 text-sm flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>New Project</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-emerald-50 rounded-lg">
                        <p className="text-2xl font-bold text-emerald-700">{stats.totalProjects}</p>
                        <p className="text-xs font-medium text-emerald-600">Projects</p>
                      </div>
                      <div className="text-center p-3 bg-amber-50 rounded-lg">
                        <p className="text-2xl font-bold text-amber-700">{stats.totalDonors}</p>
                        <p className="text-xs font-medium text-amber-600">Donors</p>
                      </div>
                      <div className="text-center p-3 bg-slate-100 rounded-lg">
                        <p className="text-2xl font-bold text-slate-700">{stats.totalSubmissions}</p>
                        <p className="text-xs font-medium text-slate-600">Applications</p>
                      </div>
                      <div className="text-center p-3 bg-emerald-50 rounded-lg">
                        <p className="text-2xl font-bold text-emerald-700">{stats.activeOpportunities}</p>
                        <p className="text-xs font-medium text-emerald-600">Opportunities</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 max-h-64 overflow-y-auto">
                    {projects.length > 0 ? (
                      <div className="space-y-3">
                        {projects.slice(0, 5).map(project => (
                          <div
                            key={project.id}
                            className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                            onClick={() => setSelectedProject(project)}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">{project.name}</p>
                              <p className="text-xs text-slate-500">
                                {project.funding_needed ? `$${project.funding_needed.toLocaleString()} needed` : 'No funding specified'}
                              </p>
                            </div>
                            <div className="flex-shrink-0 ml-2">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                            </div>
                          </div>
                        ))}
                        {projects.length > 5 && (
                          <div className="text-center pt-2">
                            <button
                              onClick={() => setActiveTab('opportunities')}
                              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                            >
                              View all {projects.length} projects →
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-slate-500 text-sm">No projects yet</p>
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium mt-1"
                        >
                          Create your first project
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
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
          <>
            {/* Funding Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <ModernStatCard
                icon={DollarSign}
                title="Funding Secured"
                value={stats.totalAwarded}
                subtitle={stats.totalSubmissions > 0 ? `${stats.applicationSuccessRate}% success rate` : "No applications yet"}
                color="amber"
                isFinancial={true}
              />
              <ModernStatCard
                icon={Target}
                title="Funding Requested"
                value={stats.totalRequested}
                subtitle={stats.totalSubmissions > 0 ? `${stats.totalSubmissions} applications` : "No applications yet"}
                color="emerald"
                isFinancial={true}
              />
              <ModernStatCard
                icon={Zap}
                title="Active Opportunities"
                value={stats.activeOpportunities}
                subtitle={stats.activeOpportunities > 0 ? "Available for matching" : "Sync to discover opportunities"}
                color="emerald"
              />
              <ModernStatCard
                icon={FileText}
                title="Applications"
                value={stats.totalSubmissions}
                subtitle={stats.totalSubmissions > 0 ? `${stats.applicationSuccessRate}% success rate` : "No applications yet"}
                color="emerald"
              />
            </div>

            {/* Enhanced Sync Control Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-slate-200 p-6 mb-8 hover:shadow-md transition-all duration-200"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center mb-4 lg:mb-0">
                  <div className="p-3 bg-emerald-100 rounded-lg mr-4">
                    <Database className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">
                      Federal Grant Database
                    </h3>
                    <p className="text-sm text-slate-600 flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-2 ${syncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                      Live connection to federal funding opportunities
                      {lastSyncTime && (
                        <span className="ml-2 text-slate-500">• Last sync: {formatLastSync(lastSyncTime)}</span>
                      )}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleSyncOpportunities}
                  disabled={syncing}
                  className={`bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-6 py-3 flex items-center ${syncing ? 'opacity-75' : ''}`}
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
            </motion.div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              <div className="xl:col-span-4">
                <div className="space-y-6">
                  {/* Filter by Project */}
                  <div className="bg-white rounded-xl border border-slate-200">
                    <div className="p-6 border-b border-slate-200">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-slate-900">Filter by Project</h2>
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors px-3 py-1.5 text-sm flex items-center space-x-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Project</span>
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

                  {/* Active Campaigns */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border border-slate-200"
                  >
                    <div className="p-6 border-b border-slate-200">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-slate-900">Active Campaigns</h2>
                        <button className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-3 py-1.5 text-sm flex items-center space-x-2">
                          <Plus className="w-4 h-4" />
                          <span>New Campaign</span>
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="text-center py-6">
                        <Heart className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-sm text-slate-600">No active campaigns</p>
                        <p className="text-xs text-slate-500">Create campaigns to raise funds from multiple donors</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>

              <div className="xl:col-span-8">
                {/* Funding Source Tabs */}
                <div className="mb-6">
                  <div className="border-b border-slate-200">
                    <nav className="flex space-x-8">
                      {[
                        { id: 'grants', label: 'Grants', icon: FileText },
                        { id: 'campaigns', label: 'Campaigns', icon: Heart },
                        { id: 'angels', label: 'Angel Investors', icon: Users },
                        { id: 'reits', label: 'REITs', icon: TrendingUp },
                        { id: 'donations', label: 'Direct Donations', icon: DollarSign }
                      ].map(tab => {
                        const Icon = tab.icon
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveFundingTab(tab.id)}
                            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                              activeFundingTab === tab.id
                                ? 'border-emerald-500 text-emerald-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center">
                              <Icon className="w-4 h-4 mr-2" />
                              {tab.label}
                            </div>
                          </button>
                        )
                      })}
                    </nav>
                  </div>
                </div>

                {/* Funding Source Content */}
                <div className="bg-white rounded-xl border border-slate-200">
                  {activeFundingTab === 'grants' && (
                    <OpportunityList
                      opportunities={opportunities}
                      selectedProject={selectedProject}
                      userProfile={userProfile}
                    />
                  )}

                  {activeFundingTab === 'campaigns' && (
                    <CampaignList
                      user={user}
                      userProfile={userProfile}
                      projects={projects}
                    />
                  )}

                  {activeFundingTab === 'angels' && (
                    <AngelInvestorOpportunities
                      user={user}
                      userProfile={userProfile}
                      selectedProject={selectedProject}
                    />
                  )}

                  {activeFundingTab === 'reits' && (
                    <div className="p-6">
                      <div className="text-center py-8">
                        <TrendingUp className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-2">Real Estate Investment Trusts</h3>
                        <p className="text-slate-600 mb-6">REIT opportunities for sustainable funding</p>
                        <div className="inline-flex items-center px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                          <Clock className="w-4 h-4 mr-2" />
                          Coming Soon
                        </div>
                      </div>
                    </div>
                  )}

                  {activeFundingTab === 'donations' && (
                    <DirectDonationsList
                      user={user}
                      userProfile={userProfile}
                      projects={projects}
                    />
                  )}
                </div>
              </div>
            </div>
          </>
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

        {/* Funding Tab Modals */}
        {showReitsModal && <ReitsModal onClose={() => setShowReitsModal(false)} />}
      </main>
    </div>
  )
}

// Modal Components for Funding Tab
function CampaignModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900">Create Campaign</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
        </div>
        <div className="text-center py-8">
          <Heart className="mx-auto h-16 w-16 text-pink-400 mb-6" />
          <h4 className="text-lg font-semibold text-slate-900 mb-3">Campaign Creation Coming Soon!</h4>
          <p className="text-slate-600 mb-2">Set up crowdfunding campaigns on platforms like:</p>
          <p className="text-sm text-slate-500">GoFundMe • Kickstarter • Indiegogo • And more</p>
        </div>
        <div className="flex justify-end">
          <button onClick={onClose} className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg hover:bg-emerald-700 font-medium transition-colors">Got it</button>
        </div>
      </div>
    </div>
  )
}

function AngelModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900">Find Angel Investors</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
        </div>
        <div className="text-center py-8">
          <Users className="mx-auto h-16 w-16 text-emerald-400 mb-6" />
          <h4 className="text-lg font-semibold text-slate-900 mb-3">Angel Investor Matching Coming Soon!</h4>
          <p className="text-slate-600 mb-2">Connect with individual investors who are interested in</p>
          <p className="text-sm text-slate-500">funding projects like yours</p>
        </div>
        <div className="flex justify-end">
          <button onClick={onClose} className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg hover:bg-emerald-700 font-medium transition-colors">Got it</button>
        </div>
      </div>
    </div>
  )
}

function ReitsModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900">Explore REITs</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
        </div>
        <div className="text-center py-6">
          <TrendingUp className="mx-auto h-12 w-12 text-green-300 mb-4" />
          <p className="text-slate-600 mb-4">REIT exploration tools are coming soon!</p>
          <p className="text-sm text-slate-500">Discover Real Estate Investment Trust opportunities for sustainable funding.</p>
        </div>
        <div className="flex justify-end">
          <button onClick={onClose} className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg hover:bg-emerald-700 font-medium transition-colors">Got it</button>
        </div>
      </div>
    </div>
  )
}

function DonationsModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900">Setup Donations</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
        </div>
        <div className="text-center py-6">
          <DollarSign className="mx-auto h-12 w-12 text-emerald-300 mb-4" />
          <p className="text-slate-600 mb-4">Direct donation setup is coming soon!</p>
          <p className="text-sm text-slate-500">Set up payment processing to accept direct donations from supporters.</p>
        </div>
        <div className="flex justify-end">
          <button onClick={onClose} className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg hover:bg-emerald-700 font-medium transition-colors">Got it</button>
        </div>
      </div>
    </div>
  )
}