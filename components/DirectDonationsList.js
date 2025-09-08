'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, Search, Plus, Users, Heart, ArrowUpRight } from 'lucide-react'
import StatCard from './ui/StatCard'
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
    <div className="p-6 bg-neutral-50 rounded-2xl">
      <div className="mb-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-brand-50 rounded-lg">
                <DollarSign className="w-5 h-5 text-brand-600" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Direct Donations</h2>
            </div>
            <p className="text-sm text-neutral-600 ml-0 md:ml-11">One-time and recurring donations from supporters</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                className="pl-10 pr-3 py-2.5 rounded-md bg-white border border-neutral-200 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder-neutral-400"
                placeholder="Search donations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowAddDonation(true)}
              className="inline-flex items-center px-4 py-2.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Record Donation
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={DollarSign}
            iconColor="text-brand-600"
            iconBg="bg-brand-50"
            label="Total Donated"
            value={`$${(stats.totalAmount || 0).toLocaleString()}`}
          />
          <StatCard
            icon={Users}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
            label="Donors"
            value={stats.donors}
          />
          <StatCard
            icon={Heart}
            iconColor="text-pink-600"
            iconBg="bg-pink-50"
            label="Donations"
            value={stats.totalDonations}
          />
            <StatCard
              icon={ArrowUpRight}
              iconColor="text-amber-600"
              iconBg="bg-amber-50"
              label="Avg Donation"
              value={`$${(stats.avgDonation || 0).toLocaleString()}`}
            />
        </div>
      </div>

      {/* Donation List */}
      <div className="space-y-6">
        {filteredDonations.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6 text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              {donations.length === 0 ? 'No donations yet' : 'No donations found'}
            </h3>
            <p className="text-neutral-500 mb-6 text-sm max-w-md mx-auto">
              {donations.length === 0
                ? 'Record donations you receive from supporters manually to build your donor history.'
                : 'Try adjusting your search terms or clearing the filter.'}
            </p>
            {donations.length === 0 && (
              <button
                onClick={() => setShowAddDonation(true)}
                className="inline-flex items-center px-4 py-2.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Record Your First Donation
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-500 uppercase text-[11px] tracking-wide">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Donor</th>
                  <th className="px-6 py-3 text-left font-medium">Amount</th>
                  <th className="px-6 py-3 text-left font-medium">Date</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredDonations.map((donation, index) => (
                  <motion.tr
                    key={donation.id || index}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.02 }}
                    className="hover:bg-neutral-50 transition-colors"
                  >
                    <td className="px-6 py-4 align-top">
                      <div className="space-y-1">
                        <p className="font-medium text-neutral-900 leading-tight">{donation.donor_name || donation.donor?.name || 'Anonymous'}</p>
                        {donation.note && (
                          <p className="text-xs text-neutral-500 line-clamp-1">{donation.note}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <span className="font-semibold text-emerald-600">${donation.amount?.toLocaleString() || '0'}</span>
                    </td>
                    <td className="px-6 py-4 align-top text-neutral-500">
                      {donation.date ? new Date(donation.date).toLocaleDateString() : (donation.created_at ? new Date(donation.created_at).toLocaleDateString() : '-')}
                    </td>
                    <td className="px-6 py-4 align-top text-right">
                      <button className="text-brand-600 hover:text-brand-700 text-xs font-medium transition-colors">View</button>
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
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-medium uppercase tracking-wide text-neutral-600">Donor</label>
            {!creatingNewDonor && (
              <div className="flex gap-2">
                <select
                  className="flex-1 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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
                  className="px-3 py-2 rounded-md bg-neutral-100 text-neutral-700 text-xs font-medium hover:bg-neutral-200 transition-colors"
                >New</button>
              </div>
            )}
            {creatingNewDonor && (
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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
                  className="px-3 py-2 rounded-md bg-neutral-100 text-neutral-700 text-xs font-medium hover:bg-neutral-200 transition-colors"
                >Cancel</button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-wide text-neutral-600">Amount ($)</label>
              <input
                type="number"
                required
                min="1"
                className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-wide text-neutral-600">Date</label>
              <input
                type="date"
                className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
            </div>
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
              <label className="block text-xs font-medium uppercase tracking-wide text-neutral-600">Note (optional)</label>
              <textarea
                rows={3}
                className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
                value={formData.note}
                onChange={(e) => setFormData({...formData, note: e.target.value})}
                placeholder="Add a note about this donation"
              />
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
              className="px-4 py-2.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Record Donation'}
            </button>
          </div>
        </form>
    </ModalShell>
  )
}

// Local StatCard removed in favor of shared ui/StatCard
