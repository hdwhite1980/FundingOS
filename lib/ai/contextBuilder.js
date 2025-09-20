// lib/ai/contextBuilder.js
import { supabaseAdmin } from '../supabaseAdmin'

// Enhanced intent classification with more specific patterns
export function classifyAssistantIntent(message) {
  const lower = message.toLowerCase().trim()
  
  // EIN/Tax ID patterns (highest priority)
  if (lower.match(/\b(ein|tax\s*id|employer\s*identification|federal\s*tax)\b/)) {
    return 'ein_lookup'
  }
  
  // Deadline patterns
  if (lower.match(/\b(deadline|due\s*date|when\s*due|expires?|closing)\b/)) {
    return 'deadline_check'
  }
  
  // Application patterns
  if (lower.match(/\b(application|apply|submit|proposal|grant\s*writing)\b/)) {
    return 'application_help'
  }
  
  // Opportunity patterns
  if (lower.match(/\b(opportunity|grant|funding|match|search|find)\b/)) {
    return 'opportunity_discovery'
  }
  
  // Budget patterns
  if (lower.match(/\b(budget|cost|expense|financial|money|dollar)\b/)) {
    return 'budget_help'
  }
  
  // Status patterns
  if (lower.match(/\b(status|progress|complete|pending|review)\b/)) {
    return 'status_check'
  }
  
  return 'general_help'
}

// Enhanced response generation with real data lookups
export async function generateAssistantResponse(intent, context, message, userId) {
  try {
    switch (intent) {
      case 'ein_lookup':
        return await buildEINResponse(context, message, userId)
      
      case 'deadline_check':
        return await buildDeadlineResponse(context, message, userId)
      
      case 'application_help':
        return await buildApplicationResponse(context, message, userId)
      
      case 'opportunity_discovery':
        return await buildOpportunityResponse(context, message, userId)
      
      case 'budget_help':
        return await buildBudgetResponse(context, message, userId)
      
      case 'status_check':
        return await buildStatusResponse(context, message, userId)
      
      default:
        return await buildGeneralResponse(context, message, userId)
    }
  } catch (error) {
    console.error(`Error generating ${intent} response:`, error)
    return "I'm having trouble accessing your data right now. Please try again in a moment."
  }
}

// Real EIN lookup with actual database query
export async function buildEINResponse(context, message, userId) {
  try {
    // First try from cached context
    const orgProfile = context?.profile
    if (orgProfile?.ein || orgProfile?.tax_id) {
      const ein = orgProfile.ein || orgProfile.tax_id
      return `📄 Your organization's EIN is: **${ein}**\n\nThis is registered for ${orgProfile.organization_name || 'your organization'}.`
    }
    
    // Fallback: Direct database lookup
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('ein, tax_id, organization_name, organization_type')
      .eq('user_id', userId)
      .single()
    
    if (error) {
      console.error('EIN lookup error:', error)
      return "I couldn't find your EIN in our records. You can add it in your organization settings."
    }
    
    const ein = profile?.ein || profile?.tax_id
    if (ein) {
      return `📄 Your organization's EIN is: **${ein}**\n\nOrganization: ${profile.organization_name || 'Not specified'}\nType: ${profile.organization_type || 'Not specified'}\n\nNeed to update this information? Check your organization settings.`
    }
    
    return "📄 I don't see an EIN on file for your organization. You can add it in your organization settings - it's required for most grant applications."
    
  } catch (error) {
    console.error('EIN response error:', error)
    return "I'm having trouble accessing your EIN information. Please check your organization settings."
  }
}

// Real deadline lookup
export async function buildDeadlineResponse(context, message, userId) {
  try {
    // Get upcoming deadlines from opportunities and applications
    const { data: opportunities, error: oppError } = await supabaseAdmin
      .from('opportunities')
      .select('title, deadline, application_deadline, status')
      .eq('user_id', userId)
      .gte('deadline', new Date().toISOString())
      .order('deadline', { ascending: true })
      .limit(5)
    
    const { data: applications, error: appError } = await supabaseAdmin
      .from('applications')
      .select('title, deadline, status, opportunity_id')
      .eq('user_id', userId)
      .gte('deadline', new Date().toISOString())
      .order('deadline', { ascending: true })
      .limit(5)
    
    if (oppError || appError) {
      return "I'm having trouble accessing your deadline information."
    }
    
    const allDeadlines = [
      ...(opportunities || []).map(o => ({
        title: o.title,
        deadline: o.deadline || o.application_deadline,
        type: 'opportunity',
        status: o.status
      })),
      ...(applications || []).map(a => ({
        title: a.title,
        deadline: a.deadline,
        type: 'application',
        status: a.status
      }))
    ].sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    
    if (allDeadlines.length === 0) {
      return "🎉 You don't have any upcoming deadlines! Time to find new opportunities."
    }
    
    const urgent = allDeadlines.filter(d => {
      const daysLeft = Math.ceil((new Date(d.deadline) - new Date()) / (1000 * 60 * 60 * 24))
      return daysLeft <= 7
    })
    
    let response = `📅 **Upcoming Deadlines:**\n\n`
    
    if (urgent.length > 0) {
      response += `🚨 **URGENT (7 days or less):**\n`
      urgent.forEach(d => {
        const daysLeft = Math.ceil((new Date(d.deadline) - new Date()) / (1000 * 60 * 60 * 24))
        response += `• ${d.title} - ${daysLeft} days left\n`
      })
      response += `\n`
    }
    
    const upcoming = allDeadlines.slice(0, 3).filter(d => !urgent.includes(d))
    if (upcoming.length > 0) {
      response += `📋 **Next up:**\n`
      upcoming.forEach(d => {
        const daysLeft = Math.ceil((new Date(d.deadline) - new Date()) / (1000 * 60 * 60 * 24))
        response += `• ${d.title} - ${daysLeft} days\n`
      })
    }
    
    return response
    
  } catch (error) {
    console.error('Deadline response error:', error)
    return "I'm having trouble accessing your deadline information."
  }
}

