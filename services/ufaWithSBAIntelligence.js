// services/ufaWithSBAIntelligence.js
// Integration of SBA Business Guide intelligence into UFA Expert Strategist

const { SBABusinessGuideIntegrator } = require('./sbaBusinessGuideIntegration')
const { UFAExpertFundingStrategist } = require('./enhancedUnifiedFundingAgent')

class UFAExpertStrategistWithSBA extends UFAExpertFundingStrategist {
  constructor(tenantId) {
    super(tenantId)
    this.sbaIntegrator = new SBABusinessGuideIntegrator()
    this.useSBAIntelligence = process.env.ENABLE_SBA_INTELLIGENCE === 'true'
  }

  async initializeSBAIntelligence() {
    console.log('🏛️ Initializing SBA Business Guide intelligence...')
    return await this.sbaIntegrator.buildSBAKnowledgeBase()
  }

  async analyzeComprehensiveFundingEcosystem() {
    console.log('🔍 Analyzing funding ecosystem with SBA intelligence integration...')
    
    // Get base funding analysis
    const baseFundingAnalysis = await super.analyzeComprehensiveFundingEcosystem()
    
    if (!this.useSBAIntelligence) {
      console.log('📊 SBA intelligence disabled (set ENABLE_SBA_INTELLIGENCE=true)')
      return baseFundingAnalysis
    }

    try {
      // Get organization profile for SBA assessments
      const orgProfile = await this.getOrganizationBusinessProfile()
      
      // Assess SBA funding readiness
      const sbaReadiness = await this.sbaIntegrator.assessSBAFundingReadiness(orgProfile)
      
      // Find relevant SBA programs
      const sbaPrograms = await this.sbaIntegrator.findRelevantSBAPrograms(null, orgProfile)
      
      // Enhance funding channels with SBA intelligence
      const enhancedChannels = {
        ...baseFundingAnalysis.channelAnalysis,
        sba_programs: await this.processSBAPrograms(sbaPrograms, orgProfile),
        sba_readiness: sbaReadiness,
        business_development: await this.analyzeSBABusinessDevelopment(orgProfile)
      }

      return {
        ...baseFundingAnalysis,
        channelAnalysis: enhancedChannels,
        sbaIntelligence: {
          readiness_assessment: sbaReadiness,
          recommended_programs: sbaPrograms.slice(0, 5),
          strategic_pathways: await this.sbaIntegrator.generateSBAStrategicPathways(sbaPrograms, orgProfile),
          business_guidance: await this.getSBABusinessGuidance(orgProfile)
        },
        dataQuality: 'LIVE+SBA',
        enhancementSource: 'SBA Business Guide + Federal Programs'
      }

    } catch (error) {
      console.error('⚠️ SBA intelligence enhancement failed:', error)
      return baseFundingAnalysis
    }
  }

  async processSBAPrograms(sbaPrograms, orgProfile) {
    console.log(`💼 Processing ${sbaPrograms.length} relevant SBA programs`)
    
    // Categorize SBA programs by type and strategic value
    const programCategories = {
      loan_programs: sbaPrograms.filter(p => p.program_type === 'loan_program'),
      grant_programs: sbaPrograms.filter(p => p.program_type === 'grant_program'),
      microfinance: sbaPrograms.filter(p => p.program_type === 'microfinance'),
      investment_programs: sbaPrograms.filter(p => p.program_type === 'investment_program')
    }

    // Calculate total available SBA funding
    const totalSBAFunding = sbaPrograms.reduce((sum, program) => {
      const maxAmount = this.sbaIntegrator.extractFundingAmount(program.funding_amounts)
      return sum + (maxAmount || 0)
    }, 0)

    // Generate SBA strategic recommendations
    const strategicRecommendations = await this.generateSBAStrategicRecommendations(sbaPrograms, orgProfile)

    return {
      totalAvailable: totalSBAFunding,
      programCount: sbaPrograms.length,
      categories: programCategories,
      topRecommendations: sbaPrograms.slice(0, 3),
      strategicRecommendations: strategicRecommendations,
      readinessAlignment: await this.assessProgramReadinessAlignment(sbaPrograms, orgProfile),
      implementationTimeline: await this.generateSBAImplementationTimeline(sbaPrograms, orgProfile),
      dataSource: 'SBA.gov Programs + Business Guide',
      lastSync: new Date().toISOString()
    }
  }

