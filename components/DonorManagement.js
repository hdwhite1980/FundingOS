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
  Star,
  Eye,
  RefreshCw
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
              {donor.last_donation_date && (
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  Last: {new Date(donor.last_donation_date).toLocaleDateString()}
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
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                campaign.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {campaign.status}
              </span>
              <button
                onClick={() => syncCampaign(campaign.id)}
                className="btn-secondary btn-sm"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
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
            subtitle={`${stats.majorDonors || 0} major donors`}
            color="blue"
          />
          <StatCard
            icon={DollarSign}
            title="Total Raised"
            value={formatCurrency(stats.totalRaised)}
            subtitle={`${formatCurrency(stats.thisYearRaised)} this year`}
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

        {activeTab === 'donations' && (
          <div className="space-y-6">
            {/* Donation Controls */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search donations..."
                    className="form-input pl-10 w-64"
                  />
                </div>
                
                <select className="form-input">
                  <option value="">All Projects</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex space-x-3">
                <button className="btn-secondary flex items-center">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </button>
                <button
                  onClick={() => setShowDonationModal(true)}
                  className="btn-primary flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Record Donation
                </button>
              </div>
            </div>

            {/* Donations Table */}
            {donations.length > 0 ? (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Donor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {donations.map((donation) => (
                      <tr key={donation.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-semibold">
                                {donation.donor?.name?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {donation.donor?.name || 'Unknown Donor'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {donation.donor?.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-green-600">
                            {formatCurrency(donation.amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(donation.donation_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {donation.project?.name || 'General'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 capitalize">
                            {donation.payment_method?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button className="text-indigo-600 hover:text-indigo-900">
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <DollarSign className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No donations yet</h3>
                <p className="mt-1 text-gray-500">Start recording donations to track your fundraising progress.</p>
                <button
                  onClick={() => setShowDonationModal(true)}
                  className="btn-primary mt-4"
                >
                  Record First Donation
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

// Modal Components
function CreateDonorModal({ onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address_line1: '',
    city: '',
    state: '',
    zip_code: '',
    donor_type: 'individual',
    notes: '',
    tags: []
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg shadow-lg max-w-md w-full"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Add New Donor</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Type</label>
              <select
                className="form-input"
                value={formData.donor_type}
                onChange={(e) => setFormData({...formData, donor_type: e.target.value})}
              >
                <option value="individual">Individual</option>
                <option value="foundation">Foundation</option>
                <option value="corporation">Corporation</option>
                <option value="government">Government</option>
              </select>
            </div>

            <div>
              <label className="form-label">Address</label>
              <input
                type="text"
                className="form-input"
                placeholder="Street address"
                value={formData.address_line1}
                onChange={(e) => setFormData({...formData, address_line1: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                />
              </div>
              <div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="State"
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                />
              </div>
              <div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="ZIP"
                  value={formData.zip_code}
                  onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Notes</label>
              <textarea
                className="form-input"
                rows="3"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional notes about this donor..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Add Donor
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

function CreateDonationModal({ donors, projects, selectedDonor, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    donor_id: selectedDonor?.id || '',
    project_id: '',
    amount: '',
    donation_date: new Date().toISOString().split('T')[0],
    payment_method: 'credit_card',
    external_platform: '',
    notes: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount),
      net_amount: parseFloat(formData.amount) // Simplified for now
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg shadow-lg max-w-md w-full"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Record Donation</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Donor *</label>
              <select
                className="form-input"
                value={formData.donor_id}
                onChange={(e) => setFormData({...formData, donor_id: e.target.value})}
                required
              >
                <option value="">Select donor</option>
                {donors.map(donor => (
                  <option key={donor.id} value={donor.id}>
                    {donor.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Project</label>
              <select
                className="form-input"
                value={formData.project_id}
                onChange={(e) => setFormData({...formData, project_id: e.target.value})}
              >
                <option value="">General donation</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Amount *</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.donation_date}
                  onChange={(e) => setFormData({...formData, donation_date: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label">Payment Method</label>
              <select
                className="form-input"
                value={formData.payment_method}
                onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
              >
                <option value="credit_card">Credit Card</option>
                <option value="check">Check</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="crowdfunding">Crowdfunding</option>
              </select>
            </div>

            {formData.payment_method === 'crowdfunding' && (
              <div>
                <label className="form-label">Platform</label>
                <select
                  className="form-input"
                  value={formData.external_platform}
                  onChange={(e) => setFormData({...formData, external_platform: e.target.value})}
                >
                  <option value="">Select platform</option>
                  <option value="gofundme">GoFundMe</option>
                  <option value="kickstarter">Kickstarter</option>
                  <option value="indiegogo">Indiegogo</option>
                  <option value="paypal">PayPal</option>
                </select>
              </div>
            )}

            <div>
              <label className="form-label">Notes</label>
              <textarea
                className="form-input"
                rows="3"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional notes about this donation..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Record Donation
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

function LinkCampaignModal({ projects, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    title: '',
    platform: 'gofundme',
    campaign_url: '',
    project_id: '',
    goal_amount: '',
    description: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      goal_amount: formData.goal_amount ? parseFloat(formData.goal_amount) : null
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg shadow-lg max-w-md w-full"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Link Campaign</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Campaign Title *</label>
              <input
                type="text"
                className="form-input"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="form-label">Platform *</label>
              <select
                className="form-input"
                value={formData.platform}
                onChange={(e) => setFormData({...formData, platform: e.target.value})}
                required
              >
                <option value="gofundme">GoFundMe</option>
                <option value="kickstarter">Kickstarter</option>
                <option value="indiegogo">Indiegogo</option>
                <option value="fundrazr">FundRazr</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="form-label">Campaign URL *</label>
              <input
                type="url"
                className="form-input"
                value={formData.campaign_url}
                onChange={(e) => setFormData({...formData, campaign_url: e.target.value})}
                placeholder="https://..."
                required
              />
            </div>

            <div>
              <label className="form-label">Associated Project</label>
              <select
                className="form-input"
                value={formData.project_id}
                onChange={(e) => setFormData({...formData, project_id: e.target.value})}
              >
                <option value="">Select project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Goal Amount</label>
              <input
                type="number"
                className="form-input"
                value={formData.goal_amount}
                onChange={(e) => setFormData({...formData, goal_amount: e.target.value})}
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description of the campaign..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Link Campaign
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}