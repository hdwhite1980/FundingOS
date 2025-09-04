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
    if (score >= 80) return 'text-accent-700 bg-accent-100 border-accent-200'
    if (score >= 60) return 'text-blue-700 bg-blue-100 border-blue-200'
    if (score >= 40) return 'text-amber-700 bg-amber-100 border-amber-200'
    return 'text-gray-700 bg-gray-100 border-gray-200'
  }

  const formatAmount = (min, max) => {
    if (!min && !max) return 'Amount varies'
    if (!min) return `Up to $${max.toLocaleString()}`
    if (!max) return `From $${min.toLocaleString()}`
    if (min === max) return `$${min.toLocaleString()}`
    return `$${min.toLocaleString()} - $${max.toLocaleString()}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="card hover:shadow-soft-lg transition-all duration-300"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                {opportunity.title}
              </h3>
              {fitScore && (
                <span className={`
                  inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                  ${getFitScoreColor(fitScore)}
                `}>
                  {fitScore}% Match
                </span>
              )}
            </div>
            
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <Building className="w-4 h-4 mr-2" />
              {opportunity.sponsor}
              {opportunity.agency && opportunity.agency !== opportunity.sponsor && (
                <span className="ml-1">• {opportunity.agency}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className={`
              inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
              ${deadlineStatus.color}
            `}>
              <Calendar className="w-3 h-3 mr-1" />
              {deadlineStatus.text}
            </span>
          </div>
        </div>

        {/* Description */}
        {opportunity.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {opportunity.description}
          </p>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <DollarSign className="w-4 h-4 text-gray-600 mx-auto mb-1" />
            <p className="text-xs text-gray-600">Amount</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatAmount(opportunity.amount_min, opportunity.amount_max)}
            </p>
          </div>

          {opportunity.match_requirement_percentage > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <Percent className="w-4 h-4 text-gray-600 mx-auto mb-1" />
              <p className="text-xs text-gray-600">Match Required</p>
              <p className="text-sm font-semibold text-gray-900">
                {opportunity.match_requirement_percentage}%
              </p>
            </div>
          )}

          {opportunity.credit_percentage && (
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <Percent className="w-4 h-4 text-gray-600 mx-auto mb-1" />
              <p className="text-xs text-gray-600">Tax Credit</p>
              <p className="text-sm font-semibold text-gray-900">
                {opportunity.credit_percentage}%
              </p>
            </div>
          )}

          {opportunity.cfda_number && (
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <FileText className="w-4 h-4 text-gray-600 mx-auto mb-1" />
              <p className="text-xs text-gray-600">CFDA</p>
              <p className="text-sm font-semibold text-gray-900">
                {opportunity.cfda_number}
              </p>
            </div>
          )}
        </div>

        {/* Tags */}
        {(opportunity.project_types || opportunity.organization_types || opportunity.geography) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {opportunity.project_types?.slice(0, 3).map(type => (
              <span key={type} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700">
                {type.replace('_', ' ')}
              </span>
            ))}
            {opportunity.organization_types?.slice(0, 2).map(type => (
              <span key={type} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-accent-50 text-accent-700">
                {type.replace('_', ' ')}
              </span>
            ))}
            {opportunity.geography?.slice(0, 2).map(geo => (
              <span key={geo} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                <MapPin className="w-3 h-3 mr-1" />
                {geo}
              </span>
            ))}
          </div>
        )}

        {/* Certification Badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          {opportunity.minority_business && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-50 text-purple-700 border border-purple-200">
              Minority Business
            </span>
          )}
          {opportunity.woman_owned_business && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-pink-50 text-pink-700 border border-pink-200">
              Woman Owned
            </span>
          )}
          {opportunity.veteran_owned_business && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-50 text-red-700 border border-red-200">
              Veteran Owned
            </span>
          )}
          {opportunity.small_business_only && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-50 text-green-700 border border-green-200">
              Small Business
            </span>
          )}
        </div>

        {/* Enhanced Actions Section */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-3">
            <button
              onClick={onAnalyze}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Zap className="w-4 h-4 mr-2" />
              AI Analysis
            </button>
            
            {opportunity.source_url && (
              <a
                href={opportunity.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Details
              </a>
            )}
          </div>

          <div className="flex items-center space-x-4 text-xs text-gray-500">
            {opportunity.contact_email && (
              <span className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                Contact available
              </span>
            )}
            {opportunity.required_documents && (
              <span>{opportunity.required_documents.length} documents required</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}