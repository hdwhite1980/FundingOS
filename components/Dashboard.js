// Dashboard.js - Modern Overview Page with Real API Integration + Mobile Responsive
'use client'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Header from './Header'
import ProjectList from './ProjectList'
import OpportunityList from './OpportunityList'
import ProjectDetailView from './ProjectDetailView'
import DonorManagement from './DonorManagement'
import CampaignList from './CampaignList'
import DirectDonationsList from './DirectDonationsList'
import { StatCard } from './ui/StatCard'
import AngelInvestorOpportunities from './AngelInvestorOpportunities'
import ApplicationProgress from './ApplicationProgress'
import CreateProjectModal from './EnhancedCreateProjectModal'
import AccountSettingsModal from './AccountSettingsModal'
import dynamic from 'next/dynamic'
const UnifiedFundingIntelligenceDashboard = dynamic(() => import('./UnifiedFundingIntelligenceDashboard'), { ssr: false })
const ComplianceDashboard = dynamic(() => import('./ComplianceDashboard'), { ssr: false })
import ProactiveAssistantManager from './ProactiveAssistantManager'
import { directUserServices } from '../lib/supabase'
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
  ArrowDownRight,
  Building,
  Edit3,
  MoreVertical,
  Trash2,
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  BarChart3,
  PieChart,
  Activity,
  Bell,
  Settings,
  Calendar
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function Dashboard({ user, userProfile: initialUserProfile, onProfileUpdate }) {
  // State management
  const [userProfile, setUserProfile] = useState(initialUserProfile)
  const [projects, setProjects] = useState([])
  const [opportunities, setOpportunities] = useState([])
  const [projectOpportunities, setProjectOpportunities] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [viewMode, setViewMode] = useState('dashboard') // 'dashboard' or 'project-detail'
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAccountSettings, setShowAccountSettings] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [activeFundingTab, setActiveFundingTab] = useState('grants')
  const [timeframe, setTimeframe] = useState('30d')
  
  // Track if initial load is complete
  const initialLoadComplete = useRef(false)
  
  // Enhanced stats for all features
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeOpportunities: 0,
    totalFunding: 0,
    successRate: 0,
    totalDonors: 0,
    totalDonated: 0,
    avgDonationAmount: 0,
    majorDonors: 0,
    totalInvestors: 0,
    totalInvested: 0,
    activeInvestments: 0,
    totalSubmissions: 0,
    totalRequested: 0,
    totalAwarded: 0,
    applicationSuccessRate: 0,
    totalReceived: 0,
    receivedBreakdown: { funding: 0, donations: 0, campaigns: 0 },
    pendingApplications: 0
  })

  // Financial insights and activity
  const [insights, setInsights] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [aiActivity, setAiActivity] = useState([])

  // Tab configuration
  const tabs = [
    { id: 'overview', label: 'Dashboard', icon: BarChart3, description: 'Financial summary & insights' },
    { id: 'opportunities', label: 'Projects & Funding', icon: Target, description: 'Funding opportunities, applications & project matching' },
    { id: 'applications', label: 'Applications', icon: FileText, description: 'Active applications' },
    { id: 'donations', label: 'Donors & Investors', icon: Heart, description: 'Donor & investor management' },
    { id: 'ai-agent', label: 'Intelligence', icon: Brain, description: 'Intelligent analysis' },
    { id: 'compliance', label: 'Compliance', icon: CheckCircle, description: 'Track requirements, documents & deadlines' }
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

      // Load core data
      console.log('📊 Loading dashboard data for user:', user.id)
      
      // Try API-based project fetching first, fallback to direct method
      let userProjects
      try {
        console.log('🔍 Trying API-based project fetching...')
        const response = await fetch(`/api/projects?userId=${user.id}`)
        if (response.ok) {
          const result = await response.json()
          userProjects = result.projects || []
          console.log(`✅ Projects fetched via API: ${userProjects.length} items`)
        } else {
          throw new Error('API fetch failed')
        }
      } catch (apiError) {
        console.log('⚠️ API fetch failed, falling back to direct method:', apiError.message)
        userProjects = await directUserServices.projects.getProjects(user.id)
      }
      
      const [allOpportunities, userSubmissions] = await Promise.all([
        directUserServices.opportunities.getOpportunities({
          organizationType: userProfile?.organization_type || 'nonprofit'
        }),
        directUserServices.applications.getSubmissions(user.id, {})
      ])
      
      console.log('📊 Dashboard data loaded:', {
        projects: userProjects?.length || 0,
        opportunities: allOpportunities?.length || 0,
        submissions: userSubmissions?.length || 0
      })
      
      setProjects(userProjects)
      setOpportunities(allOpportunities)
      setSubmissions(userSubmissions)

      // Set default selected project
      if (userProjects.length > 0 && !selectedProject) {
        setSelectedProject(userProjects[0])
      }

      // Load enhanced stats and activity
      await Promise.all([
        loadEnhancedStats(userProjects, allOpportunities),
        loadRecentActivity(userProjects),
        loadAiActivity(userProjects, allOpportunities)
      ])
      
    } catch (error) {
      toast.error('Failed to load dashboard data')
      console.error('Dashboard load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadEnhancedStats = async (userProjects, allOpportunities) => {
    try {
      if (!user?.id) return

      const [donorStats, applicationStats, investorStats, totalReceivedStats, financialInsights] = await Promise.all([
        directUserServices.donors.getDonorStats(user.id),
        directUserServices.applications.getSubmissionStats(user.id),
        directUserServices.investors.getInvestorStats(user.id),
        directUserServices.donors.getTotalAmountReceived(user.id),
        directUserServices.donors.getFinancialInsights(user.id)
      ])

      // Calculate project stats - filter out null/undefined projects
      const validProjects = (userProjects || []).filter(project => project && typeof project === 'object')
      const totalProjects = validProjects.length
      const activeOpportunities = (allOpportunities || []).filter(opp => 
        opp && (!opp.deadline_date || new Date(opp.deadline_date) > new Date())
      ).length
      
      const totalFunding = validProjects.reduce((sum, project) => 
        sum + (project.funding_needed || project.total_project_budget || project.funding_request_amount || 0), 0
      )

      setStats({
        totalProjects,
        activeOpportunities,
        totalFunding,
        successRate: totalProjects > 0 ? Math.round((totalProjects * 0.3)) : 0,
        totalDonors: donorStats.totalDonors || 0,
        totalDonated: donorStats.totalRaised || 0,
        avgDonationAmount: donorStats.avgDonationAmount || 0,
        majorDonors: donorStats.majorDonors || 0,
        totalInvestors: investorStats.totalInvestors || 0,
        totalInvested: investorStats.totalInvested || 0,
        activeInvestments: investorStats.activeInvestments || 0,
        totalSubmissions: applicationStats.totalSubmissions || 0,
        totalRequested: applicationStats.totalRequested || 0,
        totalAwarded: applicationStats.totalAwarded || 0,
        applicationSuccessRate: applicationStats.successRate || 0,
        totalReceived: totalReceivedStats.totalReceived || 0,
        receivedBreakdown: totalReceivedStats.breakdown || { funding: 0, donations: 0, campaigns: 0 },
        pendingApplications: applicationStats.pendingApplications || 0
      })

      setInsights(financialInsights)
      
    } catch (error) {
      console.error('Error loading enhanced stats:', error)
    }
  }

  const loadRecentActivity = async (userProjects) => {
    try {
      if (!user?.id) return

      // Load recent activity from various sources
      const [recentApplications, recentDonations, recentGrants] = await Promise.all([
        directUserServices.applications.getRecentActivity(user.id, 5),
        directUserServices.donors.getRecentDonations(user.id, 5),
        directUserServices.projects.getRecentGrantActivity(user.id, 5)
      ])

      // Combine and sort activity by timestamp
      const allActivity = [
        ...recentApplications.map(app => ({
          title: "Grant application submitted",
          description: `${app.project_name} - ${app.grant_title}`,
          time: app.created_at,
          type: "success",
          amount: app.amount_requested ? `$${app.amount_requested.toLocaleString()}` : null
        })),
        ...recentDonations.map(donation => ({
          title: "Donation received",
          description: `From ${donation.donor_name || 'Anonymous donor'}`,
          time: donation.created_at,
          type: "success",
          amount: `$${donation.amount.toLocaleString()}`
        })),
        ...recentGrants.map(grant => ({
          title: "Grant opportunity matched",
          description: `AI identified new opportunity for ${grant.project_name}`,
          time: grant.created_at,
          type: "info"
        }))
      ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 6)

      setRecentActivity(allActivity)
      
    } catch (error) {
      console.error('Error loading recent activity:', error)
      setRecentActivity([])
    }
  }

  const loadAiActivity = async (userProjects, allOpportunities) => {
    try {
      const activities = []
      
      if (allOpportunities.length > 0 && userProjects.length > 0) {
        activities.push({
          type: 'matching',
          title: 'Opportunity Analysis',
          description: `${allOpportunities.length} opportunities being analyzed for ${userProjects.length} projects`,
          color: 'blue',
          timestamp: new Date()
        })
      }
      
      if (stats.totalSubmissions > 0) {
        activities.push({
          type: 'tracking',
          title: 'Application Monitoring',
          description: `Tracking ${stats.totalSubmissions} applications with ${stats.applicationSuccessRate}% success rate`,
          color: 'green',
          timestamp: new Date()
        })
      }
      
      setAiActivity(activities)
      
    } catch (error) {
      console.error('Error loading AI activity:', error)
    }
  }

  const handleSyncOpportunities = async () => {
    setSyncing(true)
    const startTime = Date.now()
    
    try {
      const toastId = toast.loading('Syncing from multiple funding sources...', {
        style: {
          background: '#1e293b',
          color: '#f8fafc',
          border: '1px solid #334155',
        },
      })
      
      // Sync from all available sources
      const syncEndpoints = [
        '/api/sync/grants-gov',
        '/api/sync/candid',
        '/api/sync/nsf',
        '/api/sync/nih',
        '/api/sync/sam-gov'
      ]
      
      let totalImported = 0
      let successfulSyncs = 0
      
      // Execute all syncs in parallel
      const syncPromises = syncEndpoints.map(async (endpoint) => {
        try {
          const response = await fetch(endpoint)
          const result = await response.json()
          if (result.success && result.imported) {
            totalImported += result.imported
            successfulSyncs++
            return { endpoint, imported: result.imported }
          }
          return { endpoint, imported: 0 }
        } catch (error) {
          console.error(`Sync error for ${endpoint}:`, error)
          return { endpoint, imported: 0, error: error.message }
        }
      })
      
      const results = await Promise.allSettled(syncPromises)
      const syncTime = Math.round((Date.now() - startTime) / 1000)
      setLastSyncTime(new Date())
      
      toast.dismiss(toastId)
      
      if (successfulSyncs > 0) {
        toast.success(`Sync Complete! ${totalImported} new opportunities from ${successfulSyncs} sources in ${syncTime}s`, {
          duration: 6000,
          style: {
            background: '#f0fdf4',
            color: '#166534',
            border: '1px solid #bbf7d0',
          },
        })
      } else {
        toast.error('Sync completed but no new opportunities found')
      }
      
      // Reload opportunities data
      const newOpportunities = await directUserServices.opportunities.getOpportunities({
        organizationType: userProfile.organization_type
      })
      setOpportunities(newOpportunities)
      await loadEnhancedStats(projects, newOpportunities)
      
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

  const formatTimeAgo = (timestamp) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.round((now - time) / 1000 / 60)
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.round(diffInMinutes / 60)}h ago`
    if (diffInMinutes < 10080) return `${Math.round(diffInMinutes / 1440)}d ago`
    return time.toLocaleDateString()
  }

  // Dynamic funding process indicator with colors for each funding type
  const FundingProcessIndicator = () => {
    // Calculate funding breakdown by type
    console.log('💰 Funding Process Stats:', {
      totalDonated: stats.totalDonated,
      totalInvested: stats.totalInvested,
      totalAwarded: stats.totalAwarded
    })
    
    const fundingBreakdown = {
      grants: {
        secured: stats.totalAwarded || 0,
        pending: (stats.totalRequested || 0) - (stats.totalAwarded || 0),
        target: stats.totalFunding * 0.6, // 60% from grants
        color: 'emerald',
        bgColor: 'bg-emerald-500',
        lightBg: 'bg-emerald-100',
        textColor: 'text-emerald-700'
      },
      donations: {
        secured: stats.totalDonated || 0,
        pending: stats.totalFunding * 0.15, // Estimated pending donations
        target: stats.totalFunding * 0.25, // 25% from donations
        color: 'rose',
        bgColor: 'bg-rose-500',
        lightBg: 'bg-rose-100',
        textColor: 'text-rose-700'
      },
      investments: {
        secured: stats.totalInvested || 0,
        pending: stats.activeInvestments * 50000, // Estimate based on active deals
        target: stats.totalFunding * 0.15, // 15% from investments
        color: 'blue',
        bgColor: 'bg-blue-500',
        lightBg: 'bg-blue-100',
        textColor: 'text-blue-700'
      }
    }

    const totalSecured = Object.values(fundingBreakdown).reduce((sum, type) => sum + type.secured, 0)
    const totalTarget = stats.totalFunding || 100000 // Default target if none set
    const overallProgress = totalTarget > 0 ? (totalSecured / totalTarget) * 100 : 0

    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center mb-3">
              <div className="p-2 sm:p-2.5 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-700" />
              </div>
              <div className="ml-2 sm:ml-3 flex-1">
                <p className="text-xs sm:text-sm font-medium text-slate-600">Funding Process</p>
                <div className="flex items-center mt-1 text-xs font-medium text-emerald-600">
                  <Activity className="w-3 h-3 mr-1" />
                  <span className="hidden sm:inline">{overallProgress.toFixed(0)}% of total goal</span>
                  <span className="sm:hidden">{overallProgress.toFixed(0)}%</span>
                </div>
              </div>
            </div>
            <div className="mb-3 sm:mb-4">
              <div className="flex items-baseline space-x-1 sm:space-x-2">
                <p className="text-lg sm:text-2xl font-bold text-slate-900">
                  ${totalSecured >= 1000000 
                    ? (totalSecured / 1000000).toFixed(1) + 'M' 
                    : totalSecured >= 1000 
                      ? (totalSecured / 1000).toFixed(1) + 'K'
                      : totalSecured.toFixed(0)}
                </p>
                <p className="text-xs sm:text-sm text-slate-500">
                  of ${totalTarget > 1000000 ? (totalTarget / 1000000).toFixed(1) + 'M' : (totalTarget / 1000).toFixed(0) + 'K'} goal
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Type Progress Visualization */}
        <div className="space-y-3 sm:space-y-4">
          {/* Combined Progress Bar */}
          <div className="relative">
            <div className="w-full bg-slate-100 rounded-lg h-4 sm:h-6 overflow-hidden">
              <div className="relative h-full flex">
                {/* Grants Progress */}
                <div
                  className="bg-emerald-500 h-full transition-all duration-700 ease-out"
                  style={{ width: `${Math.min((fundingBreakdown.grants.secured / totalTarget) * 100, 100)}%` }}
                  title={`Grants: $${(fundingBreakdown.grants.secured / 1000).toFixed(0)}K`}
                />
                {/* Donations Progress */}
                <div
                  className="bg-rose-500 h-full transition-all duration-700 ease-out"
                  style={{ width: `${Math.min((fundingBreakdown.donations.secured / totalTarget) * 100, 100 - (fundingBreakdown.grants.secured / totalTarget) * 100)}%` }}
                  title={`Donations: $${(fundingBreakdown.donations.secured / 1000).toFixed(0)}K`}
                />
                {/* Investments Progress */}
                <div
                  className="bg-blue-500 h-full transition-all duration-700 ease-out"
                  style={{ width: `${Math.min((fundingBreakdown.investments.secured / totalTarget) * 100, 100 - ((fundingBreakdown.grants.secured + fundingBreakdown.donations.secured) / totalTarget) * 100)}%` }}
                  title={`Investments: $${(fundingBreakdown.investments.secured / 1000).toFixed(0)}K`}
                />
                {/* Pending indicator overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-30 animate-pulse" />
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
              <span>$0</span>
              <div className="flex items-center space-x-2">
                <span className="hidden sm:inline">{overallProgress.toFixed(0)}% secured</span>
                <span className="sm:hidden">{overallProgress.toFixed(0)}%</span>
              </div>
              <span>Goal</span>
            </div>
          </div>

          {/* Funding Type Breakdown */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {Object.entries(fundingBreakdown).map(([type, data]) => {
              const typeProgress = data.target > 0 ? (data.secured / data.target) * 100 : 0
              const typeNames = {
                grants: 'Grants',
                donations: 'Donations', 
                investments: 'Investments'
              }
              
              return (
                <div key={type} className={`${data.lightBg} rounded-lg p-2 sm:p-3`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full ${data.bgColor} mr-1 sm:mr-2`} />
                      <span className="text-xs font-medium text-slate-700 hidden sm:inline">{typeNames[type]}</span>
                      <span className="text-xs font-medium text-slate-700 sm:hidden">{typeNames[type].slice(0,4)}</span>
                    </div>
                  </div>
                  <div className={`text-xs sm:text-sm font-bold ${data.textColor} mb-1`}>
                    ${data.secured >= 1000 
                      ? (data.secured / 1000).toFixed(1) + 'K' 
                      : data.secured.toFixed(0)}
                  </div>
                  <div className="w-full bg-white/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`${data.bgColor} h-full transition-all duration-500`}
                      style={{ width: `${Math.min(typeProgress, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-600 mt-1 hidden sm:block">
                    {typeProgress.toFixed(0)}% of type goal
                  </div>
                </div>
              )
            })}
          </div>

          {/* Funding Pipeline Status */}
          <div className="border-t border-slate-200 pt-3 sm:pt-4">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
              <span className="font-medium">Pipeline Status</span>
              <span>{stats.pendingApplications || 0} applications pending</span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-emerald-400 mr-1 sm:mr-2" />
                <span className="text-xs text-slate-600 hidden sm:inline">Active: {stats.totalSubmissions || 0}</span>
                <span className="text-xs text-slate-600 sm:hidden">Act: {stats.totalSubmissions || 0}</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-amber-400 mr-1 sm:mr-2" />
                <span className="text-xs text-slate-600 hidden sm:inline">Review: {stats.pendingApplications || 0}</span>
                <span className="text-xs text-slate-600 sm:hidden">Rev: {stats.pendingApplications || 0}</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-blue-400 mr-1 sm:mr-2" />
                <span className="text-xs text-slate-600 hidden sm:inline">Opportunities: {stats.activeOpportunities}</span>
                <span className="text-xs text-slate-600 sm:hidden">Opp: {stats.activeOpportunities}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // MOBILE RESPONSIVE METRIC CARD
  const MetricCard = ({ icon: Icon, title, value, subtitle, change, trend = "neutral" }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-3">
            <div className="p-2 sm:p-2.5 bg-slate-50 rounded-lg">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-700" />
            </div>
            <div className="ml-2 sm:ml-3 flex-1">
              <p className="text-xs sm:text-sm font-medium text-slate-600">{title}</p>
              {change && (
                <div className={`flex items-center mt-1 text-xs font-medium ${
                  trend === 'up' ? 'text-emerald-600' : 
                  trend === 'down' ? 'text-red-600' : 'text-slate-500'
                }`}>
                  {trend === 'up' && <ArrowUp className="w-3 h-3 mr-1" />}
                  {trend === 'down' && <ArrowDown className="w-3 h-3 mr-1" />}
                  <span className="hidden sm:inline">{change}</span>
                  <span className="sm:hidden">{change.split(' ')[0]}</span>
                </div>
              )}
            </div>
          </div>
          <div className="mb-2">
            <p className="text-lg sm:text-2xl font-bold text-slate-900">{value}</p>
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 line-clamp-2">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  )

  // Handle project operations
  const handleProjectCreated = async (newProject) => {
    const updatedProjects = [newProject, ...projects]
    setProjects(updatedProjects)
    setSelectedProject(newProject)
    setShowCreateModal(false)
    setEditingProject(null)
    toast.success('Project created successfully!')
    await loadEnhancedStats(updatedProjects, opportunities)
  }

  const handleProjectSelect = (project) => {
    setSelectedProject(project)
  }

  const handleProjectViewDetails = (project) => {
    setSelectedProject(project)
    setViewMode('project-detail')
  }

  const handleBackToDashboard = () => {
    setViewMode('dashboard')
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
    await loadEnhancedStats(updatedProjects, opportunities)
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

  // Show error if no user provided
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">Please log in</h2>
          <p className="text-slate-600">You need to be authenticated to access the dashboard.</p>
        </div>
      </div>
    )
  }

  // Show profile loading state
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
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
        <div className="flex items-center justify-center h-64 sm:h-96">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-emerald-600"></div>
        </div>
      </div>
    )
  }

  // Main dashboard render with FULL MOBILE RESPONSIVENESS
  if (viewMode === 'project-detail' && selectedProject) {
    return (
      <ProjectDetailView 
        project={selectedProject} 
        onBack={handleBackToDashboard}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Use the proper Header component */}
      <Header user={user} userProfile={userProfile} onProfileUpdate={handleProfileUpdate} />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* MOBILE-RESPONSIVE NAVIGATION */}
        <div className="mb-6 sm:mb-8">
          {/* Mobile Navigation - Horizontal Scroll */}
          <nav className="md:hidden">
            <div className="flex space-x-2 overflow-x-auto pb-2" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-col items-center justify-center min-w-[70px] px-2 py-2.5 rounded-lg font-medium text-xs transition-all duration-200 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span className="leading-tight text-xs">{tab.label.split(' ')[0]}</span>
                  </button>
                )
              })}
            </div>
          </nav>

          {/* Desktop Navigation - Segmented Control */}
          <nav className="hidden md:flex space-x-1 bg-slate-100 rounded-lg p-1">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-md font-medium text-sm transition-all duration-200 ${
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

        {/* OVERVIEW TAB - FULLY MOBILE RESPONSIVE */}
        {activeTab === 'overview' && (
          <div className="space-y-6 sm:space-y-8">
            {/* Mobile-Optimized Time Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Dashboard Overview</h2>
              <select 
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full sm:w-auto bg-white border border-slate-200 rounded-md px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
            </div>

            {/* Mobile-Responsive Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <MetricCard
                icon={Target}
                title="Active Projects"
                value={stats.totalProjects}
                subtitle="Across all categories"
                change={stats.totalProjects > 0 ? "+3 this month" : "Create your first project"}
                trend={stats.totalProjects > 0 ? "up" : "neutral"}
              />
              <div className="sm:col-span-2">
                <FundingProcessIndicator key={`funding-${stats.totalDonated}-${stats.totalInvested}-${stats.totalAwarded}`} />
              </div>
              <MetricCard
                icon={Zap}
                title="Opportunities"
                value={stats.activeOpportunities}
                subtitle="AI-matched grants available"
                change={stats.activeOpportunities > 0 ? "+12 new this week" : "Sync to discover opportunities"}
                trend={stats.activeOpportunities > 0 ? "up" : "neutral"}
              />
            </div>

            {/* Mobile-Responsive Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Activity Feed */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-emerald-600" />
                      Recent Activity
                    </h3>
                    <button 
                      onClick={() => setActiveTab('applications')}
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium self-start sm:self-auto"
                    >
                      View all
                    </button>
                  </div>
                  
                  <div className="space-y-3 sm:space-y-4">
                    {recentActivity.length > 0 ? (
                      recentActivity.map((activity, index) => (
                        <div key={index} className="flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 bg-slate-50 rounded-lg">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            activity.type === 'success' ? 'bg-emerald-500' :
                            activity.type === 'warning' ? 'bg-amber-500' :
                            activity.type === 'info' ? 'bg-blue-500' : 'bg-slate-400'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                              <p className="font-medium text-slate-900 text-sm sm:text-base">{activity.title}</p>
                              {activity.amount && (
                                <span className="font-semibold text-emerald-700 text-sm">{activity.amount}</span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 mt-1 line-clamp-2">{activity.description}</p>
                            <div className="flex items-center mt-2 text-xs text-slate-500">
                              <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                              {formatTimeAgo(activity.time)}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 sm:py-8">
                        <Activity className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-slate-300 mb-2" />
                        <p className="text-sm text-slate-600">No recent activity</p>
                        <p className="text-xs text-slate-500">Start applying for grants or receiving donations to see updates here</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile-Responsive Sidebar */}
              <div className="space-y-4 sm:space-y-6">
                {/* Quick Actions */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button 
                      onClick={() => setShowCreateModal(true)}
                      className="w-full bg-emerald-600 text-white py-2.5 sm:py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center text-sm sm:text-base"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Project
                    </button>
                    <button 
                      onClick={handleSyncOpportunities}
                      disabled={syncing}
                      className="w-full bg-slate-100 text-slate-700 py-2.5 sm:py-3 px-4 rounded-lg font-medium hover:bg-slate-200 transition-colors flex items-center justify-center disabled:opacity-50 text-sm sm:text-base"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                      {syncing ? 'Syncing...' : 'Sync Grants'}
                    </button>
                    <button 
                      onClick={() => setActiveTab('ai-agent')}
                      className="w-full bg-slate-100 text-slate-700 py-2.5 sm:py-3 px-4 rounded-lg font-medium hover:bg-slate-200 transition-colors flex items-center justify-center text-sm sm:text-base"
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      AI Matching
                    </button>
                  </div>
                </div>

                {/* Project Summary */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Project Summary</h3>
                  <div className="space-y-3 sm:space-y-4">
                    {projects.length > 0 ? (
                      projects.slice(0, 3).map((project) => (
                        <div key={project.id} className="flex items-center space-x-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{project.name}</p>
                            <p className="text-xs text-slate-500">
                              {project.funding_needed ? `$${(project.funding_needed / 1000).toFixed(0)}K goal` : 'No funding specified'}
                            </p>
                          </div>
                          <div className="text-xs font-medium text-slate-600">Active</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 sm:py-6">
                        <Target className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-slate-300 mb-2" />
                        <p className="text-sm text-slate-600">No projects yet</p>
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium mt-1"
                        >
                          Create your first project
                        </button>
                      </div>
                    )}
                  </div>
                  {projects.length > 3 && (
                    <button 
                      onClick={() => setActiveTab('opportunities')}
                      className="w-full mt-4 text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center justify-center"
                    >
                      View all projects
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PROJECTS & FUNDING TAB - MOBILE RESPONSIVE */}
        {activeTab === 'opportunities' && (
          <>
            {/* Funding Stats - Mobile Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <MetricCard
                icon={DollarSign}
                title="Funding Secured"
                value={stats.totalAwarded}
                subtitle={stats.totalSubmissions > 0 ? `${stats.applicationSuccessRate}% success rate` : "No applications yet"}
                trend="up"
                change={stats.totalAwarded > 0 ? "+$125K this month" : "Apply for grants"}
              />
              <MetricCard
                icon={Target}
                title="Funding Requested"
                value={stats.totalRequested}
                subtitle={stats.totalSubmissions > 0 ? `${stats.totalSubmissions} applications` : "No applications yet"}
                trend="up"
                change={stats.totalRequested > 0 ? `$${(stats.totalRequested / 1000).toFixed(0)}K total` : "Submit applications"}
              />
              <MetricCard
                icon={Zap}
                title="Active Opportunities"
                value={stats.activeOpportunities}
                subtitle={stats.activeOpportunities > 0 ? "Available for matching" : "Sync to discover"}
                trend={stats.activeOpportunities > 0 ? "up" : "neutral"}
                change={stats.activeOpportunities > 0 ? "+12 new" : "Sync database"}
              />
              <MetricCard
                icon={FileText}
                title="Applications"
                value={stats.totalSubmissions}
                subtitle={stats.totalSubmissions > 0 ? `${stats.applicationSuccessRate}% success rate` : "No applications yet"}
                trend={stats.applicationSuccessRate > 50 ? "up" : "neutral"}
                change={stats.pendingApplications > 0 ? `${stats.pendingApplications} pending` : "Ready to apply"}
              />
            </div>

            {/* Enhanced Sync Control Panel - Mobile Optimized */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 mb-6 sm:mb-8 hover:shadow-md transition-all duration-200"
            >
              <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
                <div className="flex items-start sm:items-center">
                  <div className="p-2 sm:p-3 bg-emerald-100 rounded-lg mr-3 sm:mr-4 flex-shrink-0">
                    <Database className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1">
                      Federal Grant Database
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center text-xs sm:text-sm text-slate-600">
                      <div className="flex items-center">
                        <span className={`w-2 h-2 rounded-full mr-2 ${syncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                        <span className="hidden sm:inline">Live connection to federal funding opportunities</span>
                        <span className="sm:hidden">Live federal connection</span>
                      </div>
                      {lastSyncTime && (
                        <span className="sm:ml-2 text-slate-500">• Last sync: {formatLastSync(lastSyncTime)}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleSyncOpportunities}
                  disabled={syncing}
                  className={`w-full sm:w-auto bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-center text-sm sm:text-base ${syncing ? 'opacity-75' : ''}`}
                >
                  {syncing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2 sm:mr-3" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" />
                      <span className="hidden sm:inline">Refresh Opportunities</span>
                      <span className="sm:hidden">Refresh</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>

            {/* Mobile-First Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
              {/* Mobile: Projects section comes first */}
              <div className="xl:col-span-4 order-1 xl:order-1">
                <div className="space-y-4 sm:space-y-6">
                  {/* Filter by Project - Mobile Optimized */}
                  <div className="bg-white rounded-xl border border-slate-200">
                    <div className="p-4 sm:p-6 border-b border-slate-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 mb-2 sm:mb-4">
                        <h2 className="text-base sm:text-lg font-semibold text-slate-900">Filter by Project</h2>
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="w-full sm:w-auto bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors px-3 py-1.5 text-sm flex items-center justify-center sm:justify-start space-x-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Project</span>
                        </button>
                      </div>
                    </div>
                    <div className="p-3 sm:p-4 max-h-80 sm:max-h-96 overflow-y-auto">
                      <ProjectList
                        projects={projects}
                        selectedProject={selectedProject}
                        onProjectSelect={handleProjectSelect}
                        onProjectViewDetails={handleProjectViewDetails}
                        onProjectEdit={handleProjectEdit}
                        onProjectDelete={handleProjectDelete}
                      />
                    </div>
                  </div>

                  {/* Active Campaigns - Mobile Hidden Initially */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border border-slate-200"
                  >
                    <div className="p-4 sm:p-6 border-b border-slate-200">
                      <h2 className="text-base sm:text-lg font-semibold text-slate-900">Active Campaigns</h2>
                    </div>
                    <div className="p-4 sm:p-6">
                      <div className="text-center py-4 sm:py-6">
                        <Heart className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-slate-300 mb-2" />
                        <p className="text-sm text-slate-600">No active campaigns</p>
                        <p className="text-xs text-slate-500">Campaigns will appear here when created</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="xl:col-span-8 order-2 xl:order-2">
                {/* Mobile-Responsive Funding Tabs */}
                <div className="mb-4 sm:mb-6">
                  {/* Mobile: Horizontal scroll tabs */}
                  <div className="sm:hidden">
                    <div className="flex space-x-2 overflow-x-auto pb-2" style={{scrollbarWidth: 'none'}}>
                      {[
                        { id: 'grants', label: 'Grants', icon: FileText },
                        { id: 'campaigns', label: 'Campaigns', icon: Heart },
                        { id: 'angels', label: 'Angels', icon: Users },
                        { id: 'reits', label: 'REITs', icon: TrendingUp },
                        { id: 'donations', label: 'Donations', icon: DollarSign }
                      ].map(tab => {
                        const Icon = tab.icon
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveFundingTab(tab.id)}
                            className={`flex flex-col items-center justify-center min-w-[60px] px-2 py-2 rounded-lg font-medium text-xs transition-colors whitespace-nowrap ${
                              activeFundingTab === tab.id
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <Icon className="w-4 h-4 mb-1" />
                            <span className="text-xs">{tab.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Desktop: Traditional tabs */}
                  <div className="hidden sm:block border-b border-slate-200">
                    <nav className="flex space-x-6 lg:space-x-8 overflow-x-auto">
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
                            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
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
                      onCompleteProfile={() => setShowAccountSettings(true)}
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
                    <div className="p-4 sm:p-6">
                      <div className="text-center py-6 sm:py-8">
                        <TrendingUp className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-slate-300 mb-4" />
                        <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-2">Real Estate Investment Trusts</h3>
                        <p className="text-sm sm:text-base text-slate-600 mb-4 sm:mb-6">REIT opportunities for sustainable funding</p>
                        <div className="inline-flex items-center px-3 sm:px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
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

        {activeTab === 'ai-agent' && (
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
            <UnifiedFundingIntelligenceDashboard 
              tenantId={userProfile?.tenant_id || user?.user_metadata?.tenant_id || user?.id || 'default-tenant'}
            />
          </div>
        )}

        {activeTab === 'compliance' && (
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
            <ComplianceDashboard 
              userId={user?.id}
              userProfile={userProfile}
            />
          </div>
        )}

        {activeTab === 'applications' && (
          <ApplicationProgress
            user={user}
            userProfile={userProfile}
            projects={projects}
            onNavigateToProject={handleProjectViewDetails}
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

        {/* Account Settings Modal */}
        {showAccountSettings && (
          <AccountSettingsModal
            user={user}
            userProfile={userProfile}
            onUpdated={handleProfileUpdate}
            onClose={() => setShowAccountSettings(false)}
          />
        )}

  {/* Proactive Wali-OS Assistant - Appears contextually when needed */}
        <ProactiveAssistantManager
          user={user}
          userProfile={userProfile}
          projects={projects}
          opportunities={opportunities}
          submissions={submissions}
        />
      </main>
    </div>
  )
}