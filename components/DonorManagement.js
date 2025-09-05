'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  DollarSign, 
  Heart, 
  TrendingUp,
  ExternalLink,
  Upload,
  Download,
  MoreVertical,
  Edit3,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star
} from 'lucide-react'
import { donorService, donationService, crowdfundingService } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function DonorManagement({ user, userProfile, projects }) {
  const [donors, setDonors] = useState([])
  const [donations, setDonations] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('donors')
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDonationModal, setShowDonationModal] = useState(false)
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [selectedDonor, setSelectedDonor] = useState(null)

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user, searchQuery])

  const loadData = async () => {
    try {
      setLoading(true)
      const [donorsData, donationsData, campaignsData, statsData] = await Promise.all([
        donorService.getDonors(user.id, { search: searchQuery, ...filters }),
        donationService.getDonations(user.id),
        crowdfundingService.getCampaigns(user.id),
        donorService.getDonorStats(user.id)
      ])

      setDonors(donorsData)
      setDonations(donationsData)
      setCampaigns(campaignsData)
      setStats(statsData)
    } catch (error) {
      toast.error('Failed to load donor data')
      console.error('Error loading donor data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDonor = async (donorData) => {
    try {
      const newDonor = await donorService.createDonor({
        ...donorData,
        user_id: user.id
      })
      setDonors([newDonor, ...donors])
      setShowCreateModal(false)
      toast.success('Donor added successfully!')
      loadData() // Refresh stats
    } catch (error) {
      toast.error('Failed to create donor: ' + error.message)
    }
  }

  const handleCreateDonation = async (donationData) => {
    try {
      const newDonation = await donationService.createDonation({
        ...donationData,
        user_id: user.id,
        amount: parseFloat(donationData.amount),
        net_amount: parseFloat(donationData.amount) // Simplified
      })
      setDonations([newDonation, ...donations])
      setShowDonationModal(false)
      setSelectedDonor(null)
      toast.success('Donation recorded successfully!')
      loadData() // Refresh donor stats
    } catch (error) {
      toast.error('Failed to record donation: ' + error.message)
    }
  }

  const handleCreateCampaign = async (campaignData) => {
    try {
      const newCampaign = await crowdfundingService.createCampaign({
        ...campaignData,
        user_id: user.id
      })
      setCampaigns([newCampaign, ...campaigns])
      setShowCampaignModal(false)
      toast.success('Campaign linked successfully!')
    } catch (error) {
      toast.error('Failed to link campaign: ' + error.message)
    }
  }

  const handleUpdateDonor = async (donorId, updates) => {
    try {
      const updatedDonor = await donorService.updateDonor(donorId, updates)
      setDonors(donors.map(d => d.id === donorId ? updatedDonor : d))
      toast.success('Donor updated successfully!')
    } catch (error) {
      toast.error('Failed to update donor: ' + error.message)
    }
  }

  const handleDeleteDonor = async (donorId) => {
    if (window.confirm('Are you sure you want to delete this donor?')) {
      try {
        await donorService.deleteDonor(donorId)
        setDonors(donors.filter(d => d.id !== donorId))
        toast.success('Donor deleted successfully!')
        loadData() // Refresh stats
      } catch (error) {
        toast.error('Failed to delete donor: ' + error.message)
      }
    }
  }

  const syncCampaign = async (campaignId) => {
    try {
      const updatedCampaign = await crowdfundingService.syncCampaignData(campaignId)
      setCampaigns(campaigns.map(c => c.id === campaignId ? updatedCampaign : c))
      toast.success('Campaign data synced!')
    } catch (error) {
      toast.error('Failed to sync campaign data')
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const StatCard = ({ icon: Icon, title, value, subtitle, color = "blue" }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="card-body flex items-center">
        <div className={`p-3 bg-${color}-100 rounded-lg mr-4`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </motion.div>
  )

  const DonorCard = ({ donor }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card hover:shadow-lg transition-all duration-300"
    >
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {donor.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{donor.name}</h3>
                <p className="text-sm text-gray-600 capitalize">{donor.donor_type}</p>
              </div>
              {donor.is_major_donor && (
                <Star className="w-5 h-5 text-yellow-500 fill-current" />
              )}
            </div>

            <div className="space-y-2">
              {donor.email && (
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="w-4 h-4 mr-2" />
                  {donor.email}
                </div>
              )}
              {donor.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-2" />
                  {donor.phone}
                </div>
              )}
              {donor.city && donor.state && (
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  {donor.city}, {donor.state}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-4">
              <div>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(donor.total_donated)}
                </p>
                <p className="text-xs text-gray-500">
                  {donor.donation_count} donation{donor.donation_count !== 1 ? 's' : ''}
                </p>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setSelectedDonor(donor)
                    setShowDonationModal(true)
                  }}
                  className="btn-primary btn-sm"
                >
                  Add Donation
                </button>
                <button
                  onClick={() => setSelectedDonor(donor)}
                  className="btn-secondary btn-sm"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteDonor(donor.id)}
                  className="btn-secondary btn-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )

  const CampaignCard = ({ campaign }) => {
    const progressPercentage = campaign.goal_amount 
      ? (campaign.raised_amount / campaign.goal_amount) * 100
      : 0

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card hover:shadow-lg transition-all duration-300"
      >
        <div className="card-body">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">{campaign.title}</h3>
              <p className="text-sm text-gray-600 capitalize">{campaign.platform}</p>
              {campaign.project && (
                <p className="text-xs text-gray-500">{campaign.project.name}</p>
              )}
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              campaign.status === 'active' ? 'bg-green-100 text-green-800' :
              campaign.status === 'completed' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {campaign.status}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{formatCurrency(campaign.raised_amount)}</span>
                <span>{formatCurrency(campaign.goal_amount)}</span>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              {campaign.supporter_count} supporter{campaign.supporter_count !== 1 ? 's' : ''}
            </p>

            <div className="flex items-center justify-between">
              <a
                href={campaign.campaign_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary btn-sm flex items-center"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Campaign
              </a>
              
              <button
                onClick={() => syncCampaign(campaign.id)}
                className="btn-primary btn-sm"
              >
                Sync Data
              </button>
            </div>

            {campaign.last_sync && (
              <p className="text-xs text-gray-500">
                Last sync: {new Date(campaign.last_sync).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    )
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Donor Management</h1>
          <p className="text-gray-600">Track donors, donations, and crowdfunding campaigns</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Users}
            title="Total Donors"
            value={stats.totalDonors || 0}
            color="blue"
          />
          <StatCard
            icon={DollarSign}
            title="Total Raised"
            value={formatCurrency(stats.totalRaised)}
            color="green"
          />
          <StatCard
            icon={Heart}
            title="Total Donations"
            value={stats.totalDonations || 0}
            color="red"
          />
          <StatCard
            icon={Star}
            title="Major Donors"
            value={stats.majorDonors || 0}
            subtitle="$1,000+ lifetime"
            color="yellow"
          />
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8">
          {[
            { id: 'donors', label: 'Donors', icon: Users },
            { id: 'donations', label: 'Donations', icon: DollarSign },
            { id: 'campaigns', label: 'Campaigns', icon: TrendingUp }
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        {activeTab === 'donors' && (
          <div className="space-y-6">
            {/* Search and Actions */}
            <div className="flex items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search donors..."
                    className="form-input pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button className="btn-secondary flex items-center">
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </button>
                <button className="btn-secondary flex items-center">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Donor
                </button>
              </div>
            </div>

            {/* Donors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {donors.map(donor => (
                <DonorCard key={donor.id} donor={donor} />
              ))}
            </div>

            {donors.length === 0 && (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No donors yet</h3>
                <p className="mt-1 text-gray-500">Get started by adding your first donor.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary mt-4"
                >
                  Add First Donor
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            {/* Campaign Controls */}
            <div className="flex justify-between mb-6">
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowCampaignModal(true)}
                  className="btn-primary flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Link Campaign
                </button>
              </div>
            </div>

            {/* Campaigns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map(campaign => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>

            {campaigns.length === 0 && (
              <div className="text-center py-12">
                <TrendingUp className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No campaigns yet</h3>
                <p className="mt-1 text-gray-500">Connect your crowdfunding campaigns to track progress.</p>
                <button
                  onClick={() => setShowCampaignModal(true)}
                  className="btn-primary mt-4"
                >
                  Link First Campaign
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateDonorModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateDonor}
          donor={selectedDonor}
        />
      )}

      {showDonationModal && (
        <CreateDonationModal
          donors={donors}
          projects={projects}
          selectedDonor={selectedDonor}
          onClose={() => {
            setShowDonationModal(false)
            setSelectedDonor(null)
          }}
          onSubmit={handleCreateDonation}
        />
      )}

      {showCampaignModal && (
        <LinkCampaignModal
          projects={projects}
          onClose={() => setShowCampaignModal(false)}
          onSubmit={handleCreateCampaign}
        />
      )}
    </div>
  )
}

