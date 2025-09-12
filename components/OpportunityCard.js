'use client'
import { motion } from 'framer-motion'
import { 
  Calendar, 
  DollarSign, 
  Building, 
  ExternalLink, 
  Zap, 
  MapPin, 
  Award, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info, 
  Shield, 
  Sparkles,
  Clock
} from 'lucide-react'

export default function OpportunityCard({ 
  opportunity, 
  selectedProject, 
  userProfile, 
  onAnalyze, 
  fitScore, 
  deadlineStatus,
  index 
}) {
  const getFitScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-800 bg-emerald-100 border-emerald-200'
    if (score >= 60) return 'text-amber-800 bg-amber-100 border-amber-200'  
    if (score >= 40) return 'text-orange-800 bg-orange-100 border-orange-200'
    return 'text-slate-700 bg-slate-100 border-slate-200'
  }

  const formatAmount = (min, max) => {
    if (!min && !max) return 'Amount varies'
    if (!min) return `Up to $${max.toLocaleString()}`
    if (!max) return `From $${min.toLocaleString()}`
    if (min === max) return `$${min.toLocaleString()}`
    return `$${min.toLocaleString()} - $${max.toLocaleString()}`
  }

  const getEligibilityBadge = () => {
    if (!opportunity.eligibility) return null
    
    const { eligible, confidence, warnings } = opportunity.eligibility
    
    if (eligible) {
      if (warnings?.length > 0) {
        return (
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md text-xs font-medium border border-amber-200">
              Eligible (Warnings) ({confidence}%)
            </span>
          </div>
        )
      }
      return (
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md text-xs font-medium border border-emerald-200">
            Eligible ({confidence}%)
          </span>
        </div>
      )
    }
    
    return (
      <div className="flex items-center space-x-2">
        <XCircle className="w-4 h-4 text-red-600" />
        <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-md text-xs font-medium border border-red-200">
          Not Eligible
        </span>
      </div>
    )
  }

  const getAIBadge = () => {
    if (!selectedProject || !opportunity.ai_metadata?.projectId === selectedProject.id) return null
    
    const strategy = opportunity.ai_metadata.strategy
    const badgeConfig = {
      'ai-primary': { text: 'AI Primary', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
      'ai-agency': { text: 'AI Agency', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
      'ai-keyword': { text: 'AI Keyword', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
      'fallback-category': { text: 'Category Match', color: 'bg-slate-100 text-slate-800 border-slate-200' },
      'fallback-agency': { text: 'Agency Match', color: 'bg-slate-100 text-slate-800 border-slate-200' },
      'fallback-keyword': { text: 'Keyword Match', color: 'bg-slate-100 text-slate-800 border-slate-200' }
    }
    
    const config = badgeConfig[strategy] || { text: 'Matched', color: 'bg-slate-100 text-slate-800 border-slate-200' }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${config.color}`}>
        <Sparkles className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    )
  }

  const getTopQualification = () => {
    if (opportunity.small_business_only) return 'Small Business'
    if (opportunity.minority_business) return 'Minority Business'
    if (opportunity.woman_owned_business) return 'Women-Owned'
    if (opportunity.veteran_owned_business) return 'Veteran-Owned'
    return null
  }

  const topQualification = getTopQualification()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`bg-white rounded-xl border hover:shadow-lg transition-all duration-300 overflow-hidden ${
        opportunity.eligibility && !opportunity.eligibility.eligible 
          ? 'border-red-200 opacity-75' 
          : 'border-slate-200 hover:border-emerald-300'
      }`}
    >
      {/* Header Section */}
      <div className="p-6 border-b border-slate-100">
        {/* Eligibility Status */}
        {opportunity.eligibility && (
          <div className="flex items-center justify-between mb-4">
            {getEligibilityBadge()}
            {getAIBadge()}
          </div>
        )}

        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2 leading-tight">
              {opportunity.title}
            </h3>
            <div className="flex items-center text-slate-600 mb-3">
              <Building className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="text-sm font-medium">{opportunity.sponsor}</span>
              {opportunity.program_number && (
                <span className="ml-2 text-xs text-slate-500">• {opportunity.program_number}</span>
              )}
            </div>
          </div>
          {fitScore && (
            <div className={`ml-4 px-3 py-1.5 rounded-lg text-sm font-bold border ${getFitScoreColor(fitScore)} relative group cursor-help`}>
              <div className="text-xs font-medium opacity-75">Project Match</div>
              <div className="text-lg">{fitScore}%</div>
              
              {/* Tooltip */}
              <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                <div className="font-medium mb-1">Project Match Score</div>
                <div className="text-gray-300">
                  Quick assessment based on project description, funding amount, requirements, and timeline alignment with your specific project needs.
                </div>
                <div className="mt-1 text-gray-400 italic">
                  Hover on "AI Analysis" for detailed strategic assessment.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {opportunity.description && (
          <p className="text-slate-600 text-sm leading-relaxed line-clamp-2">
            {opportunity.description}
          </p>
        )}
      </div>

      {/* Details Section */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Amount */}
          <div className="flex items-center">
            <div className="p-2 bg-emerald-50 rounded-lg mr-3">
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Funding Amount</p>
              <p className="text-sm font-semibold text-slate-900">
                {formatAmount(opportunity.amount_min, opportunity.amount_max)}
              </p>
            </div>
          </div>

          {/* Deadline */}
          <div className="flex items-center">
            <div className="p-2 bg-slate-50 rounded-lg mr-3">
              <Calendar className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Deadline</p>
              <span className={`text-xs font-medium px-2 py-1 rounded-md ${deadlineStatus.color}`}>
                {deadlineStatus.text}
              </span>
            </div>
          </div>
        </div>

        {/* Qualifications */}
        {topQualification && (
          <div className="mb-4">
            <div className="flex items-center">
              <Award className="w-4 h-4 text-amber-600 mr-2" />
              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-md text-xs font-medium border border-amber-200">
                {topQualification} Priority
              </span>
            </div>
          </div>
        )}

        {/* Location */}
        {opportunity.location && (
          <div className="mb-4">
            <div className="flex items-center text-slate-600">
              <MapPin className="w-4 h-4 mr-2" />
              <span className="text-sm">{opportunity.location}</span>
            </div>
          </div>
        )}

        {/* Eligibility Details */}
        {opportunity.eligibility && (
          <div className="mb-6 p-3 bg-slate-50 rounded-lg border border-slate-200">
            {!opportunity.eligibility.eligible && (
              <div className="mb-2">
                <p className="text-sm font-medium text-red-800 mb-1">Eligibility Issues:</p>
                <div className="space-y-1">
                  {opportunity.eligibility.blockers?.slice(0, 2).map((blocker, i) => (
                    <div key={i} className="text-xs text-red-700 flex items-start">
                      <XCircle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                      {blocker.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {opportunity.eligibility.warnings?.length > 0 && (
              <div className="mb-2">
                <p className="text-sm font-medium text-amber-800 mb-1">Warnings:</p>
                <div className="space-y-1">
                  {opportunity.eligibility.warnings.slice(0, 2).map((warning, i) => (
                    <div key={i} className="text-xs text-amber-700 flex items-start">
                      <AlertTriangle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                      {warning}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {opportunity.eligibility.requirements?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-800 mb-1">Requirements:</p>
                <div className="space-y-1">
                  {opportunity.eligibility.requirements.slice(0, 2).map((req, i) => (
                    <div key={i} className="text-xs text-slate-700 flex items-start">
                      <Info className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                      {req}
                    </div>
                  ))}
                  {opportunity.eligibility.requirements.length > 2 && (
                    <div className="text-xs text-slate-600">
                      +{opportunity.eligibility.requirements.length - 2} more requirements
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onAnalyze}
            className="flex-1 px-4 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 transition-all duration-200 flex items-center justify-center relative group"
          >
            <Zap className="w-4 h-4 mr-2" />
            AI Strategic Analysis
            
            {/* Button tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              Deep AI analysis including competition, resource requirements, and strategic fit
            </div>
          </button>
          
          {opportunity.source_url && (
            <a
              href={opportunity.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3 bg-slate-100 text-slate-700 font-medium rounded-lg border border-slate-200 hover:bg-slate-200 focus:ring-2 focus:ring-slate-500 focus:ring-offset-1 transition-all duration-200 flex items-center justify-center"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Details
            </a>
          )}
        </div>
      </div>
    </motion.div>
  )
}