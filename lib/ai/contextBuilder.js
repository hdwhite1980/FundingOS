// lib/ai/contextBuilder.js - Complete with all data sources and strict privacy controls
import { supabaseAdmin } from '../supabaseAdmin'

// Enhanced intent classification - focused on specific questions
export function classifyAssistantIntent(message) {
  const lower = message.toLowerCase().trim()
  
  // Simple definition/explanation patterns (highest priority)
  if (lower.match(/^what\s+(is|does|means?)\s+.*\b(main\s*contact|contact\s*person|primary\s*contact)\b/)) {
    return 'definition_main_contact'
  }
  
  if (lower.match(/^what\s+(is|does|means?)\s+.*\b(ein|tax\s*id|employer\s*identification)\b/)) {
    return 'definition_ein'
  }
  
  if (lower.match(/^what\s+(is|does|means?)\s+.*\b(duns|cage|sam)\b/)) {
    return 'definition_business_term'
  }
  
  // Simple questions should get simple answers
  if (lower.match(/^what\s+(is|does|means?)\s+/)) {
    return 'simple_definition'
  }
  
  // Data lookup patterns (only when specifically asking for "my" data)
  if (lower.match(/\b(my\s*ein|show\s*ein|ein\s*number|what.*my.*ein)\b/)) {
    return 'ein_lookup'
  }
  
  if (lower.match(/\b(my\s*duns|show\s*duns|duns\s*number|what.*my.*duns)\b/)) {
    return 'duns_lookup'
  }
  
  if (lower.match(/\b(my\s*projects?|show\s*projects?|project\s*status|what.*my.*project)\b/)) {
    return 'project_lookup'
  }
  
  if (lower.match(/\b(my\s*campaigns?|show\s*campaigns?|campaign\s*status)\b/)) {
    return 'campaign_lookup'
  }
  
  // Only show deadlines when specifically asked
  if (lower.match(/\b(my\s*deadlines?|show\s*deadlines?|deadline|due\s*date|when\s*due)\b/)) {
    return 'deadline_check'
  }
  
  // Only show applications when specifically asked
  if (lower.match(/\b(my\s*applications?|show\s*applications?|application\s*status)\b/)) {
    return 'application_help'
  }
  
  // Broad patterns only when specifically requested
  if (lower.match(/\b(organization|org|company|business\s*info|business\s*details|my\s*info|profile)\b/)) {
    return 'org_info'
  }
  
  if (lower.match(/\b(certification|certified|minority|woman|veteran|small\s*business|8a|hubzone|disadvantaged)\b/)) {
    return 'certification_lookup'
  }
  
  if (lower.match(/\b(opportunity|grant|funding|match|search|find)\b/)) {
    return 'opportunity_discovery'
  }
  
  if (lower.match(/\b(budget|cost|expense|financial|money|dollar)\b/)) {
    return 'budget_help'
  }
  
  if (lower.match(/\b(status|progress|complete|pending|review)\b/)) {
    return 'status_check'
  }
  
  return 'general_help'
}

