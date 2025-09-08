'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Heart, Plus, Search, DollarSign, TrendingUp, ExternalLink, Eye, Target, Share2, Users } from 'lucide-react'
import ModalShell from './ui/ModalShell'
import { directUserServices } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function CampaignList({ user, userProfile, projects = [] }) {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    totalRaised: 0,
    totalGoal: 0,
    activeCampaigns: 0
  })

  useEffect(() => {
    if (user) {
      loadCampaigns()
    }
  }, [user, searchQuery])

  const loadCampaigns = async () => {
    try {
      setLoading(true)
      const campaignData = await (directUserServices.campaigns?.getCampaigns(user.id) || Promise.resolve([]))

      // Derive stats locally (no getCampaignStats helper implemented)
      const totalCampaigns = campaignData.length
      const totalRaised = campaignData.reduce((sum, c) => sum + (c.raised || 0), 0)
      const totalGoal = campaignData.reduce((sum, c) => sum + (parseFloat(c.goal) || 0), 0)
      const now = new Date()
      const activeCampaigns = campaignData.filter(c => !c.end_date || new Date(c.end_date) >= now).length

      setCampaigns(campaignData)
      setStats({ totalCampaigns, totalRaised, totalGoal, activeCampaigns })
    } catch (error) {
      console.error('Error loading campaigns:', error)
      toast.error('Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getCampaignStatus = (campaign) => {
    if (!campaign.end_date) return { status: 'ongoing', text: 'Ongoing', color: 'text-slate-600 bg-slate-100' }
    
    const endDate = new Date(campaign.end_date)
    const now = new Date()
    
    if (endDate < now) {
      return { status: 'ended', text: 'Ended', color: 'text-slate-600 bg-slate-100' }
    } else {
      const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
      return { 
        status: 'active', 
        text: `${daysLeft} days left`, 
        color: 'text-emerald-700 bg-emerald-100 border-emerald-200' 
      }
    }
  }

  const getProgressPercentage = (campaign) => {
    if (!campaign.goal || campaign.goal === 0) return 0
    return Math.min((campaign.raised || 0) / campaign.goal * 100, 100)
  }

  // Modern StatCard component following design system
  const ModernStatCard = ({ icon: Icon, label, value, iconColor = "text-slate-600", iconBg = "bg-slate-50" }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all duration-300">
      <div className="flex items-center space-x-3 mb-4">
        <div className={`p-2.5 ${iconBg} rounded-lg`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <span className="text-sm font-medium text-slate-600">{label}</span>
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-100 rounded-lg">
              <Heart className="w-5 h-5 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Campaigns</h1>
          </div>
          <p className="text-sm text-slate-600">Crowdfunding campaigns to raise funds from the community</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="pl-10 pr-3 py-2 rounded-md bg-white border border-slate-200 text-sm w-64 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder-slate-400"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 py-2 text-sm flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <ModernStatCard 
          icon={Heart} 
          iconColor="text-emerald-600" 
          iconBg="bg-emerald-50" 
          label="Total Campaigns" 
          value={stats.totalCampaigns} 
        />
        <ModernStatCard 
          icon={DollarSign} 
          iconColor="text-emerald-600" 
          iconBg="bg-emerald-50" 
          label="Total Raised" 
          value={`$${(stats.totalRaised||0).toLocaleString()}`}
        />
        <ModernStatCard 
          icon={Target} 
          iconColor="text-slate-600" 
          iconBg="bg-slate-50" 
          label="Total Goal" 
          value={`$${(stats.totalGoal||0).toLocaleString()}`}
        />
        <ModernStatCard 
          icon={TrendingUp} 
          iconColor="text-amber-600" 
          iconBg="bg-amber-50" 
          label="Active" 
          value={stats.activeCampaigns} 
        />
      </div>

      {/* Campaign List */}
      {filteredCampaigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center mb-4">
            <Heart className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {campaigns.length === 0 ? 'No campaigns yet' : 'No campaigns found'}
          </h3>
          <p className="text-slate-600 mb-6 text-sm max-w-md mx-auto">
            {campaigns.length === 0
              ? 'Create crowdfunding campaigns to raise funds from multiple supporters.'
              : 'Try adjusting your search terms or clearing the filter.'}
          </p>
          {campaigns.length === 0 && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm flex items-center space-x-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Campaign</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign, index) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-white rounded-xl border border-slate-200 hover:shadow-lg transition-all duration-300 overflow-hidden group"
            >
              {/* Campaign Image */}
              {campaign.image_url && (
                <div className="aspect-w-16 aspect-h-9">
                  <img
                    src={campaign.image_url}
                    alt={campaign.title}
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
              
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors">
                      {campaign.title}
                    </h3>
                    {campaign.description && (
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {campaign.description}
                      </p>
                    )}
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${getCampaignStatus(campaign).color}`}>
                    {getCampaignStatus(campaign).text}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">
                      ${(campaign.raised_amount || campaign.raised || 0).toLocaleString()} raised
                    </span>
                    <span className="text-sm text-slate-500">
                      of ${(campaign.goal_amount || campaign.goal || 0).toLocaleString()} goal
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-lg h-8 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-8 rounded-lg transition-all duration-700 ease-out flex items-center justify-end pr-3"
                      style={{ width: `${getProgressPercentage(campaign)}%` }}
                    >
                      <span className="text-white text-xs font-medium">
                        {getProgressPercentage({ ...campaign, raised: campaign.raised_amount || campaign.raised, goal: campaign.goal_amount || campaign.goal }).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-500 flex items-center">
                      <Users className="w-3 h-3 mr-1" />
                      {campaign.backers || 0} backers
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedCampaign(campaign)}
                    className="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors px-3 py-2.5 text-sm flex items-center justify-center space-x-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Details</span>
                  </button>
                  {campaign.campaign_url && (
                    <button
                      onClick={() => window.open(campaign.campaign_url, '_blank')}
                      className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-3 py-2.5 text-sm flex items-center space-x-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Visit</span>
                    </button>
                  )}
                  <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <CreateCampaignModal
          user={user}
          userProfile={userProfile}
          projects={projects}
          onClose={() => setShowCreateModal(false)}
          onCampaignCreated={(newCampaign) => {
            setCampaigns([newCampaign, ...campaigns])
            setShowCreateModal(false)
            loadCampaigns()
            toast.success('Campaign created successfully!')
          }}
        />
      )}

      {/* Campaign Details Modal */}
      {selectedCampaign && (
        <CampaignDetailsModal
          campaign={selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
        />
      )}
    </div>
  )
}

// Create Campaign Modal Component
function CreateCampaignModal({ user, userProfile, projects, onClose, onCampaignCreated }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goal_amount: '',
    project_id: '',
    platform: 'gofundme',
    campaign_url: '',
    end_date: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description?.trim() || '',
        goal_amount: parseFloat(formData.goal_amount) || 0,
        project_id: formData.project_id || null,
        platform: formData.platform,
        campaign_url: formData.campaign_url || null,
        end_date: formData.end_date || null
      }

      let created = null
      if (directUserServices.campaigns?.createCampaign) {
        created = await directUserServices.campaigns.createCampaign(user.id, payload)
      }

      if (!created) {
        toast.error('Campaign creation failed')
      } else {
        onCampaignCreated(created)
      }
    } catch (error) {
      console.error('Error creating campaign:', error)
      toast.error('Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalShell title="Create Campaign" subtitle="Launch a new crowdfunding effort" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Campaign Title</label>
          <input
            type="text"
            required
            className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            placeholder="Enter campaign title"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Description</label>
          <textarea
            className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Describe your campaign"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Funding Goal ($)</label>
          <input
            type="number"
            required
            min="1"
            className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            value={formData.goal_amount}
            onChange={(e) => setFormData({...formData, goal_amount: e.target.value})}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Campaign URL (External)</label>
          <input
            type="url"
            className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            value={formData.campaign_url}
            onChange={(e) => setFormData({...formData, campaign_url: e.target.value})}
            placeholder="https://..."
          />
          <p className="text-xs text-slate-500">Optional link to the live campaign page.</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Link to Project</label>
          <select
            className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            value={formData.project_id}
            onChange={(e) => setFormData({...formData, project_id: e.target.value})}
          >
            <option value="">Select a project (optional)</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Platform</label>
          <select
            className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            value={formData.platform}
            onChange={(e) => setFormData({...formData, platform: e.target.value})}
          >
            <option value="gofundme">GoFundMe</option>
            <option value="kickstarter">Kickstarter</option>
            <option value="indiegogo">Indiegogo</option>
            <option value="fundrazr">Fundrazr</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Campaign'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

// Campaign Details Modal Component
function CampaignDetailsModal({ campaign, onClose }) {
  return (
    <ModalShell title="Campaign Details" subtitle={campaign.title} onClose={onClose}>
      {/* Campaign Image */}
      {campaign.image_url && (
        <div className="mb-6">
          <img
            src={campaign.image_url}
            alt={campaign.title}
            className="w-full h-64 object-cover rounded-lg"
          />
        </div>
      )}

      {/* Campaign Info */}
      <div className="space-y-6">
        <div>
          <h4 className="text-lg font-semibold text-slate-900 mb-2">
            {campaign.title}
          </h4>
          {campaign.description && (
            <p className="text-slate-600">{campaign.description}</p>
          )}
        </div>

        {/* Progress */}
        <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">${campaign.raised?.toLocaleString() || '0'}</p>
              <p className="text-sm text-slate-600">Raised</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-600">${campaign.goal?.toLocaleString() || '0'}</p>
              <p className="text-sm text-slate-600">Goal</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{campaign.backers || 0}</p>
              <p className="text-sm text-slate-600">Backers</p>
            </div>
          </div>

          <div className="w-full bg-slate-200 rounded-lg h-8 overflow-hidden">
            <div
              className="bg-emerald-500 h-8 rounded-lg transition-all duration-700 ease-out"
              style={{ 
                width: `${Math.min((campaign.raised || 0) / (campaign.goal || 1) * 100, 100)}%` 
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          {campaign.campaign_url && (
            <button
              onClick={() => window.open(campaign.campaign_url, '_blank')}
              className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm flex items-center space-x-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Visit Campaign</span>
            </button>
          )}
          <button 
            onClick={onClose} 
            className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </ModalShell>
  )
}