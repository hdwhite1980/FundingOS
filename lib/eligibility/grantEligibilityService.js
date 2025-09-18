// lib/eligibility/grantEligibilityService.js
import { supabase } from '../supabase'

export class GrantEligibilityService {
  constructor() {
    // SBA Size Standards by NAICS code (simplified - you'd load full data)
    this.sbaStandards = {
      // Construction
      '236': { type: 'revenue', threshold: 41500000 }, // $41.5M
      '237': { type: 'revenue', threshold: 41500000 },
      '238': { type: 'revenue', threshold: 22000000 }, // $22M
      
      // Manufacturing
      '31': { type: 'employees', threshold: 500 },
      '32': { type: 'employees', threshold: 500 },
      '33': { type: 'employees', threshold: 1500 },
      
      // Professional Services
      '54': { type: 'revenue', threshold: 25000000 }, // $25M
      
      // Healthcare
      '62': { type: 'revenue', threshold: 25000000 },
      
      // Technology/Software
      '518': { type: 'revenue', threshold: 32500000 }, // $32.5M
      '541511': { type: 'revenue', threshold: 32500000 }, // Custom software
      '541512': { type: 'revenue', threshold: 32500000 }, // Computer systems design
      
      // Default for most service industries
      'default': { type: 'revenue', threshold: 8500000 } // $8.5M
    }
    
    // Federal registration requirements
    this.registrationRequirements = {
      'SAM.gov': ['federal_grants', 'federal_contracts'],
      'DUNS': ['federal_grants', 'sba_loans'],
      'CAGE_CODE': ['federal_contracts', 'dod_grants'],
      'EIN': ['all_federal']
    }
  }

  // Main eligibility check function
  async checkGrantEligibility(userProfile, opportunity) {
    const eligibilityChecks = {
      organizationType: this.checkOrganizationType(userProfile, opportunity),
      entityEligibility: this.checkEntityEligibility(userProfile, opportunity),
      sizeStandards: await this.checkSizeStandards(userProfile, opportunity),
      certifications: this.checkCertifications(userProfile, opportunity),
      registrations: this.checkRegistrations(userProfile, opportunity),
      geographic: this.checkGeographicEligibility(userProfile, opportunity),
      debarment: this.checkDebarmentStatus(userProfile, opportunity),
      financialCapacity: this.checkFinancialCapacity(userProfile, opportunity)
    }

    const eligible = Object.values(eligibilityChecks).every(check => check.eligible)
    const warnings = Object.values(eligibilityChecks)
      .filter(check => check.warnings?.length > 0)
      .flatMap(check => check.warnings)
    
    const requirements = Object.values(eligibilityChecks)
      .filter(check => check.requirements?.length > 0)
      .flatMap(check => check.requirements)

    return {
      eligible,
      confidence: this.calculateConfidence(eligibilityChecks),
      checks: eligibilityChecks,
      warnings,
      requirements,
      blockers: Object.entries(eligibilityChecks)
        .filter(([_, check]) => !check.eligible)
        .map(([key, check]) => ({ category: key, reason: check.reason }))
    }
  }

  // Organization type eligibility
  checkOrganizationType(userProfile, opportunity) {
    const userType = userProfile.organization_type
    const allowedTypes = opportunity.organization_types || ['nonprofit', 'for_profit', 'government']
    
    // Handle special cases
    if (opportunity.small_business_only && userType !== 'for_profit') {
      return {
        eligible: false,
        reason: 'This opportunity is restricted to small businesses (for-profit entities)',
        requirements: ['Must be a for-profit business entity']
      }
    }

    if (allowedTypes.includes(userType)) {
      return { eligible: true }
    }

    return {
      eligible: false,
      reason: `This opportunity is restricted to: ${allowedTypes.join(', ')}`,
      requirements: [`Organization must be: ${allowedTypes.join(' OR ')}`]
    }
  }

  // Entity eligibility (legal structure requirements)
  checkEntityEligibility(userProfile, opportunity) {
    const warnings = []
    const requirements = []
    
    // Check for specific entity requirements
    if (opportunity.source === 'grants_gov' || opportunity.cfda_number) {
      if (!userProfile.tax_id) {
        warnings.push('Federal grants typically require a Tax ID (EIN or SSN)')
        requirements.push('Obtain Tax Identification Number (EIN for organizations, SSN for individuals)')
      }
      
      const hasUEI = Boolean(userProfile.duns_uei_number || userProfile.duns_uei || userProfile.duns_number)
      if (!hasUEI) {
        requirements.push('Unique Entity ID (UEI) required (register in SAM.gov)')
      }
    }

    // Nonprofit-specific checks
    if (userProfile.organization_type === 'nonprofit') {
      if (!userProfile.tax_exempt_status) {
        warnings.push('501(c)(3) status may be required for some federal grants')
      }
    }

    return {
      eligible: true, // Don't block, but provide guidance
      warnings,
      requirements
    }
  }

