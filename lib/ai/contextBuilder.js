// lib/ai/contextBuilder.js
// Builds and (soon) caches rich per-organization AI context for the assistant.
// Phase 1: on-demand build (no persistent cache yet). Later we can add a cache table.

import { supabase } from '../supabase'

/**
 * Build full org-level context object used to ground assistant responses.
 * Accepts a userId (current authenticated user). We infer org via user profile.
 */
export async function buildOrgContext(userId, options = {}) {
  if (!userId) return { error: 'No userId provided' }

  const startedAt = Date.now()
  const context = { 
    meta: { generated_at: new Date().toISOString(), build_ms: 0 }, 
    profile: null, 
    projects: [], 
    applications: [], 
    opportunities: [], 
    donors: [], 
    investors: [], 
    company_settings: {},
    user_settings: {},
    funding_summary: {}, 
    analysis: { projects: [] } 
  }

  // 1. User profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (profileError) console.warn('contextBuilder profile error', profileError)
  context.profile = profile || null

  // 2. Company/Organization settings (if user has organization)
  if (profile?.organization_name || profile?.organization_id) {
    try {
      const { data: companySettings } = await supabase
        .from('company_settings')
        .select('*')
        .or(`organization_name.eq.${profile.organization_name},organization_id.eq.${profile.organization_id}`)
        .maybeSingle()
      
      context.company_settings = companySettings || {}
    } catch (e) {
      console.warn('Company settings table may not exist:', e.message)
    }
  }

  // 3. User-specific settings
  try {
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    
    context.user_settings = userSettings || {}
  } catch (e) {
    console.warn('User settings table may not exist:', e.message)
  }

  // 4. Projects
  if (profile) {
    const { data: projects, error: projErr } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (projErr) console.warn('contextBuilder projects error', projErr)
    context.projects = projects || []
  }

  // 5. Applications (submissions)
  const { data: submissions, error: subErr } = await supabase
    .from('submissions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (subErr) console.warn('contextBuilder submissions error', subErr)
  context.applications = submissions || []

  // 6. Donors (if table exists) - best effort
  try {
    const { data: donors, error: donorsErr } = await supabase
      .from('donors')
      .select('*')
      .eq('user_id', userId)
    if (!donorsErr) context.donors = donors || []
  } catch {}

  // 7. Investors (best effort)
  try {
    const { data: investors, error: invErr } = await supabase
      .from('investors')
      .select('*')
      .eq('user_id', userId)
    if (!invErr) context.investors = investors || []
  } catch {}

  // 8. Opportunities (limit to recent N to control payload size)
  const { data: opps, error: oppErr } = await supabase
    .from('opportunities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(options.maxOpportunities || 50)
  if (oppErr) console.warn('contextBuilder opportunities error', oppErr)
  context.opportunities = opps || []

  // 9. Project AI Analysis (if table exists)
  try {
    const { data: analyses } = await supabase
      .from('project_ai_analysis')
      .select('*')
      .eq('user_id', userId)
    context.analysis.projects = analyses || []
  } catch {}

  // 10. Funding summary quick aggregates
  context.funding_summary = computeFundingSummary(context)

  context.meta.build_ms = Date.now() - startedAt
  return context
}

function computeFundingSummary(context) {
  const submissions = context.applications || []
  const awarded = submissions.filter(s => s.status === 'approved')
  const pending = submissions.filter(s => ['submitted','in_review','pending','under_review'].includes((s.status||'').toLowerCase()))
  return {
    total_submissions: submissions.length,
    total_awarded: awarded.length,
    award_rate: submissions.length ? awarded.length / submissions.length : 0,
    pending_count: pending.length,
    last_submission_date: submissions[0]?.created_at || null
  }
}

/** Lightweight intent classification heuristic (Phase 1) */
export function classifyAssistantIntent(userMessage) {
  const text = (userMessage || '').toLowerCase()
  if (/deadline|due/.test(text)) return 'deadlines'
  if (/grant|opportunit/.test(text)) return 'opportunities'
  if (/project|narrative|budget/.test(text)) return 'project_help'
  if (/application|submit/.test(text)) return 'application_help'
  if (/donor|investor|funding/.test(text)) return 'funding_relationships'
  if (/help|what can you do|how/.test(text)) return 'capabilities'
  return 'general'
}

export function generateAssistantResponse(intent, context, message) {
  switch (intent) {
    case 'deadlines':
      return buildDeadlineResponse(context)
    case 'opportunities':
      return buildOpportunitiesResponse(context)
    case 'project_help':
      return genericProjectGuidance(context, message)
    case 'application_help':
      return buildApplicationHelp(context)
    case 'funding_relationships':
      return buildFundingRelationshipSummary(context)
    case 'capabilities':
      return capabilitiesMessage()
    default:
      return genericFallback(context, message)
  }
}

function buildDeadlineResponse(context) {
  const upcoming = (context.opportunities||[]).filter(o => o.deadline || o.deadline_date || o.application_deadline)
    .map(o => ({ title: o.title, deadline: o.deadline || o.deadline_date || o.application_deadline }))
    .slice(0,5)
  if (!upcoming.length) return 'No imminent deadlines found in your tracked opportunities.'
  return `Upcoming deadlines (top ${upcoming.length}):\n` + upcoming.map(u => `• ${u.title} – ${formatDate(u.deadline)}`).join('\n')
}

function buildOpportunitiesResponse(context) {
  const scored = (context.opportunities||[])
    .filter(o => typeof o.fit_score === 'number')
    .sort((a,b) => b.fit_score - a.fit_score)
    .slice(0,5)
  if (!scored.length) return 'I do not yet have scored opportunities. Once scoring and matching are active I will prioritize them here.'
  return 'Top opportunity matches:\n' + scored.map(o => `• ${o.title} (fit ${Math.round(o.fit_score)}%)`).join('\n')
}

function genericProjectGuidance(context, message) {
  const projects = context.projects || []
  if (!projects.length) return 'You have no projects yet. Create one and I can help structure goals, budget, and narrative.'
  
  const latest = projects[0]
  const lowerMessage = message.toLowerCase()
  
  // Provide field-specific guidance based on message content
  if (lowerMessage.includes('budget') || lowerMessage.includes('financial') || lowerMessage.includes('cost')) {
    const amount = latest.funding_request_amount || 0
    const companySettings = context.company_settings || {}
    const orgName = context.profile?.organization_name || companySettings.organization_name || 'your organization'
    return `For project "${latest.name}" requesting $${amount.toLocaleString()}, I can help with budget justification, cost categories, and financial sustainability. ${orgName}'s EIN (${companySettings.ein || 'not set'}) will be needed for most applications. Would you like help structuring your budget narrative or identifying cost-share requirements?`
  }
  
  if (lowerMessage.includes('narrative') || lowerMessage.includes('description') || lowerMessage.includes('story')) {
    return `Your project "${latest.name}" in ${(latest.project_categories||[]).join(', ') || 'general category'} needs compelling narrative. I can help craft your project description, impact statement, and sustainability plan. What specific narrative section are you working on?`
  }
  
  if (lowerMessage.includes('timeline') || lowerMessage.includes('schedule') || lowerMessage.includes('milestone')) {
    return `Project "${latest.name}" timeline is crucial for funders. I can help you create realistic milestones, identify critical path activities, and align deliverables with funder expectations. What's your project duration and key phases?`
  }
  
  return `You asked about projects. Your most recent project "${latest.name}" has a requested amount of ${latest.funding_request_amount ? '$' + latest.funding_request_amount.toLocaleString() : 'unspecified'} and categories: ${(latest.project_categories||[]).join(', ') || 'none set'}. Ask me about narrative improvement, budget clarity, or opportunity alignment to go deeper.`
}

function buildApplicationHelp(context) {
  const apps = context.applications || []
  if (!apps.length) return 'No applications found yet. Once you submit applications I can track status, timelines, and outcomes.'
  const inProgress = apps.filter(a => ['draft','in_progress'].includes((a.status||'').toLowerCase()))
  if (inProgress.length) {
    return `You have ${inProgress.length} application(s) in progress. Oldest in-progress started ${formatDate(inProgress[inProgress.length-1].created_at)}. I can help with narrative clarity, compliance checks, or aligning to sponsor priorities.`
  }
  return `You have ${apps.length} total applications. Approved: ${apps.filter(a=> (a.status||'').toLowerCase()==='approved').length}. Ask me for success pattern insights once cohort analytics are enabled.`
}

function buildFundingRelationshipSummary(context) {
  const donors = context.donors || []
  const investors = context.investors || []
  if (!donors.length && !investors.length) return 'No donor or investor records yet. Once added I can surface retention patterns and diversification risks.'
  return `You have ${donors.length} donors and ${investors.length} investors recorded. I will soon surface retention, concentration risk, and suggestions to diversify funding mix.`
}

function capabilitiesMessage() {
  return `I am your Funding Expert. I can help you with:

🎯 **Strategic Planning**
• Analyze your funding portfolio and identify gaps
• Match projects to high-fit opportunities
• Develop multi-year funding strategies

📝 **Application Excellence** 
• Complete complex grant forms step-by-step
• Improve narrative sections and impact statements
• Ensure compliance with funder requirements

💰 **Financial Optimization**
• Structure budgets and justify costs
• Identify cost-share and matching requirements
• Optimize funding mix across multiple sources

📊 **Project Development**
• Refine project descriptions and goals
• Create realistic timelines and milestones
• Align activities with funder priorities

🔍 **Opportunity Discovery**
• Find grants matching your focus areas
• Track deadlines and submission requirements
• Analyze fit scores and success probability

Ask me about any specific field, project, or funding question!`
}

function genericFallback(context, message) {
  return `I received: "${message}". Ask about deadlines, opportunities, projects, applications, donors, or say 'help' to see capabilities. I will become more contextual as the AI analysis pipeline is populated.`
}

function formatDate(d) {
  if (!d) return 'N/A'
  try { return new Date(d).toLocaleDateString() } catch { return d }
}

export async function getCachedOrgContext(userId, { ttlMs = 10 * 60 * 1000 } = {}) {
  const now = Date.now()
  try {
    const { data: cached } = await supabase
      .from('ai_org_context_cache')
      .select('*')
      .eq('user_id', userId)
      .eq('context_version', '1')
      .maybeSingle()
    if (cached) {
      const age = now - new Date(cached.refreshed_at).getTime()
      if (age < ttlMs) {
        return { context: cached.context_json, cached: true }
      }
    }
  } catch {}

  const fresh = await buildOrgContext(userId)
  const hash = computeSimpleHash(fresh)
  try {
    await supabase.from('ai_org_context_cache').upsert({
      user_id: userId,
      context_version: '1',
      context_hash: hash,
      context_json: fresh,
      refreshed_at: new Date().toISOString()
    }, { onConflict: 'user_id,context_version' })
  } catch (e) {
    console.warn('Failed to cache org context', e.message)
  }
  return { context: fresh, cached: false }
}

function computeSimpleHash(obj) {
  try {
    const c = obj || {}
    const parts = [
      c.projects?.length || 0,
      c.applications?.length || 0,
      c.opportunities?.length || 0,
      c.donors?.length || 0,
      c.investors?.length || 0,
      Math.round((c.funding_summary?.award_rate || 0) * 100)
    ].join('-')
    return parts + '-' + (JSON.stringify(c).length % 9973)
  } catch { return 'na' }
}