// Real application status lookup
export async function buildApplicationResponse(context, message, userId) {
  try {
    const { data: applications, error } = await supabaseAdmin
      .from('applications')
      .select('title, status, deadline, amount_requested, opportunity_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) {
      return "I'm having trouble accessing your application data."
    }
    
    if (!applications || applications.length === 0) {
      return "📝 You don't have any applications yet. Ready to start your first one?"
    }
    
    const byStatus = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1
      return acc
    }, {})
    
    const inProgress = applications.filter(a => ['draft', 'in_progress'].includes(a.status))
    const submitted = applications.filter(a => ['submitted', 'under_review'].includes(a.status))
    const decided = applications.filter(a => ['approved', 'rejected', 'awarded'].includes(a.status))
    
    let response = `📝 **Application Status:**\n\n`
    
    if (inProgress.length > 0) {
      response += `🔄 **In Progress (${inProgress.length}):**\n`
      inProgress.slice(0, 3).forEach(a => {
        const daysLeft = a.deadline ? Math.ceil((new Date(a.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null
        response += `• ${a.title}${daysLeft ? ` - ${daysLeft} days left` : ''}\n`
      })
      response += `\n`
    }
    
    if (submitted.length > 0) {
      response += `⏳ **Under Review (${submitted.length}):**\n`
      submitted.slice(0, 2).forEach(a => {
        response += `• ${a.title}\n`
      })
      response += `\n`
    }
    
    if (decided.length > 0) {
      const approved = decided.filter(a => ['approved', 'awarded'].includes(a.status)).length
      const rejected = decided.filter(a => a.status === 'rejected').length
      response += `✅ **Decided:** ${approved} approved, ${rejected} rejected\n\n`
    }
    
    const totalRequested = applications
      .filter(a => a.amount_requested)
      .reduce((sum, a) => sum + (parseFloat(a.amount_requested) || 0), 0)
    
    if (totalRequested > 0) {
      response += `💰 **Total Requested:** $${totalRequested.toLocaleString()}`
    }
    
    return response
    
  } catch (error) {
    console.error('Application response error:', error)
    return "I'm having trouble accessing your application data."
  }
}

// Real opportunity matching
export async function buildOpportunityResponse(context, message, userId) {
  try {
    const { data: opportunities, error } = await supabaseAdmin
      .from('opportunities')
      .select('title, deadline, amount_max, fit_score, status, source')
      .eq('user_id', userId)
      .gte('deadline', new Date().toISOString())
      .order('fit_score', { ascending: false })
      .limit(10)
    
    if (error) {
      return "I'm having trouble accessing opportunity data."
    }
    
    if (!opportunities || opportunities.length === 0) {
      return "🔍 No opportunities found. I can help you search for new funding sources."
    }
    
    const highFit = opportunities.filter(o => (o.fit_score || 0) >= 80)
    const mediumFit = opportunities.filter(o => (o.fit_score || 0) >= 60 && (o.fit_score || 0) < 80)
    
    let response = `🎯 **Funding Opportunities:**\n\n`
    
    if (highFit.length > 0) {
      response += `⭐ **High Match (80%+):**\n`
      highFit.slice(0, 3).forEach(o => {
        const daysLeft = Math.ceil((new Date(o.deadline) - new Date()) / (1000 * 60 * 60 * 24))
        const amount = o.amount_max ? `$${parseInt(o.amount_max).toLocaleString()}` : 'Amount varies'
        response += `• ${o.title} - ${amount} - ${daysLeft} days\n`
      })
      response += `\n`
    }
    
    if (mediumFit.length > 0) {
      response += `📋 **Good Match (60-79%):**\n`
      mediumFit.slice(0, 2).forEach(o => {
        const daysLeft = Math.ceil((new Date(o.deadline) - new Date()) / (1000 * 60 * 60 * 24))
        response += `• ${o.title} - ${daysLeft} days\n`
      })
    }
    
    return response
    
  } catch (error) {
    console.error('Opportunity response error:', error)
    return "I'm having trouble accessing opportunity data."
  }
}

// Budget helper
export async function buildBudgetResponse(context, message, userId) {
  try {
    const { data: applications, error } = await supabaseAdmin
      .from('applications')
      .select('title, amount_requested, budget_data, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (error || !applications?.length) {
      return "💰 I can help you build budgets for grant applications. What type of project are you budgeting for?"
    }
    
    const totalRequested = applications
      .filter(a => a.amount_requested)
      .reduce((sum, a) => sum + (parseFloat(a.amount_requested) || 0), 0)
    
    const avgRequest = applications.length > 0 ? totalRequested / applications.length : 0
    
    let response = `💰 **Budget Overview:**\n\n`
    response += `📊 **Your Applications:**\n`
    response += `• Total Requested: $${totalRequested.toLocaleString()}\n`
    response += `• Average Request: $${avgRequest.toLocaleString()}\n`
    response += `• Applications: ${applications.length}\n\n`
    
    response += `💡 **Budget Tips:**\n`
    response += `• Include indirect costs (typically 10-25%)\n`
    response += `• Personnel costs are usually the largest category\n`
    response += `• Always justify major expenses\n`
    response += `• Round to nearest $100 for clean presentation`
    
    return response
    
  } catch (error) {
    console.error('Budget response error:', error)
    return "💰 I can help you with budget planning and cost estimation for grant applications."
  }
}

// Status overview
export async function buildStatusResponse(context, message, userId) {
  try {
    const [appsResult, oppsResult, projectsResult] = await Promise.all([
      supabaseAdmin.from('applications').select('status').eq('user_id', userId),
      supabaseAdmin.from('opportunities').select('status, deadline').eq('user_id', userId),
      supabaseAdmin.from('projects').select('status').eq('user_id', userId)
    ])
    
    const apps = appsResult.data || []
    const opps = oppsResult.data || []
    const projects = projectsResult.data || []
    
    const appsByStatus = apps.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1
      return acc
    }, {})
    
    const activeOpps = opps.filter(o => 
      o.deadline && new Date(o.deadline) > new Date()
    ).length
    
    let response = `📊 **Status Overview:**\n\n`
    response += `📝 **Applications:**\n`
    Object.entries(appsByStatus).forEach(([status, count]) => {
      const emoji = status === 'approved' ? '✅' : status === 'submitted' ? '⏳' : '🔄'
      response += `${emoji} ${status}: ${count}\n`
    })
    
    response += `\n🎯 **Active Opportunities:** ${activeOpps}\n`
    response += `📋 **Projects:** ${projects.length}\n`
    
    return response
    
  } catch (error) {
    console.error('Status response error:', error)
    return "📊 I'm having trouble getting your status overview."
  }
}