// Enhanced response generation - focused and concise
export async function generateAssistantResponse(intent, context, message, userId) {
  try {
    switch (intent) {
      case 'definition_main_contact':
        return buildMainContactDefinition()
      
      case 'definition_ein':
        return buildEINDefinition()
      
      case 'definition_business_term':
        return buildBusinessTermDefinition(message)
      
      case 'simple_definition':
        return buildSimpleDefinition(message)
      
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

// Simple definition responses - no data lookup needed
function buildMainContactDefinition() {
  return `📞 **Main Contact** refers to the primary person responsible for communication with funders, grant agencies, or program officers.

This person typically:
• Serves as the key point of contact for questions
• Receives official correspondence and updates
• Handles submission and follow-up communications
• May be the Principal Investigator, Project Director, or designated representative

In grant applications, you'll often see fields like "Primary Contact," "Authorized Representative," or "Project Contact" - these all generally refer to your main contact person.`
}

function buildEINDefinition() {
  return `📋 **EIN (Employer Identification Number)** is a unique 9-digit federal tax identification number assigned by the IRS to businesses operating in the United States.

Format: XX-XXXXXXX (e.g., 12-3456789)

Used for:
• Tax filing and reporting
• Opening business bank accounts
• Grant and contract applications
• SAM.gov registration
• Employment tax purposes

Also called Federal Tax ID or FEIN (Federal Employer Identification Number).`
}

function buildBusinessTermDefinition(message) {
  const lower = message.toLowerCase()
  
  if (lower.includes('duns')) {
    return `🏢 **DUNS Number** is a unique 9-digit identifier assigned by Dun & Bradstreet to businesses.

Recently replaced by **UEI (Unique Entity Identifier)** in federal systems.

Used for:
• Federal contracting and grants
• SAM.gov registration
• Business credit reporting
• Vendor identification

New registrations now receive UEIs instead of DUNS numbers.`
  }
  
  if (lower.includes('cage')) {
    return `🔐 **CAGE Code** (Commercial And Government Entity) is a 5-character alphanumeric identifier assigned by the Defense Logistics Agency.

Used for:
• Federal contracting identification
• Defense and military contracts
• Supply chain management
• Vendor databases

Format: XXXXX (5 characters, mix of letters and numbers)`
  }
  
  if (lower.includes('sam')) {
    return `🏛️ **SAM.gov** (System for Award Management) is the federal government's system for managing vendor information.

Required for:
• Federal grants over $30,000
• Federal contracts
• Cooperative agreements
• Access to federal funding opportunities

Must maintain active registration to receive federal funding.`
  }
  
  return `I can help explain business terms like EIN, DUNS, CAGE codes, or SAM.gov registration. What specific term would you like me to explain?`
}

function buildSimpleDefinition(message) {
  return `I'd be happy to explain that term. Could you be more specific about what you'd like me to define?

I can help explain funding-related terms like:
• **EIN** - Tax identification number
• **DUNS/UEI** - Business identifier
• **CAGE Code** - Federal contracting code
• **SAM.gov** - Federal registration system
• **Main Contact** - Primary communication person`
}// Campaign lookup - with strict privacy controls
export async function buildCampaignResponse(context, message, userId) {
  try {
    // First check cached context
    const campaigns = context?.campaigns || []
    
    if (campaigns.length > 0) {
      return formatCampaignsResponse(campaigns, context?.profile?.organization_name)
    }
    
    // Fallback: Direct database lookup with strict user isolation
    const { data: userCampaigns, error } = await supabaseAdmin
      .from('campaigns')
      .select(`
        id, platform, campaign_id, campaign_url, title, description,
        goal_amount, raised_amount, supporter_count,
        start_date, end_date, status, last_sync,
        platform_fee_percentage, project_id,
        created_at, updated_at
      `)
      .eq('user_id', userId) // STRICT: Only this user's campaigns
      .order('updated_at', { ascending: false })
      .limit(10)
    
    if (error) {
      console.error('Campaign lookup error:', error)
      return "I'm having trouble accessing your campaign information."
    }
    
    if (!userCampaigns || userCampaigns.length === 0) {
      return "📢 You don't have any crowdfunding campaigns in the system yet. Ready to launch your first campaign?"
    }
    
    return formatCampaignsResponse(userCampaigns)
    
  } catch (error) {
    console.error('Campaign response error:', error)
    return "I'm having trouble accessing your campaign information."
  }
}

// Format campaigns response helper
function formatCampaignsResponse(campaigns, orgName = null) {
  let response = `📢 **Your Crowdfunding Campaigns${orgName ? ` (${orgName})` : ''}:**\n\n`
  
  // Group by status
  const activeCampaigns = campaigns.filter(c => c.status === 'active')
  const completedCampaigns = campaigns.filter(c => ['completed', 'successful'].includes(c.status))
  const pausedCampaigns = campaigns.filter(c => ['paused', 'draft'].includes(c.status))
  
  if (activeCampaigns.length > 0) {
    response += `🚀 **Active Campaigns (${activeCampaigns.length}):**\n`
    activeCampaigns.slice(0, 5).forEach(campaign => {
      const raised = parseFloat(campaign.raised_amount || 0)
      const goal = parseFloat(campaign.goal_amount || 0)
      const percentage = goal > 0 ? Math.round((raised / goal) * 100) : 0
      const supporters = campaign.supporter_count || 0
      
      response += `• **${campaign.title || 'Untitled Campaign'}** (${campaign.platform})\n`
      response += `  💰 $${raised.toLocaleString()} of $${goal.toLocaleString()} (${percentage}%)\n`
      if (supporters > 0) {
        response += `  👥 ${supporters} supporters\n`
      }
      
      // Add deadline info if available
      if (campaign.end_date) {
        const daysLeft = Math.ceil((new Date(campaign.end_date) - new Date()) / (1000 * 60 * 60 * 24))
        if (daysLeft > 0) {
          response += `  ⏰ ${daysLeft} days left\n`
        } else if (daysLeft <= 0 && daysLeft > -7) {
          response += `  🔴 Campaign ended ${Math.abs(daysLeft)} days ago\n`
        }
      }
      
      if (campaign.campaign_url) {
        response += `  🔗 [View Campaign](${campaign.campaign_url})\n`
      }
      response += `\n`
    })
  }
  
  if (completedCampaigns.length > 0) {
    response += `✅ **Completed Campaigns:** ${completedCampaigns.length}\n`
    const totalRaised = completedCampaigns.reduce((sum, c) => sum + parseFloat(c.raised_amount || 0), 0)
    if (totalRaised > 0) {
      response += `💰 Total Raised: $${totalRaised.toLocaleString()}\n`
    }
    response += `\n`
  }
  
  if (pausedCampaigns.length > 0) {
    response += `⏸️ **Draft/Paused Campaigns:** ${pausedCampaigns.length}\n\n`
  }
  
  // Overall summary stats
  const totalRaised = campaigns.reduce((sum, c) => sum + parseFloat(c.raised_amount || 0), 0)
  const totalGoal = campaigns.reduce((sum, c) => sum + parseFloat(c.goal_amount || 0), 0)
  const totalSupporters = campaigns.reduce((sum, c) => sum + parseInt(c.supporter_count || 0), 0)
  
  if (totalRaised > 0 || totalSupporters > 0) {
    response += `📊 **Campaign Summary:**\n`
    if (totalRaised > 0) {
      response += `• Total Raised: $${totalRaised.toLocaleString()}`
      if (totalGoal > 0) {
        const overallPercentage = Math.round((totalRaised / totalGoal) * 100)
        response += ` of $${totalGoal.toLocaleString()} (${overallPercentage}%)`
      }
      response += `\n`
    }
    if (totalSupporters > 0) {
      response += `• Total Supporters: ${totalSupporters.toLocaleString()}\n`
    }
    
    // Platform breakdown
    const platformStats = campaigns.reduce((acc, c) => {
      const platform = c.platform || 'Unknown'
      acc[platform] = (acc[platform] || 0) + parseFloat(c.raised_amount || 0)
      return acc
    }, {})
    
    if (Object.keys(platformStats).length > 1) {
      response += `• Platforms: ${Object.entries(platformStats)
        .map(([platform, amount]) => `${platform} ($${amount.toLocaleString()})`)
        .join(', ')}\n`
    }
    response += `\n`
  }
  
  response += `Want details on a specific campaign? Just ask!`
  
  return response
}

// Project lookup - with strict privacy controls
export async function buildProjectResponse(context, message, userId) {
  try {
    // First check cached context
    const projects = context?.projects || []
    
    if (projects.length > 0) {
      return formatProjectsResponse(projects, context?.profile?.organization_name)
    }
    
    // Fallback: Direct database lookup with strict user isolation
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
      .eq('user_id', userId) // STRICT: Only this user's projects
      .order('updated_at', { ascending: false })
      .limit(10)
    
    if (error) {
      console.error('Project lookup error:', error)
      return "I'm having trouble accessing your project information."
    }
    
    if (!userProjects || userProjects.length === 0) {
      return "📋 You don't have any projects in the system yet. Ready to add your first project?"
    }
    
    return formatProjectsResponse(userProjects)
    
  } catch (error) {
    console.error('Project response error:', error)
    return "I'm having trouble accessing your project information."
  }
}

// Format projects response helper
function formatProjectsResponse(projects, orgName = null) {
  let response = `📋 **Your Projects${orgName ? ` (${orgName})` : ''}:**\n\n`
  
  // Group by status
  const activeProjects = projects.filter(p => ['active', 'in_progress', 'draft'].includes(p.status))
  const completedProjects = projects.filter(p => ['completed', 'funded'].includes(p.status))
  const otherProjects = projects.filter(p => !['active', 'in_progress', 'draft', 'completed', 'funded'].includes(p.status))
  
  if (activeProjects.length > 0) {
    response += `🔄 **Active Projects (${activeProjects.length}):**\n`
    activeProjects.slice(0, 5).forEach(project => {
      const fundingAmount = project.funding_request_amount || project.funding_needed || project.total_project_budget
      const fundingText = fundingAmount ? ` - $${parseInt(fundingAmount).toLocaleString()}` : ''
      const locationText = project.project_location || project.location
      const location = locationText ? ` (${locationText})` : ''
      
      response += `• **${project.name || 'Untitled Project'}**${fundingText}${location}\n`
      if (project.description && project.description.length > 0) {
        response += `  ${project.description.substring(0, 100)}${project.description.length > 100 ? '...' : ''}\n`
      }
      
      // Add urgency or deadline info
      if (project.urgency_level === 'high' || project.funding_decision_needed) {
        const deadline = project.funding_decision_needed ? 
          ` - Deadline: ${new Date(project.funding_decision_needed).toLocaleDateString()}` : ''
        response += `  ⚠️ ${project.urgency_level === 'high' ? 'High Priority' : ''}${deadline}\n`
      }
      response += `\n`
    })
  }
  
  if (completedProjects.length > 0) {
    response += `✅ **Completed Projects:** ${completedProjects.length}\n\n`
  }
  
  if (otherProjects.length > 0) {
    response += `📋 **Other Projects:** ${otherProjects.length}\n\n`
  }
  
  // Summary stats
  const totalFundingRequested = projects
    .map(p => p.funding_request_amount || p.funding_needed || p.total_project_budget || 0)
    .reduce((sum, amount) => sum + parseFloat(amount || 0), 0)
  
  if (totalFundingRequested > 0) {
    response += `💰 **Total Funding Across Projects:** $${totalFundingRequested.toLocaleString()}\n`
  }
  
  const totalPeopleServed = projects
    .map(p => p.estimated_people_served || 0)
    .reduce((sum, count) => sum + parseInt(count || 0), 0)
  
  if (totalPeopleServed > 0) {
    response += `👥 **Total People Served:** ${totalPeopleServed.toLocaleString()}\n`
  }
  
  response += `\nWant details on a specific project? Just ask!`
  
  return response
}

// EIN lookup - enhanced with privacy check
export async function buildEINResponse(context, message, userId) {
  try {
    const orgProfile = context?.profile
    if (orgProfile?.ein || orgProfile?.tax_id) {
      const ein = orgProfile.ein || orgProfile.tax_id
      return `📄 Your organization's EIN is: **${ein}**\n\nThis is registered for ${orgProfile.organization_name || 'your organization'}.`
    }
    
    // Fallback with strict user isolation
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('ein, tax_id, organization_name, organization_type')
      .eq('user_id', userId) // STRICT: Only this user's profile
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

// DUNS lookup - enhanced with privacy check
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
      
      return `🏢 Your organization's ${typeLabel} is: **${dunsValue}**\n\nOrganization: ${orgProfile?.organization_name || 'Not specified'}\n\nThis identifier is used for federal contracting and grant applications.`
    }
    
    // Fallback with strict user isolation
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('duns_number, duns_uei, duns_uei_number, organization_name')
      .eq('user_id', userId) // STRICT: Only this user's profile
      .single()
    
    if (error) {
      return "I'm having trouble accessing your DUNS information."
    }
    
    const duns = profile?.duns_number || profile?.duns_uei || profile?.duns_uei_number
    if (duns) {
      return `🏢 Your organization's DUNS/UEI Number is: **${duns}**\n\nOrganization: ${profile.organization_name || 'Not specified'}\n\nThis identifier is used for federal contracting and grant applications.`
    }
    
    return "🏢 I don't see a DUNS or UEI number on file for your organization. This is required for federal grants and contracts. You can register at sam.gov and add it in your organization settings."
    
  } catch (error) {
    console.error('DUNS response error:', error)
    return "I'm having trouble accessing your DUNS information."
  }
}

// CAGE Code lookup - enhanced with privacy check
export async function buildCAGEResponse(context, message, userId) {
  try {
    const cageCode = context?.profile?.cage_code
    
    if (cageCode) {
      return `🔐 Your organization's CAGE Code is: **${cageCode}**\n\nOrganization: ${context.profile.organization_name || 'Not specified'}\n\nCAGE Codes are used to identify businesses in federal contracting.`
    }
    
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('cage_code, organization_name')
      .eq('user_id', userId) // STRICT: Only this user's profile
      .single()
    
    if (error || !profile?.cage_code) {
      return "🔐 I don't see a CAGE Code on file for your organization. CAGE Codes are assigned by the Defense Logistics Agency for federal contracting. You can apply for one if you plan to do business with the government."
    }
    
    return `🔐 Your organization's CAGE Code is: **${profile.cage_code}**\n\nOrganization: ${profile.organization_name || 'Not specified'}`
    
  } catch (error) {
    console.error('CAGE response error:', error)
    return "I'm having trouble accessing your CAGE Code information."
  }
}

// SAM registration lookup - enhanced with privacy check
export async function buildSAMResponse(context, message, userId) {
  try {
    const samStatus = context?.profile?.sam_registration || context?.profile?.sam_gov_status
    const orgName = context?.profile?.organization_name
    
    if (samStatus) {
      return `🏛️ Your SAM.gov registration status is: **${samStatus}**\n\nOrganization: ${orgName || 'Not specified'}\n\nSAM registration is required for federal grants and contracts.`
    }
    
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('sam_registration, sam_gov_status, organization_name, duns_number, duns_uei, cage_code')
      .eq('user_id', userId) // STRICT: Only this user's profile
      .single()
    
    if (error) {
      return "I'm having trouble accessing your SAM registration information."
    }
    
    const status = profile?.sam_registration || profile?.sam_gov_status
    
    if (status) {
      return `🏛️ Your SAM.gov registration status is: **${status}**\n\nOrganization: ${profile.organization_name || 'Not specified'}`
    }
    
    const hasDUNS = profile?.duns_number || profile?.duns_uei
    const hasCAGE = profile?.cage_code
    
    let response = "🏛️ I don't see SAM.gov registration information on file. SAM registration is required for federal grants and contracts.\n\n"
    
    if (hasDUNS) {
      response += `✅ You have a DUNS/UEI number: ${hasDUNS}\n`
    } else {
      response += `❌ You'll need a DUNS/UEI number first\n`
    }
    
    if (hasCAGE) {
      response += `✅ You have a CAGE Code: ${hasCAGE}\n`
    }
    
    response += `\nYou can register at sam.gov`
    
    return response
    
  } catch (error) {
    console.error('SAM response error:', error)
    return "I'm having trouble accessing your SAM registration information."
  }
}

// Complete organization info - enhanced with privacy check
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
      .eq('user_id', userId) // STRICT: Only this user's profile
      .single()
    
    if (error || !profile) {
      return "I'm having trouble accessing your organization information."
    }
    
    let response = `🏢 **Organization Profile:**\n\n`
    
    // Basic info
    response += `**${profile.organization_name || 'Organization Name Not Set'}**\n`
    response += `Type: ${profile.organization_type || 'Not specified'}\n\n`
    
    // Identifiers
    response += `📋 **Identifiers:**\n`
    response += `• EIN: ${profile.ein || profile.tax_id || 'Not on file'}\n`
    
    const duns = profile.duns_number || profile.duns_uei || profile.duns_uei_number
    response += `• DUNS/UEI: ${duns || 'Not on file'}\n`
    response += `• CAGE Code: ${profile.cage_code || 'Not on file'}\n\n`
    
    // Registration status
    const samStatus = profile.sam_registration || profile.sam_gov_status
    response += `🏛️ **Federal Registration:**\n`
    response += `• SAM.gov: ${samStatus || 'Not registered'}\n\n`
    
    // Contact info
    if (profile.address_line1 || profile.phone || profile.website) {
      response += `📍 **Contact:**\n`
      if (profile.address_line1) {
        response += `• ${profile.address_line1}, ${profile.city || ''} ${profile.state || ''} ${profile.zip_code || ''}\n`
      }
      if (profile.phone) response += `• Phone: ${profile.phone}\n`
      if (profile.website) response += `• Website: ${profile.website}\n`
      response += `\n`
    }
    
    // Business details
    if (profile.years_in_operation || profile.employee_count || profile.annual_revenue) {
      response += `📊 **Business Details:**\n`
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
      response += `🏆 **Certifications:**\n• ${certifications.join('\n• ')}\n\n`
    }
    
    response += `Need to update any information? Check your organization settings.`
    
    return response
    
  } catch (error) {
    console.error('Org info response error:', error)
    return "I'm having trouble accessing your organization information."
  }
}

