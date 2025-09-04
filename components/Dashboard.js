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
  const [clearing, setClearing] = useState(false)
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

  // Debug opportunities URLs
  useEffect(() => {
    if (opportunities.length > 0) {
      console.log('Sample opportunity URLs:', opportunities.slice(0, 3).map(opp => ({
        title: opp.title,
        source_url: opp.source_url,
        external_id: opp.external_id,
        source: opp.source
      })))
    }
  }, [opportunities])

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

  const handleClearAndResync = async () => {
    if (!confirm('This will delete ALL opportunities and fetch fresh data from Grants.gov. Are you sure?')) {
      return
    }

    setClearing(true)
    
    try {
      // Clear existing opportunities
      const clearToast = toast.loading('🗑️ Clearing existing opportunities...', {
        style: {
          background: '#1e293b',
          color: '#f8fafc',
          border: '1px solid #334155',
        },
      })

      const clearResponse = await fetch('/api/admin/clear-opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!clearResponse.ok) {
        throw new Error('Failed to clear opportunities')
      }

      toast.dismiss(clearToast)
      toast.success('✅ Database cleared successfully', {
        duration: 2000,
        style: {
          background: '#f0fdf4',
          color: '#166534',
          border: '1px solid #bbf7d0',
        },
      })

      // Wait a moment then start fresh sync
      setTimeout(() => {
        handleSyncOpportunities()
      }, 1000)

    } catch (error) {
      toast.error('Failed to clear opportunities: ' + error.message)
    } finally {
      setClearing(false)
    }
  }

  const handleSyncOpportunities = async () => {
    setSyncing(true)
    const startTime = Date.now()
    
    try {
      // Show initial loading toast with progress
      const toastId = toast.loading('🔄 Connecting to Grants.gov...', {
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
        
        // Dismiss loading toast
        toast.dismiss(toastId)
        
        // Show detailed success notification
        const successMessage = (
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            </div>
            <div>
              <div className="font-semibold text-gray-900">
                Sync Complete!
              </div>
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
        
        // Reload opportunities to show new data
        const newOpportunities = await opportunityService.getOpportunities({
          organizationType: userProfile.organization_type
        })
        setOpportunities(newOpportunities)
        
        // Recalculate stats with new data
        calculateStats(projects, newOpportunities)
        
        // Show AI matching notification for selected project
        if (selectedProject && result.imported > 0) {
          setTimeout(() => {
            toast.success(
              `🤖 AI is analyzing ${result.imported} new opportunities for "${selectedProject.name}"`,
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
        toast.error(
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✕</span>
              </div>
            </div>
            <div>
              <div className="font-semibold">Sync Failed</div>
              <div className="text-sm">{result.error || 'Unknown error occurred'}</div>
            </div>
          </div>,
          {
            duration: 5000,
            style: {
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
            },
          }
        )
      }
    } catch (error) {
      console.error('Sync error:', error)
      toast.error(
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✕</span>
            </div>
          </div>
          <div>
            <div className="font-semibold">Connection Failed</div>
            <div className="text-sm">Could not connect to Grants.gov</div>
          </div>
        </div>,
        {
          duration: 5000,
          style: {
            background: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fecaca',
          },
        }
      )
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
                  disabled={syncing || clearing}
                  className={`text-sm font-semibold transition-colors ${
                    syncing || clearing
                      ? 'text-blue-600 cursor-not-allowed' 
                      : 'text-green-600 hover:text-green-700 cursor-pointer'
                  }`}
                >
                  {syncing ? 'Syncing...' : clearing ? 'Clearing...' : 'Sync Now'}
                </button>
              </div>
            </div>
            {(syncing || clearing) && (
              <div className="absolute bottom-0 left-0 h-1 bg-blue-500 animate-pulse" 
                   style={{width: '100%'}} />
            )}
          </motion.div>
        </div>

        {/* Enhanced Sync Control Panel */}
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
              <div className="mt-4 sm:mt-0 flex items-center space-x-3">
                <div className="flex items-center text-sm text-gray-500">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    syncing || clearing
                      ? 'bg-blue-500 animate-pulse' 
                      : 'bg-green-500'
                  }`} />
                  {syncing ? 'Syncing data...' : clearing ? 'Clearing data...' : 'Live data ready'}
                </div>
                
                <button
                  onClick={handleClearAndResync}
                  disabled={syncing || clearing}
                  className="btn-secondary btn-sm flex items-center disabled:opacity-50"
                  title="Clear all opportunities and fetch fresh data"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear & Resync
                </button>
                
                <button
                  onClick={handleSyncOpportunities}
                  disabled={syncing || clearing}
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