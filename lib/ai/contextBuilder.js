// lib/ai/contextBuilder.js - Complete integrated file with database-first conversational AI
import { supabaseAdmin } from '../supabaseAdmin'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Enhanced intent classification with funding strategy patterns
export function classifyAssistantIntent(message) {
  const inputText = message.trim()
  
  // Definition/terminology patterns (highest priority - don't trigger data lookups)
  if (inputText.match(/\b(what\s*(does|is|means?)\s+.*(mean|definition|define)|explain\s+.*term|terminology)\b/i)) {
    return 'definition_help'
  }
  
  // Simple questions that shouldn't trigger data dumps
  if (inputText.match(/^(what\s*(is|does)\s+(?!my\s|our\s).+\??$)/i)) {
    return 'definition_help'
  }
  
  // Funding strategy patterns
  if (inputText.match(/\b(funding\s+ideas|grant\s+ideas|funding\s+options|what\s+grants|funding\s+strategies|find\s+grants|search\s+grants)\b/i)) {
    return 'funding_strategy_advice'
  }
  
  // Campaign patterns (only when asking about MY/OUR campaigns)
  if (inputText.match(/\b(my\s+campaign|our\s+campaign|show.*campaign|campaign\s+status|crowdfunding\s+status)\b/i)) {
    return 'campaign_lookup'
  }
  
  // Project patterns (only when asking about MY/OUR projects)
  if (inputText.match(/\b(my\s+project|our\s+project|show.*project|project\s+status|project\s+info)\b/i)) {
    return 'project_lookup'
  }
  
  // DUNS patterns - enhanced for conversational queries
  if (inputText.match(/\b(duns|d-u-n-s|dun\s*and\s*bradstreet|duns\s*number|d&b|uei|unique\s*entity\s*identifier)\b|what.*my.*duns|show.*duns|my.*duns|duns.*number|what.*duns|tell.*duns/i)) {
    return 'duns_lookup'
  }
  
  // EIN/Tax ID patterns - enhanced for conversational queries
  if (inputText.match(/\b(ein|tax\s*id|employer\s*identification|federal\s*tax)\b|what.*my.*ein|show.*ein|my.*ein|ein.*number|tax.*id.*number|what.*ein|tell.*ein/i)) {
    return 'ein_lookup'
  }
  
  // CAGE Code patterns - enhanced for conversational queries
  if (inputText.match(/\b(cage|cage\s*code|commercial\s*and\s*government\s*entity)\b|what.*my.*cage|show.*cage|my.*cage|cage.*code|what.*cage|tell.*cage/i)) {
    return 'cage_lookup'
  }
  
  // SAM registration patterns - enhanced for conversational queries
  if (inputText.match(/\b(sam|sam\.gov|system\s*for\s*award\s*management|sam\s*registration)\b|what.*my.*sam|show.*sam|my.*sam|sam.*status|what.*sam|tell.*sam|sam.*registration/i)) {
    return 'sam_lookup'
  }
  
  // Organization info patterns
  if (inputText.match(/\b(organization|org|company|business\s*info|business\s*details|my\s*info|profile)\b/i)) {
    return 'org_info'
  }
  
  // Certification patterns
  if (inputText.match(/\b(certification|certified|minority|woman|veteran|small\s*business|8a|hubzone|disadvantaged)\b/i)) {
    return 'certification_lookup'
  }
  
  // Deadline patterns
  if (inputText.match(/\b(deadline|due\s*date|when\s*due|expires?|closing)\b/i)) {
    return 'deadline_check'
  }
  
  // Application patterns
  if (inputText.match(/\b(application|apply|submit|proposal|grant\s*writing)\b/i)) {
    return 'application_help'
  }
  
  // Opportunity patterns
  if (inputText.match(/\b(opportunity|grant|funding|match|search|find)\b/i)) {
    return 'opportunity_discovery'
  }
  
  // Budget patterns
  if (inputText.match(/\b(budget|cost|expense|financial|money|dollar)\b/i)) {
    return 'budget_help'
  }
  
  // Status patterns
  if (inputText.match(/\b(status|progress|complete|pending|review)\b/i)) {
    return 'status_check'
  }
  
  return 'general_help'
}

