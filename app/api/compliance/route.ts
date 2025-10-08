import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase env vars missing')
  return createClient(url, key)
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getServerClient()
    const userId = req.nextUrl.searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Get compliance overview
    const [
      trackingResult,
      documentsResult,
      historyResult,
      preferencesResult,
      recurringResult,
      alertsResult,
      rulesResult,
      analyticsResult
    ] = await Promise.all([
      // Compliance tracking items
      supabase
        .from('compliance_tracking')
        .select('*')
        .eq('user_id', userId)
        .order('deadline_date', { ascending: true }),
      
      // Compliance documents
      supabase
        .from('compliance_documents')
        .select('*')
        .eq('user_id', userId)
        .order('expiration_date', { ascending: true }),
      
      // Recent compliance history
      supabase
        .from('compliance_history')
        .select('*')
        .eq('user_id', userId)
        .order('check_date', { ascending: false })
        .limit(10),
      
      // User preferences
      supabase
        .from('compliance_preferences')
        .select('*')
        .eq('user_id', userId)
        .single(),

      // Recurring compliance tasks
      supabase
        .from('compliance_recurring')
        .select('*')
        .eq('user_id', userId)
        .order('next_due_date', { ascending: true }),

      // Stored compliance alerts
      supabase
        .from('compliance_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),

      // Active compliance rules for reference
      supabase
        .from('compliance_rules')
        .select('*')
        .eq('is_active', true)
        .order('rule_name', { ascending: true }),

      // Recent analytics snapshots
      supabase
        .from('compliance_analytics')
        .select('*')
        .eq('user_id', userId)
        .order('report_date', { ascending: false })
        .limit(5)
    ])

    // Calculate compliance status
    const now = new Date()
    const trackingItems = trackingResult.data || []
    const documents = documentsResult.data || []
    const history = historyResult.data || []
    const recurringItems = recurringResult.data || []
    const storedAlerts = alertsResult.data || []
    const rules = rulesResult.data || []
    const analytics = analyticsResult.data || []
    const preferences = preferencesResult.data || {
      alert_thresholds: { critical: 7, warning: 14, info: 30 },
      notification_preferences: { email: true, app: true, sms: false }
    }

    // Analyze current status
    const overdueItems = trackingItems.filter(item => 
      item.deadline_date && new Date(item.deadline_date) < now && item.status !== 'completed'
    )
    
    const criticalItems = trackingItems.filter(item => {
      if (!item.deadline_date || item.status === 'completed') return false
      const daysUntil = Math.ceil((new Date(item.deadline_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntil <= (preferences.alert_thresholds?.critical || 7)
    })

    const warningItems = trackingItems.filter(item => {
      if (!item.deadline_date || item.status === 'completed') return false
      const daysUntil = Math.ceil((new Date(item.deadline_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntil > (preferences.alert_thresholds?.critical || 7) && 
             daysUntil <= (preferences.alert_thresholds?.warning || 14)
    })

    const expiredDocuments = documents.filter(doc => 
      doc.expiration_date && new Date(doc.expiration_date) < now
    )
    
    const expiringDocuments = documents.filter(doc => {
      if (!doc.expiration_date) return false
      const daysUntil = Math.ceil((new Date(doc.expiration_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntil > 0 && daysUntil <= (preferences.alert_thresholds?.warning || 14)
    })

    const overdueRecurring = recurringItems.filter(item =>
      item.next_due_date && new Date(item.next_due_date) < now && item.is_active
    )

    const upcomingRecurring = recurringItems.filter(item => {
      if (!item.next_due_date || !item.is_active) return false
      const daysUntil = Math.ceil((new Date(item.next_due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntil >= 0 && daysUntil <= (preferences.alert_thresholds?.info || 30)
    })

    const activeAlertsFromDb = storedAlerts.filter(alert => alert.is_active)
    const resolvedAlertsFromDb = storedAlerts.filter(alert => !alert.is_active)

    // Calculate overall compliance score
    const totalItems = trackingItems.length + documents.length + recurringItems.length
    const compliantItems = trackingItems.filter(item => item.status === 'completed').length + 
                          documents.filter(doc => doc.status === 'verified' || doc.status === 'uploaded').length +
                          recurringItems.filter(item => item.last_completed_date).length
    const complianceScore = totalItems > 0 ? Math.round((compliantItems / totalItems) * 100) : 100

    // Determine overall status
    let overallStatus = 'good'
    if (overdueItems.length > 0 || expiredDocuments.length > 0 || overdueRecurring.length > 0) {
      overallStatus = 'critical'
    } else if (criticalItems.length > 0 || expiringDocuments.length > 0 || upcomingRecurring.length > 0) {
      overallStatus = 'warning'
    }

    const computedAlerts = {
      overdue_items: overdueItems,
      critical_items: criticalItems,
      warning_items: warningItems,
      expired_documents: expiredDocuments,
      expiring_documents: expiringDocuments,
      overdue_recurring: overdueRecurring,
      upcoming_recurring: upcomingRecurring
    }

    const complianceOverview = {
      overall_status: overallStatus,
      compliance_score: complianceScore,
      tracking_items: trackingItems,
      documents: documents,
      history: history,
      preferences: preferences,
      recurring_items: recurringItems,
      alerts: {
        computed: computedAlerts,
        active: activeAlertsFromDb,
        recent: storedAlerts,
        resolved: resolvedAlertsFromDb
      },
      rules: rules,
      analytics: analytics,
      summary: {
        total_tracking_items: trackingItems.length,
        completed_items: trackingItems.filter(item => item.status === 'completed').length,
        pending_items: trackingItems.filter(item => item.status === 'pending').length,
        overdue_count: overdueItems.length,
        total_documents: documents.length,
        verified_documents: documents.filter(doc => doc.status === 'verified').length,
        missing_documents: documents.filter(doc => doc.status === 'missing').length,
        expired_documents: expiredDocuments.length,
        total_recurring_items: recurringItems.length,
        active_recurring_items: recurringItems.filter(item => item.is_active).length,
        overdue_recurring: overdueRecurring.length
      }
    }

    return NextResponse.json({ success: true, data: complianceOverview })
  } catch (error) {
    console.error('GET /api/compliance error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getServerClient()
    const { userId, action, data } = await req.json()

    if (!userId || !action) {
      return NextResponse.json({ error: 'userId and action required' }, { status: 400 })
    }

    let result

    switch (action) {
      case 'create_tracking_item':
        result = await supabase
          .from('compliance_tracking')
          .insert({
            user_id: userId,
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()
        break

      case 'update_tracking_item':
        result = await supabase
          .from('compliance_tracking')
          .update({
            ...data,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.id)
          .eq('user_id', userId)
          .select()
          .single()
        break

      case 'create_document':
        result = await supabase
          .from('compliance_documents')
          .insert({
            user_id: userId,
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()
        break

      case 'update_document':
        result = await supabase
          .from('compliance_documents')
          .update({
            ...data,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.id)
          .eq('user_id', userId)
          .select()
          .single()
        break

      case 'create_recurring':
        result = await supabase
          .from('compliance_recurring')
          .insert({
            user_id: userId,
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()
        break

      case 'update_recurring':
        result = await supabase
          .from('compliance_recurring')
          .update({
            ...data,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.id)
          .eq('user_id', userId)
          .select()
          .single()
        break

      case 'create_alert':
        result = await supabase
          .from('compliance_alerts')
          .insert({
            user_id: userId,
            is_active: true,
            is_read: false,
            ...data,
            created_at: new Date().toISOString()
          })
          .select()
          .single()
        break

      case 'mark_alert_read':
        result = await supabase
          .from('compliance_alerts')
          .update({
            is_read: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.id)
          .eq('user_id', userId)
          .select()
          .single()
        break

      case 'resolve_alert':
        result = await supabase
          .from('compliance_alerts')
          .update({
            is_active: false,
            is_read: true,
            resolved_at: new Date().toISOString()
          })
          .eq('id', data.id)
          .eq('user_id', userId)
          .select()
          .single()
        break

      case 'update_preferences':
        result = await supabase
          .from('compliance_preferences')
          .upsert({
            user_id: userId,
            ...data,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' })
          .select()
          .single()
        break

      case 'run_compliance_check':
        // Run a comprehensive compliance check
        const checkResult = await runComplianceCheck(supabase, userId)
        
        // Log the check
        await supabase
          .from('compliance_history')
          .insert({
            user_id: userId,
            check_date: new Date().toISOString(),
            overall_status: checkResult.overall_status,
            compliance_score: checkResult.compliance_score,
            results: checkResult,
            alerts_generated: checkResult.alerts || [],
            recommendations: checkResult.recommendations || []
          })

        result = { data: checkResult }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (result.error) {
      throw result.error
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error('POST /api/compliance error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

async function runComplianceCheck(supabase: any, userId: string) {
  const now = new Date()

  // Get all compliance items
  const [trackingResult, documentsResult, recurringResult] = await Promise.all([
    supabase.from('compliance_tracking').select('*').eq('user_id', userId),
    supabase.from('compliance_documents').select('*').eq('user_id', userId),
    supabase.from('compliance_recurring').select('*').eq('user_id', userId).eq('is_active', true)
  ])

  const trackingItems = trackingResult.data || []
  const documents = documentsResult.data || []
  const recurringItems = recurringResult.data || []

  // Check for issues
  const overdueItems = trackingItems.filter(item => 
    item.deadline_date && new Date(item.deadline_date) < now && item.status !== 'completed'
  )

  const expiredDocuments = documents.filter(doc => 
    doc.expiration_date && new Date(doc.expiration_date) < now
  )

  const missingRequiredDocs = documents.filter(doc => 
    doc.is_required && doc.status === 'missing'
  )

  const overdueRecurring = recurringItems.filter(item => 
    new Date(item.next_due_date) < now
  )

  const upcomingRecurring = recurringItems.filter(item => {
    const dueDate = new Date(item.next_due_date)
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilDue >= 0 && daysUntilDue <= 30
  })

  // Generate alerts
  const alerts: any[] = []
  
  if (overdueItems.length > 0) {
    alerts.push({
      level: 'critical',
      type: 'overdue_items',
      message: `${overdueItems.length} compliance item(s) are overdue`,
      items: overdueItems
    })
  }

  if (expiredDocuments.length > 0) {
    alerts.push({
      level: 'critical',
      type: 'expired_documents',
      message: `${expiredDocuments.length} document(s) have expired`,
      items: expiredDocuments
    })
  }

  if (missingRequiredDocs.length > 0) {
    alerts.push({
      level: 'warning',
      type: 'missing_documents',
      message: `${missingRequiredDocs.length} required document(s) are missing`,
      items: missingRequiredDocs
    })
  }

  // Calculate compliance score
  const totalItems = trackingItems.length + documents.length
  const compliantItems = trackingItems.filter(item => item.status === 'completed').length + 
                        documents.filter(doc => doc.status === 'verified' || doc.status === 'uploaded').length
  const complianceScore = totalItems > 0 ? Math.round((compliantItems / totalItems) * 100) : 100

  // Determine overall status
  let overallStatus = 'good'
  if (overdueItems.length > 0 || expiredDocuments.length > 0) {
    overallStatus = 'critical'
  } else if (missingRequiredDocs.length > 0 || overdueRecurring.length > 0) {
    overallStatus = 'warning'
  }

  // Generate recommendations
  const recommendations: string[] = []
  if (complianceScore < 80) {
    recommendations.push('Focus on completing pending compliance items to improve your score')
  }
  if (expiredDocuments.length > 0) {
    recommendations.push('Renew expired documents immediately to maintain compliance')
  }
  if (missingRequiredDocs.length > 0) {
    recommendations.push('Upload required documents to ensure regulatory compliance')
  }

  // Synchronize stored compliance alerts
  try {
    const { data: existingActiveAlerts } = await supabase
      .from('compliance_alerts')
      .select('id, alert_type, message')
      .eq('user_id', userId)
      .eq('is_active', true)

    const alertKeys = new Set(alerts.map(alert => `${alert.type}:${alert.message}`))
    const existingKeys = new Map((existingActiveAlerts || []).map(alert => [`${alert.alert_type}:${alert.message}`, alert.id]))

    const newAlertsPayload = alerts
      .filter(alert => !existingKeys.has(`${alert.type}:${alert.message}`))
      .map(alert => ({
        user_id: userId,
        alert_type: alert.type,
        severity: alert.level,
        message: alert.message,
        alert_data: alert,
        is_active: true,
        is_read: false,
        created_at: new Date().toISOString()
      }))

    if (newAlertsPayload.length > 0) {
      await supabase.from('compliance_alerts').insert(newAlertsPayload)
    }

    // Resolve alerts no longer present
    const alertsToResolve = (existingActiveAlerts || [])
      .filter(alert => !alertKeys.has(`${alert.alert_type}:${alert.message}`))
      .map(alert => alert.id)

    if (alertsToResolve.length > 0) {
      await supabase
        .from('compliance_alerts')
        .update({ is_active: false, resolved_at: new Date().toISOString() })
        .in('id', alertsToResolve)
    }
  } catch (syncError) {
    console.warn('Failed to sync compliance alerts:', syncError)
  }

  return {
    overall_status: overallStatus,
    compliance_score: complianceScore,
    alerts: alerts,
    recommendations: recommendations,
    summary: {
      total_items: totalItems,
      compliant_items: compliantItems,
      overdue_items: overdueItems.length,
      expired_documents: expiredDocuments.length,
      missing_documents: missingRequiredDocs.length,
      overdue_recurring: overdueRecurring.length,
      upcoming_recurring: upcomingRecurring.length
    },
    detail: {
      overdue_items: overdueItems,
      expired_documents: expiredDocuments,
      missing_required_documents: missingRequiredDocs,
      overdue_recurring: overdueRecurring,
      upcoming_recurring: upcomingRecurring
    }
  }
}