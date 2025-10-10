import React from 'react'

const OpportunityCard = ({ 
  opportunity, 
  selectedProject, 
  userProfile, 
  onAnalyze,
  onShowDetails,
  onRowClick,
  fitScore,
  deadlineStatus,
  index,
  resourceOnly = false
}) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'bg-green-100 text-green-800'
      case 'closing soon': return 'bg-yellow-100 text-yellow-800'
      case 'closed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const getFitScoreColor = (score) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'  
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatAmount = (amount) => {
    if (!amount) return 'N/A'
    if (typeof amount === 'string' && amount.includes('$')) return amount
    if (typeof amount === 'number') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount)
    }
    return amount.toString()
  }

  const handleRowClick = () => {
    if (onShowDetails) {
      onShowDetails(opportunity)
    } else if (onRowClick) {
      onRowClick(opportunity)
    }
  }

  return (
    <div 
      className="px-6 py-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={handleRowClick}
    >
      <div className="grid grid-cols-12 gap-4 items-center text-sm">
        {/* Opportunity Title */}
        <div className="col-span-4">
          <div className="font-medium text-gray-900 truncate pr-2">
            {opportunity.title}
          </div>
          <div className="text-gray-500 text-xs mt-1">
            {opportunity.funder_name || opportunity.sponsor}
          </div>
        </div>

        {/* Amount */}
        {!resourceOnly && (
          <div className="col-span-2 text-gray-600">
            {opportunity.amount_min && opportunity.amount_max 
              ? `$${opportunity.amount_min.toLocaleString()} - $${opportunity.amount_max.toLocaleString()}`
              : formatAmount(opportunity.amount)}
          </div>
        )}

        {/* Deadline */}
        <div className="col-span-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${deadlineStatus?.color || 'bg-gray-100 text-gray-600'}`}>
            {deadlineStatus?.text || 'No deadline'}
          </span>
        </div>

        {/* Fit Score */}
        <div className="col-span-1 text-center">
          <span className={`font-bold ${getFitScoreColor(fitScore)}`}>
            {fitScore}%
          </span>
        </div>

        {/* Status */}
        <div className="col-span-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(opportunity.status)}`}>
            {opportunity.status || 'Active'}
          </span>
        </div>

        {/* Action */}
        <div className="col-span-1 flex justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAnalyze()
            }}
            className="text-blue-600 hover:text-blue-800 font-medium text-xs px-3 py-1 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
          >
            Analyze
          </button>
        </div>
      </div>
    </div>
  )
}

export default OpportunityCard