// Dynamic Database Query Engine
class DatabaseQueryEngine {
  constructor() {
    this.queryStrategies = new Map([
      ['ein_lookup', this.queryOrganizationIdentifiers],
      ['duns_lookup', this.queryOrganizationIdentifiers],
      ['cage_lookup', this.queryOrganizationIdentifiers],
      ['sam_lookup', this.queryOrganizationIdentifiers],
      ['org_info', this.queryOrganizationIdentifiers],
      ['deadline_check', this.queryDeadlines],
      ['project_lookup', this.queryProjects],
      ['campaign_lookup', this.queryCampaigns],
      ['funding_strategy_advice', this.queryFundingData],
      ['certification_lookup', this.queryCertifications],
      ['application_help', this.queryApplications],
      ['opportunity_discovery', this.queryOpportunities],
      ['budget_help', this.queryBudgetData],
      ['status_check', this.queryStatusOverview]
    ])
  }

  async queryForIntent(intent, userId, context = {}) {
    const strategy = this.queryStrategies.get(intent) || this.queryGeneric
    
    try {
      const result = await strategy.call(this, userId, context)
      return {
        success: true,
        data: result,
        source: 'database',
        completeness: this.assessCompleteness(result, intent)
      }
    } catch (error) {
      console.error(`Database query failed for ${intent}:`, error)
      return {
        success: false,
        error: error.message,
        source: 'database'
      }
    }
  }

  async queryOrganizationIdentifiers(userId, context) {
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select(`
        organization_name, organization_type, ein, tax_id, 
        duns_number, duns_uei, duns_uei_number, cage_code,
        sam_registration, sam_gov_status, grants_gov_status,
        address_line1, city, state, zip_code, phone, website,
        years_in_operation, annual_revenue, employee_count,
        minority_owned, woman_owned, veteran_owned, small_business,
        eight_a_certified, hubzone_certified, disadvantaged_business,
        created_at, updated_at
      `)
      .eq('user_id', userId)
      .single()

    if (error) throw new Error(`Profile lookup failed: ${error.message}`)

    return {
      profile,
      identifiers: {
        ein: profile?.ein || profile?.tax_id,
        duns: profile?.duns_number || profile?.duns_uei || profile?.duns_uei_number,
        cage: profile?.cage_code,
        sam_status: profile?.sam_registration || profile?.sam_gov_status
      },
      organization: {
        name: profile?.organization_name,
        type: profile?.organization_type,
        location: `${profile?.city || ''} ${profile?.state || ''}`.trim(),
        contact: {
          phone: profile?.phone,
          website: profile?.website
        }
      },
      business_details: {
        years_operating: profile?.years_in_operation,
        employee_count: profile?.employee_count,
        annual_revenue: profile?.annual_revenue
      },
      certifications: {
        minority_owned: profile?.minority_owned,
        woman_owned: profile?.woman_owned,
        veteran_owned: profile?.veteran_owned,
        small_business: profile?.small_business,
        eight_a: profile?.eight_a_certified,
        hubzone: profile?.hubzone_certified,
        disadvantaged: profile?.disadvantaged_business
      }
    }
  }

