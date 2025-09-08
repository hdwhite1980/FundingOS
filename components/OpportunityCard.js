'use client'
import { motion } from 'framer-motion'
import { Calendar, DollarSign, Building, ExternalLink, Zap, MapPin, Award } from 'lucide-react'

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
    if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200'
    if (score >= 60) return 'text-amber-700 bg-amber-50 border-amber-200'  
    if (score >= 40) return 'text-orange-700 bg-orange-50 border-orange-200'
    return 'text-slate-700 bg-slate-50 border-slate-200'
  }

  const formatAmount = (min, max) => {
    if (!min && !max) return 'Amount varies'
    if (!min) return `Up to $${max.toLocaleString()}`
    if (!max) return `From $${min.toLocaleString()}`
    if (min === max) return `$${min.toLocaleString()}`
    return `$${min.toLocaleString()} - $${max.toLocaleString()}`
  }

  // Only show the most important qualifications
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
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="bg-white rounded-xl border border-slate-200 hover:shadow-xl hover:border-emerald-200 transition-all duration-300 group"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-slate-900 line-clamp-2 mb-2 leading-tight group-hover:text-emerald-700 transition-colors">
                  {opportunity.title}
                </h3>
                <div className="flex items-center text-slate-600 mb-3">
                  <Building className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="text-sm font-medium truncate">{opportunity.sponsor}</span>
                </div>
              </div>
              {fitScore && (
                <div className={`
                  inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold border-2 flex-shrink-0
                  ${getFitScoreColor(fitScore)}
                `}>
                  {fitScore}%
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {opportunity.description && (
          <p className="text-neutral-600 leading-relaxed mb-6 line-clamp-2">
            {opportunity.description}
          </p>
        )}

        {/* Key Info - Clean Layout */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-neutral-800">
              <DollarSign className="w-5 h-5 text-green-600 mr-2" />
              <span className="font-semibold text-lg">
                {formatAmount(opportunity.amount_min, opportunity.amount_max)}
              </span>
            </div>
            {topQualification && (
              <div className="flex items-center px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-200">
                <Award className="w-3 h-3 mr-1" />
                {topQualification}
              </div>
            )}
          </div>
          
          <div className="flex items-center">
            <Calendar className="w-4 h-4 text-neutral-500 mr-2" />
            <span className={`text-sm font-medium px-2 py-1 rounded-md ${deadlineStatus.color}`}>
              {deadlineStatus.text}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-neutral-100">
          <button
            onClick={onAnalyze}
            className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 transition-all duration-200 shadow-sm hover:shadow-md group-hover:shadow-lg"
          >
            <Zap className="w-4 h-4 mr-2" />
            AI Analysis
          </button>
          
          {opportunity.source_url && (
            <a
              href={opportunity.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-3 bg-neutral-50 text-neutral-700 font-medium rounded-lg border border-neutral-200 hover:bg-neutral-100 hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-1 transition-all duration-200"
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