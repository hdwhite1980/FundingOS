'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, Search, Plus, Users, Heart, ArrowUpRight } from 'lucide-react'
import ModalShell from './ui/ModalShell'
import { directUserServices } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function DirectDonationsList({ user, userProfile, projects = [] }) {
  const [donations, setDonations] = useState([])
  const [donors, setDonors] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddDonation, setShowAddDonation] = useState(false)
  const [stats, setStats] = useState({
    totalDonations: 0,
    totalAmount: 0,
    avgDonation: 0,
    donors: 0
  })

  useEffect(() => {
    if (user) {
      loadDonations()
    }
  }, [user, searchQuery])

  const loadDonations = async () => {
    try {
      setLoading(true)
      const [donationData, donorStats, donorList] = await Promise.all([
        directUserServices.donors?.getDonations(user.id) || Promise.resolve([]),
        directUserServices.donors?.getDonorStats ? directUserServices.donors.getDonorStats(user.id) : Promise.resolve(null),
        directUserServices.donors?.getDonors ? directUserServices.donors.getDonors(user.id) : Promise.resolve([])
      ])

      // Normalize donation records to ensure donor_name and date fields exist for UI filtering
      const normalized = (donationData || []).map(d => ({
        ...d,
        donor_name: d.donor_name || d.donor?.name || d.donor?.email || 'Anonymous',
        date: d.donation_date || d.created_at || d.date,
      }))
      setDonations(normalized)
      setDonors(donorList || [])

      if (donorStats) {
        setStats({
          totalDonations: donorStats.totalDonations || donationData.length,
          totalAmount: donorStats.totalRaised || donationData.reduce((s, d) => s + (d.amount || 0), 0),
          avgDonation: donorStats.avgDonationAmount || (donationData.length > 0 ? Math.round(donationData.reduce((s, d) => s + (d.amount || 0), 0) / donationData.length) : 0),
          donors: donorStats.totalDonors || 0
        })
      } else {
        // Local fallback
        const totalDonations = donationData.length
        const totalAmount = donationData.reduce((sum, d) => sum + (d.amount || 0), 0)
        const avgDonation = totalDonations > 0 ? Math.round(totalAmount / totalDonations) : 0
        const donorsCount = [...new Set(donationData.map(d => d.donor_id).filter(Boolean))].length
        setStats({ totalDonations, totalAmount, avgDonation, donors: donorsCount })
      }
    } catch (error) {
      console.error('Error loading donations:', error)
      toast.error('Failed to load donations')
    } finally {
      setLoading(false)
    }
  }

  const ensureDonor = async (name) => {
    if (!name) return null
    const existing = donors.find(d => d.name?.toLowerCase() === name.toLowerCase())
    if (existing) return existing.id
    try {
      if (!directUserServices.donors?.createDonor) return null
      const newDonor = await directUserServices.donors.createDonor(user.id, { name })
      if (newDonor) {
        setDonors([newDonor, ...donors])
        return newDonor.id
      }
    } catch (e) {
      console.error('ensureDonor error:', e)
    }
    return null
  }

  const filteredDonations = donations.filter(donation => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      donation.donor_name?.toLowerCase().includes(q) ||
      donation.note?.toLowerCase().includes(q) ||
      donation.project?.name?.toLowerCase().includes(q)
    )
  })

  // Modern StatCard component following design system
  const ModernStatCard = ({ icon: Icon, label, value, iconColor = "text-emerald-600", iconBg = "bg-emerald-50" }) => (
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Direct Donations</h2>
          </div>
          <p className="text-sm text-slate-600">One-time and recurring donations from supporters</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="pl-10 pr-3 py-2 rounded-md bg-white border border-slate-200 text-sm w-64 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder-slate-400"
              placeholder="Search donations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowAddDonation(true)}
            className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 py-2 text-sm flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Record Donation</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <ModernStatCard
          icon={DollarSign}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          label="Total Donated"
          value={`$${(stats.totalAmount || 0).toLocaleString()}`}
        />
        <ModernStatCard
          icon={Users}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          label="Donors"
          value={stats.donors}
        />
        <ModernStatCard
          icon={Heart}
          iconColor="text-red-600"
          iconBg="bg-red-50"
          label="Donations"
          value={stats.totalDonations}
        />
        <ModernStatCard
          icon={ArrowUpRight}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          label="Avg Donation"
          value={`$${(stats.avgDonation || 0).toLocaleString()}`}
        />
      </div>

      {/* Donation List */}
      <div className="space-y-6">
        {filteredDonations.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {donations.length === 0 ? 'No donations yet' : 'No donations found'}
            </h3>
            <p className="text-slate-600 mb-6 text-sm max-w-md mx-auto">
              {donations.length === 0
                ? 'Record donations you receive from supporters manually to build your donor history.'
                : 'Try adjusting your search terms or clearing the filter.'}
            </p>
            {donations.length === 0 && (
              <button
                onClick={() => setShowAddDonation(true)}
                className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium transition-colors px-4 py-2.5 flex items-center space-x-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Record Your First Donation</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-medium tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Donor</th>
                  <th className="px-6 py-3 text-left">Amount</th>
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDonations.map((donation, index) => (
                  <motion.tr
                    key={donation.id || index}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.02 }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 align-top">
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900 leading-tight">{donation.donor_name || donation.donor?.name || 'Anonymous'}</p>
                        {donation.note && (
                          <p className="text-xs text-slate-500 line-clamp-1">{donation.note}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <span className="font-bold text-emerald-600">${donation.amount?.toLocaleString() || '0'}</span>
                    </td>
                    <td className="px-6 py-4 align-top text-slate-500">
                      {donation.date ? new Date(donation.date).toLocaleDateString() : (donation.created_at ? new Date(donation.created_at).toLocaleDateString() : '-')}
                    </td>
                    <td className="px-6 py-4 align-top text-right">
                      <button className="text-emerald-600 hover:text-emerald-700 text-xs font-medium transition-colors">View</button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddDonation && (
        <AddDonationModal
          user={user}
          donors={donors}
          onClose={() => setShowAddDonation(false)}
          onDonationRecorded={(newDonation) => {
            setDonations([newDonation, ...donations])
            setShowAddDonation(false)
            loadDonations()
            toast.success('Donation recorded!')
          }}
          projects={projects}
          ensureDonor={ensureDonor}
        />
      )}
    </div>
  )
}

function AddDonationModal({ user, donors = [], ensureDonor, onClose, onDonationRecorded, projects }) {
  const [formData, setFormData] = useState({
    donor_name: '',
    donor_id: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
    project_id: ''
  })
  const [loading, setLoading] = useState(false)
  const [creatingNewDonor, setCreatingNewDonor] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      let donorId = formData.donor_id
      if (!donorId && formData.donor_name) {
        donorId = await ensureDonor?.(formData.donor_name)
      }

      const payload = {
        amount: parseFloat(formData.amount) || 0,
        donation_date: formData.date,
        note: formData.note || null,
        project_id: formData.project_id || null,
        donor_id: donorId || null
      }

      let created = null
      if (directUserServices.donors?.createDonation) {
        created = await directUserServices.donors.createDonation(user.id, payload)
      }

      if (!created) {
        toast.error('Failed to record donation')
      } else {
        onDonationRecorded(created)
      }
    } catch (error) {
      console.error('Error recording donation:', error)
      toast.error('Failed to record donation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalShell title="Record Donation" subtitle="Add a new direct contribution" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Donor</label>
          {!creatingNewDonor && (
            <div className="flex gap-2">
              <select
                className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={formData.donor_id}
                onChange={(e) => setFormData({...formData, donor_id: e.target.value})}
              >
                <option value="">Select existing donor</option>
                {donors.map(d => (
                  <option key={d.id} value={d.id}>{d.name || 'Unnamed Donor'}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setCreatingNewDonor(true)}
                className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md font-medium transition-colors px-3 py-2 text-xs"
              >New</button>
            </div>
          )}
          {creatingNewDonor && (
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={formData.donor_name}
                onChange={(e) => setFormData({...formData, donor_name: e.target.value})}
                placeholder="Enter donor name"
              />
              <button
                type="button"
                onClick={() => {
                  setCreatingNewDonor(false)
                  setFormData(f => ({ ...f, donor_name: '', donor_id: '' }))
                }}
                className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md font-medium transition-colors px-3 py-2 text-xs"
              >Cancel</button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Amount ($)</label>
            <input
              type="number"
              required
              min="1"
              className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Date</label>
            <input
              type="date"
              className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
            />
          </div>
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
          <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Note (optional)</label>
          <textarea
            rows={3}
            className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
            value={formData.note}
            onChange={(e) => setFormData({...formData, note: e.target.value})}
            placeholder="Add a note about this donation"
          />
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
            {loading ? 'Saving...' : 'Record Donation'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}