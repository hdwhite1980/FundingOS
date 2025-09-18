// hooks/useFieldAIHelp.js
import { useState, useCallback } from 'react'

export function useFieldAIHelp(userId) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const fetchHelp = useCallback(async ({ field, currentValue = '', projectDraft = {}, useLLM = true }) => {
    if (!userId) return
    setLoading(true); setError(null)
    try {
      const resp = await fetch('/api/ai/assistant/field-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, field, currentValue, projectDraft, useLLM })
      })
      if (!resp.ok) throw new Error('Request failed')
      const json = await resp.json()
      setData(json.data)
      return json.data
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [userId])

  return { loading, error, data, fetchHelp }
}

export default useFieldAIHelp
