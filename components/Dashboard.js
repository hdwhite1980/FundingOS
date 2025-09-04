'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Header from './Header'
import ProjectList from './ProjectList'
import OpportunityList from './OpportunityList'
import CreateProjectModal from './CreateProjectModal'
import { projectService, opportunityService, projectOpportunityService } from '../lib/supabase'
import { Plus, Target, Clock, TrendingUp, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Dashboard({ user, userProfile, onProfileUpdate }) {
  const [projects, setProjects] = useState([])
  const [opportunities, setOpportunities] = useState([])
  const [projectOpportunities, setProjectOpportunities] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeOpportunities: 0,
    totalFunding: 0,
    successRate: 0
  })

  useEffect(() => {
    loadDashboardData()
  }, [user])

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
        {/* Stats Cards */}
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
                <p className="text-sm text-gray-600">Open Opportunities</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeOpportunities}</p>
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
            className="card"
          >
            <div className="card-body flex items-center">
              <div className="p-3 bg-red-100 rounded-lg mr-4">
                <TrendingUp className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.successRate}%</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Projects Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-1"
          >
            <div className="card">
              <div className="card-header flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary flex items-center text-sm px-3 py-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </button>
              </div>
              <div className="card-body">
                <ProjectList
                  projects={projects}
                  selectedProject={selectedProject}
                  onProjectSelect={handleProjectSelected}
                />
              </div>
            </div>
          </motion.div>

          {/* Opportunities */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2"
          >
            <OpportunityList
              opportunities={opportunities}
              selectedProject={selectedProject}
              userProfile={userProfile}
            />
          </motion.div>
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