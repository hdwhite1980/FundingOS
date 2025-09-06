'use client'
import { motion } from 'framer-motion'
import { Calendar, DollarSign, Building, ExternalLink, Zap, Percent, MapPin, FileText } from 'lucide-react'

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
    if (score >= 80) return 'text-green-700 bg-green-50 border-green-200'
    if (score >= 60) return 'text-blue-700 bg-blue-50 border-blue-200'
    if (score >= 40) return 'text-amber-700 bg-amber-50 border-amber-200'
    return 'text-neutral-700 bg-neutral-50 border-neutral-200'
  }

  const formatAmount = (min, max) => {
    if (!min && !max) return 'Amount varies'
    if (!min) return `Up to $${max.toLocaleString()}`
    if (!max) return `From $${min.toLocaleString()}`
    if (min === max) return `$${min.toLocaleString()}`
    return `$${min.toLocaleString()} - $${max.toLocaleString()}`
  }

  // Collect all qualifying certifications into one badge
  const qualifications = []
  if (opportunity.minority_business) qualifications.push('MBE')
  if (opportunity.woman_owned_business) qualifications.push('WBE')
  if (opportunity.veteran_owned_business) qualifications.push('VBE')
  if (opportunity.small_business_only) qualifications.push('SBE')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="bg-white rounded-xl border border-neutral-200 hover:shadow-lg hover:border-blue-300 transition-all duration-300"
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-start gap-3 mb-2">
              <h3 className="text-lg font-semibold text-neutral-900 line-clamp-2 flex-1">
                {opportunity.title}
              </h3>
              {fitScore && (
                <span className={`
                  inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border flex-shrink-0
                  ${getFitScoreColor(fitScore)}
                `}>
                  {fitScore}% Match
                </span>
              )}
            </div>
            
            <div className="flex items-center text-sm text-neutral-600 mb-2">
              <Building className="w-4 h-4 mr-2" />
              {opportunity.sponsor}
            </div>

            <div className="flex items-center gap-3">
              <span className={`
                inline-flex items-center px-2 py-1 rounded-md text-xs font-medium
                ${deadlineStatus.color}
              `}>
                <Calendar className="w-3 h-3 mr-1" />
                {deadlineStatus.text}
              </span>
              
              {qualifications.length > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-50 text-blue-700 border border-blue-200">
                  {qualifications.join(' • ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {opportunity.description && (
          <p className="text-neutral-600 text-sm mb-4 line-clamp-2">
            {opportunity.description}
          </p>
        )}

        {/* Key Details - Single Row */}
        <div className="flex items-center justify-between mb-4 text-sm">
          <div className="flex items-center text-neutral-700">
            <DollarSign className="w-4 h-4 text-neutral-500 mr-1" />
            <span className="font-medium">
              {formatAmount(opportunity.amount_min, opportunity.amount_max)}
            </span>
          </div>
          
          {opportunity.match_requirement_percentage > 0 && (
            <div className="flex items-center text-neutral-600">
              <Percent className="w-4 h-4 mr-1" />
              <span className="text-sm">{opportunity.match_requirement_percentage}% Match</span>
            </div>
          )}
          
          {opportunity.cfda_number && (
            <div className="flex items-center text-neutral-600">
              <FileText className="w-4 h-4 mr-1" />
              <span className="text-sm">{opportunity.cfda_number}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
          <div className="flex items-center space-x-2">
            <button
              onClick={onAnalyze}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Zap className="w-4 h-4 mr-2" />
              AI Analysis
            </button>
            
            {opportunity.source_url && (
              <a
                href={opportunity.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-2 bg-white text-neutral-700 text-sm font-medium rounded-lg border border-neutral-300 hover:bg-neutral-50 hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-1 transition-all duration-200"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Details
              </a>
            )}
          </div>

          <div className="flex items-center text-xs text-neutral-500">
            {opportunity.contact_email && (
              <span className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                Contact
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}