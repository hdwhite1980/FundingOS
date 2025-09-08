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
  Info,
  MapPin,
  Calendar,
  Heart,
  ExternalLink,
  Star,
  Clock
} from 'lucide-react'

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
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Enhanced placeholder data with more realistic content
      const investorOpps = [
        {
          id: 'angel-1',
          title: 'Seed Capital for Early-Stage Climate Tech',
          investor_name: 'Green Horizon Angels',
          investor_avatar: null,
          min_investment: 25000,
          max_investment: 100000,
          preferred_industries: ['Clean Energy', 'Sustainability', 'Carbon Tech'],
          preferred_stages: ['Concept', 'Prototype'],
          description: 'Looking to fund early-stage climate technology startups focused on carbon reduction and sustainable energy systems. We provide hands-on mentorship and industry connections.',
          location_focus: 'Nationwide',
          investment_type: 'Equity',
          active: true,
          match_score: 94,
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
          response_time: '2-3 days',
          investments_made: 23
        },
        {
          id: 'angel-2',
          title: 'Diversity-Focused Healthcare Innovation Fund',
          investor_name: 'Equity Impact Investors',
          investor_avatar: null,
          min_investment: 50000,
          max_investment: 250000,
          preferred_industries: ['Healthcare', 'Biotech', 'Digital Health'],
          preferred_stages: ['Prototype', 'Market Validation'],
          description: 'Seeking companies led by diverse founders addressing healthcare access and health equity challenges. Priority given to women and minority-led startups.',
          location_focus: 'US Only',
          investment_type: 'Convertible Note',
          active: true,
          match_score: 87,
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
          response_time: '1-2 weeks',
          investments_made: 15
        },
        {
          id: 'angel-3',
          title: 'Fintech Innovation Partnership',
          investor_name: 'Digital Finance Collective',
          investor_avatar: null,
          min_investment: 75000,
          max_investment: 500000,
          preferred_industries: ['Fintech', 'Blockchain', 'Digital Payments'],
          preferred_stages: ['Market Validation', 'Growth'],
          description: 'Strategic investment and partnership opportunities for fintech startups. We offer regulatory guidance and banking industry connections.',
          location_focus: 'Global',
          investment_type: 'SAFE',
          active: true,
          match_score: 72,
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
          response_time: '3-5 days',
          investments_made: 31
        },
        {
          id: 'angel-4',
          title: 'EdTech Transformation Fund',
          investor_name: 'Learning Future Partners',
          investor_avatar: null,
          min_investment: 30000,
          max_investment: 150000,
          preferred_industries: ['Education', 'EdTech', 'Training Platforms'],
          preferred_stages: ['Concept', 'Prototype', 'Market Validation'],
          description: 'Investment in educational technology companies that are transforming how people learn and develop skills.',
          location_focus: 'North America',
          investment_type: 'Equity',
          active: true,
          match_score: 81,
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
          response_time: '1 week',
          investments_made: 18
        }
      ]

      setOpportunities(investorOpps)
    } catch (error) {
      console.error('Error loading angel investor opportunities:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredOpportunities = opportunities.filter(opp =>
    opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opp.investor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opp.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Sort by match score if available
  const sortedOpportunities = filteredOpportunities.sort((a, b) => 
    (b.match_score || 0) - (a.match_score || 0)
  )

  const handleExpressInterest = (opportunityId) => {
    console.log('Expressing interest in opportunity:', opportunityId)
    // Simulate success
    alert('Interest expressed! The investor will be notified.')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="p-4 bg-emerald-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="w-8 h-8 text-emerald-600 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Loading Opportunities</h2>
              <p className="text-slate-600">Finding the best angel investor matches for you...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Angel Investor Opportunities</h1>
          <p className="text-lg text-slate-600">Discover investment offers from verified angel investors</p>
        </div>

        {/* Project Context & Stats */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center">
              <div className="p-2.5 bg-emerald-50 rounded-lg mr-4">
                <Target className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Active Investment Opportunities</h2>
                <p className="text-sm text-slate-600 mt-1">
                  {selectedProject ? (
                    <>Showing matches for <span className="font-medium text-emerald-600">{selectedProject.name}</span></>
                  ) : (
                    'Browse all available investment opportunities'
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">{opportunities.length}</div>
                <div className="text-xs text-slate-500">Total Opportunities</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">
                  {opportunities.filter(o => o.match_score >= 80).length}
                </div>
                <div className="text-xs text-slate-500">High Matches</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">
                  ${Math.max(...opportunities.map(o => o.max_investment)).toLocaleString()}
                </div>
                <div className="text-xs text-slate-500">Max Investment</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search investor opportunities..."
                className="w-full bg-white border border-slate-200 rounded-lg pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 lg:w-48"
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
            >
              <option value="all">All Stages</option>
              <option value="concept">Concept</option>
              <option value="prototype">Prototype</option>
              <option value="market">Market Validation</option>
              <option value="growth">Growth</option>
            </select>
            <select
              className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 lg:w-48"
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

        {/* Opportunities Grid */}
        {sortedOpportunities.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
            <div className="p-4 bg-slate-50 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No opportunities found</h3>
            <p className="text-slate-600 mb-6">
              Try adjusting your search criteria or check back later for new investment offers.
            </p>
            <button 
              onClick={() => {
                setSearchQuery('')
                setFilterStage('all')
                setFilterInvestmentType('all')
              }}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors duration-200"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedOpportunities.map((opp, index) => (
              <motion.div
                key={opp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="bg-white rounded-xl border border-slate-200 hover:shadow-lg hover:border-emerald-300 transition-all duration-300 overflow-hidden"
              >
                {/* Match Score Badge */}
                {opp.match_score && (
                  <div className="relative">
                    <div className={`absolute top-4 right-4 px-3 py-1 rounded-lg text-xs font-bold ${
                      opp.match_score >= 90 ? 'bg-emerald-100 text-emerald-800' :
                      opp.match_score >= 80 ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {opp.match_score}% Match
                    </div>
                  </div>
                )}

                <div className="p-6">
                  {/* Header */}
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900 mb-2 pr-16">
                      {opp.title}
                    </h3>
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                        <Users className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{opp.investor_name}</p>
                        <p className="text-xs text-slate-500">{opp.investments_made} investments made</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-3">
                      {opp.description}
                    </p>
                  </div>

                  {/* Investment Details */}
                  <div className="space-y-4 mb-6">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">Investment Range</span>
                        <span className="font-bold text-slate-900">
                          ${opp.min_investment?.toLocaleString()} - ${opp.max_investment?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">Type</span>
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium">
                          {opp.investment_type}
                        </span>
                      </div>
                    </div>

                    {/* Industries */}
                    {opp.preferred_industries && (
                      <div>
                        <span className="text-sm font-medium text-slate-700 block mb-2">Preferred Industries</span>
                        <div className="flex flex-wrap gap-2">
                          {opp.preferred_industries.slice(0, 3).map((industry, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium"
                            >
                              {industry}
                            </span>
                          ))}
                          {opp.preferred_industries.length > 3 && (
                            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                              +{opp.preferred_industries.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Stages */}
                    {opp.preferred_stages && (
                      <div>
                        <span className="text-sm font-medium text-slate-700 block mb-2">Preferred Stages</span>
                        <div className="flex flex-wrap gap-2">
                          {opp.preferred_stages.map((stage, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-700 text-xs font-medium"
                            >
                              {stage}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Additional Info */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-slate-600">
                        <MapPin className="w-4 h-4 mr-1" />
                        {opp.location_focus}
                      </div>
                      <div className="flex items-center text-slate-600">
                        <Clock className="w-4 h-4 mr-1" />
                        {opp.response_time}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      onClick={() => handleExpressInterest(opp.id)}
                      className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors duration-200 mr-3"
                    >
                      Express Interest
                    </button>
                    <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors duration-200">
                      <Heart className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Posted Date */}
                  <div className="mt-3 text-xs text-slate-500 text-center">
                    Posted {new Date(opp.created_at).toLocaleDateString()}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Info Footer */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
          <div className="flex items-start">
            <div className="p-2 bg-emerald-100 rounded-lg mr-4 flex-shrink-0">
              <Info className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-900 mb-2">About Angel Investor Opportunities</h3>
              <p className="text-sm text-emerald-800 mb-3">
                This directory showcases active investment opportunities posted by verified angel investors. 
                Each opportunity includes detailed criteria, investment ranges, and investor backgrounds.
              </p>
              <ul className="text-sm text-emerald-700 space-y-1">
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></div>
                  All investors are verified and accredited
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></div>
                  Match scores based on your project profile
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></div>
                  Direct communication with interested investors
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}