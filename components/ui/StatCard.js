import React from 'react'

export function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-3">
            <div className={`p-2.5 rounded-lg mr-4 ${iconBg || 'bg-slate-50'}`}>
              {Icon && <Icon className={`w-5 h-5 ${iconColor || 'text-slate-700'}`} />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600">{label}</p>
              {sub && (
                <div className="flex items-center mt-1 text-xs font-medium text-emerald-600">
                  {sub}
                </div>
              )}
            </div>
          </div>
          <div className="mb-2">
            <p className="text-2xl font-bold text-slate-900">{value}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatCard
