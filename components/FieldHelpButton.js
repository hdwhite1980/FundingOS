// components/FieldHelpButton.js
'use client'
import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import useFieldAIHelp from '../hooks/useFieldAIHelp'

export default function FieldHelpButton({ userId, field, currentValue, projectDraft }) {
  const { loading, data, fetchHelp } = useFieldAIHelp(userId)
  const [open, setOpen] = useState(false)

  const handleClick = async () => {
    if (!open) {
      await fetchHelp({ field, currentValue, projectDraft })
    }
    setOpen(!open)
  }

  return (
    <div className="inline-block relative ml-2 align-top">
      <button
        type="button"
        onClick={handleClick}
  className="p-1.5 rounded-md border text-xs flex items-center gap-1 bg-white hover:bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm"
  title="Wali-OS Assistant: Improve this field"
      >
        <Sparkles className="w-4 h-4" /> AI
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-80 bg-white border border-emerald-200 rounded-lg shadow-lg p-3 text-sm">
          {loading && <div className="text-emerald-600">Thinking…</div>}
          {!loading && data && (
            <div className="space-y-2">
              <div className="font-semibold text-emerald-700">Wali-OS Guidance</div>
              <p className="text-gray-700 whitespace-pre-line">{data.explanation}</p>
              {data.what_great_looks_like?.length > 0 && (
                <div>
                  <div className="font-medium text-gray-800 mb-1">What Great Looks Like</div>
                  <ul className="list-disc list-inside space-y-0.5 text-gray-700">
                    {data.what_great_looks_like.map((x,i)=>(<li key={i}>{x}</li>))}
                  </ul>
                </div>
              )}
              {data.examples?.length > 0 && (
                <div>
                  <div className="font-medium text-gray-800 mb-1">Example</div>
                  <div className="bg-gray-50 border border-gray-200 rounded p-2 text-xs text-gray-600">{data.examples[0]}</div>
                </div>
              )}
              {data.common_pitfalls?.length > 0 && (
                <div>
                  <div className="font-medium text-gray-800 mb-1">Common Pitfalls</div>
                  <ul className="list-disc list-inside space-y-0.5 text-gray-700">
                    {data.common_pitfalls.map((x,i)=>(<li key={i}>{x}</li>))}
                  </ul>
                </div>
              )}
              {data.suggestions?.length > 0 && (
                <div className="text-emerald-700 text-xs">{data.suggestions[0]}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
