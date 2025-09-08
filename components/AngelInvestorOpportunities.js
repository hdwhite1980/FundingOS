'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  Search, 
  Target, 
  DollarSign, 
  AlertCircle,
  TrendingUp,
  Building2,
  Filter,
  Sparkles,
  Info
} from 'lucide-react'
import { angelInvestorServices } from '../lib/supabase'
import toast from 'react-hot-toast'

// This component shows opportunities CREATED by angel investors that companies can browse
// It's a different view than the angel investor's own management dashboard
export default function AngelInvestorOpportunities({ user, userProfile, selectedProject }) {
  const [opportunities, setOpportunities] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStage, setFilterStage] = useState('all')
  const [filterInvestmentType, setFilterInvestmentType] = useState('all')

  useEffect(() => {
    loadAngelOpportunities()
  }, [searchQuery, filterStage, filterInvestmentType])

  const loadAngelOpportunities = async () => {
    try {
      setLoading(true)
      // Basic placeholder fetch until backend service implemented
      let investorOpps = []
      if (angelInvestorServices?.public?.getActiveOpportunities) {
        investorOpps = await angelInvestorServices.public.getActiveOpportunities({
          stage: filterStage !== 'all' ? filterStage : undefined,
          investmentType: filterInvestmentType !== 'all' ? filterInvestmentType : undefined
        })
      } else {
        // Fallback placeholder data
        investorOpps = [
          {
            id: 'angel-1',
            title: 'Seed Capital for Early-Stage Climate Tech',
            investor_name: 'Green Horizon Angels',
            min_investment: 25000,
            max_investment: 100000,
            preferred_industries: ['clean energy', 'sustainability'],
            preferred_stages: ['concept', 'prototype'],
            description: 'Looking to fund early-stage climate technology startups focused on carbon reduction and sustainable energy systems.',
            location_focus: 'Nationwide',
            active: true,
            created_at: new Date().toISOString()
          },
          {
            id: 'angel-2',
            title: 'Diversity-Focused Healthcare Innovation Fund',
            investor_name: 'Equity Impact Investors',
            min_investment: 50000,
            max_investment: 250000,
            preferred_industries: ['healthcare', 'biotech'],
            preferred_stages: ['prototype', 'market'],
            description: 'Seeking companies led by diverse founders addressing healthcare access and health equity challenges.',
            location_focus: 'US Only',
            active: true,
            created_at: new Date().toISOString()
          }
        ]
      }

      setOpportunities(investorOpps)
    } catch (error) {
      console.error('Error loading angel investor opportunities:', error)
      toast.error('Failed to load investor opportunities')
    } finally {
      setLoading(false)
    }
  }

  const filteredOpportunities = opportunities.filter(opp =>
    opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opp.investor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opp.description?.toLowerCase().includes(searchQuery.toLowerCase())
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
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Users className="w-6 h-6 mr-3 text-indigo-600" />
              Angel Investor Opportunities
            </h2>
            <p className="text-gray-600 mt-1">
              Investment offers posted by angel investors for qualifying companies
            </p>
          </div>
          {selectedProject && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-700">
              Matching for: <span className="font-medium">{selectedProject.name}</span>
            </div>
          )}
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search investor opportunities..."
              className="form-input pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="form-input w-full md:w-56"
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
          >
            <option value="all">All Stages</option>
            <option value="concept">Concept</option>
            <option value="prototype">Prototype</option>
            <option value="market">Market</option>
            <option value="growth">Growth</option>
          </select>
          <select
            className="form-input w-full md:w-56"
            value={filterInvestmentType}
            onChange={(e) => setFilterInvestmentType(e.target.value)}
          >
            <option value="all">All Investment Types</option>
            <option value="equity">Equity</option>
            <option value="debt">Debt</option>
            <option value="convertible">Convertible Note</option>
            <option value="SAFE">SAFE</option>
          </select>
        </div>
      </div>

      {/* Opportunities */}
      {filteredOpportunities.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No investor opportunities found
          </h3>
          <p className="text-gray-600">
            Try adjusting your search or check back later for new investment offers.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOpportunities.map((opp, index) => (
            <motion.div
              key={opp.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow p-6 flex flex-col"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center">
                    {opp.title}
                  </h3>
                  <p className="text-sm text-indigo-600 font-medium mb-1">
                    {opp.investor_name}
                  </p>
                  {opp.description && (
                    <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                      {opp.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3 mb-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Investment Range</span>
                  <span className="font-medium text-gray-900">
                    ${opp.min_investment?.toLocaleString()} - ${opp.max_investment?.toLocaleString()}
                  </span>
                </div>
                {opp.preferred_industries && (
                  <div>
                    <span className="text-gray-600 block mb-1">Preferred Industries</span>
                    <div className="flex flex-wrap gap-2">
                      {opp.preferred_industries.slice(0, 3).map((ind, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs"
                        >
                          {ind}
                        </span>
                      ))}
                      {opp.preferred_industries.length > 3 && (
                        <span className="px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs">
                          +{opp.preferred_industries.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {opp.preferred_stages && (
                  <div>
                    <span className="text-gray-600 block mb-1">Preferred Stages</span>
                    <div className="flex flex-wrap gap-2">
                      {opp.preferred_stages.map((stage, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs"
                        >
                          {stage}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {opp.location_focus && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Location Focus</span>
                    <span className="font-medium text-gray-900">{opp.location_focus}</span>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
                <button
                  className="btn-outline text-sm"
                  onClick={() => toast.success('Interest expressed (placeholder)')}
                >
                  Express Interest
                </button>
                <span className="text-xs text-gray-500">
                  Posted {new Date(opp.created_at).toLocaleDateString()}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm flex items-start">
        <Info className="w-5 h-5 text-indigo-500 mr-3 mt-0.5" />
        <div className="text-indigo-800">
          This is a read-only directory of current angel investor opportunities. Investors post offers in their own dashboard. You can filter, search, and express interest in opportunities that match your project profile.
        </div>
      </div>
    </div>
  )
}