  async queryDeadlines(userId, context) {
    const [opportunities, applications, projects, campaigns] = await Promise.all([
      supabaseAdmin
        .from('opportunities')
        .select('id, title, deadline_date, status, source, fit_score, amount_max')
        .eq('user_id', userId)
        .gte('deadline_date', new Date().toISOString().split('T')[0])
        .order('deadline_date', { ascending: true }),
      
      supabaseAdmin
        .from('applications')
        .select('id, title, deadline, status, amount_requested')
        .eq('user_id', userId)
        .gte('deadline', new Date().toISOString())
        .order('deadline', { ascending: true }),
      
      supabaseAdmin
        .from('projects')
        .select('id, name, funding_decision_needed, investment_deadline, status')
        .eq('user_id', userId)
        .or('funding_decision_needed.gte.' + new Date().toISOString().split('T')[0] + ',investment_deadline.gte.' + new Date().toISOString().split('T')[0]),

      supabaseAdmin
        .from('campaigns')
        .select('id, title, end_date, status, goal_amount, raised_amount')
        .eq('user_id', userId)
        .gte('end_date', new Date().toISOString())
        .order('end_date', { ascending: true })
    ])

    const allDeadlines = [
      ...(opportunities.data || []).map(o => ({
        ...o,
        type: 'opportunity',
        deadline: o.deadline_date
      })),
      ...(applications.data || []).map(a => ({
        ...a,
        type: 'application'
      })),
      ...(projects.data || []).map(p => ({
        ...p,
        title: p.name,
        type: 'project',
        deadline: p.funding_decision_needed || p.investment_deadline
      })).filter(p => p.deadline),
      ...(campaigns.data || []).map(c => ({
        ...c,
        type: 'campaign',
        deadline: c.end_date
      }))
    ].sort((a, b) => new Date(a.deadline) - new Date(b.deadline))

    return {
      opportunities: opportunities.data || [],
      applications: applications.data || [],
      projects: projects.data || [],
      campaigns: campaigns.data || [],
      all_deadlines: allDeadlines,
      total_deadlines: allDeadlines.length,
      urgent: allDeadlines.filter(d => {
        const days = Math.ceil((new Date(d.deadline) - new Date()) / (1000 * 60 * 60 * 24))
        return days <= 7
      })
    }
  }

  async queryProjects(userId, context) {
    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select(`
        id, name, description, status, project_type, industry,
        funding_needed, total_project_budget, funding_request_amount,
        target_population, estimated_people_served,
        location, project_location, timeline, project_duration,
        proposed_start_date, funding_decision_needed,
        current_status, urgency_level, project_categories,
        key_milestones, sustainability_plan,
        matching_funds_available, cash_match_available, in_kind_match_available,
        created_at, updated_at
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) throw new Error(`Projects lookup failed: ${error.message}`)

    const activeProjects = projects?.filter(p => ['active', 'in_progress', 'draft'].includes(p.status)) || []
    const completedProjects = projects?.filter(p => ['completed', 'funded'].includes(p.status)) || []

    return {
      projects: projects || [],
      summary: {
        total_count: projects?.length || 0,
        active_projects: activeProjects.length,
        completed_projects: completedProjects.length,
        total_funding_needed: projects?.reduce((sum, p) => {
          const amount = p.funding_needed || p.funding_request_amount || p.total_project_budget || 0
          return sum + parseFloat(amount || 0)
        }, 0) || 0,
        high_priority: projects?.filter(p => p.urgency_level === 'high').length || 0
      },
      active_projects: activeProjects,
      completed_projects: completedProjects
    }
  }

  async queryCampaigns(userId, context) {
    const { data: campaigns, error } = await supabaseAdmin
      .from('campaigns')
      .select(`
        id, platform, campaign_id, campaign_url, title, description,
        goal_amount, raised_amount, supporter_count,
        start_date, end_date, status, last_sync,
        platform_fee_percentage, project_id,
        created_at, updated_at
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) throw new Error(`Campaigns lookup failed: ${error.message}`)

    const activeCampaigns = campaigns?.filter(c => c.status === 'active') || []
    const completedCampaigns = campaigns?.filter(c => ['completed', 'successful'].includes(c.status)) || []

    return {
      campaigns: campaigns || [],
      summary: {
        total_count: campaigns?.length || 0,
        active_count: activeCampaigns.length,
        completed_count: completedCampaigns.length,
        total_goals: campaigns?.reduce((sum, c) => sum + parseFloat(c.goal_amount || 0), 0) || 0,
        total_raised: campaigns?.reduce((sum, c) => sum + parseFloat(c.raised_amount || 0), 0) || 0
      },
      active_campaigns: activeCampaigns,
      completed_campaigns: completedCampaigns
    }
  }

