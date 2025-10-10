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
  const isAdmin = ['admin', 'super_admin'].includes(userProfile?.user_role)

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

  const resourceTypeBadges = () => {
    if (!resourceOnly) return null
    const types = Array.isArray(opportunity?.ai_analysis?.resourceTypes)
      ? opportunity.ai_analysis.resourceTypes
      : Array.isArray(opportunity?.ai_categories)
        ? opportunity.ai_categories
        : []

    const normalize = (t) => String(t || '').toLowerCase()
    const unique = Array.from(new Set((types || []).map(normalize)))

    const labelMap = {
      software_grant: 'Software Grant',
      cloud_credits: 'Cloud Credits',
      data_credits: 'Data Credits',
      ad_credits: 'Ad Credits',
      in_kind: 'In‑Kind',
      services: 'Services',
      mentorship: 'Mentorship',
      training: 'Training',
      equipment: 'Equipment',
      facility_access: 'Facility Access',
      incubator: 'Incubator',
      accelerator: 'Accelerator',
      resources: null,
      non_monetary: null
    }

    const colorMap = {
      mentorship: 'bg-indigo-100 text-indigo-800',
      training: 'bg-amber-100 text-amber-800',
      facility_access: 'bg-teal-100 text-teal-800',
      cloud_credits: 'bg-blue-100 text-blue-800',
      software_grant: 'bg-purple-100 text-purple-800',
      in_kind: 'bg-emerald-100 text-emerald-800',
      services: 'bg-slate-100 text-slate-800',
      equipment: 'bg-orange-100 text-orange-800',
      incubator: 'bg-pink-100 text-pink-800',
      accelerator: 'bg-fuchsia-100 text-fuchsia-800',
      data_credits: 'bg-cyan-100 text-cyan-800',
      ad_credits: 'bg-lime-100 text-lime-800'
    }

    const rendered = unique
      .map(t => ({ key: t, label: labelMap[t] || (t.charAt(0).toUpperCase() + t.slice(1).replace('_',' ')), color: colorMap[t] || 'bg-gray-100 text-gray-700' }))
      .filter(b => b.label)

    if (rendered.length === 0) return null

    return (
      <div className="mt-2 flex flex-wrap gap-1">
        {rendered.slice(0, 4).map(b => (
          <span key={b.key} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${b.color}`}>
            {b.label}
          </span>
        ))}
        {rendered.length > 4 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">
            +{rendered.length - 4} more
          </span>
        )}
      </div>
    )
  }

  const handleReclassify = async (makeNonMonetary) => {
    try {
      const resp = await fetch('/api/opportunities/reclassify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: opportunity.id,
          makeNonMonetary,
          userRole: userProfile?.user_role || 'company'
        })
      })
      const json = await resp.json()
      if (!resp.ok || !json.success) {
        window.alert(json.error || 'Reclassification failed')
        return
      }
      window.alert(makeNonMonetary ? 'Marked as non‑monetary.' : 'Marked as monetary.')
      // Basic refresh to reflect filters immediately
      if (typeof window !== 'undefined') window.location.reload()
    } catch (e) {
      console.error('Reclassification error', e)
      window.alert('Network error during reclassification')
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
          {resourceTypeBadges()}
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
        <div className="col-span-1 flex justify-end gap-2">
          {isAdmin && (
            resourceOnly ? (
              <button
                onClick={(e) => { e.stopPropagation(); handleReclassify(false) }}
                className="text-red-600 hover:text-red-800 font-medium text-[10px] px-2 py-1 border border-red-600 rounded hover:bg-red-50 transition-colors"
                title="Move this out of Resources"
              >
                Mark Monetary
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); handleReclassify(true) }}
                className="text-emerald-600 hover:text-emerald-800 font-medium text-[10px] px-2 py-1 border border-emerald-600 rounded hover:bg-emerald-50 transition-colors"
                title="Mark as non‑monetary resource"
              >
                Mark Non‑Monetary
              </button>
            )
          )}
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