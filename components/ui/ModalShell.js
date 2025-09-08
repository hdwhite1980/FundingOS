import React from 'react'

export function ModalShell({ title, subtitle, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full p-6 md:p-7 animate-scale-in">
        <div className="flex items-start justify-between mb-6">
          <div>
            {title && <h3 className="text-xl font-semibold text-slate-900 tracking-tight">{title}</h3>}
            {subtitle && <p className="text-sm text-slate-600 mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-2 transition-colors hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
        <div className="space-y-5">{children}</div>
        {footer && <div className="mt-6">{footer}</div>}
      </div>
    </div>
  )
}

export default ModalShell