  async queryFundingData(userId, context) {
    const [projects, opportunities, applications, profile] = await Promise.all([
      this.queryProjects(userId, context),
      supabaseAdmin
        .from('opportunities')
        .select('*')
        .eq('user_id', userId)
        .gte('deadline_date', new Date().toISOString().split('T')[0])
        .order('fit_score', { ascending: false })
        .limit(15),
      
      supabaseAdmin
        .from('applications')
        .select('title, status, amount_requested, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      
      this.queryOrganizationIdentifiers(userId, context)
    ])

    // Search and discover new opportunities
    const newOpportunities = await this.searchAndSaveOpportunities(userId, projects.projects, profile.organization)

    return {
      ...projects,
      opportunities: opportunities.data || [],
      new_opportunities: newOpportunities,
      applications: applications.data || [],
      organization: profile.organization,
      funding_readiness: this.assessFundingReadiness(profile, projects)
    }
  }

  async queryCertifications(userId, context) {
    const [profileCerts, detailedCerts] = await Promise.all([
      supabaseAdmin
        .from('user_profiles')
        .select(`
          minority_owned, woman_owned, veteran_owned, small_business,
          eight_a_certified, hubzone_certified, disadvantaged_business,
          special_certifications, organization_name
        `)
        .eq('user_id', userId)
        .single(),
      
      supabaseAdmin
        .from('certifications')
        .select(`
          id, certification_name, certification_type, issuing_organization,
          certification_number, issue_date, expiration_date, renewal_date,
          status, is_verified, verification_source, description,
          certificate_url, verification_url, tags, metadata,
          created_at, updated_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .then(
          result => result,
          error => {
            console.log('Certifications table not available:', error.message)
            return { data: [], error: null }
          }
        )
    ])

    const certifications = detailedCerts.data || []
    const analysis = this.processCertificationsData(certifications)

    return {
      business_certifications: profileCerts.data,
      professional_certifications: certifications,
      certifications_analysis: analysis,
      organization_name: profileCerts.data?.organization_name
    }
  }

  async queryApplications(userId, context) {
    const { data: applications, error } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Applications lookup failed: ${error.message}`)

    return {
      applications: applications || [],
      summary: this.summarizeApplications(applications || [])
    }
  }

  async queryOpportunities(userId, context) {
    const { data: opportunities, error } = await supabaseAdmin
      .from('opportunities')
      .select('*')
      .eq('user_id', userId)
      .gte('deadline_date', new Date().toISOString().split('T')[0])
      .order('fit_score', { ascending: false })

    if (error) throw new Error(`Opportunities lookup failed: ${error.message}`)

    return {
      opportunities: opportunities || [],
      summary: this.summarizeOpportunities(opportunities || [])
    }
  }

  async queryBudgetData(userId, context) {
    const [applications, projects] = await Promise.all([
      supabaseAdmin
        .from('applications')
        .select('title, amount_requested, budget_data, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      
      supabaseAdmin
        .from('projects')
        .select('name, funding_needed, total_project_budget, funding_request_amount')
        .eq('user_id', userId)
    ])

    const appBudgets = applications.data || []
    const projBudgets = projects.data || []

    return {
      application_budgets: appBudgets,
      project_budgets: projBudgets,
      budget_summary: {
        total_requested_apps: appBudgets.reduce((sum, a) => sum + (parseFloat(a.amount_requested) || 0), 0),
        total_project_funding: projBudgets.reduce((sum, p) => {
          const amount = p.funding_needed || p.funding_request_amount || p.total_project_budget || 0
          return sum + parseFloat(amount || 0)
        }, 0),
        average_request: appBudgets.length > 0 ? 
          appBudgets.reduce((sum, a) => sum + (parseFloat(a.amount_requested) || 0), 0) / appBudgets.length : 0
      }
    }
  }

  async queryStatusOverview(userId, context) {
    const [apps, opps, projects, campaigns] = await Promise.all([
      supabaseAdmin.from('applications').select('status').eq('user_id', userId),
      supabaseAdmin.from('opportunities').select('status, deadline_date').eq('user_id', userId),
      supabaseAdmin.from('projects').select('status').eq('user_id', userId),
      supabaseAdmin.from('campaigns').select('status, raised_amount, goal_amount').eq('user_id', userId)
    ])

    return {
      applications: this.summarizeApplications(apps.data || []),
      opportunities: this.summarizeOpportunities(opps.data || []),
      projects: {
        total: projects.data?.length || 0,
        by_status: this.groupByStatus(projects.data || [])
      },
      campaigns: {
        total: campaigns.data?.length || 0,
        by_status: this.groupByStatus(campaigns.data || []),
        total_raised: campaigns.data?.reduce((sum, c) => sum + parseFloat(c.raised_amount || 0), 0) || 0
      }
    }
  }

  async queryGeneric(userId, context) {
    return await this.queryOrganizationIdentifiers(userId, context)
  }

  // Helper methods
  assessCompleteness(data, intent) {
    switch (intent) {
      case 'ein_lookup':
        return data.identifiers?.ein ? 'complete' : 'incomplete'
      case 'deadline_check':
        return data.total_deadlines > 0 ? 'complete' : 'empty'
      case 'project_lookup':
        return data.summary?.total_count > 0 ? 'complete' : 'empty'
      case 'funding_strategy_advice':
        return (data.opportunities?.length > 0 || data.new_opportunities?.length > 0) ? 'complete' : 'partial'
      default:
        return 'partial'
    }
  }

  assessFundingReadiness(profile, projects) {
    let score = 0
    let gaps = []

    if (profile.identifiers.ein) score += 25
    else gaps.push('EIN/Tax ID missing')
    
    if (profile.identifiers.duns) score += 20
    else gaps.push('DUNS/UEI number missing')
    
    if (profile.organization.name) score += 10
    else gaps.push('Organization name missing')

    if (projects.summary.total_count > 0) score += 25
    else gaps.push('No projects defined')

    if (projects.summary.total_funding_needed > 0) score += 20
    else gaps.push('No funding amounts specified')

    return { 
      score, 
      gaps, 
      readiness_level: score >= 70 ? 'ready' : score >= 40 ? 'partial' : 'needs_work' 
    }
  }

  summarizeApplications(applications) {
    const byStatus = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1
      return acc
    }, {})

    return {
      total: applications.length,
      by_status: byStatus,
      total_requested: applications.reduce((sum, app) => sum + (parseFloat(app.amount_requested) || 0), 0)
    }
  }

  summarizeOpportunities(opportunities) {
    const highPriority = opportunities.filter(o => o.fit_score >= 80).length
    const mediumPriority = opportunities.filter(o => o.fit_score >= 60 && o.fit_score < 80).length
    
    return {
      total: opportunities.length,
      high_priority: highPriority,
      medium_priority: mediumPriority,
      urgent: opportunities.filter(o => {
        const days = Math.ceil((new Date(o.deadline_date) - new Date()) / (1000 * 60 * 60 * 24))
        return days <= 30
      }).length
    }
  }

  groupByStatus(items) {
    return items.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1
      return acc
    }, {})
  }