// Certification lookup - enhanced with privacy check
export async function buildCertificationResponse(context, message, userId) {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select(`
        organization_name,
        minority_owned, woman_owned, veteran_owned, small_business,
        eight_a_certified, hubzone_certified, disadvantaged_business,
        special_certifications
      `)
      .eq('user_id', userId) // STRICT: Only this user's profile
      .single()
    
    if (error) {
      return "I'm having trouble accessing your certification information."
    }
    
    const certifications = []
    if (profile.minority_owned) certifications.push('✅ Minority-Owned Business')
    if (profile.woman_owned) certifications.push('✅ Woman-Owned Business')
    if (profile.veteran_owned) certifications.push('✅ Veteran-Owned Business')
    if (profile.small_business) certifications.push('✅ Small Business')
    if (profile.eight_a_certified) certifications.push('✅ 8(a) Certified')
    if (profile.hubzone_certified) certifications.push('✅ HUBZone Certified')
    if (profile.disadvantaged_business) certifications.push('✅ Disadvantaged Business')
    
    let response = `🏆 **Business Certifications for ${profile.organization_name || 'your organization'}:**\n\n`
    
    if (certifications.length > 0) {
      response += certifications.join('\n') + '\n\n'
    } else {
      response += `No certifications currently on file.\n\n`
    }
    
    if (profile.special_certifications?.length > 0) {
      response += `📋 **Special Certifications:**\n• ${profile.special_certifications.join('\n• ')}\n\n`
    }
    
    response += `These certifications can help you qualify for set-aside contracts and grants. Update them in your organization settings if needed.`
    
    return response
    
  } catch (error) {
    console.error('Certification response error:', error)
    return "I'm having trouble accessing your certification information."
  }
}

