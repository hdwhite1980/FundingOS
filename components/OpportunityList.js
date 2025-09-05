'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, Calendar, DollarSign, Building, ExternalLink, Zap, Clock, Target, Sparkles } from 'lucide-react'
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
    organizationType: 'all',
    aiRelevance: 'all' // all, ai_targeted, high_score
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

    // AI relevance filter
    if (selectedProject && filters.aiRelevance !== 'all') {
      if (filters.aiRelevance === 'ai_targeted') {
        filtered = filtered.filter(opp => 
          opp.ai_metadata?.projectId === selectedProject.id
        )
      } else if (filters.aiRelevance === 'high_score') {
        // First calculate scores, then filter
        filtered = filtered.map(opp => ({
          ...opp,
          tempFitScore: calculateEnhancedFitScore(selectedProject, opp, userProfile)
        })).filter(opp => opp.tempFitScore >= 70)
      }
    }

    // Smart ranking based on selected project
    if (selectedProject) {
      filtered = filtered.map(opp => ({
        ...opp,
        fitScore: calculateEnhancedFitScore(selectedProject, opp, userProfile)
      })).sort((a, b) => b.fitScore - a.fitScore)
    }

    setFilteredOpportunities(filtered)
  }

  const calculateEnhancedFitScore = (selectedProject, opportunity, userProfile) => {
    let score = 0
    
    // AI-enhanced scoring: Check if this opportunity was found via AI for this specific project
    if (opportunity.ai_metadata?.projectId === selectedProject.id) {
      score += 40 // High bonus for AI-targeted opportunities
      
      // Additional bonuses based on AI search strategy
      switch (opportunity.ai_metadata.strategy) {
        case 'ai-primary':
          score += 30 // Primary category match
          break
        case 'ai-agency':
          score += 25 // Agency-specific match
          break
        case 'ai-keyword':
          score += 20 // Keyword match
          break
        default:
          score += 15 // Any AI strategy gets some bonus
      }
    }
    
    // Project type alignment
    if (opportunity.project_types?.includes(selectedProject.project_type)) {
      score += 20
    }

    // Organization type match
    if (opportunity.organization_types?.includes(userProfile.organization_type)) {
      score += 15
    }

    // Enhanced funding amount fit
    if (opportunity.amount_min && opportunity.amount_max && selectedProject.funding_needed) {
      const projectNeed = selectedProject.funding_needed
      if (projectNeed >= opportunity.amount_min && projectNeed <= opportunity.amount_max) {
        score += 20 // Perfect fit
      } else if (projectNeed <= opportunity.amount_max) {
        score += 12 // Can cover the need
      } else if (projectNeed >= opportunity.amount_min) {
        score += 8 // Partial funding possible
      }
    }

    // Location relevance
    if (opportunity.geography?.includes('nationwide') || 
        opportunity.geography?.includes(selectedProject.location?.split(',')[1]?.trim()?.toLowerCase())) {
      score += 10
    }

    // Enhanced certification bonuses
    if (opportunity.minority_business && userProfile.minority_owned) score += 12
    if (opportunity.woman_owned_business && userProfile.woman_owned) score += 12
    if (opportunity.veteran_owned_business && userProfile.veteran_owned) score += 12
    if (opportunity.small_business_only && userProfile.small_business) score += 15

    // Deadline urgency bonus (enhanced)
    if (opportunity.deadline_date) {
      const daysUntilDeadline = differenceInDays(new Date(opportunity.deadline_date), new Date())
      if (daysUntilDeadline > 0 && daysUntilDeadline <= 14) {
        score += 20 // Very urgent
      } else if (daysUntilDeadline > 14 && daysUntilDeadline <= 30) {
        score += 15 // Urgent
      } else if (daysUntilDeadline > 30 && daysUntilDeadline <= 90) {
        score += 10 // Good timing
      } else if (daysUntilDeadline > 90) {
        score += 5 // Plan ahead
      }
    } else {
      score += 8 // Rolling deadlines get decent bonus
    }

    // Industry alignment bonus
    if (selectedProject.industry && opportunity.industry_focus?.includes(selectedProject.industry.toLowerCase())) {
      score += 15
    }

    // Competition level consideration
    if (opportunity.competition_level === 'low') {
      score += 10
    } else if (opportunity.competition_level === 'medium') {
      score += 5
    }

    return Math.min(score, 100) // Cap at 100
  }

  // Legacy function for backward compatibility
  const calculateFitScore = (project, opportunity, profile) => {
    return calculateEnhancedFitScore(project, opportunity, profile)
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

  const getAIBadge = (opportunity) => {
    if (!selectedProject || !opportunity.ai_metadata?.projectId === selectedProject.id) return null
    
    const strategy = opportunity.ai_metadata.strategy
    const badgeConfig = {
      'ai-primary': { text: 'AI Primary', color: 'bg-purple-100 text-purple-800' },
      'ai-agency': { text: 'AI Agency', color: 'bg-blue-100 text-blue-800' },
      'ai-keyword': { text: 'AI Keyword', color: 'bg-green-100 text-green-800' },
      'fallback-category': { text: 'Category Match', color: 'bg-gray-100 text-gray-800' },
      'fallback-agency': { text: 'Agency Match', color: 'bg-gray-100 text-gray-800' },
      'fallback-keyword': { text: 'Keyword Match', color: 'bg-gray-100 text-gray-800' }
    }
    
    const config = badgeConfig[strategy] || { text: 'Matched', color: 'bg-gray-100 text-gray-800' }
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color} ml-2`}>
        <Sparkles className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    )
  }

  // Count AI-targeted opportunities
  const aiTargetedCount = opportunities.filter(opp => 
    selectedProject && opp.ai_metadata?.projectId === selectedProject.id
  ).length

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
      {/* Enhanced Header */}
      <div className="card">
        <div className="card-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                Opportunities for {selectedProject.name}
                {aiTargetedCount > 0 && (
                  <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    <Sparkles className="w-3 h-3 mr-1" />
                    {aiTargetedCount} AI-Targeted
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-600">
                {filteredOpportunities.length} matching opportunities found
                {selectedProject.project_type && (
                  <span className="ml-2 text-xs text-gray-500">
                    • {selectedProject.project_type.replace('_', ' ')} project
                  </span>
                )}
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
          {/* Enhanced Search and Filters */}
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

            {/* AI Relevance Filter */}
            <select
              className="form-input"
              value={filters.aiRelevance}
              onChange={(e) => setFilters({...filters, aiRelevance: e.target.value})}
            >
              <option value="all">All Opportunities</option>
              <option value="ai_targeted">AI-Targeted Only</option>
              <option value="high_score">High Match (70%+)</option>
            </select>
          </div>

          {/* AI Insights Bar */}
          {aiTargetedCount > 0 && (
            <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center text-sm text-purple-800">
                <Sparkles className="w-4 h-4 mr-2" />
                <span className="font-medium">AI found {aiTargetedCount} opportunities specifically for this project</span>
                <span className="ml-2 text-purple-600">
                  based on project type, funding needs, and organization profile
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Opportunities List */}
      <div className="space-y-4">
        {filteredOpportunities.length === 0 ? (
          <div className="card">
            <div className="card-body text-center py-12">
              <Building className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No opportunities found</h3>
              <p className="mt-1 text-gray-500">
                Try adjusting your search filters or check back later for new opportunities.
              </p>
              {filters.aiRelevance !== 'all' && (
                <button 
                  onClick={() => setFilters({...filters, aiRelevance: 'all'})}
                  className="mt-3 btn-secondary btn-sm"
                >
                  Show All Opportunities
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredOpportunities.map((opportunity, index) => (
            <motion.div
              key={opportunity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="relative"
            >
              {/* AI Badge Overlay */}
              {selectedProject && opportunity.ai_metadata?.projectId === selectedProject.id && (
                <div className="absolute top-2 right-2 z-10">
                  {getAIBadge(opportunity)}
                </div>
              )}
              
              <OpportunityCard
                opportunity={opportunity}
                selectedProject={selectedProject}
                userProfile={userProfile}
                onAnalyze={() => handleAnalyzeOpportunity(opportunity)}
                fitScore={opportunity.fitScore}
                deadlineStatus={getDeadlineStatus(opportunity.deadline_date)}
                index={index}
              />
            </motion.div>
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