  processCertificationsData(certifications) {
    if (!certifications || certifications.length === 0) {
      return {
        total_count: 0,
        active_count: 0,
        expired_count: 0,
        expiring_soon: 0,
        by_type: {},
        by_status: {},
        expiration_alerts: [],
        competitive_advantages: []
      }
    }

    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000))
    
    const analysis = {
      total_count: certifications.length,
      active_count: 0,
      expired_count: 0,
      expiring_soon: 0,
      verified_count: 0,
      by_type: {},
      by_status: {},
      by_issuer: {},
      expiration_alerts: [],
      competitive_advantages: []
    }

    certifications.forEach(cert => {
      analysis.by_status[cert.status] = (analysis.by_status[cert.status] || 0) + 1
      
      if (cert.status === 'active') analysis.active_count++
      if (cert.is_verified) analysis.verified_count++

      if (cert.certification_type) {
        analysis.by_type[cert.certification_type] = (analysis.by_type[cert.certification_type] || 0) + 1
      }

      if (cert.expiration_date) {
        const expirationDate = new Date(cert.expiration_date)
        
        if (expirationDate < now) {
          analysis.expired_count++
        } else if (expirationDate <= thirtyDaysFromNow) {
          analysis.expiring_soon++
          analysis.expiration_alerts.push({
            name: cert.certification_name,
            expiration_date: cert.expiration_date,
            days_remaining: Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24))
          })
        }
      }

      const competitiveTypes = ['professional', 'technical', 'quality', 'safety', 'industry']
      if (cert.status === 'active' && cert.certification_type && competitiveTypes.includes(cert.certification_type.toLowerCase())) {
        analysis.competitive_advantages.push({
          name: cert.certification_name,
          type: cert.certification_type,
          issuer: cert.issuing_organization,
          verified: cert.is_verified
        })
      }
    })

    analysis.expiration_alerts.sort((a, b) => a.days_remaining - b.days_remaining)
    
    return analysis
  }

  async searchAndSaveOpportunities(userId, projects, organization) {
    // Simplified version - you can expand with actual API integrations
    try {
      const searchTerms = this.extractSearchTerms(projects, organization)
      
      // Mock new opportunities discovery
      if (searchTerms.length > 0) {
        return [
          {
            id: `discovered-${Date.now()}`,
            title: `SBIR Phase I - ${searchTerms[0]} Innovation`,
            sponsor: 'Department of Defense',
            description: `Small Business Innovation Research grant for ${searchTerms[0]} applications`,
            maxAmount: 275000,
            deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            source: 'api_discovery'
          }
        ]
      }
      
      return []
    } catch (error) {
      console.error('Opportunity discovery error:', error)
      return []
    }
  }

  extractSearchTerms(projects, organization) {
    const terms = new Set()
    
    if (organization.type) terms.add(organization.type.toLowerCase())
    
    projects.forEach(project => {
      if (project.project_type) terms.add(project.project_type.toLowerCase())
      if (project.industry) terms.add(project.industry.toLowerCase())
    })
    
    return Array.from(terms).slice(0, 3)
  }
}

