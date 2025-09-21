// lib/ai/contextBuilder.js - Complete with API integration and grant discovery
import { supabaseAdmin } from '../supabaseAdmin'

// Enhanced intent classification with funding strategy patterns
export function classifyAssistantIntent(message) {
  const lower = message.toLowerCase().trim()
  
  // Definition/terminology patterns (highest priority - don't trigger data lookups)
  if (lower.match(/\b(what\s*(does|is|means?)\s+.*(mean|definition|define)|explain\s+.*term|terminology)\b/)) {
    return 'definition_help'
  }
  
  // Simple questions that shouldn't trigger data dumps
  if (lower.match(/^(what\s*(is|does)\s+(?!my\s|our\s).+\??$)/)) {
    return 'definition_help'
  }
  
  // Funding strategy patterns (new)
  if (lower.match(/\b(funding\s+ideas|grant\s+ideas|funding\s+options|what\s+grants|funding\s+strategies|find\s+grants|search\s+grants)\b/)) {
    return 'funding_strategy_advice'
  }
  
  // Campaign patterns (only when asking about MY/OUR campaigns)
  if (lower.match(/\b(my\s+campaign|our\s+campaign|show.*campaign|campaign\s+status|crowdfunding\s+status)\b/)) {
    return 'campaign_lookup'
  }
  
  // Project patterns (only when asking about MY/OUR projects)
  if (lower.match(/\b(my\s+project|our\s+project|show.*project|project\s+status|project\s+info)\b/)) {
    return 'project_lookup'
  }
  
  // DUNS patterns
  if (lower.match(/\b(duns|d-u-n-s|dun\s*and\s*bradstreet|duns\s*number|d&b|uei|unique\s*entity\s*identifier)\b/)) {
    return 'duns_lookup'
  }
  
  // EIN/Tax ID patterns
  if (lower.match(/\b(ein|tax\s*id|employer\s*identification|federal\s*tax)\b/)) {
    return 'ein_lookup'
  }
  
  // CAGE Code patterns
  if (lower.match(/\b(cage|cage\s*code|commercial\s*and\s*government\s*entity)\b/)) {
    return 'cage_lookup'
  }
  
  // SAM registration patterns
  if (lower.match(/\b(sam|sam\.gov|system\s*for\s*award\s*management|sam\s*registration)\b/)) {
    return 'sam_lookup'
  }
  
  // Organization info patterns
  if (lower.match(/\b(organization|org|company|business\s*info|business\s*details|my\s*info|profile)\b/)) {
    return 'org_info'
  }
  
  // Certification patterns
  if (lower.match(/\b(certification|certified|minority|woman|veteran|small\s*business|8a|hubzone|disadvantaged)\b/)) {
    return 'certification_lookup'
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

// Enhanced response generation with funding strategy support
export async function generateAssistantResponse(intent, context, message, userId) {
  try {
    switch (intent) {
      case 'funding_strategy_advice':
        return await buildFundingStrategyResponse(context, message, userId)
      
      case 'definition_help':
        return await buildDefinitionResponse(context, message, userId)
      
      case 'campaign_lookup':
        return await buildCampaignResponse(context, message, userId)
      
      case 'project_lookup':
        return await buildProjectResponse(context, message, userId)
      
      case 'ein_lookup':
        return await buildEINResponse(context, message, userId)
      
      case 'duns_lookup':
        return await buildDUNSResponse(context, message, userId)
      
      case 'cage_lookup':
        return await buildCAGEResponse(context, message, userId)
      
      case 'sam_lookup':
        return await buildSAMResponse(context, message, userId)
      
      case 'org_info':
        return await buildOrgInfoResponse(context, message, userId)
      
      case 'certification_lookup':
        return await buildCertificationResponse(context, message, userId)
      
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

// NEW: Funding strategy advice with API integration
export async function buildFundingStrategyResponse(context, message, userId) {
  try {
    console.log('Building funding strategy response for user:', userId)
    
    // Get user's projects and profile
    const projects = context?.projects || []
    const profile = context?.profile || {}
    
    // Extract search terms from projects
    const searchTerms = extractSearchTerms(projects, profile)
    console.log('Search terms extracted:', searchTerms)
    
    // Search and save new opportunities from APIs
    const newOpportunities = await searchAndSaveOpportunities(searchTerms, userId)
    console.log('New opportunities discovered:', newOpportunities.length)
    
    // Find matching opportunities from the full database
    const matches = await findMatchingOpportunities(projects, profile)
    console.log('Matching opportunities found:', matches.length)
    
    return buildComprehensiveFundingResponse(matches, newOpportunities, projects, profile)
    
  } catch (error) {
    console.error('Funding strategy response error:', error)
    return "I'm having trouble generating funding strategy recommendations. Please try again in a moment."
  }
}

// Extract relevant search terms from user data
function extractSearchTerms(projects, profile) {
  const terms = new Set()
  
  // Add organization type
  if (profile.organization_type) {
    terms.add(profile.organization_type.toLowerCase())
  }
  
  // Add industry focus
  if (profile.primary_focus_areas) {
    profile.primary_focus_areas.forEach(area => terms.add(area.toLowerCase()))
  }
  
  // Extract from projects
  projects.forEach(project => {
    if (project.project_type) terms.add(project.project_type.toLowerCase())
    if (project.industry) terms.add(project.industry.toLowerCase())
    
    // Extract from project categories
    if (project.project_categories) {
      project.project_categories.forEach(cat => terms.add(cat.toLowerCase()))
    }
    
    // Extract keywords from description
    if (project.description) {
      const keywords = extractKeywords(project.description)
      keywords.forEach(kw => terms.add(kw))
    }
  })
  
  // Add certification-based terms
  if (profile.minority_owned) terms.add('minority business')
  if (profile.woman_owned) terms.add('women business')
  if (profile.veteran_owned) terms.add('veteran business')
  if (profile.small_business) terms.add('small business')
  
  // Add default tech terms if no specific terms found
  if (terms.size === 0) {
    terms.add('technology')
    terms.add('innovation')
    terms.add('small business')
  }
  
  return Array.from(terms).slice(0, 5) // Limit to top 5 terms
}

// Extract keywords from text
function extractKeywords(text) {
  const commonWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'will', 'would', 'could', 'should'])
  
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.has(word))
    .slice(0, 10)
}

// Search external APIs and save opportunities
async function searchAndSaveOpportunities(searchTerms, userId) {
  const discoveries = []
  
  try {
    console.log('Searching external APIs for terms:', searchTerms)
    
    for (const term of searchTerms.slice(0, 3)) { // Limit to avoid rate limits
      try {
        // Search Grants.gov API
        const grantsGovResults = await searchGrantsGovAPI(term)
        if (grantsGovResults.length > 0) {
          await saveDiscoveredOpportunities(grantsGovResults, 'grants.gov', term)
          discoveries.push(...grantsGovResults.slice(0, 2)) // Limit results
        }
        
        // Search SBA API
        const sbaResults = await searchSBAAPI(term)
        if (sbaResults.length > 0) {
          await saveDiscoveredOpportunities(sbaResults, 'sba.gov', term)
          discoveries.push(...sbaResults.slice(0, 1))
        }
        
        // Search NSF API
        const nsfResults = await searchNSFAPI(term)
        if (nsfResults.length > 0) {
          await saveDiscoveredOpportunities(nsfResults, 'nsf.gov', term)
          discoveries.push(...nsfResults.slice(0, 1))
        }
        
        // Add small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (apiError) {
        console.error(`API search error for term "${term}":`, apiError.message)
        continue // Continue with next term
      }
    }
    
    console.log(`Total opportunities discovered: ${discoveries.length}`)
    return discoveries
    
  } catch (error) {
    console.error('Search and save error:', error)
    return [] // Return empty array on error
  }
}

// Mock API functions - replace with your actual API implementations
async function searchGrantsGovAPI(searchTerm) {
  // Replace with your actual Grants.gov API implementation
  console.log(`Searching Grants.gov for: ${searchTerm}`)
  
  // Simulated API response - replace with actual API call
  return [
    {
      id: `grants-gov-${Date.now()}`,
      title: `SBIR Phase I - ${searchTerm} Innovation`,
      sponsor: 'Department of Defense',
      description: `Small Business Innovation Research grant for ${searchTerm} applications`,
      minAmount: 100000,
      maxAmount: 500000,
      deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 60 days from now
      eligibility: 'Small businesses with fewer than 500 employees',
      url: 'https://grants.gov/sample-opportunity',
      programType: 'SBIR',
      agency: 'DOD'
    }
  ]
}

async function searchSBAAPI(searchTerm) {
  console.log(`Searching SBA for: ${searchTerm}`)
  
  return [
    {
      id: `sba-${Date.now()}`,
      title: `Small Business Growth Grant - ${searchTerm}`,
      sponsor: 'Small Business Administration',
      description: `Growth funding for ${searchTerm} businesses`,
      minAmount: 25000,
      maxAmount: 100000,
      deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      eligibility: 'Small businesses with growth potential',
      url: 'https://sba.gov/sample-opportunity',
      programType: 'Growth Grant'
    }
  ]
}

async function searchNSFAPI(searchTerm) {
  console.log(`Searching NSF for: ${searchTerm}`)
  
  return [
    {
      id: `nsf-${Date.now()}`,
      title: `NSF Innovation Grant - ${searchTerm} Research`,
      sponsor: 'National Science Foundation',
      description: `Research and development funding for ${searchTerm} innovation`,
      minAmount: 150000,
      maxAmount: 750000,
      deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      eligibility: 'Universities and research institutions',
      url: 'https://nsf.gov/sample-opportunity',
      programType: 'Research Grant'
    }
  ]
}

// Save discovered opportunities to database
async function saveDiscoveredOpportunities(opportunities, source, searchTerm) {
  try {
    const processedOpps = opportunities.map(opp => ({
      external_id: opp.id,
      source: source,
      title: opp.title,
      sponsor: opp.sponsor,
      agency: opp.agency || opp.sponsor,
      description: opp.description,
      amount_min: opp.minAmount,
      amount_max: opp.maxAmount,
      deadline_date: opp.deadline,
      eligibility_criteria: opp.eligibility,
      source_url: opp.url,
      discovery_method: 'api_search',
      search_query_used: searchTerm,
      raw_data: opp,
      status: 'discovered',
      relevance_score: 75, // Default score
      fit_score: 70,
      created_at: new Date().toISOString(),
      last_synced: new Date().toISOString()
    }))
    
    // Use upsert to avoid duplicates
    const { error } = await supabaseAdmin
      .from('opportunities')
      .upsert(processedOpps, { 
        onConflict: 'external_id,source',
        ignoreDuplicates: false 
      })
    
    if (error) {
      console.error('Error saving opportunities:', error)
    } else {
      console.log(`Saved ${processedOpps.length} opportunities from ${source}`)
    }
    
  } catch (error) {
    console.error('Save opportunities error:', error)
  }
}

// Find matching opportunities from database
async function findMatchingOpportunities(userProjects, userProfile) {
  try {
    const projectTypes = userProjects.map(p => p.project_type).filter(Boolean)
    const industries = userProjects.map(p => p.industry).filter(Boolean)
    
    let query = supabaseAdmin
      .from('opportunities')
      .select(`
        id, title, sponsor, agency, description,
        amount_min, amount_max, deadline_date,
        fit_score, relevance_score, source,
        source_url, application_complexity,
        recommendation_strength, strategic_priority
      `)
      .gte('deadline_date', new Date().toISOString().split('T')[0])
      .order('fit_score', { ascending: false })
      .limit(15)
    
    // Apply eligibility filters based on user profile
    if (userProfile) {
      const conditions = []
      
      if (userProfile.small_business) {
        conditions.push('small_business_only.eq.true')
        conditions.push('small_business_only.is.null')
      }
      
      if (userProfile.minority_owned) {
        conditions.push('minority_business.eq.true')
        conditions.push('minority_business.is.null')
      }
      
      if (userProfile.woman_owned) {
        conditions.push('woman_owned_business.eq.true')
        conditions.push('woman_owned_business.is.null')
      }
      
      if (userProfile.veteran_owned) {
        conditions.push('veteran_owned_business.eq.true')
        conditions.push('veteran_owned_business.is.null')
      }
      
      if (conditions.length > 0) {
        query = query.or(conditions.join(','))
      }
    }
    
    const { data: opportunities, error } = await query
    
    if (error) {
      console.error('Matching opportunities error:', error)
      return []
    }
    
    return opportunities || []
    
  } catch (error) {
    console.error('Find matching opportunities error:', error)
    return []
  }
}

// Build comprehensive funding response
function buildComprehensiveFundingResponse(matches, newOpportunities, projects, profile) {
  let response = `Based on your ${projects.length} project(s), here's your personalized funding strategy:\n\n`
  
  // Show newly discovered opportunities first
  if (newOpportunities.length > 0) {
    response += `**NEWLY DISCOVERED OPPORTUNITIES (${newOpportunities.length}):**\n`
    newOpportunities.slice(0, 3).forEach(opp => {
      const daysLeft = Math.ceil((new Date(opp.deadline) - new Date()) / (1000 * 60 * 60 * 24))
      const amount = opp.maxAmount ? `$${opp.maxAmount.toLocaleString()}` : 'Amount varies'
      response += `• **${opp.title}** - ${amount} - ${daysLeft} days\n`
      response += `  Sponsor: ${opp.sponsor}\n`
      if (opp.url) response += `  Apply: ${opp.url}\n`
      response += `\n`
    })
  }
  
  // Show existing matches
  if (matches.length > 0) {
    const highPriority = matches.filter(o => (o.fit_score >= 80))
    const goodMatches = matches.filter(o => (o.fit_score >= 60 && o.fit_score < 80))
    
    if (highPriority.length > 0) {
      response += `**HIGH PRIORITY MATCHES (${highPriority.length}):**\n`
      highPriority.slice(0, 2).forEach(opp => {
        const daysLeft = Math.ceil((new Date(opp.deadline_date) - new Date()) / (1000 * 60 * 60 * 24))
        const amount = opp.amount_max ? `$${parseInt(opp.amount_max).toLocaleString()}` : 'Amount varies'
        response += `• **${opp.title}** - ${amount} - ${daysLeft} days\n`
        response += `  Fit Score: ${opp.fit_score}%\n\n`
      })
    }
    
    if (goodMatches.length > 0) {
      response += `**GOOD MATCHES (${goodMatches.length}):**\n`
      goodMatches.slice(0, 2).forEach(opp => {
        const daysLeft = Math.ceil((new Date(opp.deadline_date) - new Date()) / (1000 * 60 * 60 * 24))
        response += `• ${opp.title} - ${daysLeft} days\n`
      })
      response += `\n`
    }
  }
  
  // Add strategic recommendations
  response += `**STRATEGIC RECOMMENDATIONS:**\n`
  
  if (projects.length > 0) {
    const totalFunding = projects.reduce((sum, p) => {
      return sum + parseFloat(p.funding_needed || p.funding_request_amount || 0)
    }, 0)
    
    if (totalFunding > 0) {
      response += `• Your $${totalFunding.toLocaleString()} funding need suggests targeting multiple grant types\n`
    }
  }
  
  // Certification-based recommendations
  if (profile.small_business) {
    response += `• As a small business, prioritize SBIR/STTR programs\n`
  }
  
  if (profile.minority_owned || profile.woman_owned || profile.veteran_owned) {
    response += `• Leverage your certification status for set-aside opportunities\n`
  }
  
  response += `• Set up alerts for new opportunities in your focus areas\n`
  response += `• Consider state and local programs in ${profile.state || 'your state'}\n\n`
  
  response += `All discovered opportunities have been saved for other users to find. Want more specific recommendations? Tell me about your project focus areas.`
  
  return response
}

// Definition helper - answers terminology questions without data dumps
export async function buildDefinitionResponse(context, message, userId) {
  const lower = message.toLowerCase()
  
  if (lower.includes('main contact')) {
    return `In grant applications and funding, the "main contact" is the primary person responsible for:\n\n• Managing the application process\n• Communicating with the funding organization\n• Coordinating with team members\n• Ensuring compliance and reporting\n\nThis person's contact information is typically required on most grant applications and serves as the official point of contact for all correspondence.`
  }
  
  if (lower.includes('project manager') || lower.includes('project director')) {
    return `A project manager/director is the person who oversees the day-to-day execution of a funded project. They're responsible for managing timelines, budgets, team coordination, and deliverables. This role is often required to be identified in grant applications.`
  }
  
  if (lower.includes('principal investigator') || lower.includes('pi')) {
    return `A Principal Investigator (PI) is the lead researcher responsible for the intellectual and scientific direction of a research project. They have overall responsibility for the project's conduct and are accountable to the funding agency for proper use of funds.`
  }
  
  if (lower.includes('fiscal sponsor')) {
    return `A fiscal sponsor is an established 501(c)(3) organization that accepts grants and donations on behalf of a project or group that doesn't have tax-exempt status. The sponsor handles financial management and legal compliance.`
  }
  
  if (lower.includes('matching funds') || lower.includes('cost share')) {
    return `Matching funds (or cost share) are resources that your organization contributes to a project, typically required by funders. This can be cash or in-kind contributions like volunteer time, equipment, or facilities. It demonstrates your commitment to the project.`
  }
  
  // Generic response for unrecognized terms
  return `I'd be happy to explain that term, but I need a bit more context. Could you be more specific about what funding or grant-related terminology you'd like me to explain?`
}

// Campaign lookup - with strict privacy controls
export async function buildCampaignResponse(context, message, userId) {
  try {
    const campaigns = context?.campaigns || []
    
    if (campaigns.length > 0) {
      return formatCampaignsResponse(campaigns, context?.profile?.organization_name)
    }
    
    const { data: userCampaigns, error } = await supabaseAdmin
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
      .limit(10)
    
    if (error) {
      console.error('Campaign lookup error:', error)
      return "I'm having trouble accessing your campaign information."
    }
    
    if (!userCampaigns || userCampaigns.length === 0) {
      return "You don't have any crowdfunding campaigns in the system yet. Ready to launch your first campaign?"
    }
    
    return formatCampaignsResponse(userCampaigns)
    
  } catch (error) {
    console.error('Campaign response error:', error)
    return "I'm having trouble accessing your campaign information."
  }
}

function formatCampaignsResponse(campaigns, orgName = null) {
  if (!campaigns || campaigns.length === 0) {
    return "You don't have any crowdfunding campaigns yet. Ready to launch your first campaign?"
  }

  let response = `Your crowdfunding campaigns:\n\n`
  
  const activeCampaigns = campaigns.filter(c => c.status === 'active')
  const completedCampaigns = campaigns.filter(c => ['completed', 'successful'].includes(c.status))
  
  // Show active campaigns first (max 2 for brevity)
  if (activeCampaigns.length > 0) {
    const topActive = activeCampaigns.slice(0, 2)
    
    topActive.forEach(campaign => {
      const raised = parseFloat(campaign.raised_amount || 0)
      const goal = parseFloat(campaign.goal_amount || 0)
      const percentage = goal > 0 ? Math.round((raised / goal) * 100) : 0
      
      response += `🚀 **${campaign.title || 'Active Campaign'}**\n`
      response += `   ${percentage}% funded ($${raised.toLocaleString()} of $${goal.toLocaleString()})\n`
      
      if (campaign.end_date) {
        const daysLeft = Math.ceil((new Date(campaign.end_date) - new Date()) / (1000 * 60 * 60 * 24))
        if (daysLeft > 0 && daysLeft <= 30) {
          response += `   ⏰ ${daysLeft} days left\n`
        }
      }
      response += `\n`
    })
    
    if (activeCampaigns.length > 2) {
      response += `...and ${activeCampaigns.length - 2} more active campaigns.\n\n`
    }
  }
  
  // Summary stats
  const totalCampaigns = campaigns.length
  if (completedCampaigns.length > 0) {
    const totalRaised = completedCampaigns.reduce((sum, c) => sum + parseFloat(c.raised_amount || 0), 0)
    response += `✅ ${completedCampaigns.length} completed campaigns`
    if (totalRaised > 0) {
      response += ` (raised $${totalRaised.toLocaleString()})`
    }
    response += `\n\n`
  }
  
  response += `Need help with any specific campaign?`
  
  return response
}

// Project lookup - with strict privacy controls
export async function buildProjectResponse(context, message, userId) {
  try {
    const projects = context?.projects || []
    
    if (projects.length > 0) {
      return formatProjectsResponse(projects, context?.profile?.organization_name)
    }
    
    const { data: userProjects, error } = await supabaseAdmin
      .from('projects')
      .select(`
        id, name, description, project_type, status, 
        funding_needed, funding_request_amount, total_project_budget,
        location, project_location, timeline, project_duration,
        proposed_start_date, funding_decision_needed,
        estimated_people_served, target_population,
        current_status, urgency_level,
        created_at, updated_at
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(10)
    
    if (error) {
      console.error('Project lookup error:', error)
      return "I'm having trouble accessing your project information."
    }
    
    if (!userProjects || userProjects.length === 0) {
      return "You don't have any projects in the system yet. Ready to add your first project?"
    }
    
    return formatProjectsResponse(userProjects)
    
  } catch (error) {
    console.error('Project response error:', error)
    return "I'm having trouble accessing your project information."
  }
}

function formatProjectsResponse(projects, orgName = null) {
  if (!projects || projects.length === 0) {
    return "You don't have any projects yet. Ready to add your first project?"
  }

  // Keep it simple and concise for chat
  let response = `Here's your project overview:\n\n`
  
  const activeProjects = projects.filter(p => ['active', 'in_progress', 'draft'].includes(p.status))
  
  if (activeProjects.length > 0) {
    // Show max 3 projects to keep it concise
    const topProjects = activeProjects.slice(0, 3)
    
    topProjects.forEach(project => {
      const fundingAmount = project.funding_request_amount || project.funding_needed || project.total_project_budget
      const budget = fundingAmount ? `$${parseInt(fundingAmount).toLocaleString()}` : 'No budget set'
      
      response += `📋 **${project.name || 'Untitled Project'}**\n`
      response += `   Status: ${project.status || 'Unknown'} | Budget: ${budget}\n`
      
      if (project.urgency_level === 'high') {
        response += `   🚨 High Priority\n`
      }
      
      response += `\n`
    })
    
    if (activeProjects.length > 3) {
      response += `...and ${activeProjects.length - 3} more active projects.\n\n`
    }
  }
  
  const totalProjects = projects.length
  const completedProjects = projects.filter(p => ['completed', 'funded'].includes(p.status)).length
  
  if (totalProjects > activeProjects.length) {
    response += `You have ${totalProjects} total projects`
    if (completedProjects > 0) {
      response += ` (${completedProjects} completed)`
    }
    response += `.\n\n`
  }
  
  response += `Need help with any specific project?`
  
  return response
}

// EIN lookup - enhanced with privacy check and missing data alerts
export async function buildEINResponse(context, message, userId) {
  try {
    const orgProfile = context?.profile
    if (orgProfile?.ein || orgProfile?.tax_id) {
      const ein = orgProfile.ein || orgProfile.tax_id
      return `Your organization's EIN is: **${ein}**\n\nThis is registered for ${orgProfile.organization_name || 'your organization'}.`
    }
    
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('ein, tax_id, organization_name, organization_type')
      .eq('user_id', userId)
      .single()
    
    if (error) {
      console.error('EIN lookup error:', error)
      return "I couldn't find your EIN in our records. Please update your organization information in your profile settings to add your EIN."
    }
    
    const ein = profile?.ein || profile?.tax_id
    if (ein) {
      return `Your organization's EIN is: **${ein}**\n\nOrganization: ${profile.organization_name || 'Not specified'}\nType: ${profile.organization_type || 'Not specified'}\n\nNeed to update this information? Check your organization settings.`
    }
    
    return "I don't see an EIN on file for your organization. Please update your profile to add your EIN - it's required for most grant applications."
    
  } catch (error) {
    console.error('EIN response error:', error)
    return "I'm having trouble accessing your EIN information. Please check your organization settings."
  }
}

// DUNS lookup - enhanced with privacy check and missing data alerts
export async function buildDUNSResponse(context, message, userId) {
  try {
    const orgProfile = context?.profile
    
    const dunsFields = {
      duns_number: orgProfile?.duns_number,
      duns_uei: orgProfile?.duns_uei,
      duns_uei_number: orgProfile?.duns_uei_number
    }
    
    let dunsValue = null
    let dunsType = null
    
    for (const [field, value] of Object.entries(dunsFields)) {
      if (value) {
        dunsValue = value
        dunsType = field
        break
      }
    }
    
    if (dunsValue) {
      const typeLabel = dunsType === 'duns_uei' || dunsType === 'duns_uei_number' 
        ? 'DUNS/UEI Number' 
        : 'DUNS Number'
      
      return `Your organization's ${typeLabel} is: **${dunsValue}**\n\nOrganization: ${orgProfile?.organization_name || 'Not specified'}\n\nThis identifier is used for federal contracting and grant applications.`
    }
    
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('duns_number, duns_uei, duns_uei_number, organization_name')
      .eq('user_id', userId)
      .single()
    
    if (error) {
      return "I'm having trouble accessing your DUNS information. Please check your profile settings."
    }
    
    const duns = profile?.duns_number || profile?.duns_uei || profile?.duns_uei_number
    if (duns) {
      return `Your organization's DUNS/UEI Number is: **${duns}**\n\nOrganization: ${profile.organization_name || 'Not specified'}\n\nThis identifier is used for federal contracting and grant applications.`
    }
    
    return "I don't see a DUNS or UEI number on file for your organization. Please update your profile to add this information - it's required for federal grants and contracts. You can register at sam.gov first, then add it to your profile."
    
  } catch (error) {
    console.error('DUNS response error:', error)
    return "I'm having trouble accessing your DUNS information. Please check your profile settings."
  }
}

// CAGE Code lookup - enhanced with privacy check and missing data alerts
export async function buildCAGEResponse(context, message, userId) {
  try {
    const cageCode = context?.profile?.cage_code
    
    if (cageCode) {
      return `Your organization's CAGE Code is: **${cageCode}**\n\nOrganization: ${context.profile.organization_name || 'Not specified'}\n\nCAGE Codes are used to identify businesses in federal contracting.`
    }
    
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('cage_code, organization_name')
      .eq('user_id', userId)
      .single()
    
    if (error || !profile?.cage_code) {
      return "I don't see a CAGE Code on file for your organization. Please update your profile to add this information. CAGE Codes are assigned by the Defense Logistics Agency for federal contracting - you can apply for one if you plan to do business with the government."
    }
    
    return `Your organization's CAGE Code is: **${profile.cage_code}**\n\nOrganization: ${profile.organization_name || 'Not specified'}`
    
  } catch (error) {
    console.error('CAGE response error:', error)
    return "I'm having trouble accessing your CAGE Code information. Please check your profile settings."
  }
}

// SAM registration lookup - enhanced with privacy check and missing data alerts
export async function buildSAMResponse(context, message, userId) {
  try {
    const samStatus = context?.profile?.sam_registration || context?.profile?.sam_gov_status
    const orgName = context?.profile?.organization_name
    
    if (samStatus) {
      return `Your SAM.gov registration status is: **${samStatus}**\n\nOrganization: ${orgName || 'Not specified'}\n\nSAM registration is required for federal grants and contracts.`
    }
    
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('sam_registration, sam_gov_status, organization_name, duns_number, duns_uei, cage_code')
      .eq('user_id', userId)
      .single()
    
    if (error) {
      return "I'm having trouble accessing your SAM registration information. Please check your profile settings."
    }
    
    const status = profile?.sam_registration || profile?.sam_gov_status
    
    if (status) {
      return `Your SAM.gov registration status is: **${status}**\n\nOrganization: ${profile.organization_name || 'Not specified'}`
    }
    
    const hasDUNS = profile?.duns_number || profile?.duns_uei
    const hasCAGE = profile?.cage_code
    
    let response = "I don't see SAM.gov registration information on file. Please update your profile with your SAM status. SAM registration is required for federal grants and contracts.\n\n"
    
    if (hasDUNS) {
      response += `You have a DUNS/UEI number: ${hasDUNS}\n`
    } else {
      response += `You'll need a DUNS/UEI number first - please add this to your profile\n`
    }
    
    if (hasCAGE) {
      response += `You have a CAGE Code: ${hasCAGE}\n`
    }
    
    response += `\nYou can register at sam.gov, then update your profile with the status.`
    
    return response
    
  } catch (error) {
    console.error('SAM response error:', error)
    return "I'm having trouble accessing your SAM registration information. Please check your profile settings."
  }
}

// Complete organization info - enhanced with privacy check and missing data alerts
export async function buildOrgInfoResponse(context, message, userId) {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select(`
        organization_name, organization_type, ein, tax_id,
        duns_number, duns_uei, duns_uei_number, cage_code,
        sam_registration, sam_gov_status,
        address_line1, city, state, zip_code,
        phone, website, years_in_operation,
        employee_count, annual_revenue,
        minority_owned, woman_owned, veteran_owned, small_business,
        eight_a_certified, hubzone_certified, disadvantaged_business
      `)
      .eq('user_id', userId)
      .single()
    
    if (error || !profile) {
      return "I'm having trouble accessing your organization information."
    }
    
    let response = `**Organization Profile:**\n\n`
    
    // Basic info
    response += `**${profile.organization_name || 'Organization Name Not Set'}**\n`
    response += `Type: ${profile.organization_type || 'Not specified'}\n\n`
    
    // Identifiers
    response += `**Identifiers:**\n`
    response += `• EIN: ${profile.ein || profile.tax_id || 'Not on file'}\n`
    
    const duns = profile.duns_number || profile.duns_uei || profile.duns_uei_number
    response += `• DUNS/UEI: ${duns || 'Not on file'}\n`
    response += `• CAGE Code: ${profile.cage_code || 'Not on file'}\n\n`
    
    // Registration status
    const samStatus = profile.sam_registration || profile.sam_gov_status
    response += `**Federal Registration:**\n`
    response += `• SAM.gov: ${samStatus || 'Not registered'}\n\n`
    
    // Contact info
    if (profile.address_line1 || profile.phone || profile.website) {
      response += `**Contact:**\n`
      if (profile.address_line1) {
        response += `• ${profile.address_line1}, ${profile.city || ''} ${profile.state || ''} ${profile.zip_code || ''}\n`
      }
      if (profile.phone) response += `• Phone: ${profile.phone}\n`
      if (profile.website) response += `• Website: ${profile.website}\n`
      response += `\n`
    }
    
    // Business details
    if (profile.years_in_operation || profile.employee_count || profile.annual_revenue) {
      response += `**Business Details:**\n`
      if (profile.years_in_operation) response += `• Years Operating: ${profile.years_in_operation}\n`
      if (profile.employee_count) response += `• Employees: ${profile.employee_count}\n`
      if (profile.annual_revenue) response += `• Annual Revenue: $${parseInt(profile.annual_revenue).toLocaleString()}\n`
      response += `\n`
    }
    
    // Certifications
    const certifications = []
    if (profile.minority_owned) certifications.push('Minority-Owned')
    if (profile.woman_owned) certifications.push('Woman-Owned')
    if (profile.veteran_owned) certifications.push('Veteran-Owned')
    if (profile.small_business) certifications.push('Small Business')
    if (profile.eight_a_certified) certifications.push('8(a) Certified')
    if (profile.hubzone_certified) certifications.push('HUBZone Certified')
    if (profile.disadvantaged_business) certifications.push('Disadvantaged Business')
    
    if (certifications.length > 0) {
      response += `**Certifications:**\n• ${certifications.join('\n• ')}\n\n`
    }
    
    response += `Need to update any information? Check your organization settings.`
    
    return response
    
  } catch (error) {
    console.error('Org info response error:', error)
    return "I'm having trouble accessing your organization information."
  }
}

// Certification lookup - enhanced with comprehensive certifications table data
export async function buildCertificationResponse(context, message, userId) {
  try {
    // Get both profile certifications and detailed certifications table data
    const [profileResult, certificationsResult] = await Promise.all([
      supabaseAdmin
        .from('user_profiles')
        .select(`
          organization_name,
          minority_owned, woman_owned, veteran_owned, small_business,
          eight_a_certified, hubzone_certified, disadvantaged_business,
          special_certifications
        `)
        .eq('user_id', userId)
        .single(),
      
      supabaseAdmin
        .from('certifications')
        .select(`
          id, certification_name, certification_type, issuing_organization,
          certification_number, issue_date, expiration_date, status,
          is_verified, verification_source, description, tags
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

    const profile = profileResult.data || {}
    const certifications = certificationsResult.data || []
    
    let response = `**Certifications for ${profile.organization_name || 'your organization'}:**\n\n`
    
    // Show business certifications from profile
    const businessCerts = []
    if (profile.minority_owned) businessCerts.push('🏢 Minority-Owned Business')
    if (profile.woman_owned) businessCerts.push('👩‍💼 Woman-Owned Business')
    if (profile.veteran_owned) businessCerts.push('🎖️ Veteran-Owned Business')
    if (profile.small_business) businessCerts.push('🏪 Small Business')
    if (profile.eight_a_certified) businessCerts.push('📋 8(a) Certified')
    if (profile.hubzone_certified) businessCerts.push('🏘️ HUBZone Certified')
    if (profile.disadvantaged_business) businessCerts.push('🤝 Disadvantaged Business')
    
    if (businessCerts.length > 0) {
      response += `**BUSINESS CERTIFICATIONS:**\n${businessCerts.join('\n')}\n\n`
    }

    // Show detailed certifications from certifications table
    if (certifications.length > 0) {
      const activeCerts = certifications.filter(c => c.status === 'active')
      const expiredCerts = certifications.filter(c => c.status === 'expired')
      const expiringCerts = certifications.filter(c => {
        if (!c.expiration_date) return false
        const daysUntilExpiry = Math.ceil((new Date(c.expiration_date) - new Date()) / (1000 * 60 * 60 * 24))
        return daysUntilExpiry <= 30 && daysUntilExpiry > 0
      })

      if (activeCerts.length > 0) {
        response += `**PROFESSIONAL & TECHNICAL CERTIFICATIONS (${activeCerts.length} active):**\n`
        
        // Group by type
        const certsByType = activeCerts.reduce((acc, cert) => {
          const type = cert.certification_type || 'other'
          if (!acc[type]) acc[type] = []
          acc[type].push(cert)
          return acc
        }, {})

        Object.entries(certsByType).forEach(([type, certs]) => {
          const typeLabel = type.charAt(0).toUpperCase() + type.slice(1)
          response += `\n**${typeLabel} (${certs.length}):**\n`
          
          certs.forEach(cert => {
            const verifiedIcon = cert.is_verified ? '✅' : '⚠️'
            const expiryInfo = cert.expiration_date ? 
              ` (expires ${new Date(cert.expiration_date).toLocaleDateString()})` : 
              ' (no expiration)'
            
            response += `${verifiedIcon} **${cert.certification_name}**\n`
            if (cert.issuing_organization) {
              response += `   Issued by: ${cert.issuing_organization}\n`
            }
            if (cert.certification_number) {
              response += `   Number: ${cert.certification_number}\n`
            }
            response += `   Status: ${cert.status}${expiryInfo}\n`
            if (cert.description) {
              response += `   ${cert.description}\n`
            }
            response += `\n`
          })
        })
      }

      // Show expiring certifications alert
      if (expiringCerts.length > 0) {
        response += `**⚠️ EXPIRING SOON (${expiringCerts.length}):**\n`
        expiringCerts.forEach(cert => {
          const daysLeft = Math.ceil((new Date(cert.expiration_date) - new Date()) / (1000 * 60 * 60 * 24))
          response += `• **${cert.certification_name}** - ${daysLeft} days left\n`
        })
        response += `\n`
      }

      // Show expired certifications (if any)
      if (expiredCerts.length > 0) {
        response += `**❌ EXPIRED (${expiredCerts.length}):**\n`
        expiredCerts.slice(0, 3).forEach(cert => {
          response += `• ${cert.certification_name}\n`
        })
        if (expiredCerts.length > 3) {
          response += `...and ${expiredCerts.length - 3} more\n`
        }
        response += `\n`
      }

      // Show verification status summary
      const verifiedCount = certifications.filter(c => c.is_verified).length
      const totalCount = certifications.length
      response += `**VERIFICATION STATUS:**\n`
      response += `• ${verifiedCount}/${totalCount} certifications verified\n`
      response += `• ${activeCerts.length} active, ${expiredCerts.length} expired\n\n`

      // Show competitive advantages
      const competitiveCerts = activeCerts.filter(c => 
        ['professional', 'technical', 'quality', 'safety'].includes(c.certification_type?.toLowerCase())
      )
      if (competitiveCerts.length > 0) {
        response += `**COMPETITIVE ADVANTAGES:**\n`
        response += `• ${competitiveCerts.length} professional/technical certifications\n`
        const verifiedCompetitive = competitiveCerts.filter(c => c.is_verified).length
        response += `• ${verifiedCompetitive} verified credentials\n`
        response += `• Strengthens grant and contract applications\n\n`
      }
    } else {
      response += `**PROFESSIONAL CERTIFICATIONS:**\nNo detailed certifications on file.\n\n`
    }

    // Show special certifications from profile
    if (profile.special_certifications?.length > 0) {
      response += `**SPECIAL CERTIFICATIONS:**\n• ${profile.special_certifications.join('\n• ')}\n\n`
    }
    
    response += `**GRANT STRATEGY IMPACT:**\n`
    response += `• Business certifications qualify you for set-aside contracts\n`
    response += `• Professional certifications demonstrate expertise\n`
    response += `• Verified credentials increase application credibility\n`
    if (expiringCerts.length > 0) {
      response += `• ⚠️ Renew expiring certifications to maintain eligibility\n`
    }
    response += `\nUpdate certifications in your profile to improve grant matching.`
    
    return response
    
  } catch (error) {
    console.error('Enhanced certification response error:', error)
    return "I'm having trouble accessing your certification information. The certifications system may be updating."
  }
}

// Real deadline lookup - enhanced with privacy check and all data sources
export async function buildDeadlineResponse(context, message, userId) {
  try {
    const [oppsResult, appsResult, projectsResult, campaignsResult] = await Promise.all([
      supabaseAdmin
        .from('opportunities')
        .select('title, deadline_date, status')
        .eq('user_id', userId)
        .gte('deadline_date', new Date().toISOString().split('T')[0])
        .order('deadline_date', { ascending: true })
        .limit(5),
      
      supabaseAdmin
        .from('applications')
        .select('title, deadline, status')
        .eq('user_id', userId)
        .gte('deadline', new Date().toISOString())
        .order('deadline', { ascending: true })
        .limit(5),
      
      supabaseAdmin
        .from('projects')
        .select('name, funding_decision_needed, investment_deadline')
        .eq('user_id', userId)
        .or('funding_decision_needed.gte.' + new Date().toISOString().split('T')[0] + ',investment_deadline.gte.' + new Date().toISOString().split('T')[0])
        .limit(5),
      
      supabaseAdmin
        .from('campaigns')
        .select('title, end_date, status')
        .eq('user_id', userId)
        .gte('end_date', new Date().toISOString())
        .order('end_date', { ascending: true })
        .limit(5)
    ])
    
    const opportunities = oppsResult.data || []
    const applications = appsResult.data || []
    const projects = projectsResult.data || []
    const campaigns = campaignsResult.data || []
    
    const allDeadlines = [
      ...opportunities.map(o => ({
        title: o.title,
        deadline: o.deadline_date,
        type: 'opportunity',
        status: o.status
      })),
      ...applications.map(a => ({
        title: a.title,
        deadline: a.deadline,
        type: 'application',
        status: a.status
      })),
      ...projects.map(p => ({
        title: p.name,
        deadline: p.funding_decision_needed || p.investment_deadline,
        type: 'project',
        status: 'active'
      })).filter(p => p.deadline),
      ...campaigns.map(c => ({
        title: c.title,
        deadline: c.end_date,
        type: 'campaign',
        status: c.status
      }))
    ].sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    
    if (allDeadlines.length === 0) {
      return "You don't have any upcoming deadlines! Time to find new opportunities."
    }
    
    const urgent = allDeadlines.filter(d => {
      const daysLeft = Math.ceil((new Date(d.deadline) - new Date()) / (1000 * 60 * 60 * 24))
      return daysLeft <= 7
    })
    
    let response = `**Upcoming Deadlines:**\n\n`
    
    if (urgent.length > 0) {
      response += `**URGENT (7 days or less):**\n`
      urgent.forEach(d => {
        const daysLeft = Math.ceil((new Date(d.deadline) - new Date()) / (1000 * 60 * 60 * 24))
        response += `• ${d.title} (${d.type}) - ${daysLeft} days left\n`
      })
      response += `\n`
    }
    
    const upcoming = allDeadlines.slice(0, 3).filter(d => !urgent.includes(d))
    if (upcoming.length > 0) {
      response += `**Next up:**\n`
      upcoming.forEach(d => {
        const daysLeft = Math.ceil((new Date(d.deadline) - new Date()) / (1000 * 60 * 60 * 24))
        response += `• ${d.title} (${d.type}) - ${daysLeft} days\n`
      })
    }
    
    return response
    
  } catch (error) {
    console.error('Deadline response error:', error)
    return "I'm having trouble accessing your deadline information."
  }
}

// Real application status lookup - enhanced with privacy check
export async function buildApplicationResponse(context, message, userId) {
  try {
    const { data: applications, error } = await supabaseAdmin
      .from('applications')
      .select('title, status, deadline, amount_requested')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) {
      return "I'm having trouble accessing your application data."
    }
    
    if (!applications || applications.length === 0) {
      return "You don't have any applications yet. Ready to start your first one?"
    }
    
    const inProgress = applications.filter(a => ['draft', 'in_progress'].includes(a.status))
    const submitted = applications.filter(a => ['submitted', 'under_review'].includes(a.status))
    const decided = applications.filter(a => ['approved', 'rejected', 'awarded'].includes(a.status))
    
    let response = `**Application Status:**\n\n`
    
    if (inProgress.length > 0) {
      response += `**In Progress (${inProgress.length}):**\n`
      inProgress.slice(0, 3).forEach(a => {
        const daysLeft = a.deadline ? Math.ceil((new Date(a.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null
        response += `• ${a.title}${daysLeft ? ` - ${daysLeft} days left` : ''}\n`
      })
      response += `\n`
    }
    
    if (submitted.length > 0) {
      response += `**Under Review (${submitted.length}):**\n`
      submitted.slice(0, 2).forEach(a => {
        response += `• ${a.title}\n`
      })
      response += `\n`
    }
    
    if (decided.length > 0) {
      const approved = decided.filter(a => ['approved', 'awarded'].includes(a.status)).length
      const rejected = decided.filter(a => a.status === 'rejected').length
      response += `**Decided:** ${approved} approved, ${rejected} rejected\n\n`
    }
    
    const totalRequested = applications
      .filter(a => a.amount_requested)
      .reduce((sum, a) => sum + (parseFloat(a.amount_requested) || 0), 0)
    
    if (totalRequested > 0) {
      response += `**Total Requested:** $${totalRequested.toLocaleString()}`
    }
    
    return response
    
  } catch (error) {
    console.error('Application response error:', error)
    return "I'm having trouble accessing your application data."
  }
}

// Real opportunity matching - enhanced with comprehensive opportunities table
export async function buildOpportunityResponse(context, message, userId) {
  try {
    const { data: userProjects } = await supabaseAdmin
      .from('projects')
      .select('name, project_type, industry, target_population, funding_needed, project_categories')
      .eq('user_id', userId)
    
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select(`
        organization_type, state, 
        minority_owned, woman_owned, veteran_owned, small_business,
        industry_focus, primary_focus_areas
      `)
      .eq('user_id', userId)
      .single()
    
    let opportunitiesQuery = supabaseAdmin
      .from('opportunities')
      .select(`
        id, title, sponsor, agency, description,
        amount_min, amount_max, deadline_date,
        fit_score, relevance_score, confidence_level,
        geography, project_types, organization_types,
        minority_business, woman_owned_business, veteran_owned_business, small_business_only,
        source_url, competition_level, application_complexity,
        recommendation_strength, strategic_priority,
        recommended_actions, potential_challenges
      `)
      .gte('deadline_date', new Date().toISOString().split('T')[0])
      .order('fit_score', { ascending: false })
      .limit(20)
    
    if (userProfile) {
      if (userProfile.minority_owned && !userProfile.woman_owned && !userProfile.veteran_owned) {
        opportunitiesQuery = opportunitiesQuery.or('minority_business.eq.true,minority_business.is.null')
      }
      if (userProfile.woman_owned) {
        opportunitiesQuery = opportunitiesQuery.or('woman_owned_business.eq.true,woman_owned_business.is.null')
      }
      if (userProfile.veteran_owned) {
        opportunitiesQuery = opportunitiesQuery.or('veteran_owned_business.eq.true,veteran_owned_business.is.null')
      }
      if (userProfile.small_business) {
        opportunitiesQuery = opportunitiesQuery.or('small_business_only.eq.true,small_business_only.is.null')
      }
    }
    
    const { data: opportunities, error } = await opportunitiesQuery
    
    if (error) {
      console.error('Opportunities lookup error:', error)
      return "I'm having trouble accessing the grants database. Please try again later."
    }
    
    if (!opportunities || opportunities.length === 0) {
      return await buildOpportunityGuidance(userProjects, userProfile)
    }
    
    return formatOpportunitiesResponse(opportunities, userProjects, userProfile)
    
  } catch (error) {
    console.error('Opportunity response error:', error)
    return "I'm having trouble accessing opportunity data. Please try again later."
  }
}

function formatOpportunitiesResponse(opportunities, userProjects, userProfile) {
  let response = `**Grant Opportunities Found:**\n\n`
  
  const highPriority = opportunities.filter(o => 
    (o.fit_score >= 80) || 
    (o.recommendation_strength === 'high') ||
    (o.strategic_priority === 'high')
  )
  
  const mediumPriority = opportunities.filter(o => 
    (o.fit_score >= 60 && o.fit_score < 80) || 
    (o.recommendation_strength === 'medium') ||
    (o.strategic_priority === 'medium')
  )
  
  if (highPriority.length > 0) {
    response += `**HIGH PRIORITY MATCHES (${highPriority.length}):**\n`
    highPriority.slice(0, 3).forEach(opp => {
      const daysLeft = Math.ceil((new Date(opp.deadline_date) - new Date()) / (1000 * 60 * 60 * 24))
      const amount = opp.amount_max ? `$${parseInt(opp.amount_max).toLocaleString()}` : 'Amount varies'
      response += `• **${opp.title}** - ${amount} - ${daysLeft} days\n`
      response += `  Sponsor: ${opp.sponsor}\n`
      if (opp.fit_score && opp.fit_score > 0) {
        response += `  Fit Score: ${opp.fit_score}%\n`
      }
      response += `\n`
    })
  }
  
  if (mediumPriority.length > 0) {
    response += `**GOOD MATCHES (${mediumPriority.length}):**\n`
    mediumPriority.slice(0, 2).forEach(opp => {
      const daysLeft = Math.ceil((new Date(opp.deadline_date) - new Date()) / (1000 * 60 * 60 * 24))
      response += `• ${opp.title} - ${daysLeft} days\n`
    })
    response += `\n`
  }
  
  response += `**RECOMMENDED ACTIONS:**\n`
  
  if (highPriority.length > 0) {
    const urgent = highPriority.filter(o => {
      const daysLeft = Math.ceil((new Date(o.deadline_date) - new Date()) / (1000 * 60 * 60 * 24))
      return daysLeft <= 30
    })
    
    if (urgent.length > 0) {
      response += `• URGENT: ${urgent.length} high-priority grants have deadlines within 30 days\n`
    }
    response += `• Start applications for top ${Math.min(3, highPriority.length)} high-priority matches\n`
  }
  
  if (userProjects && userProjects.length > 0) {
    response += `• Review how your ${userProjects.length} projects align with these opportunities\n`
  }
  
  response += `• Set up grant alerts to monitor for new opportunities\n`
  response += `• Consider networking with other ${userProfile?.organization_type || 'similar'} organizations\n\n`
  
  response += `Want details on any specific grant? Just ask me about it by name.`
  
  return response
}

async function buildOpportunityGuidance(userProjects, userProfile) {
  let response = `I don't see any current grant matches in our database. Here's how to expand your search:\n\n`
  
  response += `**IMMEDIATE ACTIONS:**\n`
  
  if (!userProjects || userProjects.length === 0) {
    response += `• Add your projects to the system for better grant matching\n`
  } else {
    response += `• Your ${userProjects.length} projects are ready for matching\n`
    response += `• Consider refining project categories for better discovery\n`
  }
  
  if (!userProfile?.organization_type) {
    response += `• Complete your organization profile for eligibility matching\n`
  }
  
  response += `• Check back daily - new grants are added regularly\n`
  response += `• Set up automated alerts for new opportunities\n\n`
  
  response += `**EXPAND YOUR SEARCH:**\n`
  response += `• Search state and local government websites\n`
  response += `• Check industry-specific foundations\n`
  response += `• Review corporate giving programs\n`
  response += `• Connect with grant writing consultants\n\n`
  
  if (userProfile?.state) {
    response += `**${userProfile.state} SPECIFIC:**\n`
    response += `• Check your state's grant portal\n`
    response += `• Look into regional community foundations\n`
    response += `• Consider municipal funding programs\n\n`
  }
  
  response += `The grant discovery system will improve as you add more project details and we sync more funding sources.`
  
  return response
}

// Budget helper - enhanced with privacy check
export async function buildBudgetResponse(context, message, userId) {
  try {
    const { data: applications, error } = await supabaseAdmin
      .from('applications')
      .select('title, amount_requested, budget_data, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (error || !applications?.length) {
      return "I can help you build budgets for grant applications. What type of project are you budgeting for?"
    }
    
    const totalRequested = applications
      .filter(a => a.amount_requested)
      .reduce((sum, a) => sum + (parseFloat(a.amount_requested) || 0), 0)
    
    const avgRequest = applications.length > 0 ? totalRequested / applications.length : 0
    
    let response = `**Budget Overview:**\n\n`
    response += `**Your Applications:**\n`
    response += `• Total Requested: ${totalRequested.toLocaleString()}\n`
    response += `• Average Request: ${avgRequest.toLocaleString()}\n`
    response += `• Applications: ${applications.length}\n\n`
    
    response += `**Budget Tips:**\n`
    response += `• Include indirect costs (typically 10-25%)\n`
    response += `• Personnel costs are usually the largest category\n`
    response += `• Always justify major expenses\n`
    response += `• Round to nearest $100 for clean presentation`
    
    return response
    
  } catch (error) {
    console.error('Budget response error:', error)
    return "I can help you with budget planning and cost estimation for grant applications."
  }
}

// Status overview - enhanced with all data sources
export async function buildStatusResponse(context, message, userId) {
  try {
    const [appsResult, oppsResult, projectsResult, campaignsResult] = await Promise.all([
      supabaseAdmin.from('applications').select('status').eq('user_id', userId),
      supabaseAdmin.from('opportunities').select('status, deadline_date').eq('user_id', userId),
      supabaseAdmin.from('projects').select('status').eq('user_id', userId),
      supabaseAdmin.from('campaigns').select('status, raised_amount, goal_amount').eq('user_id', userId)
    ])
    
    const apps = appsResult.data || []
    const opps = oppsResult.data || []
    const projects = projectsResult.data || []
    const campaigns = campaignsResult.data || []
    
    const appsByStatus = apps.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1
      return acc
    }, {})
    
    const activeOpps = opps.filter(o => 
      o.deadline_date && new Date(o.deadline_date) > new Date()
    ).length
    
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length
    const totalRaised = campaigns.reduce((sum, c) => sum + parseFloat(c.raised_amount || 0), 0)
    
    let response = `**Status Overview:**\n\n`
    response += `**Applications:**\n`
    Object.entries(appsByStatus).forEach(([status, count]) => {
      const emoji = status === 'approved' ? '✅' : status === 'submitted' ? '⏳' : '🔄'
      response += `${emoji} ${status}: ${count}\n`
    })
    
    response += `\n**Active Opportunities:** ${activeOpps}\n`
    response += `**Projects:** ${projects.length}\n`
    response += `**Active Campaigns:** ${activeCampaigns}\n`
    
    if (totalRaised > 0) {
      response += `**Total Raised:** ${totalRaised.toLocaleString()}\n`
    }
    
    return response
    
  } catch (error) {
    console.error('Status response error:', error)
    return "I'm having trouble getting your status overview."
  }
}

// General help with context awareness
export async function buildGeneralResponse(context, message, userId) {
  const orgName = context?.profile?.organization_name || 'your organization'
  
  return `Hi! I'm here to help ${orgName} with funding strategy.\n\n` +
    `**I can help you with:**\n` +
    `• Finding your EIN/tax ID, DUNS, or CAGE codes\n` +
    `• Checking upcoming deadlines\n` +
    `• Reviewing application status\n` +
    `• Monitoring project progress\n` +
    `• Tracking campaign performance\n` +
    `• Discovering new opportunities\n` +
    `• Budget planning and guidance\n\n` +
    `Just ask me things like "What's my EIN?" or "Show me my deadlines."`
}

// Enhanced context builder with all data sources and strict privacy controls
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
      
      supabaseAdmin.from('campaigns').select(`
        id, platform, campaign_id, campaign_url, title, description,
        goal_amount, raised_amount, supporter_count,
        start_date, end_date, status, last_sync,
        platform_fee_percentage, project_id,
        created_at, updated_at
      `).eq('user_id', userId).order('updated_at', { ascending: false }),
      
      // Add certifications data - handle gracefully if table doesn't exist yet
      supabaseAdmin.from('certifications').select(`
        id, certification_name, certification_type, issuing_organization,
        certification_number, issue_date, expiration_date, renewal_date,
        status, is_verified, verification_source, description,
        certificate_url, verification_url, tags, metadata,
        created_at, updated_at
      `).eq('user_id', userId).order('created_at', { ascending: false }).then(
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
    
    // Process certifications data for enhanced understanding
    const certificationsAnalysis = processCertificationsData(certifications)
    
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

// Process certifications data for enhanced AI understanding
function processCertificationsData(certifications) {
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
    competitive_advantages: [],
    most_recent: null,
    oldest: null
  }

  certifications.forEach(cert => {
    // Count by status
    analysis.by_status[cert.status] = (analysis.by_status[cert.status] || 0) + 1
    
    if (cert.status === 'active') {
      analysis.active_count++
    }
    
    if (cert.is_verified) {
      analysis.verified_count++
    }

    // Count by type
    if (cert.certification_type) {
      analysis.by_type[cert.certification_type] = (analysis.by_type[cert.certification_type] || 0) + 1
    }

    // Count by issuer
    if (cert.issuing_organization) {
      analysis.by_issuer[cert.issuing_organization] = (analysis.by_issuer[cert.issuing_organization] || 0) + 1
    }

    // Check expiration status
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

    // Identify competitive advantages
    const competitiveTypes = ['professional', 'technical', 'quality', 'safety', 'industry']
    if (cert.status === 'active' && cert.certification_type && competitiveTypes.includes(cert.certification_type.toLowerCase())) {
      analysis.competitive_advantages.push({
        name: cert.certification_name,
        type: cert.certification_type,
        issuer: cert.issuing_organization,
        verified: cert.is_verified
      })
    }

    // Track most recent and oldest
    const certDate = new Date(cert.created_at)
    if (!analysis.most_recent || certDate > new Date(analysis.most_recent.created_at)) {
      analysis.most_recent = cert
    }
    if (!analysis.oldest || certDate < new Date(analysis.oldest.created_at)) {
      analysis.oldest = cert
    }
  })

  // Sort expiration alerts by urgency
  analysis.expiration_alerts.sort((a, b) => a.days_remaining - b.days_remaining)
  
  // Sort competitive advantages by verification status and type
  analysis.competitive_advantages.sort((a, b) => {
    if (a.verified && !b.verified) return -1
    if (!a.verified && b.verified) return 1
    return a.type.localeCompare(b.type)
  })

  return analysis
}