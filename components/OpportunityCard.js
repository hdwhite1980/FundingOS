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
  onShowDetails,
  fitScore, 
  deadlineStatus,
  index 
}) {
  const formatAmount = (min, max) => {
    if (!min && !max) return 'Amount varies'
    if (!min) return `Up to $${max.toLocaleString()}`
    if (!max) return `From $${min.toLocaleString()}`
    if (min === max) return `$${min.toLocaleString()}`
    return `$${min.toLocaleString()} - $${max.toLocaleString()}`
  }

  const getStatusColor = () => {
    if (!opportunity.deadline_date) return 'bg-blue-500' // Rolling deadline
    
    const now = new Date()
    const deadline = new Date(opportunity.deadline_date)
    const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))
    
    if (daysLeft < 0) return 'bg-gray-400' // Expired
    if (daysLeft <= 7) return 'bg-red-500' // Urgent
    if (daysLeft <= 30) return 'bg-yellow-500' // Soon
    return 'bg-green-500' // Active/Good timing
  }

  const getStatusText = () => {
    if (!opportunity.deadline_date) return 'Rolling'
    
    const now = new Date()
    const deadline = new Date(opportunity.deadline_date)
    const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))
    
    if (daysLeft < 0) return 'Expired'
    if (daysLeft <= 7) return 'Urgent'
    if (daysLeft <= 30) return 'Active'
    return 'Active'
  }

  return (
    <div className="bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Status Column */}
          <div className="flex items-center space-x-3 w-24">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
            <span className="text-sm font-medium text-gray-600">{getStatusText()}</span>
          </div>
          
          {/* Opportunity/Service Column */}
          <div className="flex-1 min-w-0 mx-6">
            <h3 className="text-sm font-semibold text-gray-900 truncate mb-1">
              {opportunity.title}
            </h3>
            <p className="text-xs text-gray-500 truncate">
              {opportunity.sponsor}
              {fitScore && (
                <span className="ml-2 text-xs text-blue-600">
                  • {fitScore}% match
                </span>
              )}
            </p>
          </div>
          
          {/* Price Column */}
          <div className="text-right w-32">
            <div className="text-sm font-semibold text-gray-900">
              {formatAmount(opportunity.amount_min, opportunity.amount_max)}
            </div>
            {opportunity.deadline_date && (
              <div className="text-xs text-gray-500">
                {deadlineStatus.text}
              </div>
            )}
          </div>
          
          {/* Actions Column */}
          <div className="flex items-center space-x-2 ml-4 w-24 justify-end">
            <button
              onClick={onAnalyze}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors duration-150"
              title="AI Strategic Analysis"
            >
              <Zap className="w-4 h-4" />
            </button>
            
            {opportunity.source_url && (
              <a
                href={opportunity.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors duration-150"
                title="View Details"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            
            <button 
              onClick={() => onShowDetails && onShowDetails(opportunity)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors duration-150"
              title="Show Details"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}