// AI Enhancement Engine
class AIEnhancementEngine {
  constructor() {
    this.systemPrompt = `You are a conversational funding and grants assistant. Your job is to take database query results and user questions, then create natural, helpful responses.

Key principles:
1. Be conversational and empathetic - match the user's emotional tone
2. Focus on what matters most to the user right now
3. Ask follow-up questions to keep the conversation going
4. If data is missing, acknowledge it naturally and suggest next steps
5. Be specific about numbers, dates, and actionable advice
6. Adapt your communication style to the urgency level

When database results are incomplete or empty:
- Don't make up information
- Suggest how to fill the gaps
- Focus on what CAN be done with available information
- Offer to help with next steps

Always end responses with an engaging follow-up question to continue the conversation.`
  }

  async enhanceResponse(intent, databaseResult, userMessage, conversationContext = []) {
    const prompt = this.buildEnhancementPrompt(intent, databaseResult, userMessage, conversationContext)
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: this.systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })

      return {
        success: true,
        response: completion.choices[0].message.content,
        source: 'ai_enhanced'
      }
    } catch (error) {
      console.error('AI enhancement failed:', error)
      return {
        success: false,
        response: this.buildFallbackResponse(databaseResult, intent),
        source: 'fallback'
      }
    }
  }

  buildEnhancementPrompt(intent, databaseResult, userMessage, conversationContext) {
    let prompt = `User asked: "${userMessage}"\n`
    prompt += `Intent classified as: ${intent}\n`
    prompt += `Database query result:\n${JSON.stringify(databaseResult, null, 2)}\n`
    
    if (conversationContext.length > 0) {
      prompt += `\nRecent conversation context:\n`
      conversationContext.slice(-3).forEach(msg => {
        prompt += `${msg.role}: ${msg.content}\n`
      })
    }
    
    prompt += `\nPlease create a natural, conversational response that:\n`
    
    switch (intent) {
      case 'ein_lookup':
        prompt += `- Tells them their EIN if found, or explains it's missing if not\n`
        prompt += `- Provides context about why EIN matters for grants\n`
        prompt += `- Suggests next steps if information is missing\n`
        break
      
      case 'deadline_check':
        prompt += `- Prioritizes deadlines by urgency\n`
        prompt += `- Acknowledges their time pressure if urgent items exist\n`
        prompt += `- Suggests specific actions for immediate deadlines\n`
        break
      
      case 'funding_strategy_advice':
        prompt += `- Focuses on their highest-priority opportunities\n`
        prompt += `- Explains WHY certain grants are good matches\n`
        prompt += `- Mentions any newly discovered opportunities\n`
        prompt += `- Suggests a practical next step\n`
        break
      
      case 'project_lookup':
        prompt += `- Highlights their most important/active projects\n`
        prompt += `- Mentions funding needs if specified\n`
        prompt += `- Suggests improvements or next steps\n`
        break
      
      default:
        prompt += `- Uses the available data to directly answer their question\n`
        prompt += `- Acknowledges any data gaps naturally\n`
        prompt += `- Suggests practical next steps\n`
    }
    
    prompt += `\nBe conversational, empathetic, and specific. End with a follow-up question to continue the conversation.`
    
    return prompt
  }

  buildFallbackResponse(databaseResult, intent) {
    if (!databaseResult.success) {
      return "I'm having trouble accessing your information right now. Can you try asking me again in a moment?"
    }
    
    switch (intent) {
      case 'ein_lookup':
        const ein = databaseResult.data?.identifiers?.ein
        return ein ? 
          `Your EIN is ${ein}. This is registered for ${databaseResult.data?.organization?.name || 'your organization'}.` :
          "I don't see an EIN in your profile yet. You'll need this for most grant applications."
      
      case 'deadline_check':
        const deadlines = databaseResult.data?.total_deadlines || 0
        return deadlines > 0 ? 
          `You have ${deadlines} upcoming deadlines to track.` :
          "You don't have any pressing deadlines right now."
      
      default:
        return "I found some information for you, but I'm having trouble presenting it clearly right now. What specific details do you need most?"
    }
  }
}

