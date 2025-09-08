import React from 'react'

export function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6 hover:shadow-md transition-all duration-300">
      <div className="flex items-center">
        <div className={`p-2.5 rounded-lg mr-4 ${iconBg || 'bg-brand-50'}`}>
          {Icon && <Icon className={`w-5 h-5 ${iconColor || 'text-brand-600'}`} />}
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-neutral-900 leading-none">{value}</p>
          {sub && <p className="mt-1 text-[11px] font-medium text-neutral-400">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

export default StatCard