  async generateSBAStrategicRecommendations(sbaPrograms, orgProfile) {
    const recommendations = []

    // Primary SBA loan recommendation
    const primaryLoanProgram = sbaPrograms.find(p => p.program_type === 'loan_program' && p.strategic_value >= 4)
    if (primaryLoanProgram && orgProfile.sba_loan_readiness >= 60) {
      recommendations.push({
        category: 'sba_loans',
        priority: 'high',
        title: `Strategic ${primaryLoanProgram.name} Application`,
        description: `Leverage SBA loan guarantee for favorable terms and lower risk to lenders`,
        timeline: await this.sbaIntegrator.calculatePreparationTimeline(primaryLoanProgram, orgProfile),
        investment_required: 25000, // Professional guidance and preparation costs
        potential_return: this.sbaIntegrator.extractFundingAmount(primaryLoanProgram.funding_amounts),
        success_probability: await this.sbaIntegrator.calculateSuccessProbability(primaryLoanProgram, orgProfile),
        sba_insights: [
          `${primaryLoanProgram.name} offers government-backed guarantee reducing lender risk`,
          `Success factors: ${primaryLoanProgram.success_factors.slice(0, 2).join(', ')}`,
          `Application complexity: ${primaryLoanProgram.application_complexity}/5 - requires professional guidance`
        ],
        action_steps: await this.sbaIntegrator.generateNextSteps(primaryLoanProgram, orgProfile),
        business_benefits: [
          'Lower interest rates than conventional loans',
          'Longer repayment terms available',
          'Government backing increases approval probability',
          'Builds relationship with SBA ecosystem'
        ]
      })
    }

    // SBIR/STTR recommendation for R&D organizations
    const innovationProgram = sbaPrograms.find(p => p.name.includes('SBIR') || p.name.includes('STTR'))
    if (innovationProgram && orgProfile.innovation_focus) {
      recommendations.push({
        category: 'innovation_funding',
        priority: 'high',
        title: 'SBIR/STTR Non-Dilutive Innovation Funding',
        description: 'Secure federal R&D funding without giving up equity or ownership',
        timeline: '6-12 months per phase',
        investment_required: 50000, // Technical writing and proposal development
        potential_return: 2000000, // Phase I + Phase II potential
        success_probability: 35, // Competitive but high-value
        sba_insights: [
          'Non-dilutive funding - no equity required',
          'Phased approach allows proof-of-concept before major investment',
          'Opens doors to federal agency partnerships and procurement opportunities'
        ],
        action_steps: [
          'Research relevant federal agencies and their SBIR/STTR programs',
          'Develop technical proposal with clear innovation merit',
          'Establish partnerships with research institutions if applicable',
          'Prepare Phase I proposal focusing on feasibility demonstration'
        ],
        business_benefits: [
          'No equity dilution - retain full ownership',
          'Federal validation of technology/innovation',
          'Pathway to larger Phase II funding',
          'Enhanced credibility for private investment'
        ]
      })
    }

    return recommendations.slice(0, 3) // Return top 3 recommendations
  }

  async assessProgramReadinessAlignment(sbaPrograms, orgProfile) {
    const alignment = {}
    
    for (const program of sbaPrograms.slice(0, 5)) {
      const score = await this.sbaIntegrator.calculateAlignmentScore(program, orgProfile)
      alignment[program.name] = {
        score: score,
        readiness_level: score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low',
        missing_requirements: await this.identifyMissingRequirements(program, orgProfile),
        preparation_time: await this.estimatePreparationTime(program, orgProfile)
      }
    }
    
    return alignment
  }