  // SBA Size Standards check
  async checkSizeStandards(userProfile, opportunity) {
    // Only applies to small business programs
    if (!opportunity.small_business_only && !this.isSmallBusinessProgram(opportunity)) {
      return { eligible: true }
    }

    const naicsCode = userProfile.primary_naics || opportunity.naics_code
    const sizeStandard = this.getSizeStandard(naicsCode)
    
    if (!sizeStandard) {
      return {
        eligible: true,
        warnings: ['Unable to determine size standards - manual verification may be required'],
        requirements: ['Verify small business size standards for your NAICS code']
      }
    }

    const isSmallBusiness = this.evaluateSize(userProfile, sizeStandard)
    
    if (!isSmallBusiness.qualifies) {
      return {
        eligible: false,
        reason: `Exceeds small business size standards (${sizeStandard.type}: ${isSmallBusiness.threshold})`,
        requirements: [`Must have ${sizeStandard.type} below ${isSmallBusiness.threshold}`]
      }
    }

    return {
      eligible: true,
      info: `Qualifies as small business under ${sizeStandard.type} standard`
    }
  }

  getSizeStandard(naicsCode) {
    if (!naicsCode) return this.sbaStandards['default']
    
    // Check for exact match first
    if (this.sbaStandards[naicsCode]) {
      return this.sbaStandards[naicsCode]
    }
    
    // Check by industry prefix (2-digit, 3-digit)
    const prefixes = [naicsCode.slice(0, 3), naicsCode.slice(0, 2)]
    for (const prefix of prefixes) {
      if (this.sbaStandards[prefix]) {
        return this.sbaStandards[prefix]
      }
    }
    
    return this.sbaStandards['default']
  }

  evaluateSize(userProfile, sizeStandard) {
    if (sizeStandard.type === 'revenue') {
      const revenue = userProfile.annual_revenue || 0
      return {
        qualifies: revenue < sizeStandard.threshold,
        threshold: `$${(sizeStandard.threshold / 1000000).toFixed(1)}M annual revenue`,
        current: `$${(revenue / 1000000).toFixed(1)}M`
      }
    } else if (sizeStandard.type === 'employees') {
      const employees = userProfile.employee_count || 0
      return {
        qualifies: employees < sizeStandard.threshold,
        threshold: `${sizeStandard.threshold} employees`,
        current: `${employees} employees`
      }
    }
    
    return { qualifies: true, threshold: 'Unknown' }
  }

  isSmallBusinessProgram(opportunity) {
    const indicators = [
      'SBIR', 'STTR', 'SBA', 'small business',
      'disadvantaged business', 'HUBZone'
    ]
    
    const searchText = `${opportunity.title} ${opportunity.description}`.toLowerCase()
    return indicators.some(indicator => searchText.includes(indicator.toLowerCase()))
  }

  // Certification requirements
  checkCertifications(userProfile, opportunity) {
    const missing = []
    const advantages = []
    
    // Check for required certifications
    if (opportunity.minority_business && !userProfile.minority_owned) {
      missing.push('Minority Business Enterprise (MBE) certification')
    } else if (userProfile.minority_owned) {
      advantages.push('MBE certification provides advantage')
    }
    
    if (opportunity.woman_owned_business && !userProfile.woman_owned) {
      missing.push('Women-Owned Small Business (WOSB) certification')
    } else if (userProfile.woman_owned) {
      advantages.push('WOSB certification provides advantage')
    }
    
    if (opportunity.veteran_owned_business && !userProfile.veteran_owned) {
      missing.push('Veteran-Owned Small Business (VOSB) certification')
    } else if (userProfile.veteran_owned) {
      advantages.push('VOSB certification provides advantage')
    }

    // HUBZone check (would need address verification)
    if (this.isHubZoneProgram(opportunity) && !userProfile.hubzone_certified) {
      missing.push('HUBZone certification (if located in qualified area)')
    }

    return {
      eligible: missing.length === 0,
      reason: missing.length > 0 ? `Missing required certifications: ${missing.join(', ')}` : null,
      requirements: missing,
      advantages
    }
  }

