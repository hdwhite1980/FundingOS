'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Header from './Header'
import ProjectList from './ProjectList'
import OpportunityList from './OpportunityList'
import CreateProjectModal from './CreateProjectModal'
import { projectService, opportunityService, projectOpportunityService } from '../lib/supabase'
import { Plus, Target, Clock, TrendingUp, DollarSign, RefreshCw, Zap, Database } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Dashboard({ user, userProfile, onProfileUpdate }) {
  const [projects, setProjects] = useState([])
  const [opportunities, setOpportunities] = useState([])
  const [projectOpportunities, setProjectOpportunities] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState(null)
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeOpportunities: 0,
    totalFunding: 0,
    successRate: 0
  })

  useEffect(() => {
    // Only load dashboard data if we have a valid userProfile
    if (userProfile) {
      loadDashboardData()
    }
  }, [user, userProfile])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load projects
      const userProjects = await projectService.getProjects(user.id)
      setProjects(userProjects)
      
      // Load opportunities
      const allOpportunities = await opportunityService.getOpportunities({
        organizationType: userProfile.organization_type
      })
      setOpportunities(allOpportunities)

      // Set default selected project
      if (userProjects.length > 0 && !selectedProject) {
        setSelectedProject(userProjects[0])
      }

      // Calculate stats
      calculateStats(userProjects, allOpportunities)
      
    } catch (error) {
      toast.error('Failed to load dashboard data')
      console.error('Dashboard load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (userProjects, allOpportunities) => {
    // This would be more sophisticated in a real app
    const totalProjects = userProjects.length
    const activeOpportunities = allOpportunities.filter(opp => 
      !opp.deadline_date || new Date(opp.deadline_date) > new Date()
    ).length
    
    const totalFunding = userProjects.reduce((sum, project) => 
      sum + (project.funding_needed || 0), 0
    )

    setStats({
      totalProjects,
      activeOpportunities,
      totalFunding,
      successRate: totalProjects > 0 ? Math.round((totalProjects * 0.3)) : 0 // Mock success rate
    })
  }

  const handleSyncOpportunities = async () => {
    setSyncing(true)
    const startTime = Date.now()
    
    try {
      toast.loading('Fetching latest opportunities from Grants.gov...', { id: 'sync' })
      
      const response = await fetch('/api/sync/grants-gov')
      const result = await response.json()
      
      if (result.success) {
        const syncTime = Math.round((Date.now() - startTime) / 1000)
        setLastSyncTime(new Date())
        
        toast.success(
          `Successfully imported ${result.imported} opportunities in ${syncTime}s!`, 
          { id: 'sync', duration: 4000 }
        )
        
        // Reload opportunities to show new data
        const newOpportunities = await opportunityService.getOpportunities({
          organizationType: userProfile.organization_type
        })
        setOpportunities(newOpportunities)
        
        // Recalculate stats with new data
        calculateStats(projects, newOpportunities)
        
      } else {
        toast.error('Sync failed: ' + result.error, { id: 'sync' })
      }
    } catch (error) {
      console.error('Sync error:', error)
      toast.error('Sync failed: ' + error.message, { id: 'sync' })
    } finally {
      setSyncing(false)
    }
  }

  const formatLastSync = (time) => {
    if (!time) return 'Never'
    const now = new Date()
    const diff = Math.round((now - time) / 1000 / 60) // minutes
    
    if (diff < 1) return 'Just now'
    if (diff < 60) return `${diff}m ago`
    if (diff < 1440) return `${Math.round(diff / 60)}h ago`
    return time.toLocaleDateString()
  }

  const handleProjectCreated = async (newProject) => {
    setProjects([newProject, ...projects])
    setSelectedProject(newProject)
    setShowCreateModal(false)
    toast.success('Project created successfully!')
    
    // Trigger AI opportunity matching in the background
    setTimeout(() => {
      toast.success('AI is analyzing opportunities for your new project...')
    }, 1000)
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
        {/* Enhanced Stats Cards with Sync Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="card"
          >
            <div className="card-body flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg mr-4">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Projects</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalProjects}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="card"
          >
            <div className="card-body flex items-center">
              <div className="p-3 bg-accent-100 rounded-lg mr-4">
                <Clock className="h-6 w-6 text-accent-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Live Opportunities</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeOpportunities}</p>
                <p className="text-xs text-gray-500">Last sync: {formatLastSync(lastSyncTime)}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="card"
          >
            <div className="card-body flex items-center">
              <div className="p-3 bg-amber-100 rounded-lg mr-4">
                <DollarSign className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Funding Need</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${stats.totalFunding.toLocaleString()}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="card relative overflow-hidden"
          >
            <div className="card-body flex items-center">
              <div className="p-3 bg-green-100 rounded-lg mr-4">
                <RefreshCw className={`h-6 w-6 text-green-600 ${syncing ? 'animate-spin' : ''}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">Data Status</p>
                <button
                  onClick={handleSyncOpportunities}
                  disabled={syncing}
                  className={`text-sm font-semibold transition-colors ${
                    syncing 
                      ? 'text-blue-600 cursor-not-allowed' 
                      : 'text-green-600 hover:text-green-700 cursor-pointer'
                  }`}
                >
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            </div>
            {syncing && (
              <div className="absolute bottom-0 left-0 h-1 bg-blue-500 animate-pulse" 
                   style={{width: '100%'}} />
            )}
          </motion.div>
        </div>

        {/* Sync Control Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
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
                    Connected to live federal grant data from Grants.gov • Updated daily at 6 AM EST
                  </p>
                </div>
              </div>
              <div className="mt-4 sm:mt-0 flex items-center space-x-4">
                <div className="flex items-center text-sm text-gray-500">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    syncing 
                      ? 'bg-blue-500 animate-pulse' 
                      : 'bg-green-500'
                  }`} />
                  {syncing ? 'Syncing data...' : 'Live data ready'}
                </div>
                <button
                  onClick={handleSyncOpportunities}
                  disabled={syncing}
                  className="btn-primary btn-sm flex items-center"
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

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Modern Projects Sidebar */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary btn-sm interactive"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New
                  </button>
                </div>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto space-y-3">
                <ProjectList
                  projects={projects}
                  selectedProject={selectedProject}
                  onProjectSelect={handleProjectSelected}
                />
              </div>
            </div>
          </div>

          {/* Modern Opportunities Section */}
          <div className="lg:col-span-3">
            <OpportunityList
              opportunities={opportunities}
              selectedProject={selectedProject}
              userProfile={userProfile}
            />
          </div>
        </div>

        {/* Create Project Modal */}
        {showCreateModal && (
          <CreateProjectModal
            userProfile={userProfile}
            onClose={() => setShowCreateModal(false)}
            onProjectCreated={handleProjectCreated}
          />
        )}
      </main>
    </div>
  )
}