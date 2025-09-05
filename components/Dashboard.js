// Integrated Dashboard.js with full feature set including donor tracking and application progress
'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Header from './Header'
import ProjectList from './ProjectList'
import OpportunityList from './OpportunityList'
import DonorManagement from './DonorManagement'
import ApplicationProgress from './ApplicationProgress'
import CreateProjectModal from './CreateProjectModal'
import { 
  projectService, 
  opportunityService, 
  donorService, 
  applicationProgressService,
  projectOpportunityService 
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
  CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function Dashboard({ user, userProfile, onProfileUpdate }) {
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

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Target },
    { id: 'opportunities', label: 'Opportunities', icon: Zap },
    { id: 'donors', label: 'Donors', icon: Users },
    { id: 'applications', label: 'Applications', icon: FileText }
  ]

  useEffect(() => {
    if (userProfile) {
      loadDashboardData()
    }
  }, [user, userProfile])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load core data
      const [userProjects, allOpportunities] = await Promise.all([
        projectService.getProjects(user.id),
        opportunityService.getOpportunities({
          organizationType: userProfile.organization_type
        })
      ])
      
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

  const loadEnhancedStats = async (userProjects, allOpportunities) => {
    try {
      const [donorStats, applicationStats] = await Promise.all([
        donorService.getDonorStats(user.id),
        applicationProgressService.getSubmissionStats(user.id)
      ])

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
        
        // Reload opportunities
        const newOpportunities = await opportunityService.getOpportunities({
          organizationType: userProfile.organization_type
        })
        setOpportunities(newOpportunities)
        
        // Recalculate stats
        await loadEnhancedStats(projects, newOpportunities)
        
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
      await projectService.deleteProject(projectId)
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
      const projOpportunities = await projectOpportunityService.getProjectOpportunities(project.id)
      setProjectOpportunities(projOpportunities)
    } catch (error) {
      console.error('Failed to load project opportunities:', error)
    }
  }

  // Enhanced stat card component
  const StatCard = ({ icon: Icon, title, value, subtitle, color = "blue", trend }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card hover:shadow-lg transition-all duration-300"
    >
      <div className="card-body flex items-center">
        <div className={`p-3 bg-${color}-100 rounded-lg mr-4`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          {trend && (
            <p className={`text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? '+' : ''}{trend}% vs last month
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate} />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Enhanced Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-2" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <>
            {/* Enhanced Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatCard
                icon={Target}
                title="Active Projects"
                value={stats.totalProjects}
                subtitle={`$${stats.totalFunding.toLocaleString()} needed`}
                color="blue"
              />
              <StatCard
                icon={Users}
                title="Total Donors"
                value={stats.totalDonors}
                subtitle={`$${stats.totalDonated.toLocaleString()} donated`}
                color="green"
              />
              <StatCard
                icon={FileText}
                title="Applications"
                value={stats.totalSubmissions}
                subtitle={`${stats.applicationSuccessRate}% success rate`}
                color="purple"
              />
              <StatCard
                icon={CheckCircle}
                title="Total Awarded"
                value={`$${stats.totalAwarded.toLocaleString()}`}
                subtitle={`from ${Math.round(stats.totalSubmissions * (stats.applicationSuccessRate / 100))} grants`}
                color="emerald"
              />
            </div>

            {/* Sync Control Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card mb-8"
            >
              <div className="card-body">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-50 rounded-lg mr-4">
                      <Database className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Federal Opportunity Database
                      </h3>
                      <p className="text-sm text-gray-600">
                        Connected to live federal grant data • Updated daily at 6 AM EST
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-0 flex items-center space-x-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        syncing ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
                      }`} />
                      {syncing ? 'Syncing data...' : 'Live data ready'}
                    </div>
                    
                    <button
                      onClick={handleSyncOpportunities}
                      disabled={syncing}
                      className="btn-primary btn-sm flex items-center disabled:opacity-50"
                    >
                      {syncing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Refresh Data
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Sync Statistics */}
                {stats.activeOpportunities > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{stats.activeOpportunities}</p>
                        <p className="text-xs text-gray-600">Active Grants</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">Federal</p>
                        <p className="text-xs text-gray-600">Source Type</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-purple-600">Live</p>
                        <p className="text-xs text-gray-600">Data Status</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-amber-600">6 AM</p>
                        <p className="text-xs text-gray-600">Daily Update</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Projects and Opportunities Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-1">
                <div className="card">
                  <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn-primary btn-sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        New
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

              <div className="lg:col-span-3">
                <OpportunityList
                  opportunities={opportunities}
                  selectedProject={selectedProject}
                  userProfile={userProfile}
                />
              </div>
            </div>
          </>
        )}

        {activeTab === 'opportunities' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <div className="card">
                <div className="p-6 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="btn-primary btn-sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New
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

            <div className="lg:col-span-3">
              <OpportunityList
                opportunities={opportunities}
                selectedProject={selectedProject}
                userProfile={userProfile}
              />
            </div>
          </div>
        )}

        {activeTab === 'donors' && (
          <DonorManagement
            user={user}
            userProfile={userProfile}
            projects={projects}
          />
        )}

        {activeTab === 'applications' && (
          <ApplicationProgress
            user={user}
            userProfile={userProfile}
            projects={projects}
          />
        )}

        {/* Create/Edit Project Modal */}
        {showCreateModal && (
          <CreateProjectModal
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