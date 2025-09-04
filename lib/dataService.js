// Production Data Service - Real API Integrations
import { supabase } from './supabase'

export class DataService {
  constructor() {
    this.grantsGovKey = process.env.GRANTS_GOV_API_KEY
    this.samGovKey = process.env.SAM_GOV_API_KEY
    this.censusKey = process.env.CENSUS_API_KEY
    this.hudUserToken = process.env.HUD_USER_TOKEN
    this.eventbriteToken = process.env.EVENTBRITE_API_TOKEN
  }

  // Grants.gov Federal Opportunities
  async fetchGrantsGovOpportunities(filters = {}) {
    try {
      const baseUrl = 'https://api.grants.gov/v2/opportunities/search'
      const params = new URLSearchParams({
        api_key: this.grantsGovKey,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        sortBy: 'closeDate',
        sortOrder: 'ASC',
        oppStatus: 'forecasted|posted'
      })

      if (filters.keyword) params.append('keyword', filters.keyword)
      if (filters.eligibility) params.append('eligibility', filters.eligibility)
      if (filters.fundingInstrument) params.append('fundingInstrument', filters.fundingInstrument)
      if (filters.agency) params.append('agency', filters.agency)

      const response = await fetch(`${baseUrl}?${params}`)
      if (!response.ok) throw new Error(`Grants.gov API error: ${response.status}`)
      
      const data = await response.json()
      return this.transformGrantsGovData(data.oppHits || [])
    } catch (error) {
      console.error('Error fetching Grants.gov opportunities:', error)
      return []
    }
  }

  transformGrantsGovData(opportunities) {
    return opportunities.map(opp => ({
      external_id: opp.opportunityNumber,
      source: 'grants_gov',
      title: opp.opportunityTitle,
      sponsor: opp.agencyName,
      agency: opp.agencyName,
      description: opp.description || opp.synopsis,
      amount_min: this.parseAmount(opp.awardFloor),
      amount_max: this.parseAmount(opp.awardCeiling),
      deadline_date: opp.closeDate,
      deadline_type: 'fixed',
      match_requirement_percentage: this.extractMatchRequirement(opp.description),
      eligibility_criteria: this.parseEligibility(opp.eligibilityDesc),
      geography: ['nationwide'], // Most federal grants
      project_types: this.inferProjectTypes(opp.opportunityCategory),
      organization_types: this.parseOrgTypes(opp.eligibilityDesc),
      cfda_number: opp.cfdaNumbers?.[0],
      source_url: `https://www.grants.gov/web/grants/view-opportunity.html?oppId=${opp.opportunityId}`,
      application_process: opp.instructions,
      required_documents: this.parseRequiredDocs(opp.requiredRegistrations),
      contact_email: opp.contactEmail,
      contact_phone: opp.contactPhone,
      raw_data: opp
    }))
  }

  // SAM.gov Assistance Listings
  async fetchSamGovListings(filters = {}) {
    try {
      const baseUrl = 'https://api.sam.gov/entity-information/v2/assistance-listings'
      const params = new URLSearchParams({
        api_key: this.samGovKey,
        limit: filters.limit || 50,
        offset: filters.offset || 0
      })

      if (filters.keyword) params.append('keyword', filters.keyword)
      if (filters.assistanceType) params.append('assistanceType', filters.assistanceType)

      const response = await fetch(`${baseUrl}?${params}`)
      if (!response.ok) throw new Error(`SAM.gov API error: ${response.status}`)
      
      const data = await response.json()
      return this.transformSamGovData(data.assistanceListings || [])
    } catch (error) {
      console.error('Error fetching SAM.gov listings:', error)
      return []
    }
  }

  transformSamGovData(listings) {
    return listings.map(listing => ({
      external_id: listing.assistanceListingNumber,
      source: 'sam_gov',
      title: listing.title,
      sponsor: listing.agencyName,
      agency: listing.departmentName,
      description: listing.objectiveDescription,
      amount_min: this.parseAmount(listing.rangeLow),
      amount_max: this.parseAmount(listing.rangeHigh),
      deadline_date: null, // ALNs don't have specific deadlines
      deadline_type: 'rolling',
      match_requirement_percentage: this.extractMatchRequirement(listing.costSharingDescription),
      eligibility_criteria: this.parseEligibility(listing.applicantEligibilityDescription),
      geography: this.parseGeography(listing.geographicScope),
      project_types: this.inferProjectTypes(listing.functionalCode),
      organization_types: this.parseOrgTypes(listing.applicantEligibilityDescription),
      cfda_number: listing.assistanceListingNumber,
      source_url: `https://sam.gov/fal/${listing.assistanceListingNumber}/view`,
      application_process: listing.applicationProcedureDescription,
      required_documents: this.parseRequiredDocs(listing.requiredCredentialsDescription),
      contact_email: listing.contactEmail,
      contact_phone: listing.contactPhone,
      raw_data: listing
    }))
  }

