'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  DollarSign, 
  Search, 
  Plus, 
  Users, 
  Heart,
  ArrowUpRight,
  Calendar,
  Filter,
  CheckCircle
} from 'lucide-react'
import { directUserServices } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function DirectDonationsList({ user, userProfile, projects = [] }) {
  const [donations, setDonations] = useState([])
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
      const [donationData, donationStats] = await Promise.all([
        directUserServices.donors?.getDonations(user.id) || Promise.resolve([]),
        directUserServices.donors?.getDonationStats(user.id) || Promise.resolve({
          totalDonations: 0,
          totalAmount: 0,
          avgDonation: 0,
          donors: 0
        })
      ])

      setDonations(donationData)
      setStats(donationStats)
    } catch (error) {
      console.error('Error loading donations:', error)
      toast.error('Failed to load donations')
    } finally {
      setLoading(false)
    }
  }

  const filteredDonations = donations.filter(donation =>
    donation.donor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    donation.note?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
              <DollarSign className="w-6 h-6 mr-3 text-green-600" />
              Direct Donations
            </h2>
            <p className="text-gray-600 mt-1">
              One-time and recurring donations from supporters
            </p>
          </div>
          <button
            onClick={() => setShowAddDonation(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Record Donation
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Donated</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${stats.totalAmount?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>
          
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Donors</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.donors}</p>
                </div>
              </div>
            </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg mr-3">
                <Heart className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Donations</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalDonations}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg mr-3">
                <ArrowUpRight className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Donation</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${stats.avgDonation?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search donations..."
            className="form-input pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Donation List */}
      {filteredDonations.length === 0 ? (
        <div className="text-center py-12">
          <DollarSign className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {donations.length === 0 ? 'No donations yet' : 'No donations found'}
          </h3>
          <p className="text-gray-600 mb-6">
            {donations.length === 0 
              ? 'Record donations you receive from supporters manually'
              : 'Try adjusting your search terms'
            }
          </p>
          {donations.length === 0 && (
            <button
              onClick={() => setShowAddDonation(true)}
              className="btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Record Your First Donation
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Donor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDonations.map((donation, index) => (
                <motion.tr
                  key={donation.id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {donation.donor_name || 'Anonymous'}
                      </p>
                      {donation.note && (
                        <p className="text-xs text-gray-500 line-clamp-1">{donation.note}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-green-600">
                      ${donation.amount?.toLocaleString() || '0'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {donation.date ? new Date(donation.date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-green-600 hover:text-green-900 text-xs">
                      View
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Donation Modal */}
      {showAddDonation && (
        <AddDonationModal
          user={user}
          onClose={() => setShowAddDonation(false)}
          onDonationRecorded={(newDonation) => {
            setDonations([newDonation, ...donations])
            setShowAddDonation(false)
            loadDonations() // Refresh stats
            toast.success('Donation recorded!')
          }}
          projects={projects}
        />
      )}
    </div>
  )
}

function AddDonationModal({ user, onClose, onDonationRecorded, projects }) {
  const [formData, setFormData] = useState({
    donor_name: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
    project_id: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const newDonation = {
        id: Date.now(),
        ...formData,
        amount: parseFloat(formData.amount) || 0,
        created_at: new Date().toISOString(),
        user_id: user.id
      }

      onDonationRecorded(newDonation)
    } catch (error) {
      console.error('Error recording donation:', error)
      toast.error('Failed to record donation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Record Donation</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Donor Name
            </label>
            <input
              type="text"
              className="form-input"
              value={formData.donor_name}
              onChange={(e) => setFormData({...formData, donor_name: e.target.value})}
              placeholder="Anonymous"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount ($)
            </label>
            <input
              type="number"
              required
              min="1"
              className="form-input"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              className="form-input"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
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
              Note (optional)
            </label>
            <textarea
              className="form-input"
              rows={3}
              value={formData.note}
              onChange={(e) => setFormData({...formData, note: e.target.value})}
              placeholder="Add a note about this donation"
            />
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
              {loading ? 'Saving...' : 'Record Donation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
