'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Search, 
  Filter, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Shield, 
  Award,
  Info,
  Settings,
  Eye,
  EyeOff,
  Calendar, 
  DollarSign, 
  Building, 
  Zap, 
  Target, 
  Sparkles 
} from 'lucide-react'
import { format, isAfter, differenceInDays } from 'date-fns'
import OpportunityCard from './OpportunityCard'
import AIAnalysisModal from './AIAnalysisModal'
import { opportunityService } from '../lib/supabase'
import scoringService from '../lib/scoringServiceIntegration'
import toast from 'react-hot-toast'

export default function OpportunityList({ 
  opportunities: initialOpportunities, 
  selectedProject, 
  userProfile,
  enableEligibilityCheck = true // Flag to enable/disable eligibility features
}) {
  const [opportunities, setOpportunities] = useState(initialOpportunities || [])
  const [filteredOpportunities, setFilteredOpportunities] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOpportunity, setSelectedOpportunity] = useState(null)
  const [showAIModal, setShowAIModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showEligibilitySettings, setShowEligibilitySettings] = useState(false)
  const [opportunityScores, setOpportunityScores] = useState({}) // Added missing state for opportunity scores
  
  // Combined filters
  const [filters, setFilters] = useState({
    // Basic filters
    deadlineType: 'all', // all, upcoming, rolling
    amountRange: 'all', // all, small, medium, large
    organizationType: 'all',
    aiRelevance: 'all', // all, ai_targeted, high_score
    
    // Eligibility filters (when enabled)
    onlyEligible: enableEligibilityCheck,
    excludeWarnings: false,
    minConfidence: 70,
    showIneligible: false,
    smallBusinessOnly: false
  })
  
  // Profile completion suggestions (when eligibility enabled)
  const [profileSuggestions, setProfileSuggestions] = useState([])
  const [showProfileAlert, setShowProfileAlert] = useState(false)

  useEffect(() => {
    if (selectedProject && userProfile) {
      loadOpportunities()
      if (enableEligibilityCheck) {
        loadProfileSuggestions()
      }
    }
  }, [selectedProject, userProfile, filters])

  useEffect(() => {
    applyFilters()
  }, [opportunities, searchQuery])

  // Calculate opportunity scores when opportunities or selectedProject change
  useEffect(() => {
    const calculateScores = async () => {
      if (selectedProject && opportunities.length > 0) {
        try {
          const scores = {}
          for (const opportunity of opportunities) {
            try {
              const score = await scoringService.calculateScore(selectedProject, opportunity, userProfile)
              scores[opportunity.id] = score
            } catch (error) {
              console.error(`Error calculating score for opportunity ${opportunity.id}:`, error)
              scores[opportunity.id] = 0 // Default score on error
            }
          }
          setOpportunityScores(scores)
        } catch (error) {
          console.error('Error calculating opportunity scores:', error)
          // Set all scores to 0 on error
          const defaultScores = {}
          opportunities.forEach(opp => {
            defaultScores[opp.id] = 0
          })
          setOpportunityScores(defaultScores)
        }
      }
    }

    calculateScores()
  }, [selectedProject, opportunities])

  const loadOpportunities = async () => {
    try {
      setLoading(true)
      
      let loadedOpportunities
      
      if (enableEligibilityCheck) {
        // Use enhanced opportunity service with eligibility filtering
        loadedOpportunities = await opportunityService.getEligibleOpportunities(
          userProfile,
          {
            projectTypes: [selectedProject.project_type],
            organizationType: userProfile.organization_type,
            state: userProfile.state,
            onlyEligible: filters.onlyEligible,
            excludeWarnings: filters.excludeWarnings,
            minConfidence: filters.minConfidence,
            smallBusinessOnly: filters.smallBusinessOnly,
            showIneligible: filters.showIneligible
          }
        )
        
        // Show eligibility stats
        const totalCount = loadedOpportunities.length
        const eligibleCount = loadedOpportunities.filter(opp => opp.eligibility?.eligible).length
        const ineligibleCount = totalCount - eligibleCount
        
        if (ineligibleCount > 0 && filters.onlyEligible) {
          toast(`Found ${totalCount} opportunities (${ineligibleCount} filtered out due to eligibility)`, {
            icon: '🔍',
            duration: 5000
          })
        }
      } else {
        // Use basic opportunity service
        loadedOpportunities = await opportunityService.getOpportunities({
          projectTypes: [selectedProject.project_type],
          organizationType: userProfile.organization_type,
          state: userProfile.state
        })
      }
      
      setOpportunities(loadedOpportunities)
      
    } catch (error) {
      console.error('Error loading opportunities:', error)
      toast.error('Failed to load opportunities')
    } finally {
      setLoading(false)
    }
  }

  const loadProfileSuggestions = async () => {
    try {
      const suggestions = await opportunityService.getProfileCompletionSuggestions(userProfile)
      setProfileSuggestions(suggestions)
      setShowProfileAlert(suggestions.filter(s => s.priority === 'high').length > 0)
    } catch (error) {
      console.error('Error loading profile suggestions:', error)
    }
  }

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
        // For high score filtering, we need to calculate scores asynchronously
        // This will be handled in the useEffect that manages async scoring
        filtered = filtered.filter(opp => {
          const cachedScore = opportunityScores[opp.id]
          return cachedScore !== undefined && cachedScore >= 70
        })
      }
    }

    // Smart ranking based on selected project
    if (selectedProject) {
      filtered = filtered.map(opp => ({
        ...opp,
        fitScore: opportunityScores[opp.id] || 0
      })).sort((a, b) => b.fitScore - a.fitScore)
    }

    setFilteredOpportunities(filtered)
  }

  /* REMOVED OLD SCORING LOGIC - USING NEW SCORING SERVICE

    let score = 0
    
    // 🎯 1. PROJECT TYPE MATCHING (0-25 points)
    if (selectedProject.project_type && opportunity.project_types) {
      if (opportunity.project_types.includes(selectedProject.project_type)) {
        score += 25 // Perfect match
      } else if (opportunity.project_types.some(type => 
        isRelatedProjectType(selectedProject.project_type, type)
      )) {
        score += 15 // Related type
      } else {
        score += 5 // Different type
      }
    }
    
    // 💰 2. FUNDING AMOUNT MATCH (0-20 points)
    if (opportunity.amount_min && opportunity.amount_max && selectedProject.funding_needed) {
      const projectNeed = selectedProject.funding_needed
      if (projectNeed >= opportunity.amount_min && projectNeed <= opportunity.amount_max) {
        score += 20 // Perfect fit
      } else if (projectNeed <= opportunity.amount_max * 2) {
        score += 15 // Reasonable fit
      } else if (projectNeed >= opportunity.amount_min * 0.5) {
        score += 10 // Partial funding possible
      }
      // No points if amounts don't align at all
    } else {
      score += 10 // Unknown amounts - neutral score
    }
    
    // 📝 3. DESCRIPTION KEYWORD OVERLAP (0-20 points)
    if (selectedProject.description && opportunity.description) {
      const projectTerms = extractMeaningfulTerms(selectedProject.description)
      const oppTerms = extractMeaningfulTerms(opportunity.description)
      const overlap = calculateTermOverlap(projectTerms, oppTerms)
      
      if (overlap >= 0.4) {
        score += 20 // Strong overlap
      } else if (overlap >= 0.2) {
        score += 15 // Good overlap
      } else if (overlap >= 0.1) {
        score += 10 // Some overlap
      } else if (overlap > 0) {
        score += 5 // Minimal overlap
      }
      // No points if no overlap
    }
    
    // 🏢 4. ORGANIZATION TYPE ELIGIBILITY (0-15 points)
    if (userProfile?.organization_type && opportunity.organization_types) {
      if (opportunity.organization_types.includes(userProfile.organization_type) ||
          opportunity.organization_types.includes('all')) {
        score += 15 // Eligible
      } else {
        score += 5 // May still be eligible
      }
    } else {
      score += 10 // Unknown eligibility
    }
    
    // 🌍 5. GEOGRAPHIC MATCH (0-10 points)
    if (opportunity.geography?.includes('nationwide') || 
        opportunity.geography?.includes('national')) {
      score += 10 // Available everywhere
    } else if (selectedProject.location && opportunity.geography?.some(geo => 
      selectedProject.location.toLowerCase().includes(geo.toLowerCase())
    )) {
      score += 10 // Geographic match
    } else if (!opportunity.geography || opportunity.geography.length > 5) {
      score += 5 // Broadly available
    }
    // No points if geographically restricted and no match
    
    // ⏰ 6. DEADLINE TIMING (0-10 points)
    if (opportunity.deadline_date) {
      const daysUntilDeadline = differenceInDays(new Date(opportunity.deadline_date), new Date())
      if (daysUntilDeadline > 30) {
        score += 10 // Good timing
      } else if (daysUntilDeadline > 7) {
        score += 7 // Tight timing
      } else if (daysUntilDeadline > 0) {
        score += 3 // Very urgent
      }
      // No points for expired opportunities
    } else {
      score += 8 // Rolling deadline
    }
    
    // 🏅 BONUSES:
    
    // AI-Targeted Bonus (+10 points)
    if (opportunity.ai_metadata?.projectId === selectedProject.id) {
      score += 10
    }
    
    // Certification Advantage Bonus (+5 points)
    if (userProfile) {
      if (opportunity.minority_business && userProfile.minority_owned) score += 5
      if (opportunity.woman_owned_business && userProfile.woman_owned) score += 5
      if (opportunity.veteran_owned_business && userProfile.veteran_owned) score += 5
      if (opportunity.small_business_only && userProfile.small_business) score += 5
    }
    
    // Eligibility Penalty/Bonus
    if (enableEligibilityCheck && opportunity.eligibility) {
      if (opportunity.eligibility.eligible) {
        score += 5 // Small bonus for confirmed eligibility
      } else {
        score = Math.max(0, score - 20) // Significant penalty for ineligible
      }
    }
    
    return Math.min(score, 100) // Cap at 100
  }

  REMOVED OLD SCORING LOGIC - USING NEW SCORING SERVICE */

  const extractMeaningfulTerms = (text) => {
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word))
      .slice(0, 15)
  }

  const calculateTermOverlap = (terms1, terms2) => {
    if (terms1.length === 0 || terms2.length === 0) return 0
    const overlap = terms1.filter(term => terms2.includes(term)).length
    return overlap / Math.max(terms1.length, terms2.length)
  }

  // New helper function for related project types
  const isRelatedProjectType = (projectType, opportunityType) => {
    const relatedTypes = {
      'commercial_development': ['development', 'construction', 'infrastructure', 'community', 'economic'],
      'technology': ['innovation', 'research', 'development', 'technical', 'digital'],
      'research': ['study', 'analysis', 'investigation', 'development', 'innovation'],
      'infrastructure': ['construction', 'development', 'improvement', 'renovation', 'upgrade'],
      'community_development': ['development', 'community', 'social', 'economic', 'improvement'],
      'healthcare': ['health', 'medical', 'clinical', 'wellness', 'care'],
      'education': ['training', 'learning', 'educational', 'academic', 'development'],
      'environmental': ['green', 'sustainability', 'conservation', 'environmental', 'climate']
    }
    
    const projectKeywords = relatedTypes[projectType] || [projectType?.split('_')[0] || '']
    return projectKeywords.some(keyword => 
      opportunityType.toLowerCase().includes(keyword.toLowerCase())
    )
  }

  const calculateGoalAlignment = (projectGoals, opportunityFocus) => {
    if (!projectGoals || !opportunityFocus) return 0
    const goalText = JSON.stringify(projectGoals).toLowerCase()
    const focusText = JSON.stringify(opportunityFocus).toLowerCase()
    
    // Look for common themes
    const commonThemes = ['development', 'community', 'research', 'innovation', 'improvement', 'support', 'enhance']
    let matches = 0
    commonThemes.forEach(theme => {
      if (goalText.includes(theme) && focusText.includes(theme)) {
        matches++
      }
    })
    
    return Math.max(0.3, matches / commonThemes.length) // Minimum 30% alignment
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
      return { status: 'ok', text: format(new Date(deadlineDate), 'MMM d, yyyy'), color: 'text-emerald-600 bg-emerald-50' }
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

  // Eligibility helper functions
  const getEligibilityIcon = (eligibility) => {
    if (!eligibility) return <Info className="w-4 h-4 text-gray-400" />
    
    if (eligibility.eligible) {
      if (eligibility.warnings?.length > 0) {
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      }
      return <CheckCircle className="w-4 h-4 text-emerald-600" />
    }
    
    return <XCircle className="w-4 h-4 text-red-600" />
  }

  const getEligibilityStatus = (eligibility) => {
    if (!eligibility) return { text: 'Unknown', color: 'text-gray-600 bg-gray-100' }
    
    if (eligibility.eligible) {
      if (eligibility.warnings?.length > 0) {
        return { text: 'Eligible (Warnings)', color: 'text-yellow-800 bg-yellow-100' }
      }
      return { text: 'Eligible', color: 'text-emerald-800 bg-emerald-100' }
    }
    
    return { text: 'Not Eligible', color: 'text-red-800 bg-red-100' }
  }

  const getAIBadge = (opportunity) => {
    if (!selectedProject || !opportunity.ai_metadata?.projectId === selectedProject.id) return null
    
    const strategy = opportunity.ai_metadata.strategy
    const badgeConfig = {
      'ai-primary': { text: 'AI Primary', color: 'bg-purple-100 text-purple-800' },
      'ai-agency': { text: 'AI Agency', color: 'bg-blue-100 text-blue-800' },
            'ai-keyword': { text: 'AI Keyword', color: 'bg-emerald-100 text-emerald-800' },
      'fallback-category': { text: 'Category-Based', color: 'bg-gray-100 text-gray-800' },
      'fallback-agency': { text: 'Agency-Based', color: 'bg-gray-100 text-gray-800' },
      'fallback-keyword': { text: 'Keyword-Based', color: 'bg-gray-100 text-gray-800' }
    }
    
    const config = badgeConfig[strategy] || { text: 'Matched', color: 'bg-gray-100 text-gray-800' }
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color} ml-2`}>
        <Sparkles className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    )
  }

  // Components
  const EligibilityBadge = ({ opportunity }) => {
    if (!enableEligibilityCheck) return null
    
    const eligibility = opportunity.eligibility
    const status = getEligibilityStatus(eligibility)
    
    return (
      <div className="flex items-center space-x-2">
        {getEligibilityIcon(eligibility)}
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
          {status.text}
          {eligibility?.eligible && (
            <span className="ml-1 text-xs">({eligibility.confidence}%)</span>
          )}
        </span>
      </div>
    )
  }

  const ProfileCompletionAlert = () => {
    if (!enableEligibilityCheck || !showProfileAlert || profileSuggestions.length === 0) return null

    const highPriority = profileSuggestions.filter(s => s.priority === 'high')
    
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6"
      >
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-amber-600 mr-3 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-amber-800">
              Complete Your Profile for Better Eligibility
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              Missing information may prevent you from seeing eligible opportunities.
            </p>
            <div className="mt-3 space-y-1">
              {highPriority.slice(0, 3).map((suggestion, index) => (
                <div key={index} className="text-xs text-amber-700">
                  • {suggestion.description}: {suggestion.reason}
                </div>
              ))}
              {highPriority.length > 3 && (
                <div className="text-xs text-amber-600">
                  +{highPriority.length - 3} more items
                </div>
              )}
            </div>
            <div className="mt-3 flex space-x-3">
              <button 
                onClick={() => window.location.href = '/profile'}
                className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded hover:bg-amber-200"
              >
                Complete Profile
              </button>
              <button 
                onClick={() => setShowProfileAlert(false)}
                className="text-xs text-amber-600 hover:text-amber-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  const EligibilitySettings = () => {
    if (!enableEligibilityCheck) return null
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-4"
      >
        <h3 className="font-semibold text-gray-900 mb-3">Eligibility Filters</h3>
        
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.onlyEligible}
              onChange={(e) => setFilters({
                ...filters,
                onlyEligible: e.target.checked
              })}
              className="mr-2"
            />
            <span className="text-sm">Only show eligible opportunities</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.excludeWarnings}
              onChange={(e) => setFilters({
                ...filters,
                excludeWarnings: e.target.checked
              })}
              className="mr-2"
            />
            <span className="text-sm">Exclude opportunities with warnings</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.smallBusinessOnly}
              onChange={(e) => setFilters({
                ...filters,
                smallBusinessOnly: e.target.checked
              })}
              className="mr-2"
            />
            <span className="text-sm">Small business programs only</span>
          </label>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Confidence: {filters.minConfidence}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={filters.minConfidence}
              onChange={(e) => setFilters({
                ...filters,
                minConfidence: parseInt(e.target.value)
              })}
              className="w-full"
            />
          </div>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.showIneligible}
              onChange={(e) => setFilters({
                ...filters,
                showIneligible: e.target.checked,
                onlyEligible: !e.target.checked
              })}
              className="mr-2"
            />
            <span className="text-sm">Show ineligible opportunities</span>
          </label>
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-200">
          <button
            onClick={() => setFilters({
              ...filters,
              onlyEligible: enableEligibilityCheck,
              excludeWarnings: false,
              minConfidence: 70,
              showIneligible: false,
              smallBusinessOnly: false
            })}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Reset eligibility filters
          </button>
        </div>
      </motion.div>
    )
  }

  // Main component render - checking if project is selected
  if (!selectedProject) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <Target className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Select a Project</h3>
          <p className="mt-1 text-gray-500">
            Choose a project to see matching funding opportunities{enableEligibilityCheck ? ' with detailed eligibility analysis' : ''}.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Completion Alert */}
      <ProfileCompletionAlert />

      {/* Enhanced Header */}
      <div className="card">
        <div className="card-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                {enableEligibilityCheck ? (
                  <Shield className="w-5 h-5 mr-2 text-green-600" />
                ) : (
                  <Target className="w-5 h-5 mr-2 text-green-600" />
                )}
                {enableEligibilityCheck ? 'Eligible ' : ''}Opportunities for {selectedProject.name}
              </h2>
              <p className="text-sm text-gray-600">
                {filteredOpportunities.length} opportunities found
                {selectedProject.project_type && (
                  <span className="ml-2 text-xs text-gray-500">
                    • {selectedProject.project_type.replace('_', ' ')} project
                  </span>
                )}
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-2">
              {enableEligibilityCheck && (
                <div className="relative">
                  <button
                    onClick={() => setShowEligibilitySettings(!showEligibilitySettings)}
                    className="btn-outline text-sm flex items-center"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Eligibility Filters
                  </button>
                  {showEligibilitySettings && <EligibilitySettings />}
                </div>
              )}
              <button 
                onClick={() => setShowAIModal(true)}
                className="btn-outline text-sm flex items-center hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors"
              >
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

          {/* Simplified Status Display */}
          {filteredOpportunities.length > 0 && enableEligibilityCheck && (
            <div className="mt-4 inline-flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
              <Shield className="w-4 h-4 mr-2 text-green-600" />
              <span className="font-medium text-green-700">
                {filteredOpportunities.filter(opp => opp.eligibility?.eligible).length}
              </span>
              <span className="ml-1">eligible opportunities</span>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Opportunities List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">
              {enableEligibilityCheck ? 'Checking eligibility...' : 'Loading opportunities...'}
            </p>
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="card">
            <div className="card-body text-center py-12">
              <Building className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">
                No {enableEligibilityCheck ? 'eligible ' : ''}opportunities found
              </h3>
              <p className="mt-1 text-gray-500">
                Try adjusting your search filters{enableEligibilityCheck ? ' or complete your profile for more opportunities' : ' or check back later for new opportunities'}.
              </p>
              <div className="mt-4 flex space-x-3 justify-center">
                {enableEligibilityCheck ? (
                  <>
                    <button 
                      onClick={() => setFilters({...filters, showIneligible: true})}
                      className="btn-secondary btn-sm flex items-center"
                    >
                      <EyeOff className="w-4 h-4 mr-2" />
                      Show All Opportunities
                    </button>
                    <button 
                      onClick={() => window.location.href = '/profile'}
                      className="btn-primary btn-sm"
                    >
                      Complete Profile
                    </button>
                  </>
                ) : (
                  filters.aiRelevance !== 'all' && (
                    <button 
                      onClick={() => setFilters({...filters, aiRelevance: 'all'})}
                      className="btn-secondary btn-sm"
                    >
                      Show All Opportunities
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        ) : (
          filteredOpportunities.map((opportunity, index) => (
            <motion.div
              key={opportunity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className={`relative ${
                enableEligibilityCheck && opportunity.eligibility && !opportunity.eligibility.eligible 
                  ? 'opacity-75' 
                  : ''
              }`}
            >
              {/* AI Badge Overlay */}
              {selectedProject && opportunity.ai_metadata?.projectId === selectedProject.id && (
                <div className="absolute top-2 right-2 z-10">
                  {getAIBadge(opportunity)}
                </div>
              )}
              
              {/* Enhanced Opportunity Card */}
              <div className={`card transition-all duration-300 ${
                enableEligibilityCheck && opportunity.eligibility 
                  ? (opportunity.eligibility.eligible 
                      ? 'hover:shadow-lg' 
                      : 'border-red-200')
                  : 'hover:shadow-lg'
              }`}>
                <div className="card-body">
                  {/* Eligibility Status Header */}
                  {enableEligibilityCheck && opportunity.eligibility && (
                    <div className="flex items-center justify-between mb-4">
                      <EligibilityBadge opportunity={opportunity} />
                      {opportunity.eligibility.eligible && opportunity.eligibility.checks?.certifications?.advantages?.length > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          <Award className="w-3 h-3 mr-1" />
                          Certification Advantage
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Original Opportunity Card Content */}
                  <OpportunityCard
                    opportunity={opportunity}
                    selectedProject={selectedProject}
                    userProfile={userProfile}
                    onAnalyze={() => handleAnalyzeOpportunity(opportunity)}
                    fitScore={opportunity.fitScore}
                    deadlineStatus={getDeadlineStatus(opportunity.deadline_date)}
                    index={index}
                  />
                  
                  {/* Eligibility Details */}
                  {enableEligibilityCheck && opportunity.eligibility && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      {!opportunity.eligibility.eligible && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-red-800 mb-2">Eligibility Issues:</h4>
                          <div className="space-y-1">
                            {opportunity.eligibility.blockers.map((blocker, i) => (
                              <div key={i} className="text-xs text-red-700 flex items-start">
                                <XCircle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                                {blocker.reason}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {opportunity.eligibility.warnings?.length > 0 && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-yellow-800 mb-2">Warnings:</h4>
                          <div className="space-y-1">
                            {opportunity.eligibility.warnings.map((warning, i) => (
                              <div key={i} className="text-xs text-yellow-700 flex items-start">
                                <AlertTriangle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                                {warning}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {opportunity.eligibility.requirements?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-blue-800 mb-2">Requirements:</h4>
                          <div className="space-y-1">
                            {opportunity.eligibility.requirements.slice(0, 3).map((req, i) => (
                              <div key={i} className="text-xs text-blue-700 flex items-start">
                                <Info className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                                {req}
                              </div>
                            ))}
                            {opportunity.eligibility.requirements.length > 3 && (
                              <div className="text-xs text-blue-600">
                                +{opportunity.eligibility.requirements.length - 3} more requirements
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
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
          quickMatchScore={selectedOpportunity.fitScore}
          onClose={() => {
            setShowAIModal(false)
            setSelectedOpportunity(null)
          }}
        />
      )}
      
      {/* Click outside handler for settings */}
      {showEligibilitySettings && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowEligibilitySettings(false)}
        />
      )}
    </div>
  )
}