  isHubZoneProgram(opportunity) {
    return opportunity.title?.toLowerCase().includes('hubzone') ||
           opportunity.description?.toLowerCase().includes('hubzone')
  }

  // Registration requirements
  checkRegistrations(userProfile, opportunity) {
    const missing = []
    const requirements = []
    
    if (opportunity.source === 'grants_gov' || opportunity.cfda_number) {
      if (!userProfile.sam_registration) {
        missing.push('SAM.gov registration')
        requirements.push('Register in System for Award Management (SAM.gov)')
      }
      
      if (!userProfile.grants_gov_registration) {
        missing.push('Grants.gov registration')
        requirements.push('Create Grants.gov account and get authorized')
      }
    }
    
    if (this.requiresCageCode(opportunity) && !userProfile.cage_code) {
      missing.push('CAGE Code')
      requirements.push('Obtain Commercial and Government Entity (CAGE) Code')
    }

    return {
      eligible: true, // Don't block, but inform about requirements
      warnings: missing.length > 0 ? [`Required registrations: ${missing.join(', ')}`] : [],
      requirements
    }
  }

  requiresCageCode(opportunity) {
    const indicators = ['contract', 'procurement', 'DOD', 'defense']
    const searchText = `${opportunity.title} ${opportunity.description}`.toLowerCase()
    return indicators.some(indicator => searchText.includes(indicator.toLowerCase()))
  }

  // Geographic eligibility
  checkGeographicEligibility(userProfile, opportunity) {
    if (!opportunity.geography || opportunity.geography.includes('nationwide')) {
      return { eligible: true }
    }
    
    const userState = userProfile.state?.toLowerCase()
    const userCity = userProfile.city?.toLowerCase()
    
    const eligibleLocations = opportunity.geography.map(loc => loc.toLowerCase())
    
    // Check state eligibility
    if (userState && eligibleLocations.includes(userState)) {
      return { eligible: true }
    }
    
    // Check city eligibility
    if (userCity && eligibleLocations.some(loc => loc.includes(userCity))) {
      return { eligible: true }
    }
    
    // Check for regional eligibility (would need more sophisticated logic)
    const isEligible = this.checkRegionalEligibility(userProfile, eligibleLocations)
    
    if (!isEligible) {
      return {
        eligible: false,
        reason: `This opportunity is restricted to: ${opportunity.geography.join(', ')}`,
        requirements: [`Must be located in: ${opportunity.geography.join(' OR ')}`]
      }
    }
    
    return { eligible: true }
  }

  checkRegionalEligibility(userProfile, eligibleLocations) {
    // Simplified - would need comprehensive regional mapping
    const regions = {
      'northeast': ['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA'],
      'southeast': ['DE', 'MD', 'DC', 'VA', 'WV', 'KY', 'TN', 'NC', 'SC', 'GA', 'FL', 'AL', 'MS'],
      'midwest': ['OH', 'MI', 'IN', 'WI', 'IL', 'MN', 'IA', 'MO', 'ND', 'SD', 'NE', 'KS'],
      'southwest': ['TX', 'OK', 'NM', 'AZ'],
      'west': ['MT', 'WY', 'CO', 'UT', 'NV', 'ID', 'WA', 'OR', 'CA', 'AK', 'HI']
    }
    
    const userState = userProfile.state
    for (const region of eligibleLocations) {
      if (regions[region]?.includes(userState)) {
        return true
      }
    }
    
    return false
  }

  // Debarment status (simplified - would need actual EPLS check)
  checkDebarmentStatus(userProfile, opportunity) {
    // For federal opportunities, check if debarred
    if (opportunity.source === 'grants_gov' || opportunity.cfda_number) {
      if (userProfile.debarment_status === 'debarred') {
        return {
          eligible: false,
          reason: 'Organization is currently debarred from federal funding',
          requirements: ['Resolve debarment status']
        }
      }
    }
    
    return { eligible: true }
  }

  // Financial capacity check
  checkFinancialCapacity(userProfile, opportunity) {
    const warnings = []
    const requirements = []
    
    // Check if organization can handle large grants
    if (opportunity.amount_min && opportunity.amount_min > 1000000) {
      if (!userProfile.annual_revenue || userProfile.annual_revenue < opportunity.amount_min * 0.5) {
        warnings.push('Large grant may require significant organizational capacity')
        requirements.push('Demonstrate financial capacity to manage large federal awards')
      }
    }
    
    // Check for audit requirements
    if (opportunity.amount_min && opportunity.amount_min > 750000) {
      if (!userProfile.single_audit_completed) {
        requirements.push('Single Audit may be required for awards over $750,000')
      }
    }
    
    return {
      eligible: true,
      warnings,
      requirements
    }
  }

