'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Heart, 
  Plus, 
  Search, 
  DollarSign, 
  TrendingUp,
  ExternalLink,
  Eye,
  Calendar,
  Target,
  Share2,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
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
      const [campaignData, campaignStats] = await Promise.all([
        directUserServices.campaigns?.getCampaigns(user.id) || Promise.resolve([]),
        directUserServices.campaigns?.getCampaignStats(user.id) || Promise.resolve({
          totalCampaigns: 0,
          totalRaised: 0,
          totalGoal: 0,
          activeCampaigns: 0
        })
      ])
      
      setCampaigns(campaignData)
      setStats(campaignStats)
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
    if (!campaign.end_date) return { status: 'ongoing', text: 'Ongoing', color: 'text-blue-600 bg-blue-50' }
    
    const endDate = new Date(campaign.end_date)
    const now = new Date()
    
    if (endDate < now) {
      return { status: 'ended', text: 'Ended', color: 'text-gray-600 bg-gray-50' }
    } else {
      const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
      return { 
        status: 'active', 
        text: `${daysLeft} days left`, 
        color: 'text-green-600 bg-green-50' 
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header with Stats */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Heart className="w-6 h-6 mr-3 text-pink-600" />
              Campaigns
            </h2>
            <p className="text-gray-600 mt-1">
              Crowdfunding campaigns to raise funds from the community
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-pink-100 rounded-lg mr-3">
                <Heart className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCampaigns}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Raised</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${stats.totalRaised?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Goal</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${stats.totalGoal?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg mr-3">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeCampaigns}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search campaigns..."
            className="form-input pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Campaign List */}
      {filteredCampaigns.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {campaigns.length === 0 ? 'No campaigns yet' : 'No campaigns found'}
          </h3>
          <p className="text-gray-600 mb-6">
            {campaigns.length === 0 
              ? 'Create crowdfunding campaigns to raise funds from multiple supporters'
              : 'Try adjusting your search terms'
            }
          </p>
          {campaigns.length === 0 && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
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
              className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden"
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {campaign.title}
                    </h3>
                    {campaign.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {campaign.description}
                      </p>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCampaignStatus(campaign).color}`}>
                    {getCampaignStatus(campaign).text}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      ${campaign.raised?.toLocaleString() || '0'} raised
                    </span>
                    <span className="text-sm text-gray-500">
                      of ${campaign.goal?.toLocaleString() || '0'} goal
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-pink-500 to-pink-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getProgressPercentage(campaign)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500 flex items-center">
                      <Users className="w-3 h-3 mr-1" />
                      {campaign.backers || 0} backers
                    </span>
                    <span className="text-xs font-medium text-pink-600">
                      {getProgressPercentage(campaign).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedCampaign(campaign)}
                    className="flex-1 btn-outline text-sm"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </button>
                  {campaign.external_url && (
                    <button
                      onClick={() => window.open(campaign.external_url, '_blank')}
                      className="btn-primary text-sm"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Visit
                    </button>
                  )}
                  <button className="btn-secondary text-sm">
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
            loadCampaigns() // Refresh stats
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
    goal: '',
    project_id: '',
    platform: 'gofundme',
    external_url: '',
    end_date: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // For now, create a placeholder campaign
      const newCampaign = {
        id: Date.now(),
        ...formData,
        goal: parseFloat(formData.goal) || 0,
        raised: 0,
        backers: 0,
        created_at: new Date().toISOString(),
        user_id: user.id
      }

      onCampaignCreated(newCampaign)
    } catch (error) {
      console.error('Error creating campaign:', error)
      toast.error('Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Create Campaign</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Title
            </label>
            <input
              type="text"
              required
              className="form-input"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Enter campaign title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="form-input"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe your campaign"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Funding Goal ($)
            </label>
            <input
              type="number"
              required
              min="1"
              className="form-input"
              value={formData.goal}
              onChange={(e) => setFormData({...formData, goal: e.target.value})}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link to Project
            </label>
            <select
              className="form-input"
              value={formData.project_id}
              onChange={(e) => setFormData({...formData, project_id: e.target.value})}
            >
              <option value="">Select a project (optional)</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Platform
            </label>
            <select
              className="form-input"
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
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Campaign Details Modal Component
function CampaignDetailsModal({ campaign, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Campaign Details</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              ✕
            </button>
          </div>

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
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    ${campaign.raised?.toLocaleString() || '0'}
                  </p>
                  <p className="text-sm text-gray-600">Raised</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    ${campaign.goal?.toLocaleString() || '0'}
                  </p>
                  <p className="text-sm text-gray-600">Goal</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {campaign.backers || 0}
                  </p>
                  <p className="text-sm text-gray-600">Backers</p>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-pink-500 to-pink-600 h-3 rounded-full"
                  style={{ 
                    width: `${Math.min((campaign.raised || 0) / (campaign.goal || 1) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              {campaign.external_url && (
                <button
                  onClick={() => window.open(campaign.external_url, '_blank')}
                  className="btn-primary"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Visit Campaign
                </button>
              )}
              <button onClick={onClose} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