// Main Conversational Assistant Controller
class ConversationalAssistant {
  constructor() {
    this.dbEngine = new DatabaseQueryEngine()
    this.aiEngine = new AIEnhancementEngine()
    this.conversationMemory = new Map()
  }

  async handleUserMessage(userId, message, intent, context = {}) {
    try {
      console.log(`Querying database for intent: ${intent}`)
      const databaseResult = await this.dbEngine.queryForIntent(intent, userId, context)
      
      const conversationContext = this.getConversationContext(userId)
      
      console.log(`Enhancing response with AI for completeness: ${databaseResult.completeness}`)
      const aiResult = await this.aiEngine.enhanceResponse(
        intent, 
        databaseResult, 
        message, 
        conversationContext
      )
      
      this.updateConversationMemory(userId, message, aiResult.response)
      
      return {
        success: true,
        response: aiResult.response,
        metadata: {
          database_completeness: databaseResult.completeness,
          ai_enhanced: aiResult.success,
          data_sources: [databaseResult.source, aiResult.source]
        }
      }
      
    } catch (error) {
      console.error('Conversational assistant error:', error)
      return {
        success: false,
        response: "I'm having some technical difficulties. Mind trying that again?",
        metadata: { error: error.message }
      }
    }
  }

  getConversationContext(userId) {
    return this.conversationMemory.get(userId) || []
  }

  updateConversationMemory(userId, userMessage, assistantResponse) {
    let context = this.conversationMemory.get(userId) || []
    
    context.push(
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
      { role: 'assistant', content: assistantResponse, timestamp: new Date().toISOString() }
    )
    
    if (context.length > 10) {
      context = context.slice(-10)
    }
    
    this.conversationMemory.set(userId, context)
  }

  async processMessage(userId, message, context = {}) {
    const intent = classifyAssistantIntent(message)
    console.log(`Processing message for user ${userId}, intent: ${intent}`)
    return await this.handleUserMessage(userId, message, intent, context)
  }
}

// Main response function that replaces all the hardcoded response builders
export async function generateAssistantResponse(intent, context, message, userId) {
  const assistant = new ConversationalAssistant()
  return await assistant.processMessage(userId, message, context)
}