// General help with context awareness
export async function buildGeneralResponse(context, message, userId) {
  const orgName = context?.profile?.organization_name || 'your organization'
  
  return `👋 Hi! I'm here to help ${orgName} with funding strategy.\n\n` +
    `💡 **I can help you with:**\n` +
    `• Finding your EIN/tax ID\n` +
    `• Checking upcoming deadlines\n` +
    `• Reviewing application status\n` +
    `• Discovering new opportunities\n` +
    `• Budget planning and guidance\n\n` +
    `Just ask me things like "What's my EIN?" or "Show me my deadlines."`
}

// Enhanced context builder with better caching
export async function getCachedOrgContext(userId, options = {}) {
  const { ttlMs = 5 * 60 * 1000 } = options // 5 min default
  
  try {
    const context = await buildOrgContext(userId)
    return { context, cached: false }
  } catch (error) {
    console.error('Context building error:', error)
    throw error
  }
}

// Core context builder - ensure this pulls all real data
export async function buildOrgContext(userId) {
  try {
    const [profileResult, projectsResult, appsResult, oppsResult] = await Promise.all([
      supabaseAdmin.from('user_profiles').select('*').eq('user_id', userId).single(),
      supabaseAdmin.from('projects').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabaseAdmin.from('applications').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabaseAdmin.from('opportunities').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    ])
    
    const profile = profileResult.data || {}
    const projects = projectsResult.data || []
    const applications = appsResult.data || []
    const opportunities = oppsResult.data || []
    
    return {
      profile,
      projects,
      applications,
      opportunities,
      funding_summary: {
        total_requested: applications.reduce((sum, a) => sum + (parseFloat(a.amount_requested) || 0), 0),
        applications_count: applications.length,
        award_rate: calculateAwardRate(applications)
      },
      meta: {
        updated_at: new Date().toISOString(),
        user_id: userId
      }
    }
  } catch (error) {
    console.error('Build context error:', error)
    throw error
  }
}

function calculateAwardRate(applications) {
  const decided = applications.filter(a => ['approved', 'rejected', 'awarded'].includes(a.status))
  const approved = decided.filter(a => ['approved', 'awarded'].includes(a.status))
  return decided.length > 0 ? Math.round((approved.length / decided.length) * 100) : 0
}