  // SBIR.gov Opportunities
  async fetchSbirOpportunities(filters = {}) {
    try {
      const baseUrl = 'https://www.sbir.gov/api/solicitations.json'
      const params = new URLSearchParams({
        limit: filters.limit || 50,
        year: filters.year || new Date().getFullYear()
      })

      if (filters.agency) params.append('agency', filters.agency)
      if (filters.keyword) params.append('keyword', filters.keyword)

      const response = await fetch(`${baseUrl}?${params}`)
      if (!response.ok) throw new Error(`SBIR.gov API error: ${response.status}`)
      
      const data = await response.json()
      return this.transformSbirData(data || [])
    } catch (error) {
      console.error('Error fetching SBIR opportunities:', error)
      return []
    }
  }

  transformSbirData(solicitations) {
    return solicitations.map(sol => ({
      external_id: sol.solicitationId,
      source: 'sbir_gov',
      title: `${sol.agency} SBIR/STTR - ${sol.title}`,
      sponsor: sol.agency,
      agency: sol.agency,
      description: sol.description,
      amount_min: sol.phaseIMin || 50000,
      amount_max: sol.phaseIIMax || 1500000,
      deadline_date: sol.closeDate,
      deadline_type: 'fixed',
      match_requirement_percentage: 0,
      eligibility_criteria: ['small_business', 'sbir_eligible'],
      geography: ['nationwide'],
      project_types: ['research', 'technology'],
      organization_types: ['for_profit'],
      small_business_only: true,
      source_url: `https://www.sbir.gov/node/${sol.nodeId}`,
      application_process: sol.applicationInstructions,
      required_documents: ['technical_proposal', 'commercialization_plan', 'budget'],
      contact_email: sol.contactEmail,
      raw_data: sol
    }))
  }

  // Federal Register Monitoring
  async fetchFederalRegisterNotices(filters = {}) {
    try {
      const baseUrl = 'https://www.federalregister.gov/api/v1/documents.json'
      const params = new URLSearchParams({
        per_page: filters.limit || 20,
        order: 'newest',
        'conditions[type][]': 'NOTICE'
      })

      if (filters.agency) {
        params.append('conditions[agencies][]', filters.agency)
      }
      if (filters.keyword) {
        params.append('conditions[term]', filters.keyword)
      }

      const response = await fetch(`${baseUrl}?${params}`)
      if (!response.ok) throw new Error(`Federal Register API error: ${response.status}`)
      
      const data = await response.json()
      return this.transformFederalRegisterData(data.results || [])
    } catch (error) {
      console.error('Error fetching Federal Register notices:', error)
      return []
    }
  }

  transformFederalRegisterData(notices) {
    return notices
      .filter(notice => this.isFundingRelated(notice.title + ' ' + notice.abstract))
      .map(notice => ({
        external_id: notice.document_number,
        source: 'federal_register',
        title: notice.title,
        sponsor: notice.agency_names?.[0] || 'Federal Agency',
        agency: notice.agency_names?.[0],
        description: notice.abstract,
        deadline_date: notice.comments_close_on,
        deadline_type: notice.comments_close_on ? 'fixed' : 'rolling',
        source_url: notice.html_url,
        raw_data: notice
      }))
  }

  // HUD User APIs for Geographic Context
  async fetchHudData(year, state, county = null) {
    try {
      const fmrUrl = county 
        ? `https://www.huduser.gov/hudapi/public/fmr/data/${year}/${state}/${county}`
        : `https://www.huduser.gov/hudapi/public/fmr/data/${year}/${state}`

      const headers = { 'Authorization': `Bearer ${this.hudUserToken}` }
      
      const [fmrResponse, ilResponse] = await Promise.all([
        fetch(fmrUrl, { headers }),
        fetch(`https://www.huduser.gov/hudapi/public/il/${year}/?state=${state}`, { headers })
      ])

      const fmrData = fmrResponse.ok ? await fmrResponse.json() : null
      const ilData = ilResponse.ok ? await ilResponse.json() : null

      return { fmr: fmrData, incomeLimits: ilData }
    } catch (error) {
      console.error('Error fetching HUD data:', error)
      return { fmr: null, incomeLimits: null }
    }
  }

