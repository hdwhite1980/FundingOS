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
  RefreshCw,
  X
} from 'lucide-react'
import { directUserServices } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function DonorManagement({ user, userProfile, projects, initialTab = 'donors' }) {
  const [donors, setDonors] = useState([])
  const [investors, setInvestors] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [donations, setDonations] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(initialTab)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingDonor, setEditingDonor] = useState(null)
  const [modalType, setModalType] = useState('donor') // 'donor' or 'investor'
  const [showDonationModal, setShowDonationModal] = useState(false)
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [showInvestmentModal, setShowInvestmentModal] = useState(false)
  const [showDonationDetailModal, setShowDonationDetailModal] = useState(false)
  const [selectedDonor, setSelectedDonor] = useState(null)
  const [selectedInvestor, setSelectedInvestor] = useState(null)
  const [selectedDonation, setSelectedDonation] = useState(null)

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user, searchQuery])

  const loadData = async () => {
    try {
      setLoading(true)
      const [donorsData, donationsData, campaignsData, investorsData, statsData] = await Promise.all([
        directUserServices.donors?.getDonors(user.id, { search: searchQuery, ...filters }) || Promise.resolve([]),
        directUserServices.donors?.getDonations(user.id) || Promise.resolve([]),
        directUserServices.campaigns?.getCampaigns(user.id, { search: searchQuery, ...filters }) || Promise.resolve([]),
        directUserServices.investors?.getInvestors(user.id, { search: searchQuery, ...filters }) || Promise.resolve([]),
        directUserServices.donors?.getDonorStats(user.id) || Promise.resolve({})
      ])

      setDonors(donorsData)
      setDonations(donationsData)
      setCampaigns(campaignsData)
      setInvestors(investorsData)
      setStats(statsData)
    } catch (error) {
      toast.error('Failed to load data')
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshStats = async () => {
    try {
      toast('Refreshing donor statistics...', {
        icon: '🔄',
        style: {
          borderRadius: '10px',
          background: '#3b82f6',
          color: '#fff',
        },
      })
      
      const success = await directUserServices.donors?.refreshAllDonorStats(user.id)
      
      if (success) {
        await loadData()
        toast.success('Donor statistics refreshed successfully!')
      } else {
        toast.error('Failed to refresh donor statistics')
      }
    } catch (error) {
      toast.error('Failed to refresh donor statistics: ' + error.message)
    }
  }

  const handleCreateDonor = async (donorData) => {
    try {
      const newDonor = await directUserServices.donors?.createDonor(user.id, donorData)
      setDonors([newDonor, ...donors])
      setShowCreateModal(false)
      toast.success('Donor added successfully!')
      loadData()
    } catch (error) {
      toast.error('Failed to create donor: ' + error.message)
    }
  }

  const handleUpdateDonor = async (donorData) => {
    try {
      const updatedDonor = await directUserServices.donors?.updateDonor(editingDonor.id, donorData)
      setDonors(donors.map(d => d.id === editingDonor.id ? updatedDonor : d))
      setShowEditModal(false)
      setEditingDonor(null)
      toast.success('Donor updated successfully!')
      loadData()
    } catch (error) {
      toast.error('Failed to update donor: ' + error.message)
    }
  }

  const handleCreateDonation = async (donationData) => {
    try {
      const newDonation = await directUserServices.donors?.createDonation(user.id, {
        ...donationData,
        amount: parseFloat(donationData.amount),
        net_amount: parseFloat(donationData.amount)
      })
      setDonations([newDonation, ...donations])
      setShowDonationModal(false)
      setSelectedDonor(null)
      toast.success('Donation recorded successfully!')
      loadData()
    } catch (error) {
      toast.error('Failed to record donation: ' + error.message)
    }
  }

  const handleCreateCampaign = async (campaignData) => {
    try {
      const newCampaign = await directUserServices.campaigns?.createCampaign(user.id, campaignData)
      setCampaigns([newCampaign, ...campaigns])
      setShowCampaignModal(false)
      toast.success('Campaign created successfully!')
    } catch (error) {
      toast.error('Failed to create campaign: ' + error.message)
    }
  }

  const handleCreateInvestor = async (investorData) => {
    try {
      // Filter fields to only those relevant to investors table
      const filteredData = {
        name: investorData.name,
        email: investorData.email || null,
        phone: investorData.phone || null,
        company: investorData.company || null,
        investor_type: investorData.type || 'individual',
        status: investorData.status || 'active',
        focus_areas: investorData.focus_areas || null,
        website: investorData.website || null,
        linkedin: investorData.linkedin || null,
        notes: investorData.notes || null
      }
      
      const newInvestor = await directUserServices.investors?.createInvestor(user.id, filteredData)
      setInvestors([newInvestor, ...investors])
      setShowCreateModal(false)
      toast.success('Investor added successfully!')
      loadData()
    } catch (error) {
      toast.error('Failed to create investor: ' + error.message)
    }
  }

  const handleDeleteDonor = async (donorId) => {
    if (window.confirm('Are you sure you want to delete this donor?')) {
      try {
        await directUserServices.donors?.deleteDonor(user.id, donorId)
        setDonors(donors.filter(d => d.id !== donorId))
        toast.success('Donor deleted successfully!')
        loadData()
      } catch (error) {
        toast.error('Failed to delete donor: ' + error.message)
      }
    }
  }

  const handleDeleteInvestor = async (investorId) => {
    if (window.confirm('Are you sure you want to delete this investor?')) {
      try {
        await directUserServices.investors?.deleteInvestor(user.id, investorId)
        setInvestors(investors.filter(i => i.id !== investorId))
        toast.success('Investor deleted successfully!')
        loadData()
      } catch (error) {
        toast.error('Failed to delete investor: ' + error.message)
      }
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  // Modern StatCard component following design system
  const ModernStatCard = ({ icon: Icon, title, value, subtitle, color = "emerald" }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all duration-300">
      <div className="flex items-center space-x-3 mb-4">
        <div className={`p-2.5 bg-slate-50 rounded-lg`}>
          <Icon className={`w-5 h-5 ${
            color === 'emerald' ? 'text-emerald-600' : 
            color === 'amber' ? 'text-amber-600' : 
            color === 'red' ? 'text-red-600' : 
            'text-slate-600'
          }`} />
        </div>
        <span className="text-sm font-medium text-slate-600">{title}</span>
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
    </div>
  )

  const DonorCard = ({ donor }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {donor.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{donor.name}</h3>
              <p className="text-sm text-slate-600 capitalize">{donor.donor_type}</p>
            </div>
            {donor.is_major_donor && (
              <Star className="w-5 h-5 text-amber-500 fill-current" />
            )}
          </div>

          <div className="space-y-2 mb-4">
            {donor.email && (
              <div className="flex items-center text-sm text-slate-600">
                <Mail className="w-4 h-4 mr-2" />
                {donor.email}
              </div>
            )}
            {donor.phone && (
              <div className="flex items-center text-sm text-slate-600">
                <Phone className="w-4 h-4 mr-2" />
                {donor.phone}
              </div>
            )}
            {donor.city && donor.state && (
              <div className="flex items-center text-sm text-slate-600">
                <MapPin className="w-4 h-4 mr-2" />
                {donor.city}, {donor.state}
              </div>
            )}
            {donor.last_donation_date && (
              <div className="flex items-center text-sm text-slate-600">
                <Calendar className="w-4 h-4 mr-2" />
                Last: {new Date(donor.last_donation_date).toLocaleDateString()}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-emerald-600">
                {formatCurrency(donor.total_donated)}
              </p>
              <p className="text-xs text-slate-500">
                {donor.donation_count} donation{donor.donation_count !== 1 ? 's' : ''}
              </p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setSelectedDonor(donor)
                  setShowDonationModal(true)
                }}
                className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-3 py-1.5 text-sm"
              >
                Add Donation
              </button>
              <button
                onClick={() => {
                  setEditingDonor(donor)
                  setModalType('donor')
                  setShowEditModal(true)
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteDonor(donor.id)}
                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )

  const InvestorCard = ({ investor }) => {
    const getInvestorTypeIcon = () => {
      const type = investor.type || 'individual';
      switch(type) {
        case 'angel':
          return <TrendingUp className="w-5 h-5 text-emerald-600" />;
        case 'venture_capital':
          return <Users className="w-5 h-5 text-emerald-600" />;
        default:
          return <Users className="w-5 h-5 text-slate-600" />;
      }
    };

    const getInvestorTypeLabel = () => {
      const type = investor.type || 'individual';
      switch(type) {
        case 'angel':
          return 'Angel Investor';
        case 'venture_capital':
          return 'VC Firm';
        default:
          return 'Individual';
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all duration-300"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {(investor.name || '').charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{investor.name || 'Unknown Investor'}</h3>
                <div className="flex items-center space-x-2 text-sm text-slate-500">
                  {getInvestorTypeIcon()}
                  <span>{getInvestorTypeLabel()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {investor.email && (
                <div className="flex items-center text-sm text-slate-600">
                  <Mail className="w-4 h-4 mr-2" />
                  {investor.email}
                </div>
              )}
              {investor.phone && (
                <div className="flex items-center text-sm text-slate-600">
                  <Phone className="w-4 h-4 mr-2" />
                  {investor.phone}
                </div>
              )}
              {investor.focus_areas && (
                <div className="text-sm text-slate-600">
                  <span className="font-medium">Focus:</span> {investor.focus_areas}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-emerald-600">
                  {formatCurrency(investor.total_invested || 0)}
                </p>
                <p className="text-xs text-slate-500">
                  {investor.investment_count || 0} investment{(investor.investment_count || 0) !== 1 ? 's' : ''}
                </p>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setSelectedInvestor(investor)
                    setShowInvestmentModal(true)
                  }}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-3 py-1.5 text-sm"
                >
                  New Investment
                </button>
                <button
                  onClick={() => setSelectedInvestor(investor)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteInvestor(investor.id)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const CampaignCard = ({ campaign }) => {
    const progressPercentage = campaign.goal_amount 
      ? (campaign.raised_amount / campaign.goal_amount) * 100
      : 0

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all duration-300"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">{campaign.title}</h3>
            <p className="text-sm text-slate-600 capitalize">{campaign.platform}</p>
            {campaign.project && (
              <p className="text-xs text-slate-500">{campaign.project.name}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
              campaign.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
              campaign.status === 'completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
              'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              {campaign.status}
            </span>
            <button
              onClick={() => {}}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600">Progress</span>
              <span className="font-medium text-slate-900">{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-lg h-8 overflow-hidden">
              <div 
                className="bg-emerald-500 h-8 rounded-lg transition-all duration-700 ease-out"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>{formatCurrency(campaign.raised_amount)}</span>
              <span>{formatCurrency(campaign.goal_amount)}</span>
            </div>
          </div>

          <p className="text-sm text-slate-600">
            {campaign.supporter_count} supporter{campaign.supporter_count !== 1 ? 's' : ''}
          </p>

          <div className="flex items-center justify-between">
            <a
              href={campaign.campaign_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors px-3 py-2 text-sm flex items-center space-x-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View Campaign</span>
            </a>
          </div>

          {campaign.last_sync && (
            <p className="text-xs text-slate-500">
              Last sync: {new Date(campaign.last_sync).toLocaleDateString()}
            </p>
          )}
        </div>
      </motion.div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Donor Management</h1>
          <p className="text-sm text-slate-600">Track donors, donations, and crowdfunding campaigns</p>
        </div>
        <button
          onClick={refreshStats}
          className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors px-4 py-2.5 flex items-center space-x-2"
          title="Refresh all donor statistics"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Stats</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <ModernStatCard
          icon={Users}
          title="Total Donors"
          value={stats.totalDonors || 0}
          subtitle={`${stats.majorDonors || 0} major donors`}
          color="emerald"
        />
        <ModernStatCard
          icon={DollarSign}
          title="Total Raised"
          value={formatCurrency(stats.totalRaised)}
          subtitle={`${formatCurrency(stats.thisYearRaised)} this year`}
          color="emerald"
        />
        <ModernStatCard
          icon={Heart}
          title="Total Donations"
          value={stats.totalDonations || 0}
          subtitle={`${formatCurrency(stats.avgDonationAmount)} average`}
          color="red"
        />
        <ModernStatCard
          icon={Star}
          title="Major Donors"
          value={stats.majorDonors || 0}
          subtitle="$1,000+ lifetime"
          color="amber"
        />
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <nav className="flex space-x-1 bg-slate-100 rounded-lg p-1 max-w-fit">
          {[
            { id: 'donors', label: 'Donors', icon: Users },
            { id: 'investors', label: 'Investors', icon: TrendingUp },
            { id: 'campaigns', label: 'Campaigns', icon: Heart },
            { id: 'donations', label: 'Donations', icon: DollarSign }
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-md font-medium text-sm transition-all duration-200 whitespace-nowrap ${
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

      {/* Content */}
      {activeTab === 'donors' && (
        <div className="space-y-6">
          {/* Search and Actions */}
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search donors..."
                  className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm flex items-center space-x-2">
                <Upload className="w-4 h-4" />
                <span>Import</span>
              </button>
              <button className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              <button
                onClick={() => {
                  setModalType('donor')
                  setShowCreateModal(true)
                }}
                className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Donor</span>
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
              <div className="mx-auto w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No donors yet</h3>
              <p className="text-slate-600 mb-6">Get started by adding your first donor.</p>
              <button
                onClick={() => {
                  setModalType('donor')
                  setShowCreateModal(true)
                }}
                className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 py-2.5"
              >
                Add First Donor
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'investors' && (
        <div className="space-y-6">
          {/* Search and Actions */}
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search investors..."
                  className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm flex items-center space-x-2">
                <Upload className="w-4 h-4" />
                <span>Import</span>
              </button>
              <button className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              <button
                onClick={() => {
                  setModalType('investor')
                  setShowCreateModal(true)
                }}
                className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Investor</span>
              </button>
            </div>
          </div>

          {/* Investors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {investors.map(investor => (
              <InvestorCard key={investor.id} investor={investor} />
            ))}
          </div>

          {investors.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No investors yet</h3>
              <p className="text-slate-600 mb-6">Connect with individual investors interested in your projects.</p>
              <button
                onClick={() => {
                  setModalType('investor')
                  setShowCreateModal(true)
                }}
                className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 py-2.5"
              >
                Add First Investor
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          {/* Campaign Controls */}
          <div className="flex justify-between">
            <button
              onClick={() => setShowCampaignModal(true)}
              className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Link Campaign</span>
            </button>
          </div>

          {/* Campaigns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map(campaign => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>

          {campaigns.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No campaigns yet</h3>
              <p className="text-slate-600 mb-6">Connect your crowdfunding campaigns to track progress.</p>
              <button
                onClick={() => setShowCampaignModal(true)}
                className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 py-2.5"
              >
                Link First Campaign
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search donations..."
                  className="pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-md text-sm w-64 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              
              <select className="bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                <option value="">All Projects</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex space-x-3">
              <button className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              <button
                onClick={() => setShowDonationModal(true)}
                className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Record Donation</span>
              </button>
            </div>
          </div>

          {/* Donations Table */}
          {donations.length > 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Donor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {donations.map((donation) => (
                    <tr key={donation.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {donation.donor?.name?.charAt(0)?.toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-slate-900">
                              {donation.donor?.name || 'Unknown Donor'}
                            </div>
                            <div className="text-sm text-slate-500">
                              {donation.donor?.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-emerald-600">
                          {formatCurrency(donation.amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {new Date(donation.donation_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {donation.project?.name || 'General'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                          {donation.payment_method?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => {
                            setSelectedDonation(donation)
                            setShowDonationDetailModal(true)
                          }}
                          className="text-slate-600 hover:text-slate-900"
                        >
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
              <div className="mx-auto w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No donations yet</h3>
              <p className="text-slate-600 mb-6">Start recording donations to track your fundraising progress.</p>
              <button
                onClick={() => setShowDonationModal(true)}
                className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 py-2.5"
              >
                Record First Donation
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateDonorModal
          modalType={modalType}
          onClose={() => setShowCreateModal(false)}
          onSubmit={modalType === 'investor' ? handleCreateInvestor : handleCreateDonor}
        />
      )}

      {showEditModal && (
        <EditDonorModal
          donor={editingDonor}
          onClose={() => {
            setShowEditModal(false)
            setEditingDonor(null)
          }}
          onSubmit={handleUpdateDonor}
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

      {showInvestmentModal && selectedInvestor && (
        <RecordInvestmentModal
          investor={selectedInvestor}
          onClose={() => {
            setShowInvestmentModal(false)
            setSelectedInvestor(null)
          }}
        />
      )}

      {showDonationDetailModal && selectedDonation && (
        <DonationDetailModal
          donation={selectedDonation}
          onClose={() => {
            setShowDonationDetailModal(false)
            setSelectedDonation(null)
          }}
        />
      )}
    </div>
  )
}

// Modal Components
function CreateDonorModal({ modalType, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address_line1: '',
    city: '',
    state: '',
    zip_code: '',
    donor_type: modalType === 'investor' ? 'individual' : 'individual',
    notes: '',
    tags: [],
    // Investor-specific fields
    type: modalType === 'investor' ? 'individual' : null,
    focus_areas: '',
    website: '',
    linkedin: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const isInvestor = modalType === 'investor'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl max-w-md w-full"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {isInvestor ? 'Add New Investor' : 'Add New Donor'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Name *</label>
              <input
                type="text"
                className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Phone</label>
                <input
                  type="tel"
                  className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>

            {isInvestor ? (
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Investor Type</label>
                <select
                  className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                  <option value="individual">Individual Investor</option>
                  <option value="angel">Angel Investor</option>
                  <option value="venture_capital">Venture Capital Firm</option>
                  <option value="family_office">Family Office</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Type</label>
                <select
                  className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  value={formData.donor_type}
                  onChange={(e) => setFormData({...formData, donor_type: e.target.value})}
                >
                  <option value="individual">Individual</option>
                  <option value="foundation">Foundation</option>
                  <option value="corporation">Corporation</option>
                  <option value="government">Government</option>
                </select>
              </div>
            )}

            {isInvestor && (
              <>
                <div>
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Focus Areas</label>
                  <input
                    type="text"
                    className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="e.g., Healthcare, Technology, Education"
                    value={formData.focus_areas}
                    onChange={(e) => setFormData({...formData, focus_areas: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Website</label>
                    <input
                      type="url"
                      className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="https://..."
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">LinkedIn</label>
                    <input
                      type="url"
                      className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="https://linkedin.com/in/..."
                      value={formData.linkedin}
                      onChange={(e) => setFormData({...formData, linkedin: e.target.value})}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Address</label>
              <input
                type="text"
                className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Street address"
                value={formData.address_line1}
                onChange={(e) => setFormData({...formData, address_line1: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <input
                  type="text"
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                />
              </div>
              <div>
                <input
                  type="text"
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="State"
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                />
              </div>
              <div>
                <input
                  type="text"
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="ZIP"
                  value={formData.zip_code}
                  onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Notes</label>
              <textarea
                className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                rows="3"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder={`Additional notes about this ${isInvestor ? 'investor' : 'donor'}...`}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button 
                type="button" 
                onClick={onClose} 
                className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm"
              >
                Add {isInvestor ? 'Investor' : 'Donor'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

// Edit Donor Modal
function EditDonorModal({ donor, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: donor?.name || '',
    email: donor?.email || '',
    phone: donor?.phone || '',
    address_line1: donor?.address_line1 || '',
    city: donor?.city || '',
    state: donor?.state || '',
    zip_code: donor?.zip_code || '',
    donor_type: donor?.donor_type || 'individual',
    notes: donor?.notes || '',
    tags: donor?.tags || []
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
        className="bg-white rounded-xl shadow-xl max-w-md w-full"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Edit Donor</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <input
                type="text"
                value={formData.address_line1}
                onChange={(e) => setFormData({...formData, address_line1: e.target.value})}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Street address"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ZIP Code</label>
              <input
                type="text"
                value={formData.zip_code}
                onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Donor Type</label>
              <select
                value={formData.donor_type}
                onChange={(e) => setFormData({...formData, donor_type: e.target.value})}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="individual">Individual</option>
                <option value="corporate">Corporate</option>
                <option value="foundation">Foundation</option>
                <option value="government">Government</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                rows="3"
                placeholder="Additional notes about this donor..."
              />
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button 
                type="button" 
                onClick={onClose} 
                className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm"
              >
                Update Donor
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
      net_amount: parseFloat(formData.amount)
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl max-w-md w-full"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Record Donation</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Donor *</label>
              <select
                className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Project</label>
              <select
                className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Amount *</label>
                <input
                  type="number"
                  className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Date *</label>
                <input
                  type="date"
                  className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  value={formData.donation_date}
                  onChange={(e) => setFormData({...formData, donation_date: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Payment Method</label>
              <select
                className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Platform</label>
                <select
                  className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Notes</label>
              <textarea
                className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                rows="3"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional notes about this donation..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button 
                type="button" 
                onClick={onClose} 
                className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm"
              >
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
        className="bg-white rounded-xl shadow-xl max-w-md w-full"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Link Campaign</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Campaign Title *</label>
              <input
                type="text"
                className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Platform *</label>
              <select
                className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Campaign URL *</label>
              <input
                type="url"
                className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={formData.campaign_url}
                onChange={(e) => setFormData({...formData, campaign_url: e.target.value})}
                placeholder="https://..."
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Associated Project</label>
              <select
                className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Goal Amount</label>
              <input
                type="number"
                className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={formData.goal_amount}
                onChange={(e) => setFormData({...formData, goal_amount: e.target.value})}
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Description</label>
              <textarea
                className="w-full mt-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description of the campaign..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button 
                type="button" 
                onClick={onClose} 
                className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm"
              >
                Link Campaign
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

function DonationDetailModal({ donation, onClose }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl max-w-md w-full"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Donation Details</h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Donor Info */}
            <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg">
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {donation.donor?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <h4 className="font-medium text-slate-900">
                  {donation.donor?.name || 'Unknown Donor'}
                </h4>
                <p className="text-sm text-slate-600">
                  {donation.donor?.email || 'No email provided'}
                </p>
                <p className="text-xs text-slate-500 capitalize">
                  {donation.donor?.donor_type || 'Individual'}
                </p>
              </div>
            </div>

            {/* Donation Amount */}
            <div className="text-center py-4">
              <p className="text-3xl font-bold text-emerald-600">
                {formatCurrency(donation.amount)}
              </p>
              <p className="text-sm text-slate-500">Donation Amount</p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Date</label>
                <p className="text-sm text-slate-900">
                  {new Date(donation.donation_date).toLocaleDateString()}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700">Payment Method</label>
                <p className="text-sm text-slate-900 capitalize">
                  {donation.payment_method?.replace('_', ' ') || 'Not specified'}
                </p>
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium text-slate-700">Project</label>
                <p className="text-sm text-slate-900">
                  {donation.project?.name || 'General Donation'}
                </p>
              </div>

              {donation.external_platform && (
                <div className="col-span-2">
                  <label className="text-sm font-medium text-slate-700">Platform</label>
                  <p className="text-sm text-slate-900 capitalize">
                    {donation.external_platform}
                  </p>
                </div>
              )}

              {donation.notes && (
                <div className="col-span-2">
                  <label className="text-sm font-medium text-slate-700">Notes</label>
                  <p className="text-sm text-slate-900">
                    {donation.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Timestamps */}
            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                Created: {new Date(donation.created_at).toLocaleString()}
              </p>
              {donation.updated_at && donation.updated_at !== donation.created_at && (
                <p className="text-xs text-slate-500">
                  Updated: {new Date(donation.updated_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button 
              onClick={onClose} 
              className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 py-2.5 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// Record Investment Modal Component
const RecordInvestmentModal = ({ investor, onClose }) => {
  const [formData, setFormData] = useState({
    amount: '',
    investment_date: new Date().toISOString().split('T')[0],
    investment_type: 'equity',
    notes: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    toast.success(`Investment of $${parseFloat(formData.amount).toLocaleString()} from ${investor.name} recorded!`, {
      duration: 3000
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl max-w-md w-full"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Record Investment</h2>
              <p className="text-sm text-slate-600 mt-1">From: {investor.name}</p>
            </div>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Investment Amount *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Investment Date *
              </label>
              <input
                type="date"
                required
                value={formData.investment_date}
                onChange={(e) => setFormData({ ...formData, investment_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Investment Type
              </label>
              <select
                value={formData.investment_type}
                onChange={(e) => setFormData({ ...formData, investment_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="equity">Equity</option>
                <option value="convertible_note">Convertible Note</option>
                <option value="safe">SAFE</option>
                <option value="grant">Grant</option>
                <option value="loan">Loan</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Add any additional details..."
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-medium transition-colors"
              >
                Record Investment
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
