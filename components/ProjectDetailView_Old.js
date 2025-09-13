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
  Bookmark
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
          directUserServices.angelInvestors.getInvestmentsByProject(project.id),
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
        appliedOpportunities: [
          {
            id: 1,
            title: 'NSF Small Business Innovation Research (SBIR)',
            status: 'submitted',
            submittedDate: '2024-08-15',
            amount: 50000,
            deadline: '2024-09-30',
            progress: 65
          },
          {
            id: 2,
            title: 'Department of Energy Clean Energy Grant',
            status: 'in_progress',
            submittedDate: null,
            amount: 75000,
            deadline: '2024-10-15',
            progress: 30
          },
          {
            id: 3,
            title: 'EPA Environmental Innovation Grant',
            status: 'approved',
            submittedDate: '2024-07-01',
            amount: 25000,
            deadline: '2024-08-01',
            progress: 100
          }
        ],
        savedOpportunities: [
          {
            id: 1,
            title: 'USDA Rural Business Development Grant',
            funder_name: 'U.S. Department of Agriculture',
            amount_min: 10000,
            amount_max: 50000,
            deadline_date: '2024-11-30',
            status: 'open',
            fit_score: 85,
            saved_date: '2024-09-10'
          },
          {
            id: 2,
            title: 'NIH Small Business Innovation Research',
            funder_name: 'National Institutes of Health',
            amount_min: 50000,
            amount_max: 300000,
            deadline_date: '2024-12-15',
            status: 'open',
            fit_score: 78,
            saved_date: '2024-09-08'
          },
          {
            id: 3,
            title: 'Gates Foundation Innovation Grant',
            funder_name: 'Bill & Melinda Gates Foundation',
            amount_min: 100000,
            amount_max: 500000,
            deadline_date: '2025-01-31',
            status: 'open',
            fit_score: 92,
            saved_date: '2024-09-05'
          }
        ],
        campaigns: [
          {
            id: 1,
            name: 'Seed Funding Campaign',
            type: 'equity',
            target: 100000,
            raised: 67500,
            investors: 15,
            status: 'active',
            endDate: '2024-12-31'
          },
          {
            id: 2,
            name: 'Product Development Fund',
            type: 'rewards',
            target: 50000,
            raised: 32000,
            backers: 45,
            status: 'active',
            endDate: '2024-11-15'
          }
        ],
        angelInvestments: [
          {
            id: 1,
            investor: 'TechStart Angels',
            amount: 25000,
            date: '2024-06-15',
            equity: 5,
            status: 'completed'
          },
          {
            id: 2,
            investor: 'Innovation Ventures',
            amount: 40000,
            date: '2024-07-20',
            equity: 8,
            status: 'completed'
          }
        ],
        reits: [
          {
            id: 1,
            name: 'Green Energy REIT Investment',
            amount: 15000,
            date: '2024-05-10',
            returns: 7.5,
            status: 'active'
          }
        ],
        directDonations: [
          {
            id: 1,
            donor: 'Environmental Foundation',
            amount: 5000,
            date: '2024-04-20',
            purpose: 'Research materials',
            status: 'received'
          },
          {
            id: 2,
            donor: 'Community Impact Fund',
            amount: 3000,
            date: '2024-05-15',
            purpose: 'Equipment purchase',
            status: 'received'
          }
        ],
        metrics: {
          totalFunding: 247500,
          targetFunding: 300000,
          fundingProgress: 82.5,
          activeApplications: 2,
          approvedGrants: 1,
          totalInvestors: 17,
          monthlyBurn: 8500,
          runway: 18
        }
      })
      
      setLoading(false)
    }

    fetchProjectData()
  }, [project])

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Target },
    { id: 'applications', label: 'Grant Applications', icon: FileText },
    { id: 'opportunities', label: 'Saved Opportunities', icon: Award },
    { id: 'campaigns', label: 'Campaigns', icon: TrendingUp },
    { id: 'investments', label: 'Investments', icon: DollarSign },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ]

  const getStatusColor = (status) => {
    const colors = {
      submitted: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      received: 'bg-green-100 text-green-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const FundingProgressChart = () => (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-4">Funding Progress</h3>
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Current: ${data.metrics.totalFunding?.toLocaleString()}</span>
          <span>Target: ${data.metrics.targetFunding?.toLocaleString()}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className="bg-gradient-to-r from-green-400 to-blue-500 h-4 rounded-full transition-all duration-500"
            style={{ width: `${data.metrics.fundingProgress}%` }}
          ></div>
        </div>
        <div className="text-center mt-2 text-lg font-bold text-gray-800">
          {data.metrics.fundingProgress}%
        </div>
      </div>
    </div>
  )

  const MetricsGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Funding</p>
            <p className="text-2xl font-bold text-green-600">
              ${data.metrics.totalFunding?.toLocaleString()}
            </p>
          </div>
          <DollarSign className="h-8 w-8 text-green-500" />
        </div>
      </div>
      
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Active Applications</p>
            <p className="text-2xl font-bold text-blue-600">
              {data.metrics.activeApplications}
            </p>
          </div>
          <FileText className="h-8 w-8 text-blue-500" />
        </div>
      </div>
      
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Investors</p>
            <p className="text-2xl font-bold text-purple-600">
              {data.metrics.totalInvestors}
            </p>
          </div>
          <Users className="h-8 w-8 text-purple-500" />
        </div>
      </div>
      
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Runway (months)</p>
            <p className="text-2xl font-bold text-orange-600">
              {data.metrics.runway}
            </p>
          </div>
          <Activity className="h-8 w-8 text-orange-500" />
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Button handlers
  const handleExportReport = () => {
    // Generate and download project report
    const reportData = {
      project: project.name,
      date: new Date().toISOString().split('T')[0],
      metrics: data.metrics,
      applications: data.appliedOpportunities,
      opportunities: data.savedOpportunities,
      campaigns: data.campaigns
    }
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name}-report-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleNewApplication = () => {
    // Navigate to create new application
    setActiveTab('applications')
    // Could trigger modal or form here
  }

  const handleApplyNow = (opportunityId) => {
    // Navigate to application creation for specific opportunity
    console.log('Apply to opportunity:', opportunityId)
    setActiveTab('applications')
    // Could integrate with application creation flow
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-emerald-600 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="mr-4 p-2 hover:bg-emerald-700 rounded-full transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">{project.name}</h1>
                <p className="text-sm text-emerald-100">{project.project_type?.replace('_', ' ')} Project</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={handleExportReport}
                className="px-4 py-2 text-sm font-medium text-emerald-700 bg-white border border-emerald-300 rounded-md hover:bg-emerald-50"
              >
                Export Report
              </button>
              <button 
                onClick={handleNewApplication}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                New Application
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <div>
            <MetricsGrid />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FundingProgressChart />
              
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  <div className="flex items-center p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium">EPA Grant Approved</p>
                      <p className="text-xs text-gray-500">$25,000 • 2 days ago</p>
                    </div>
                  </div>
                  <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium">NSF SBIR Under Review</p>
                      <p className="text-xs text-gray-500">$50,000 • 5 days ago</p>
                    </div>
                  </div>
                  <div className="flex items-center p-3 bg-purple-50 rounded-lg">
                    <DollarSign className="w-5 h-5 text-purple-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium">New Investment Received</p>
                      <p className="text-xs text-gray-500">$40,000 • 1 week ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'applications' && (
          <div className="bg-white rounded-lg border">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Grant Applications</h2>
                <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-1" />
                  New Application
                </button>
              </div>
            </div>
            <div className="divide-y">
              {data.appliedOpportunities.map((app) => (
                <div key={app.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{app.title}</h3>
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-1" />
                          ${app.amount.toLocaleString()}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          Deadline: {app.deadline}
                        </span>
                        {app.submittedDate && (
                          <span>Submitted: {app.submittedDate}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(app.status)}`}>
                          {app.status.replace('_', ' ')}
                        </span>
                        <div className="mt-1 text-sm text-gray-500">
                          {app.progress}% complete
                        </div>
                      </div>
                      <button className="p-2 hover:bg-gray-100 rounded-full">
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${app.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'opportunities' && (
          <div className="bg-white rounded-lg border">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-emerald-800">Saved Opportunities</h2>
                <div className="text-sm text-gray-500">
                  {data.savedOpportunities.length} opportunities saved
                </div>
              </div>
            </div>
            <div className="divide-y">
              {data.savedOpportunities.length > 0 ? (
                data.savedOpportunities.map((opp) => (
                  <div key={opp.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-medium text-gray-900">{opp.title}</h3>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            {opp.fit_score}% match
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          {opp.funder_name}
                        </div>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-1" />
                            ${opp.amount_min?.toLocaleString()} - ${opp.amount_max?.toLocaleString()}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            Deadline: {new Date(opp.deadline_date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <Bookmark className="w-4 h-4 mr-1" />
                            Saved: {new Date(opp.saved_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(opp.status)}`}>
                          {opp.status}
                        </span>
                        <button 
                          onClick={() => handleApplyNow(opp.id)}
                          className="px-3 py-1.5 text-sm font-medium text-emerald-600 border border-emerald-600 rounded hover:bg-emerald-50"
                        >
                          Apply Now
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <Bookmark className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Saved Opportunities</h3>
                  <p className="text-gray-500">
                    Save opportunities from the opportunity discovery page to track them here.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add other tab content here */}
        {activeTab === 'campaigns' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Funding Campaigns</h2>
            <div className="grid gap-6">
              {data.campaigns.map((campaign) => (
                <div key={campaign.id} className="bg-white rounded-lg border p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-medium">{campaign.name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}>
                        {campaign.type} • {campaign.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        ${campaign.raised.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        of ${campaign.target.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-green-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${(campaign.raised / campaign.target) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{campaign.investors || campaign.backers} {campaign.type === 'equity' ? 'investors' : 'backers'}</span>
                    <span>Ends: {campaign.endDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'investments' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold">Angel Investments</h3>
              </div>
              <div className="divide-y">
                {data.angelInvestments.map((investment) => (
                  <div key={investment.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{investment.investor}</h4>
                        <p className="text-sm text-gray-500">{investment.date}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${investment.amount.toLocaleString()}</div>
                        <div className="text-sm text-gray-500">{investment.equity}% equity</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold">Direct Donations</h3>
              </div>
              <div className="divide-y">
                {data.directDonations.map((donation) => (
                  <div key={donation.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{donation.donor}</h4>
                        <p className="text-sm text-gray-500">{donation.purpose}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${donation.amount.toLocaleString()}</div>
                        <div className="text-sm text-gray-500">{donation.date}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div>
            <h2 className="text-lg font-semibold mb-6">Project Analytics</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">Funding Sources Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Angel Investments</span>
                    <span className="font-medium">${(65000).toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: '26%' }}></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Campaign Funding</span>
                    <span className="font-medium">${(99500).toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '40%' }}></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Grants</span>
                    <span className="font-medium">${(75000).toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">Monthly Burn Rate</h3>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    ${data.metrics.monthlyBurn?.toLocaleString()}/month
                  </div>
                  <div className="text-sm text-gray-500 mb-4">
                    Current burn rate
                  </div>
                  <div className="bg-orange-100 text-orange-800 px-3 py-2 rounded-lg">
                    <div className="text-sm font-medium">
                      {data.metrics.runway} months runway remaining
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}