  async generateSBAImplementationTimeline(sbaPrograms, orgProfile) {
    const timeline = {
      immediate_actions: [], // 0-30 days
      short_term: [], // 30-90 days
      medium_term: [], // 90-180 days
      long_term: [] // 180+ days
    }

    for (const program of sbaPrograms.slice(0, 3)) {
      const prepTime = await this.estimatePreparationTime(program, orgProfile)
      
      if (prepTime <= 30) {
        timeline.immediate_actions.push({
          program: program.name,
          action: `Apply for ${program.name}`,
          deadline: program.deadline || 'Rolling basis'
        })
      } else if (prepTime <= 90) {
        timeline.short_term.push({
          program: program.name,
          action: `Prepare application for ${program.name}`,
          preparation_needed: await this.identifyMissingRequirements(program, orgProfile)
        })
      } else if (prepTime <= 180) {
        timeline.medium_term.push({
          program: program.name,
          action: `Build capacity for ${program.name}`,
          capacity_building: await this.identifyCapacityGaps(program, orgProfile)
        })
      } else {
        timeline.long_term.push({
          program: program.name,
          action: `Long-term positioning for ${program.name}`,
          strategic_development: await this.identifyStrategicGaps(program, orgProfile)
        })
      }
    }

    return timeline
  }

  async identifyMissingRequirements(program, orgProfile) {
    // TODO: Implement detailed program requirement analysis
    // For now, return standard business requirements
    return ['Financial documentation', 'Business plan update', 'Compliance verification']
  }

  async estimatePreparationTime(program, orgProfile) {
    // Calculate preparation time based on program complexity and organization readiness
    const baseComplexity = program.application_complexity || 3
    const readinessScore = orgProfile.overall_readiness || 60
    
    // Higher complexity and lower readiness = more time needed
    return Math.max(30, (baseComplexity * 30) - (readinessScore * 0.5))
  }

  async identifyCapacityGaps(program, orgProfile) {
    return ['Staffing requirements', 'Technical infrastructure', 'Compliance systems']
  }

  async identifyStrategicGaps(program, orgProfile) {
    return ['Market positioning', 'Partnership development', 'Technology advancement']
  }

  async analyzeSBABusinessDevelopment(orgProfile) {
    return {
      recommended_resources: [
        'SBA Business Development Centers',
        'SCORE Mentoring',
        'Women\'s Business Centers',
        'Veteran Business Outreach Centers'
      ],
      development_priorities: [
        'Business plan refinement',
        'Financial management systems',
        'Market analysis and positioning',
        'Compliance and regulatory preparation'
      ],
      networking_opportunities: [
        'SBA District Office events',
        'Industry-specific SBA programs',
        'Federal contracting workshops',
        'Small business innovation events'
      ]
    }
  }

  async getSBABusinessGuidance(orgProfile) {
    return {
      stage_specific_guidance: await this.getStageSpecificGuidance(orgProfile),
      compliance_checklist: await this.getComplianceChecklist(orgProfile),
      resource_recommendations: await this.getResourceRecommendations(orgProfile),
      next_steps: await this.getNextSteps(orgProfile)
    }
  }

  async getStageSpecificGuidance(orgProfile) {
    const stage = orgProfile.business_stage || 'early_stage'
    
    const guidance = {
      startup: {
        priorities: ['Business structure', 'Initial funding', 'Market validation'],
        sba_programs: ['Microloan Program', 'SBA 504 for real estate'],
        timeline: '6-12 months for initial funding'
      },
      early_stage: {
        priorities: ['Growth capital', 'Market expansion', 'Team building'],
        sba_programs: ['7(a) Loan Program', 'SBIR/STTR'],
        timeline: '3-9 months for growth funding'
      },
      growth: {
        priorities: ['Scale operations', 'Geographic expansion', 'Technology upgrade'],
        sba_programs: ['7(a) Loan Program', 'SBA 504', 'Export assistance'],
        timeline: '6-12 months for major expansion'
      },
      mature: {
        priorities: ['Acquisition', 'Diversification', 'Succession planning'],
        sba_programs: ['7(a) Acquisition loans', 'SBA 504', 'Investment programs'],
        timeline: '12-18 months for strategic initiatives'
      }
    }
    
    return guidance[stage] || guidance.early_stage
  }