  calculateConfidence(eligibilityChecks) {
    const totalChecks = Object.keys(eligibilityChecks).length
    const passedChecks = Object.values(eligibilityChecks).filter(check => check.eligible).length
    const hasWarnings = Object.values(eligibilityChecks).some(check => check.warnings?.length > 0)
    
    let confidence = (passedChecks / totalChecks) * 100
    
    // Reduce confidence if there are warnings
    if (hasWarnings) {
      confidence -= 10
    }
    
    return Math.max(0, Math.round(confidence))
  }

  // Enhanced opportunity filtering for the main service
  async filterEligibleOpportunities(userProfile, opportunities) {
    const results = []
    
    for (const opportunity of opportunities) {
      const eligibility = await this.checkGrantEligibility(userProfile, opportunity)
      
      results.push({
        ...opportunity,
        eligibility,
        // Add eligibility score for ranking
        eligibilityScore: eligibility.eligible ? eligibility.confidence : 0
      })
    }
    
    // Sort by eligibility score (eligible opportunities first, then by confidence)
    return results.sort((a, b) => {
      if (a.eligibility.eligible && !b.eligibility.eligible) return -1
      if (!a.eligibility.eligible && b.eligibility.eligible) return 1
      return b.eligibilityScore - a.eligibilityScore
    })
  }

  // Get eligibility requirements for user profile completion
  getProfileCompletionRequirements(userProfile, intendedPrograms = []) {
    const missing = []
    
    // Basic requirements
    if (!userProfile.tax_id) missing.push({
      field: 'tax_id',
      description: 'Tax ID (EIN or SSN)',
      priority: 'high',
      reason: 'Required for all federal funding'
    })
    
    if (!(userProfile.duns_uei_number || userProfile.duns_uei || userProfile.duns_number)) missing.push({
      field: 'duns_uei_number', 
      description: 'Unique Entity ID (UEI)',
      priority: 'high',
      reason: 'Required for federal grants and contracts'
    })
    
    if (!userProfile.primary_naics) missing.push({
      field: 'primary_naics',
      description: 'Primary NAICS Code',
      priority: 'medium',
      reason: 'Determines size standards and program eligibility'
    })
    
    // Size/revenue information
    if (!userProfile.annual_revenue) missing.push({
      field: 'annual_revenue',
      description: 'Annual Revenue',
      priority: 'medium', 
      reason: 'Required for size standard determination'
    })
    
    if (!userProfile.employee_count) missing.push({
      field: 'employee_count',
      description: 'Number of Employees',
      priority: 'medium',
      reason: 'Required for size standard determination'
    })
    
    // Certifications (if applicable)
    if (intendedPrograms.includes('small_business') && !userProfile.small_business) {
      missing.push({
        field: 'small_business_certification',
        description: 'Small Business Certification',
        priority: 'high',
        reason: 'Required for small business programs'
      })
    }
    
    return missing
  }
}

// Enhanced opportunity service integration
export const enhancedOpportunityService = {
  async getEligibleOpportunities(userProfile, filters = {}) {
    const eligibilityService = new GrantEligibilityService()
    
    // Get base opportunities
    const { data: opportunities } = await supabase
      .from('opportunities')
      .select('*')
      .order('deadline_date', { ascending: true, nullsLast: true })
    
    if (!opportunities) return []
    
    // Apply eligibility filtering
    const eligibleOpportunities = await eligibilityService.filterEligibleOpportunities(
      userProfile, 
      opportunities
    )
    
    // Apply user's filter preferences
    let filtered = eligibleOpportunities
    
    if (filters.onlyEligible) {
      filtered = filtered.filter(opp => opp.eligibility.eligible)
    }
    
    if (filters.includeWarnings === false) {
      filtered = filtered.filter(opp => 
        opp.eligibility.eligible && (!opp.eligibility.warnings || opp.eligibility.warnings.length === 0)
      )
    }
    
    if (filters.minConfidence) {
      filtered = filtered.filter(opp => opp.eligibilityScore >= filters.minConfidence)
    }
    
    return filtered
  }
}

export default GrantEligibilityService