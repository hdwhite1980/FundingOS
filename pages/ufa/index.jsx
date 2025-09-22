import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '../../lib/supabase'

const UnifiedFundingIntelligenceDashboard = dynamic(() => import('../../components/UnifiedFundingIntelligenceDashboard'), { ssr: false })

export default function UfaPage() {
  const [tenantId, setTenantId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          if (mounted) {
            setError('You must be signed in to view the UFA dashboard.')
            setLoading(false)
          }
          return
        }

        const user = session.user
        let resolvedTenantId = user.id

        // Try to read tenant_id from profiles if present
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .maybeSingle()

          resolvedTenantId = profile?.tenant_id || user.user_metadata?.tenant_id || user.id
        } catch {}

        if (mounted) setTenantId(resolvedTenantId)
      } catch (e) {
        if (mounted) setError('Failed to load session context')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  if (loading) return <div className="p-6">Loading dashboard…</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!tenantId) return <div className="p-6">Unable to resolve tenant context.</div>

  return (
    <div className="max-w-7xl mx-auto">
      <UnifiedFundingIntelligenceDashboard tenantId={tenantId} />
    </div>
  )
}