  // Census Data for Demographics
  async fetchCensusData(state, county = null, tract = null) {
    try {
      const year = '2022'
      const baseUrl = `https://api.census.gov/data/${year}/acs/acs5`
      
      let geoFilter = `state:${state}`
      if (county) geoFilter += `+county:${county}`
      if (tract) geoFilter += `+tract:${tract}`

      const variables = [
        'B19013_001E', // Median household income
        'B25064_001E', // Median gross rent
        'B08301_010E', // Public transportation
        'B25003_002E', // Owner occupied housing
        'B25003_003E'  // Renter occupied housing
      ].join(',')

      const params = new URLSearchParams({
        get: `NAME,${variables}`,
        for: tract ? 'tract:*' : county ? 'county:*' : 'state:*',
        in: geoFilter,
        key: this.censusKey
      })

      const response = await fetch(`${baseUrl}?${params}`)
      if (!response.ok) throw new Error(`Census API error: ${response.status}`)
      
      return await response.json()
    } catch (error) {
      console.error('Error fetching Census data:', error)
      return null
    }
  }

  // Eventbrite for Local Funding Events
  async fetchEventbriteEvents(latitude, longitude, radius = 50) {
    try {
      const baseUrl = 'https://www.eventbriteapi.com/v3/events/search/'
      const params = new URLSearchParams({
        'location.within': `${radius}mi`,
        'location.latitude': latitude,
        'location.longitude': longitude,
        q: 'grant funding pitch investor',
        'start_date.range_start': new Date().toISOString(),
        sort_by: 'date'
      })

      const response = await fetch(`${baseUrl}?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.eventbriteToken}`
        }
      })

      if (!response.ok) throw new Error(`Eventbrite API error: ${response.status}`)
      