// Keep your existing comprehensive context building for cases that need full context
export async function buildOrgContext(userId) {
  try {
    const [profileResult, projectsResult, appsResult, oppsResult, campaignsResult, certificationsResult] = await Promise.all([
      supabaseAdmin.from('user_profiles').select(`
        id, user_id, email, full_name, organization_name, organization_type,
        ein, tax_id, duns_number, duns_uei, duns_uei_number, cage_code,
        sam_registration, sam_gov_status, grants_gov_status,
        address_line1, address_line2, city, state, zip_code, country,
        phone, website, years_in_operation, annual_revenue, employee_count,
        minority_owned, woman_owned, veteran_owned, small_business,
        eight_a_certified, hubzone_certified, disadvantaged_business,
        special_certifications, legal_structure, incorporation_year,
        mission_statement, primary_focus_areas, populations_served,
        annual_budget, funding_sources, grant_experience,
        compliance_capacity, risk_tolerance
      `).eq('user_id', userId).single(),
      
      supabaseAdmin.from('projects').select(`
        id, name, description, project_type, status,
        funding_needed, funding_request_amount, total_project_budget,
        location, project_location, timeline, project_duration,
        proposed_start_date, funding_decision_needed, investment_deadline,
        target_population, estimated_people_served,
        current_status, urgency_level,
        key_milestones, sustainability_plan,
        matching_funds_available, cash_match_available, in_kind_match_available,
        project_categories, industry,
        created_at, updated_at
      `).eq('user_id', userId).order('updated_at', { ascending: false }),
      
      supabaseAdmin.from('applications').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabaseAdmin.from('opportunities').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabaseAdmin.from('campaigns').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
      
      supabaseAdmin.from('certifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).then(
        result => result,
        error => {
          console.log('Certifications table not available yet:', error.message)
          return { data: [], error: null }
        }
      )
    ])
    
    const profile = profileResult.data || {}
    const projects = projectsResult.data || []
    const applications = appsResult.data || []
    const opportunities = oppsResult.data || []
    const campaigns = campaignsResult.data || []
    const certifications = certificationsResult.data || []
    
    const dbEngine = new DatabaseQueryEngine()
    const certificationsAnalysis = dbEngine.processCertificationsData(certifications)
    
    const projectFunding = projects.reduce((sum, p) => {
      const amount = p.funding_request_amount || p.funding_needed || p.total_project_budget || 0
      return sum + parseFloat(amount || 0)
    }, 0)
    
    const applicationFunding = applications.reduce((sum, a) => sum + (parseFloat(a.amount_requested) || 0), 0)
    
    const campaignGoals = campaigns.reduce((sum, c) => sum + parseFloat(c.goal_amount || 0), 0)
    const campaignRaised = campaigns.reduce((sum, c) => sum + parseFloat(c.raised_amount || 0), 0)
    
    return {
      profile,
      projects,
      applications,
      opportunities,
      campaigns,
      certifications,
      certifications_analysis: certificationsAnalysis,
      funding_summary: {
        total_requested: applicationFunding,
        total_project_funding: projectFunding,
        total_campaign_goals: campaignGoals,
        total_campaign_raised: campaignRaised,
        total_combined_funding: applicationFunding + projectFunding + campaignGoals,
        applications_count: applications.length,
        projects_count: projects.length,
        campaigns_count: campaigns.length,
        certifications_count: certifications.length,
        award_rate: calculateAwardRate(applications)
      },
      meta: {
        updated_at: new Date().toISOString(),
        user_id: userId,
        privacy_isolation: 'strict'
      }
    }
  } catch (error) {
    console.error('Build context error:', error)
    throw error
  }
}

export async function getCachedOrgContext(userId, options = {}) {
  const { ttlMs = 5 * 60 * 1000 } = options
  
  try {
    const context = await buildOrgContext(userId)
    return { context, cached: false }
  } catch (error) {
    console.error('Context building error:', error)
    throw error
  }
}

function calculateAwardRate(applications) {
  const decided = applications.filter(a => ['approved', 'rejected', 'awarded'].includes(a.status))
  const approved = decided.filter(a => ['approved', 'awarded'].includes(a.status))
  return decided.length > 0 ? Math.round((approved.length / decided.length) * 100) : 0
}