// Real deadline lookup - enhanced with privacy check
export async function buildDeadlineResponse(context, message, userId) {
  try {
    // Get upcoming deadlines from all sources with strict user isolation
    const [oppsResult, appsResult, projectsResult, campaignsResult] = await Promise.all([
      supabaseAdmin
        .from('opportunities')
        .select('title, deadline, application_deadline, status')
        .eq('user_id', userId) // STRICT: Only this user's opportunities
        .gte('deadline', new Date().toISOString())
        .order('deadline', { ascending: true })
        .limit(5),
      
      supabaseAdmin
        .from('applications')
        .select('title, deadline, status, opportunity_id')
        .eq('user_id', userId) // STRICT: Only this user's applications
        .gte('deadline', new Date().toISOString())
        .order('deadline', { ascending: true })
        .limit(5),
      
      supabaseAdmin
        .from('projects')
        .select('name, funding_decision_needed, investment_deadline, proposed_start_date')
        .eq('user_id', userId) // STRICT: Only this user's projects
        .or('funding_decision_needed.gte.' + new Date().toISOString() + ',investment_deadline.gte.' + new Date().toISOString())
        .limit(5),
      
      supabaseAdmin
        .from('campaigns')
        .select('title, end_date, status')
        .eq('user_id', userId) // STRICT: Only this user's campaigns
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
        deadline: o.deadline || o.application_deadline,
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
        response += `• ${d.title} (${d.type}) - ${daysLeft} days left\n`
      })
      response += `\n`
    }
    
    const upcoming = allDeadlines.slice(0, 3).filter(d => !urgent.includes(d))
    if (upcoming.length > 0) {
      response += `📋 **Next up:**\n`
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
      .select('title, status, deadline, amount_requested, opportunity_id')
      .eq('user_id', userId) // STRICT: Only this user's applications
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

// Real opportunity matching - enhanced with privacy check
export async function buildOpportunityResponse(context, message, userId) {
  try {
    const { data: opportunities, error } = await supabaseAdmin
      .from('opportunities')
      .select('title, deadline, amount_max, fit_score, status, source')
      .eq('user_id', userId) // STRICT: Only this user's opportunities
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

// Budget helper - enhanced with privacy check
export async function buildBudgetResponse(context, message, userId) {
  try {
    const { data: applications, error } = await supabaseAdmin
      .from('applications')
      .select('title, amount_requested, budget_data, status')
      .eq('user_id', userId) // STRICT: Only this user's applications
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

// Status overview - enhanced with all data sources
export async function buildStatusResponse(context, message, userId) {
  try {
    const [appsResult, oppsResult, projectsResult, campaignsResult] = await Promise.all([
      supabaseAdmin.from('applications').select('status').eq('user_id', userId),
      supabaseAdmin.from('opportunities').select('status, deadline').eq('user_id', userId),
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
      o.deadline && new Date(o.deadline) > new Date()
    ).length
    
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length
    const totalRaised = campaigns.reduce((sum, c) => sum + parseFloat(c.raised_amount || 0), 0)
    
    let response = `📊 **Status Overview:**\n\n`
    response += `📝 **Applications:**\n`
    Object.entries(appsByStatus).forEach(([status, count]) => {
      const emoji = status === 'approved' ? '✅' : status === 'submitted' ? '⏳' : '🔄'
      response += `${emoji} ${status}: ${count}\n`
    })
    
    response += `\n🎯 **Active Opportunities:** ${activeOpps}\n`
    response += `📋 **Projects:** ${projects.length}\n`
    response += `📢 **Active Campaigns:** ${activeCampaigns}\n`
    
    if (totalRaised > 0) {
      response += `💰 **Total Raised:** $${totalRaised.toLocaleString()}\n`
    }
    
    return response
    
  } catch (error) {
    console.error('Status response error:', error)
    return "📊 I'm having trouble getting your status overview."
  }
}

// General help with context awareness - MUCH more concise
export async function buildGeneralResponse(context, message, userId) {
  const orgName = context?.profile?.organization_name
  
  // Don't dump data unless specifically asked
  return `👋 Hi! I'm here to help${orgName ? ` ${orgName}` : ''} with funding questions.

💡 **Ask me specific questions like:**
• "What is my EIN?" or "What does main contact mean?"
• "Show me my projects" or "What are my deadlines?"
• "What is a DUNS number?" or "How do I register for SAM.gov?"

I'll give you focused answers without overwhelming you with extra information.`
}

// Enhanced context builder with all data sources and strict privacy controls
export async function buildOrgContext(userId) {
  try {
    const [profileResult, projectsResult, appsResult, oppsResult, campaignsResult] = await Promise.all([
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
      `).eq('user_id', userId).single(), // STRICT: Only this user's profile
      
      supabaseAdmin.from('projects').select(`
        id, name, description, project_type, status,
        funding_needed, funding_request_amount, total_project_budget,
        location, project_location, timeline, project_duration,
        proposed_start_date, funding_decision_needed, investment_deadline,
        target_population, estimated_people_served,
        current_status, urgency_level,
        key_milestones, sustainability_plan,
        matching_funds_available, cash_match_available, in_kind_match_available,
        created_at, updated_at
      `).eq('user_id', userId).order('updated_at', { ascending: false }), // STRICT: Only this user's projects
      
      supabaseAdmin.from('applications').select('*').eq('user_id', userId).order('created_at', { ascending: false }), // STRICT: Only this user's applications
      
      supabaseAdmin.from('opportunities').select('*').eq('user_id', userId).order('created_at', { ascending: false }), // STRICT: Only this user's opportunities
      
      supabaseAdmin.from('campaigns').select(`
        id, platform, campaign_id, campaign_url, title, description,
        goal_amount, raised_amount, supporter_count,
        start_date, end_date, status, last_sync,
        platform_fee_percentage, project_id,
        created_at, updated_at
      `).eq('user_id', userId).order('updated_at', { ascending: false }) // STRICT: Only this user's campaigns
    ])
    
    const profile = profileResult.data || {}
    const projects = projectsResult.data || []
    const applications = appsResult.data || []
    const opportunities = oppsResult.data || []
    const campaigns = campaignsResult.data || []
    
    // Calculate comprehensive funding summary including all sources
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
      funding_summary: {
        total_requested: applicationFunding,
        total_project_funding: projectFunding,
        total_campaign_goals: campaignGoals,
        total_campaign_raised: campaignRaised,
        total_combined_funding: applicationFunding + projectFunding + campaignGoals,
        applications_count: applications.length,
        projects_count: projects.length,
        campaigns_count: campaigns.length,
        award_rate: calculateAwardRate(applications)
      },
      meta: {
        updated_at: new Date().toISOString(),
        user_id: userId,
        privacy_isolation: 'strict' // Indicator that privacy controls are enforced
      }
    }
  } catch (error) {
    console.error('Build context error:', error)
    throw error
  }
}

// Enhanced context getter with caching
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

// Helper function to calculate award rate
function calculateAwardRate(applications) {
  const decided = applications.filter(a => ['approved', 'rejected', 'awarded'].includes(a.status))
  const approved = decided.filter(a => ['approved', 'awarded'].includes(a.status))
  return decided.length > 0 ? Math.round((approved.length / decided.length) * 100) : 0
}