      const data = await response.json()
      return this.transformEventbriteData(data.events || [])
    } catch (error) {
      console.error('Error fetching Eventbrite events:', error)
      return []
    }
  }

  transformEventbriteData(events) {
    return events.map(event => ({
      external_id: event.id,
      source: 'eventbrite',
      title: event.name?.text,
      sponsor: event.organizer?.name,
      description: event.description?.text,
      deadline_date: event.start?.utc,
      deadline_type: 'fixed',
      geography: [event.venue?.address?.city, event.venue?.address?.region],
      project_types: ['networking', 'funding_event'],
      source_url: event.url,
      contact_email: event.organizer?.email,
      raw_data: event
    }))
  }

  // Utility Functions
  parseAmount(amountStr) {
    if (!amountStr) return null
    const cleaned = amountStr.toString().replace(/[^0-9.]/g, '')
    return cleaned ? parseFloat(cleaned) : null
  }

  parseDate(dateStr) {
    if (!dateStr || dateStr.trim() === '') return null
    try {
      // Handle MM/DD/YYYY format from Grants.gov
      const date = new Date(dateStr)
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]
    } catch (error) {
      return null
    }
  }

  extractMatchRequirement(text) {
    if (!text) return 0
    const matchRegex = /(\d+)%?\s*match|match.*?(\d+)%|(\d+)%.*?match/i
    const match = text.match(matchRegex)
    return match ? parseInt(match[1] || match[2] || match[3]) : 0
  }

  parseEligibility(eligibilityText) {
    if (!eligibilityText) return []
    
    const criteria = []
    const text = eligibilityText.toLowerCase()
    
    if (text.includes('nonprofit') || text.includes('non-profit')) criteria.push('nonprofit_eligible')
    if (text.includes('for-profit') || text.includes('business')) criteria.push('for_profit_eligible')
    if (text.includes('government') || text.includes('municipality')) criteria.push('government_eligible')
    if (text.includes('small business')) criteria.push('small_business_eligible')
    if (text.includes('minority') || text.includes('disadvantaged')) criteria.push('minority_business_eligible')
    if (text.includes('woman') || text.includes('women')) criteria.push('woman_owned_eligible')
    if (text.includes('veteran')) criteria.push('veteran_owned_eligible')
    
    return criteria.length > 0 ? criteria : ['general_eligibility']
  }

  inferProjectTypes(categoryOrCode) {
    if (!categoryOrCode) return ['general']
    
    const category = categoryOrCode.toString().toLowerCase()
    const types = []
    
    if (category.includes('housing') || category.includes('community development')) types.push('community_development')
    if (category.includes('research') || category.includes('r&d')) types.push('research')
    if (category.includes('technology') || category.includes('innovation')) types.push('technology')
    if (category.includes('infrastructure') || category.includes('construction')) types.push('infrastructure')
    if (category.includes('education') || category.includes('training')) types.push('education')
    if (category.includes('health') || category.includes('medical')) types.push('healthcare')
    if (category.includes('environment') || category.includes('energy')) types.push('environmental')
    if (category.includes('economic') || category.includes('business')) types.push('economic_development')
    
    return types.length > 0 ? types : ['general']
  }

  parseOrgTypes(eligibilityText) {
    if (!eligibilityText) return ['nonprofit', 'for_profit', 'government']
    
    const types = []
    const text = eligibilityText.toLowerCase()
    
    if (text.includes('nonprofit') || text.includes('non-profit')) types.push('nonprofit')
    if (text.includes('for-profit') || text.includes('business') || text.includes('commercial')) types.push('for_profit')
    if (text.includes('government') || text.includes('public') || text.includes('municipality')) types.push('government')
    if (text.includes('individual') || text.includes('person')) types.push('individual')
    
    return types.length > 0 ? types : ['nonprofit', 'for_profit', 'government']
  }

  parseGeography(geoText) {
    if (!geoText) return ['nationwide']
    
    const geo = geoText.toLowerCase()
    if (geo.includes('nationwide') || geo.includes('national')) return ['nationwide']
    if (geo.includes('state')) return ['state']
    if (geo.includes('local') || geo.includes('county') || geo.includes('city')) return ['local']
    
    return ['nationwide']
  }

  parseRequiredDocs(docsText) {
    if (!docsText) return []
    
    const docs = []
    const text = docsText.toLowerCase()
    
    if (text.includes('proposal') || text.includes('narrative')) docs.push('project_narrative')
    if (text.includes('budget')) docs.push('budget')
    if (text.includes('financial') || text.includes('audit')) docs.push('financial_statements')
    if (text.includes('letter') || text.includes('support')) docs.push('letters_of_support')
    if (text.includes('plan')) docs.push('project_plan')
    if (text.includes('resume') || text.includes('cv') || text.includes('bio')) docs.push('key_personnel')
    
    return docs.length > 0 ? docs : ['application_form']
  }

  isFundingRelated(text) {
    const fundingKeywords = [
      'grant', 'funding', 'award', 'assistance', 'program', 'opportunity',
      'solicitation', 'rfp', 'nofo', 'application', 'proposal'
    ]
    
    const lowerText = text.toLowerCase()
    return fundingKeywords.some(keyword => lowerText.includes(keyword))
  }

  // Main orchestration method
  async fetchAllOpportunities(filters = {}) {
    try {
      const sources = []

      // Federal opportunities
      if (!filters.source || filters.source.includes('federal')) {
        const [grantsGov, samGov, sbir] = await Promise.all([
          this.fetchGrantsGovOpportunities(filters),
          this.fetchSamGovListings(filters),
          this.fetchSbirOpportunities(filters)
        ])
        sources.push(...grantsGov, ...samGov, ...sbir)
      }

      // Federal Register notices
      if (!filters.source || filters.source.includes('notices')) {
        const federalRegister = await this.fetchFederalRegisterNotices(filters)
        sources.push(...federalRegister)
      }

      // Local events (if location provided)
      if (filters.latitude && filters.longitude) {
        const events = await this.fetchEventbriteEvents(filters.latitude, filters.longitude)
        sources.push(...events)
      }

      // Store in Supabase
      await this.storeOpportunities(sources)
      
      return sources
    } catch (error) {
      console.error('Error in fetchAllOpportunities:', error)
      return []
    }
  }

  // Store opportunities in Supabase
  async storeOpportunities(opportunities) {
    if (opportunities.length === 0) return

    try {
      // Use upsert to handle duplicates
      const { data, error } = await supabase
        .from('opportunities')
        .upsert(
          opportunities.map(opp => ({
            ...opp,
            last_updated: new Date().toISOString()
          })),
          { 
            onConflict: 'external_id,source',
            ignoreDuplicates: false 
          }
        )

      if (error) {
        console.error('Error storing opportunities:', error)
      } else {
        console.log(`Stored ${opportunities.length} opportunities`)
      }

      return data
    } catch (error) {
      console.error('Error in storeOpportunities:', error)
      return null
    }
  }
}