import React from 'react'

export function ModalShell({ title, subtitle, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-xl max-w-lg w-full p-6 md:p-7 animate-scale-in">
        <div className="flex items-start justify-between mb-6">
          <div>
            {title && <h3 className="text-xl font-semibold text-neutral-900 tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 rounded-md p-1.5 transition-colors"
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