  async getComplianceChecklist(orgProfile) {
    return [
      'SBA size standards compliance',
      'Personal guarantee requirements',
      'Collateral documentation',
      'Financial statement preparation',
      'Credit score optimization',
      'Industry-specific certifications',
      'Environmental compliance (if applicable)',
      'Equal opportunity requirements'
    ]
  }

  async getResourceRecommendations(orgProfile) {
    return [
      {
        category: 'Technical Assistance',
        resources: ['SBA Resource Partners', 'Industry associations', 'Trade organizations']
      },
      {
        category: 'Financial Preparation',
        resources: ['CPA services', 'Financial planning consultants', 'Banking relationships']
      },
      {
        category: 'Legal Support',
        resources: ['SBA-approved attorneys', 'Business law firms', 'Regulatory specialists']
      },
      {
        category: 'Market Intelligence',
        resources: ['Industry reports', 'Market research firms', 'Trade publications']
      }
    ]
  }

  async getNextSteps(orgProfile) {
    return [
      'Complete SBA readiness assessment',
      'Gather required financial documentation',
      'Identify target SBA programs and lenders',
      'Develop relationships with SBA resource partners',
      'Create detailed business plan and projections',
      'Schedule consultations with SBA advisors'
    ]
  }

  async getOrganizationBusinessProfile() {
    // Integration with real organization data from database
    try {
      const { createClient } = require('@supabase/supabase-js')
      
      const supabaseUrl = process.env.SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (!supabaseUrl || !supabaseKey) {
        console.warn('Database not configured - cannot fetch real organization profile')
        return { error: 'Database not configured' }
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey)
      
      // Get user profile data
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .single()
      
      if (profileError || !userProfile) {
        console.warn('No user profile found for tenant:', this.tenantId)
        return { error: 'No organization profile found' }
      }
      
      // Get company settings if available
      const { data: companySettings } = await supabase
        .from('company_settings')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .single()
      
      // Get any existing SBA readiness assessment
      const { data: sbaAssessment } = await supabase
        .from('ufa_sba_readiness_assessments')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      // Build real organization profile from database data
      const orgProfile = {
        tenant_id: this.tenantId,
        business_stage: this.determineBusinessStage(userProfile, companySettings),
        industry: companySettings?.industry || userProfile.industry || 'unknown',
        annual_revenue: companySettings?.annual_revenue || 0,
        employee_count: companySettings?.employee_count || 1,
        years_in_business: this.calculateYearsInBusiness(companySettings?.founding_date),
        innovation_focus: this.assessInnovationFocus(userProfile, companySettings),
        
        // SBA readiness scores from database or calculated
        sba_loan_readiness: sbaAssessment?.overall_score || this.calculateBasicReadiness(userProfile, companySettings),
        overall_readiness: sbaAssessment?.overall_score || this.calculateBasicReadiness(userProfile, companySettings),
        credit_score: sbaAssessment?.credit_score || 0,
        collateral_available: sbaAssessment?.collateral_value || 0,
        
        // Profile completeness indicators
        has_business_plan: !!(companySettings?.business_plan_url || companySettings?.business_description),
        has_financial_statements: !!(companySettings?.financial_documents || companySettings?.annual_revenue),
        
        // Metadata
        profile_source: 'database',
        last_updated: new Date().toISOString()
      }
      
      console.log(`📊 Loaded real organization profile for tenant ${this.tenantId}:`, {
        industry: orgProfile.industry,
        stage: orgProfile.business_stage,
        readiness: orgProfile.sba_loan_readiness
      })
      
      return orgProfile
      
    } catch (error) {
      console.error('Failed to fetch organization profile from database:', error)
      return { error: `Database error: ${error.message}` }
    }
  }
  
