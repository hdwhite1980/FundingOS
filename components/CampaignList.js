'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Heart, Plus, Search, DollarSign, TrendingUp, ExternalLink, Eye, Target, Share2, Users } from 'lucide-react'
import StatCard from './ui/StatCard'
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
    if (!campaign.end_date) return { status: 'ongoing', text: 'Ongoing', color: 'text-slate-600 bg-slate-50' }
    
    const endDate = new Date(campaign.end_date)
    const now = new Date()
    
    if (endDate < now) {
      return { status: 'ended', text: 'Ended', color: 'text-gray-600 bg-gray-50' }
    } else {
      const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
      return { 
        status: 'active', 
        text: `${daysLeft} days left`, 
        color: 'text-emerald-600 bg-emerald-50' 
      }
    }
  }

  const getProgressPercentage = (campaign) => {
    if (!campaign.goal || campaign.goal === 0) return 0
    return Math.min((campaign.raised || 0) / campaign.goal * 100, 100)
  }

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
            <div className="p-2.5 bg-pink-100 rounded-lg">
              <Heart className="w-5 h-5 text-pink-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Campaigns</h1>
          </div>
          <p className="text-slate-600">Crowdfunding campaigns to raise funds from the community</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="pl-10 pr-3 py-2.5 rounded-lg bg-white border border-slate-200 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder-slate-400 shadow-sm"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all duration-200 hover:shadow-md"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Heart} iconColor="text-pink-600" iconBg="bg-pink-50" label="Total Campaigns" value={stats.totalCampaigns} />
        <StatCard icon={DollarSign} iconColor="text-emerald-600" iconBg="bg-emerald-50" label="Total Raised" value={`$${(stats.totalRaised||0).toLocaleString()}`}/>
        <StatCard icon={Target} iconColor="text-slate-600" iconBg="bg-slate-50" label="Total Goal" value={`$${(stats.totalGoal||0).toLocaleString()}`}/>
        <StatCard icon={TrendingUp} iconColor="text-amber-600" iconBg="bg-amber-50" label="Active" value={stats.activeCampaigns} />
      </div>

      {/* Campaign List */}
      {filteredCampaigns.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
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
              className="inline-flex items-center px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Campaign
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
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="bg-white border border-slate-200 rounded-xl hover:shadow-xl transition-all duration-300 overflow-hidden group"
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
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getCampaignStatus(campaign).color}`}>
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
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${getProgressPercentage(campaign)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-500 flex items-center">
                      <Users className="w-3 h-3 mr-1" />
                      {campaign.backers || 0} backers
                    </span>
                    <span className="text-xs font-semibold text-emerald-600">
                      {getProgressPercentage({ ...campaign, raised: campaign.raised_amount || campaign.raised, goal: campaign.goal_amount || campaign.goal }).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedCampaign(campaign)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2.5 rounded-md border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 text-sm font-medium transition-colors"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </button>
          {campaign.campaign_url && (
                    <button
                      onClick={() => window.open(campaign.campaign_url, '_blank')}
                      className="inline-flex items-center px-3 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Visit
                    </button>
                  )}
                  <button className="inline-flex items-center justify-center px-3 py-2.5 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-sm font-medium transition-colors">
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
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-medium uppercase tracking-wide text-neutral-600">Campaign Title</label>
            <input
              type="text"
              required
              className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Enter campaign title"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium uppercase tracking-wide text-neutral-600">Description</label>
            <textarea
              className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe your campaign"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium uppercase tracking-wide text-neutral-600">Funding Goal ($)</label>
            <input
              type="number"
              required
              min="1"
              className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              value={formData.goal_amount}
              onChange={(e) => setFormData({...formData, goal_amount: e.target.value})}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium uppercase tracking-wide text-neutral-600">Campaign URL (External)</label>
            <input
              type="url"
              className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              value={formData.campaign_url}
              onChange={(e) => setFormData({...formData, campaign_url: e.target.value})}
              placeholder="https://..."
            />
            <p className="text-xs text-neutral-500">Optional link to the live campaign page.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium uppercase tracking-wide text-neutral-600">Link to Project</label>
            <select
              className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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
            <label className="block text-xs font-medium uppercase tracking-wide text-neutral-600">Platform</label>
            <select
              className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-md bg-neutral-100 text-neutral-700 text-sm font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
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
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                {campaign.title}
              </h4>
              {campaign.description && (
                <p className="text-gray-600">{campaign.description}</p>
              )}
            </div>

            {/* Progress */}
            <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center">
          <p className="text-2xl font-bold text-emerald-600">${campaign.raised?.toLocaleString() || '0'}</p>
          <p className="text-sm text-neutral-600">Raised</p>
                </div>
                <div className="text-center">
          <p className="text-2xl font-bold text-slate-600">${campaign.goal?.toLocaleString() || '0'}</p>
          <p className="text-sm text-neutral-600">Goal</p>
                </div>
                <div className="text-center">
          <p className="text-2xl font-bold text-purple-600">{campaign.backers || 0}</p>
          <p className="text-sm text-neutral-600">Backers</p>
                </div>
              </div>

        <div className="w-full bg-neutral-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-pink-500 to-pink-600 h-3 rounded-full"
                  style={{ 
                    width: `${Math.min((campaign.raised || 0) / (campaign.goal || 1) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              {campaign.campaign_url && (
                <button
                  onClick={() => window.open(campaign.campaign_url, '_blank')}
                  className="px-4 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-colors"
                >
                  <ExternalLink className="w-4 h-4 mr-2 inline" />
                  Visit Campaign
                </button>
              )}
              <button onClick={onClose} className="px-4 py-2.5 rounded-md bg-neutral-100 text-neutral-700 text-sm font-medium hover:bg-neutral-200 transition-colors">Close</button>
            </div>
          </div>
    </ModalShell>
  )
}
