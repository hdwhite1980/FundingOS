'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, Calendar, DollarSign, Building, ExternalLink, Zap, Clock, Target } from 'lucide-react'
import { format, isAfter, differenceInDays } from 'date-fns'
import OpportunityCard from './OpportunityCard'
import AIAnalysisModal from './AIAnalysisModal'
import { opportunityService } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function OpportunityList({ opportunities: initialOpportunities, selectedProject, userProfile }) {
  const [opportunities, setOpportunities] = useState(initialOpportunities || [])
  const [filteredOpportunities, setFilteredOpportunities] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOpportunity, setSelectedOpportunity] = useState(null)
  const [showAIModal, setShowAIModal] = useState(false)
  const [filters, setFilters] = useState({
    deadlineType: 'all', // all, upcoming, rolling
    amountRange: 'all', // all, small, medium, large
    organizationType: 'all'
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    applyFilters()
  }, [opportunities, searchQuery, filters, selectedProject])

  const applyFilters = () => {
    let filtered = [...opportunities]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(opp =>
        opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.sponsor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Deadline filter
    if (filters.deadlineType === 'upcoming') {
      filtered = filtered.filter(opp => 
        opp.deadline_date && isAfter(new Date(opp.deadline_date), new Date())
      )
    } else if (filters.deadlineType === 'rolling') {
      filtered = filtered.filter(opp => !opp.deadline_date || opp.deadline_type === 'rolling')
    }

    // Amount filter
    if (selectedProject && filters.amountRange !== 'all') {
      const fundingNeeded = selectedProject.funding_needed
      filtered = filtered.filter(opp => {
        if (!opp.amount_max) return true
        
        switch (filters.amountRange) {
          case 'small':
            return opp.amount_max <= fundingNeeded * 0.5
          case 'medium':
            return opp.amount_max >= fundingNeeded * 0.5 && opp.amount_max <= fundingNeeded * 2
          case 'large':
            return opp.amount_max >= fundingNeeded
          default:
            return true
        }
      })
    }

    // Organization type filter
    if (filters.organizationType !== 'all') {
      filtered = filtered.filter(opp => 
        !opp.organization_types || opp.organization_types.includes(filters.organizationType)
      )
    }

    // Smart ranking based on selected project
    if (selectedProject) {
      filtered = filtered.map(opp => ({
        ...opp,
        fitScore: calculateFitScore(selectedProject, opp, userProfile)
      })).sort((a, b) => b.fitScore - a.fitScore)
    }

    setFilteredOpportunities(filtered)
  }

  const calculateFitScore = (project, opportunity, profile) => {
    let score = 0
    
    // Project type match
    if (opportunity.project_types?.includes(project.project_type)) {
      score += 30
    }

    // Organization type match
    if (opportunity.organization_types?.includes(profile.organization_type)) {
      score += 25
    }

    // Funding amount fit
    if (opportunity.amount_min && opportunity.amount_max) {
      const projectNeed = project.funding_needed
      if (projectNeed >= opportunity.amount_min && projectNeed <= opportunity.amount_max) {
        score += 20
      } else if (projectNeed <= opportunity.amount_max) {
        score += 10
      }
    }

    // Certification bonuses
    if (opportunity.minority_business && profile.minority_owned) score += 10
    if (opportunity.woman_owned_business && profile.woman_owned) score += 10
    if (opportunity.veteran_owned_business && profile.veteran_owned) score += 10
    if (opportunity.small_business_only && profile.small_business) score += 10

    // Deadline urgency (inverse score - closer deadlines get higher priority)
    if (opportunity.deadline_date) {
      const daysUntilDeadline = differenceInDays(new Date(opportunity.deadline_date), new Date())
      if (daysUntilDeadline > 0 && daysUntilDeadline <= 30) {
        score += 15
      } else if (daysUntilDeadline > 30 && daysUntilDeadline <= 90) {
        score += 10
      }
    } else {
      score += 5 // Rolling deadlines get a small bonus
    }

    return Math.min(score, 100) // Cap at 100
  }

  const getDeadlineStatus = (deadlineDate) => {
    if (!deadlineDate) return { status: 'rolling', text: 'Rolling', color: 'text-blue-600 bg-blue-50' }
    
    const daysUntil = differenceInDays(new Date(deadlineDate), new Date())
    
    if (daysUntil < 0) {
      return { status: 'expired', text: 'Expired', color: 'text-gray-600 bg-gray-50' }
    } else if (daysUntil <= 7) {
      return { status: 'urgent', text: `${daysUntil} days left`, color: 'text-red-600 bg-red-50' }
    } else if (daysUntil <= 30) {
      return { status: 'soon', text: `${daysUntil} days left`, color: 'text-amber-600 bg-amber-50' }
    } else {
      return { status: 'ok', text: format(new Date(deadlineDate), 'MMM d, yyyy'), color: 'text-accent-600 bg-accent-50' }
    }
  }

  const handleAnalyzeOpportunity = (opportunity) => {
    if (!selectedProject) {
      toast.error('Please select a project first')
      return
    }
    
    setSelectedOpportunity(opportunity)
    setShowAIModal(true)
  }

  if (!selectedProject) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <Target className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Select a Project</h3>
          <p className="mt-1 text-gray-500">
            Choose a project from the sidebar to see matching funding opportunities.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="card-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Opportunities for {selectedProject.name}
              </h2>
              <p className="text-sm text-gray-600">
                {filteredOpportunities.length} matching opportunities found
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-2">
              <button className="btn-outline text-sm flex items-center">
                <Zap className="w-4 h-4 mr-2" />
                AI Analysis
              </button>
            </div>
          </div>
        </div>
        
        <div className="card-body">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search opportunities..."
                className="form-input pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <select
              className="form-input"
              value={filters.deadlineType}
              onChange={(e) => setFilters({...filters, deadlineType: e.target.value})}
            >
              <option value="all">All Deadlines</option>
              <option value="upcoming">Upcoming Deadlines</option>
              <option value="rolling">Rolling Deadlines</option>
            </select>
            
            <select
              className="form-input"
              value={filters.amountRange}
              onChange={(e) => setFilters({...filters, amountRange: e.target.value})}
            >
              <option value="all">All Amounts</option>
              <option value="small">Partial Funding</option>
              <option value="medium">Good Fit</option>
              <option value="large">Full Funding+</option>
            </select>
          </div>
        </div>
      </div>

      {/* Opportunities List */}
      <div className="space-y-4">
        {filteredOpportunities.length === 0 ? (
          <div className="card">
            <div className="card-body text-center py-12">
              <Building className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No opportunities found</h3>
              <p className="mt-1 text-gray-500">
                Try adjusting your search filters or check back later for new opportunities.
              </p>
            </div>
          </div>
        ) : (
          filteredOpportunities.map((opportunity, index) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              selectedProject={selectedProject}
              userProfile={userProfile}
              onAnalyze={() => handleAnalyzeOpportunity(opportunity)}
              fitScore={opportunity.fitScore}
              deadlineStatus={getDeadlineStatus(opportunity.deadline_date)}
              index={index}
            />
          ))
        )}
      </div>

      {/* AI Analysis Modal */}
      {showAIModal && selectedOpportunity && (
        <AIAnalysisModal
          opportunity={selectedOpportunity}
          project={selectedProject}
          userProfile={userProfile}
          onClose={() => {
            setShowAIModal(false)
            setSelectedOpportunity(null)
          }}
        />
      )}
    </div>
  )
}