  determineBusinessStage(userProfile, companySettings) {
    const yearsInBusiness = this.calculateYearsInBusiness(companySettings?.founding_date)
    const revenue = companySettings?.annual_revenue || 0
    const employees = companySettings?.employee_count || 1
    
    if (yearsInBusiness < 1 || revenue < 50000) {
      return 'startup'
    } else if (yearsInBusiness < 3 || revenue < 500000 || employees < 10) {
      return 'early_stage'
    } else if (revenue < 2000000 || employees < 50) {
      return 'growth'
    } else {
      return 'mature'
    }
  }
  
  calculateYearsInBusiness(foundingDate) {
    if (!foundingDate) return 0
    
    const founded = new Date(foundingDate)
    const now = new Date()
    const years = (now - founded) / (1000 * 60 * 60 * 24 * 365.25)
    
    return Math.max(0, Math.floor(years))
  }
  
  assessInnovationFocus(userProfile, companySettings) {
    const industry = (companySettings?.industry || userProfile?.industry || '').toLowerCase()
    const description = (companySettings?.business_description || userProfile?.bio || '').toLowerCase()
    
    const innovationKeywords = ['technology', 'tech', 'software', 'ai', 'innovation', 'research', 'development', 'startup', 'fintech', 'biotech', 'medtech']
    
    return innovationKeywords.some(keyword => 
      industry.includes(keyword) || description.includes(keyword)
    )
  }
  
  calculateBasicReadiness(userProfile, companySettings) {
    let readinessScore = 0
    
    // Profile completeness (20 points)
    if (userProfile?.bio || companySettings?.business_description) readinessScore += 10
    if (userProfile?.website || companySettings?.website) readinessScore += 10
    
    // Business information (30 points)
    if (companySettings?.industry) readinessScore += 10
    if (companySettings?.annual_revenue && companySettings.annual_revenue > 0) readinessScore += 10
    if (companySettings?.employee_count && companySettings.employee_count > 0) readinessScore += 10
    
    // Financial indicators (30 points)
    if (companySettings?.annual_revenue && companySettings.annual_revenue > 100000) readinessScore += 15
    if (companySettings?.founding_date) readinessScore += 15
    
    // Documentation (20 points)
    if (companySettings?.business_plan_url) readinessScore += 10
    if (companySettings?.financial_documents) readinessScore += 10
    
    return Math.min(readinessScore, 100)
  }
}

// Main function to run expert funding analysis with SBA intelligence
async function runExpertFundingAnalysisForTenant(tenantId) {
  console.log(`🚀 Starting enhanced UFA analysis with SBA intelligence for tenant: ${tenantId}`)
  
  try {
    const ufa = new UFAExpertStrategistWithSBA(tenantId)
    
    // Initialize SBA intelligence if enabled
    if (process.env.ENABLE_SBA_INTELLIGENCE === 'true') {
      await ufa.initializeSBAIntelligence()
    }
    
    // Run comprehensive analysis
    const analysisResult = await ufa.analyzeComprehensiveFundingEcosystem()
    
    console.log(`✅ UFA analysis completed for tenant ${tenantId}`)
    console.log(`📊 Found ${analysisResult.sbaIntelligence?.recommended_programs?.length || 0} SBA programs`)
    
    return {
      success: true,
      tenantId,
      analysisData: analysisResult,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error(`❌ UFA analysis failed for tenant ${tenantId}:`, error)
    return {
      success: false,
      tenantId,
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }
}

module.exports = {
  UFAExpertStrategistWithSBA,
  runExpertFundingAnalysisForTenant
}