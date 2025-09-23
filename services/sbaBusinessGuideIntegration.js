// services/sbaBusinessGuideIntegration.js
// Integrate SBA Business Guide into UFA for comprehensive business funding intelligence

const axios = require('axios')
const cheerio = require('cheerio')

class SBABusinessGuideIntegrator {
  constructor() {
    this.baseUrl = 'https://www.sba.gov/business-guide'
    this.knowledgeBase = new Map()
    this.lastUpdated = null
    this.sbaPrograms = new Map()
  }

  async buildSBAKnowledgeBase() {
    console.log('🏛️ Building UFA knowledge base from SBA Business Guide...')
    
    try {
      // Scrape comprehensive SBA content
      const businessContent = await this.scrapeSBABusinessGuide()
      
      // Process into UFA-actionable intelligence
      const processedKnowledge = await this.processIntoUFAIntelligence(businessContent)
      
      // Extract SBA funding programs and opportunities
      const fundingPrograms = await this.extractSBAFundingPrograms()
      
      // Store structured knowledge base
      await this.storeSBAKnowledgeBase(processedKnowledge, fundingPrograms)
      
      return {
        success: true,
        content_categories: Object.keys(processedKnowledge),
        funding_programs: fundingPrograms.length,
        total_resources: businessContent.length,
        last_updated: new Date().toISOString()
      }
      
    } catch (error) {
      console.error('Failed to build SBA knowledge base:', error)
      return { success: false, error: error.message }
    }
  }

  async scrapeSBABusinessGuide() {
    const businessContent = []
    
    // Key SBA Business Guide sections for funding intelligence
    const sbaGuideSections = [
      '/business-guide/plan-your-business',
      '/business-guide/launch-your-business', 
      '/business-guide/manage-your-business',
      '/business-guide/grow-your-business',
      '/business-guide/fund-your-business',
      '/business-guide/plan-your-business/calculate-your-startup-costs',
      '/business-guide/plan-your-business/write-your-business-plan',
      '/business-guide/launch-your-business/choose-business-structure',
      '/business-guide/launch-your-business/register-your-business',
      '/business-guide/manage-your-business/stay-legally-compliant',
      '/business-guide/grow-your-business/expand-market-reach',
      '/business-guide/fund-your-business/determine-how-much-funding-you-need',
      '/business-guide/fund-your-business/explore-funding-options'
    ]

    for (const section of sbaGuideSections) {
      try {
        const content = await this.scrapeSBASection(section)
        businessContent.push(...content)
      } catch (error) {
        console.error(`Failed to scrape SBA section ${section}:`, error)
      }
    }

    return businessContent
  }

  async scrapeSBASection(sectionPath) {
    const url = `${this.baseUrl}${sectionPath}`
    console.log(`🏢 Scraping SBA content from: ${url}`)
    
    try {
      const response = await axios.get(url)
      const $ = cheerio.load(response.data)
      
      const content = []
      
      // Extract main content areas
      $('.guide-content, .section-content, .funding-option, .program-details').each((index, element) => {
        const title = $(element).find('h1, h2, h3, h4').first().text().trim()
        const text = $(element).find('p, li').map((i, el) => $(el).text().trim()).get().join(' ')
        const callouts = $(element).find('.callout, .highlight, .important').map((i, el) => $(el).text().trim()).get()
        
        if (title && text) {
          content.push({
            category: this.categorizeSBAContent(sectionPath, title),
            title: title,
            content: text,
            callouts: callouts,
            source_url: url,
            section: sectionPath,
            business_stage: this.identifyBusinessStage(sectionPath),
            funding_relevance: this.assessFundingRelevance(title, text),
            extracted_at: new Date().toISOString()
          })
        }
      })
      
      return content
      
    } catch (error) {
      console.error(`Error scraping SBA ${url}:`, error)
      return []
    }
  }

  categorizeSBAContent(sectionPath, title) {
    const categoryMap = {
      'plan-your-business': 'business_planning',
      'launch-your-business': 'business_formation',
      'manage-your-business': 'business_operations',
      'grow-your-business': 'business_growth',
      'fund-your-business': 'funding_strategies',
      'startup-costs': 'financial_planning',
      'business-plan': 'strategic_planning',
      'business-structure': 'legal_structure',
      'register-your-business': 'compliance_setup',
      'legally-compliant': 'ongoing_compliance',
      'expand-market': 'growth_strategies',
      'funding-options': 'funding_mechanisms'
    }
    
    for (const [path, category] of Object.entries(categoryMap)) {
      if (sectionPath.includes(path)) {
        return category
      }
    }
    
    return 'general_business'
  }

  identifyBusinessStage(sectionPath) {
    if (sectionPath.includes('plan-your-business')) return 'pre_startup'
    if (sectionPath.includes('launch-your-business')) return 'startup'
    if (sectionPath.includes('manage-your-business')) return 'established'
    if (sectionPath.includes('grow-your-business')) return 'growth'
    return 'all_stages'
  }

  assessFundingRelevance(title, content) {
    const fundingKeywords = [
      'funding', 'loan', 'grant', 'investment', 'capital', 'financing',
      'SBA loan', 'microfinance', 'venture capital', 'angel investor',
      'crowdfunding', 'revenue', 'cash flow', 'startup costs'
    ]
    
    const text = (title + ' ' + content).toLowerCase()
    const relevanceScore = fundingKeywords.reduce((score, keyword) => {
      return text.includes(keyword.toLowerCase()) ? score + 1 : score
    }, 0)
    
    if (relevanceScore >= 3) return 'high'
    if (relevanceScore >= 1) return 'medium'
    return 'low'
  }

  async extractSBAFundingPrograms() {
    console.log('💰 Extracting SBA funding programs and opportunities...')
    
    try {
      // Scrape SBA funding programs
      const fundingUrl = 'https://www.sba.gov/funding-programs'
      const response = await axios.get(fundingUrl)
      const $ = cheerio.load(response.data)
      
      const programs = []
      
      $('.program-card, .funding-option, .loan-program').each((index, element) => {
        const programName = $(element).find('h3, h4, .program-title').first().text().trim()
        const description = $(element).find('p, .description').first().text().trim()
        const eligibility = $(element).find('.eligibility, .requirements').text().trim()
        const amounts = $(element).find('.amount, .loan-amount, .funding-range').text().trim()
        const link = $(element).find('a').attr('href')
        
        if (programName && description) {
          programs.push({
            name: programName,
            description: description,
            eligibility_requirements: eligibility,
            funding_amounts: amounts,
            program_type: this.classifyProgramType(programName, description),
            business_stage_fit: this.determineBusinessStageFit(description),
            strategic_value: this.assessStrategicValue(programName, description),
            application_complexity: this.assessApplicationComplexity(description),
            success_factors: this.identifySuccessFactors(description),
            link: link ? `https://www.sba.gov${link}` : fundingUrl,
            extracted_at: new Date().toISOString()
          })
        }
      })
      
      // Add known major SBA programs if not captured
      const majorPrograms = this.getMajorSBAPrograms()
      programs.push(...majorPrograms)
      
      return programs
      
    } catch (error) {
      console.error('Failed to extract SBA funding programs:', error)
      return this.getFallbackSBAPrograms()
    }
  }

  classifyProgramType(name, description) {
    const text = (name + ' ' + description).toLowerCase()
    
    if (text.includes('loan') || text.includes('7(a)') || text.includes('504')) return 'loan_program'
    if (text.includes('grant') || text.includes('award')) return 'grant_program'
    if (text.includes('investment') || text.includes('venture')) return 'investment_program'
    if (text.includes('micro') || text.includes('small')) return 'microfinance'
    if (text.includes('disaster') || text.includes('emergency')) return 'disaster_relief'
    if (text.includes('export') || text.includes('international')) return 'export_assistance'
    
    return 'general_support'
  }

  determineBusinessStageFit(description) {
    const stages = []
    const text = description.toLowerCase()
    
    if (text.includes('startup') || text.includes('new business') || text.includes('start')) {
      stages.push('startup')
    }
    if (text.includes('existing') || text.includes('established') || text.includes('operating')) {
      stages.push('established')
    }
    if (text.includes('expand') || text.includes('grow') || text.includes('acquisition')) {
      stages.push('growth')
    }
    
    return stages.length > 0 ? stages : ['all_stages']
  }

  assessStrategicValue(name, description) {
    let value = 0
    const text = (name + ' ' + description).toLowerCase()
    
    // Funding amount indicators
    if (text.includes('million') || text.includes('$1,000,000')) value += 3
    else if (text.includes('$500,000') || text.includes('500k')) value += 2
    else if (text.includes('$50,000') || text.includes('50k')) value += 1
    
    // Program accessibility
    if (text.includes('guaranteed') || text.includes('backed')) value += 2
    if (text.includes('low interest') || text.includes('favorable terms')) value += 1
    
    // Strategic importance
    if (text.includes('core program') || text.includes('flagship')) value += 2
    if (text.includes('popular') || text.includes('widely used')) value += 1
    
    return Math.min(value, 5) // Cap at 5
  }

  assessApplicationComplexity(description) {
    let complexity = 1
    const text = description.toLowerCase()
    
    // Complexity indicators
    if (text.includes('extensive documentation') || text.includes('detailed proposal')) complexity += 2
    if (text.includes('business plan required') || text.includes('financial projections')) complexity += 1
    if (text.includes('collateral') || text.includes('guarantee')) complexity += 1
    if (text.includes('multiple phases') || text.includes('technical review')) complexity += 1
    
    return Math.min(complexity, 5) // Cap at 5
  }

  identifySuccessFactors(description) {
    const factors = []
    const text = description.toLowerCase()
    
    // Common success factors
    if (text.includes('business plan') || text.includes('planning')) {
      factors.push('Comprehensive business plan')
    }
    if (text.includes('credit') || text.includes('financial')) {
      factors.push('Strong credit history')
    }
    if (text.includes('collateral') || text.includes('assets')) {
      factors.push('Adequate collateral')
    }
    if (text.includes('experience') || text.includes('management')) {
      factors.push('Management experience')
    }
    if (text.includes('market') || text.includes('demand')) {
      factors.push('Market validation')
    }
    if (text.includes('innovation') || text.includes('technology')) {
      factors.push('Technical innovation')
    }
    
    // Default success factors if none identified
    if (factors.length === 0) {
      factors.push('Strong business fundamentals', 'Financial readiness', 'Clear growth strategy')
    }
    
    return factors.slice(0, 4) // Return top 4 factors
  }

  getMajorSBAPrograms() {
    return [
      {
        name: 'SBA 7(a) Loan Program',
        description: 'SBA\'s most common loan program providing up to $5 million for various business purposes including working capital, equipment, real estate, and debt refinancing.',
        eligibility_requirements: 'For-profit business, meet SBA size standards, demonstrate need for credit, have invested equity',
        funding_amounts: 'Up to $5 million',
        program_type: 'loan_program',
        business_stage_fit: ['startup', 'established', 'growth'],
        strategic_value: 5,
        application_complexity: 3,
        success_factors: ['Strong credit history', 'Solid business plan', 'Industry experience', 'Collateral availability'],
        link: 'https://www.sba.gov/funding-programs/loans/7a-loans'
      },
      {
        name: 'SBA 504 Loan Program',
        description: 'Long-term, fixed-rate financing for major fixed assets like real estate and equipment. Provides up to $5.5 million for qualified projects.',
        eligibility_requirements: 'For-profit business, meet size standards, occupy 51% of real estate purchased',
        funding_amounts: 'Up to $5.5 million',
        program_type: 'loan_program',
        business_stage_fit: ['established', 'growth'],
        strategic_value: 4,
        application_complexity: 4,
        success_factors: ['Real estate or equipment purchase', 'Job creation', 'Strong financials', 'Occupancy requirements'],
        link: 'https://www.sba.gov/funding-programs/loans/504-loans'
      },
      {
        name: 'SBA Microloans',
        description: 'Small loans up to $50,000 to help small businesses and nonprofit childcare centers start up and expand.',
        eligibility_requirements: 'Small business or nonprofit childcare center, demonstrate need for credit',
        funding_amounts: 'Up to $50,000',
        program_type: 'microfinance',
        business_stage_fit: ['startup', 'established'],
        strategic_value: 2,
        application_complexity: 2,
        success_factors: ['Business plan', 'Management experience', 'Industry knowledge'],
        link: 'https://www.sba.gov/funding-programs/loans/microloans'
      },
      {
        name: 'SBIR/STTR Programs',
        description: 'Research and development funding for innovative small businesses through federal agencies. Provides non-dilutive funding for technology development.',
        eligibility_requirements: 'Small business, research and development focus, innovative technology',
        funding_amounts: 'Phase I: up to $275,000, Phase II: up to $1.75 million',
        program_type: 'grant_program',
        business_stage_fit: ['startup', 'established'],
        strategic_value: 5,
        application_complexity: 5,
        success_factors: ['Innovation', 'Technical expertise', 'Commercialization potential', 'Research capabilities'],
        link: 'https://www.sba.gov/funding-programs/investment-capital/sbir-sttr'
      }
    ]
  }

  async processIntoUFAIntelligence(businessContent) {
    console.log('🧠 Processing SBA content into UFA business intelligence...')
    
    const intelligence = {
      business_planning: {
        description: 'Strategic business planning and startup guidance',
        insights: [],
        funding_applications: [],
        ufa_integrations: []
      },
      business_formation: {
        description: 'Business structure and legal formation guidance',
        insights: [],
        funding_applications: [],
        ufa_integrations: []
      },
      funding_strategies: {
        description: 'Comprehensive funding options and strategies',
        insights: [],
        funding_applications: [],
        ufa_integrations: []
      },
      financial_planning: {
        description: 'Financial planning and cost analysis',
        insights: [],
        funding_applications: [],
        ufa_integrations: []
      },
      business_operations: {
        description: 'Business management and operational guidance',
        insights: [],
        funding_applications: [],
        ufa_integrations: []
      },
      growth_strategies: {
        description: 'Business growth and expansion strategies',
        insights: [],
        funding_applications: [],
        ufa_integrations: []
      },
      compliance_requirements: {
        description: 'Legal compliance and regulatory requirements',
        insights: [],
        funding_applications: [],
        ufa_integrations: []
      }
    }

    // Process each piece of content
    businessContent.forEach(content => {
      const category = intelligence[content.category]
      if (category) {
        // Extract actionable business insights
        const insights = this.extractBusinessInsights(content)
        category.insights.push(...insights)
        
        // Generate funding applications
        const fundingApps = this.generateFundingApplications(content)
        category.funding_applications.push(...fundingApps)
        
        // Create UFA integrations
        const ufaIntegrations = this.generateUFAIntegrations(content)
        category.ufa_integrations.push(...ufaIntegrations)
      }
    })

    // Generate strategic recommendations for each category
    Object.keys(intelligence).forEach(category => {
      intelligence[category].strategic_recommendations = this.generateCategoryRecommendations(
        intelligence[category].insights,
        category
      )
    })

    return intelligence
  }

  generateCategoryRecommendations(insights, category) {
    const recommendations = []
    
    // Generate category-specific recommendations based on insights
    switch (category) {
      case 'business_planning':
        recommendations.push({
          priority: 'high',
          title: 'Develop Comprehensive Business Plan',
          description: 'Create detailed business plan using SBA templates and guidance',
          action: 'Use SBA business plan tools and templates for thorough preparation',
          impact: 'Improves funding application success and strategic clarity'
        })
        break
        
      case 'funding_strategies':
        recommendations.push({
          priority: 'high',
          title: 'Explore SBA Loan Programs',
          description: 'Evaluate SBA 7(a) and 504 loan programs for optimal funding',
          action: 'Research SBA loan programs and connect with SBA-approved lenders',
          impact: 'Access to government-backed financing with favorable terms'
        })
        break
        
      case 'financial_planning':
        recommendations.push({
          priority: 'medium',
          title: 'Prepare Financial Documentation',
          description: 'Organize financial statements and projections for funding applications',
          action: 'Work with accountant to prepare 3-year financial statements and projections',
          impact: 'Strengthens funding applications and improves approval odds'
        })
        break
        
      case 'business_formation':
        recommendations.push({
          priority: 'medium',
          title: 'Optimize Business Structure',
          description: 'Ensure business structure supports funding and growth objectives',
          action: 'Review business entity structure with legal counsel',
          impact: 'Ensures compliance and optimal structure for funding'
        })
        break
        
      case 'compliance_requirements':
        recommendations.push({
          priority: 'critical',
          title: 'Maintain Regulatory Compliance',
          description: 'Stay current with all regulatory requirements and certifications',
          action: 'Implement compliance monitoring systems and regular reviews',
          impact: 'Prevents funding delays and maintains program eligibility'
        })
        break
        
      default:
        recommendations.push({
          priority: 'medium',
          title: `Leverage ${category} Insights`,
          description: `Apply SBA guidance for ${category.replace('_', ' ')} optimization`,
          action: `Review and implement relevant SBA recommendations`,
          impact: 'Improves business operations and funding readiness'
        })
    }
    
    return recommendations.slice(0, 3) // Return top 3 recommendations
  }

  extractBusinessInsights(content) {
    const insights = []
    
    // Key business insight phrases
    const insightKeywords = [
      'should', 'must', 'required', 'important', 'consider', 'avoid',
      'best practice', 'recommend', 'critical', 'essential', 'key'
    ]
    
    const sentences = content.content.split('.').filter(s => s.length > 15)
    
    sentences.forEach(sentence => {
      if (insightKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
        const insight = this.convertToBusinessInsight(sentence.trim(), content)
        if (insight) {
          insights.push(insight)
        }
      }
    })
    
    // Process callouts as high-value insights
    content.callouts.forEach(callout => {
      if (callout.length > 10) {
        insights.push({
          type: 'sba_guidance',
          content: callout,
          category: content.category,
          business_stage: content.business_stage,
          funding_relevance: content.funding_relevance,
          priority: 'high',
          source: 'sba.gov'
        })
      }
    })
    
    return insights
  }

  convertToBusinessInsight(sentence, content) {
    const lowerSentence = sentence.toLowerCase()
    
    if (lowerSentence.includes('funding') || lowerSentence.includes('capital')) {
      return {
        type: 'funding_strategy',
        content: sentence,
        ufa_application: 'Use for funding strategy recommendations and capital planning',
        category: content.category,
        business_stage: content.business_stage,
        priority: 'high'
      }
    }
    
    if (lowerSentence.includes('loan') || lowerSentence.includes('credit')) {
      return {
        type: 'loan_guidance',
        content: sentence,
        ufa_application: 'Use for SBA loan program recommendations and preparation',
        category: content.category,
        business_stage: content.business_stage,
        priority: 'high'
      }
    }
    
    if (lowerSentence.includes('business plan') || lowerSentence.includes('planning')) {
      return {
        type: 'planning_guidance',
        content: sentence,
        ufa_application: 'Use for business plan development and strategic planning',
        category: content.category,
        business_stage: content.business_stage,
        priority: 'medium'
      }
    }
    
    if (lowerSentence.includes('compliance') || lowerSentence.includes('legal')) {
      return {
        type: 'compliance_guidance',
        content: sentence,
        ufa_application: 'Use for compliance checking and legal requirement tracking',
        category: content.category,
        business_stage: content.business_stage,
        priority: 'critical'
      }
    }
    
    return null
  }

  generateFundingApplications(content) {
    const applications = []
    
    if (content.funding_relevance === 'high') {
      switch (content.category) {
        case 'funding_strategies':
          applications.push({
            ufa_feature: 'SBA Loan Program Matching',
            implementation: 'Match organizations with appropriate SBA loan programs based on business stage and needs',
            strategic_value: 'Access to government-backed financing with favorable terms',
            business_stage_focus: content.business_stage,
            content_source: content.title
          })
          break
          
        case 'financial_planning':
          applications.push({
            ufa_feature: 'Financial Readiness Assessment',
            implementation: 'Assess organization readiness for various funding types based on SBA criteria',
            strategic_value: 'Improve funding application success rates through better preparation',
            business_stage_focus: content.business_stage,
            content_source: content.title
          })
          break
          
        case 'business_planning':
          applications.push({
            ufa_feature: 'Business Plan Enhancement',
            implementation: 'Integrate SBA business plan guidance into funding application support',
            strategic_value: 'Strengthen applications with comprehensive business planning',
            business_stage_focus: content.business_stage,
            content_source: content.title
          })
          break
      }
    }
    
    return applications
  }

  generateUFAIntegrations(content) {
    const integrations = []
    
    if (content.business_stage && content.funding_relevance !== 'low') {
      integrations.push({
        integration_type: 'business_stage_optimization',
        description: `Optimize funding strategies for ${content.business_stage} stage organizations`,
        implementation: `Use SBA ${content.category} guidance to enhance ${content.business_stage} funding recommendations`,
        strategic_impact: 'Provide stage-appropriate funding strategies and preparation guidance',
        content_basis: content.title
      })
    }
    
    return integrations
  }

  async storeSBAKnowledgeBase(intelligence, programs) {
    // Store processed SBA intelligence in database for UFA use
    try {
      const { createClient } = require('@supabase/supabase-js')
      
      const supabaseUrl = process.env.SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (!supabaseUrl || !supabaseKey) {
        console.log('💾 Storing SBA knowledge base in memory (no database configured)')
        this.knowledgeBase = new Map(Object.entries(intelligence))
        this.sbaPrograms = new Map(programs.map(p => [p.name, p]))
        return
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey)
      
      // Store business intelligence
      for (const [category, data] of Object.entries(intelligence)) {
        await supabase.from('ufa_sba_knowledge').upsert([{
          category: category,
          description: data.description,
          insights: data.insights,
          funding_applications: data.funding_applications,
          ufa_integrations: data.ufa_integrations,
          strategic_recommendations: data.strategic_recommendations,
          source: 'sba.gov',
          last_updated: new Date().toISOString()
        }], { onConflict: ['category', 'source'] })
      }
      
      // Store SBA funding programs
      for (const program of programs) {
        await supabase.from('ufa_sba_programs').upsert([{
          name: program.name,
          description: program.description,
          eligibility_requirements: program.eligibility_requirements,
          funding_amounts: program.funding_amounts,
          program_type: program.program_type,
          business_stage_fit: program.business_stage_fit,
          strategic_value: program.strategic_value,
          application_complexity: program.application_complexity,
          success_factors: program.success_factors,
          link: program.link,
          last_updated: new Date().toISOString()
        }], { onConflict: ['name'] })
      }
      
      console.log('✅ SBA knowledge base stored successfully')
      
    } catch (error) {
      console.error('Failed to store SBA knowledge base:', error)
      // Fall back to in-memory storage
      this.knowledgeBase = new Map(Object.entries(intelligence))
      this.sbaPrograms = new Map(programs.map(p => [p.name, p]))
    }
  }

  // Integration methods for UFA Expert Strategist
  
  async enhanceWithSBAIntelligence(opportunity, organizationProfile) {
    // Enhance opportunities with relevant SBA guidance and programs
    const relevantPrograms = await this.findRelevantSBAPrograms(opportunity, organizationProfile)
    const businessGuidance = await this.getRelevantBusinessGuidance(opportunity, organizationProfile)
    
    return {
      ...opportunity,
      sba_programs: relevantPrograms,
      business_guidance: businessGuidance.insights.slice(0, 3),
      funding_readiness: await this.assessSBAFundingReadiness(organizationProfile),
      strategic_pathways: this.generateSBAStrategicPathways(relevantPrograms, organizationProfile)
    }
  }

  async findRelevantSBAPrograms(opportunity, orgProfile) {
    // Find SBA programs that match the opportunity and organization
    const allPrograms = Array.from(this.sbaPrograms.values())
    
    return allPrograms.filter(program => {
      // Match business stage
      const stageMatch = program.business_stage_fit.includes(orgProfile.business_stage) || 
                         program.business_stage_fit.includes('all_stages')
      
      // Match funding type/purpose
      const purposeMatch = this.assessPurposeMatch(program, opportunity)
      
      // Match funding amount range
      const amountMatch = this.assessAmountMatch(program, opportunity)
      
      return stageMatch && (purposeMatch || amountMatch)
    }).sort((a, b) => b.strategic_value - a.strategic_value)
  }

  assessPurposeMatch(program, opportunity) {
    const programText = (program.name + ' ' + program.description).toLowerCase()
    const opportunityText = (opportunity.title + ' ' + opportunity.description).toLowerCase()
    
    const commonTerms = ['equipment', 'real estate', 'working capital', 'expansion', 'research', 'development']
    
    return commonTerms.some(term => 
      programText.includes(term) && opportunityText.includes(term)
    )
  }

  assessAmountMatch(program, opportunity) {
    // Extract funding amounts and compare
    const programAmount = this.extractFundingAmount(program.funding_amounts)
    const opportunityAmount = opportunity.funding_amount || opportunity.value
    
    if (programAmount && opportunityAmount) {
      return opportunityAmount <= programAmount * 1.2 // Allow 20% buffer
    }
    
    return true // If can't determine, assume match
  }

  extractFundingAmount(amountString) {
    if (!amountString) return null
    
    const millions = amountString.match(/\$(\d+(?:\.\d+)?)\s*million/i)
    if (millions) return parseFloat(millions[1]) * 1000000
    
    const thousands = amountString.match(/\$(\d+(?:,\d{3})*)/i)
    if (thousands) return parseInt(thousands[1].replace(/,/g, ''))
    
    return null
  }

  async getRelevantBusinessGuidance(opportunity, orgProfile) {
    // Get relevant business guidance based on stage and opportunity
    const relevantCategories = this.determineRelevantCategories(opportunity, orgProfile)
    
    const relevantInsights = []
    const relevantIntegrations = []
    
    relevantCategories.forEach(category => {
      if (this.knowledgeBase.has(category)) {
        const categoryData = this.knowledgeBase.get(category)
        relevantInsights.push(...categoryData.insights)
        relevantIntegrations.push(...categoryData.ufa_integrations)
      }
    })
    
    return {
      insights: relevantInsights.slice(0, 5),
      integrations: relevantIntegrations.slice(0, 3)
    }
  }

  determineRelevantCategories(opportunity, orgProfile) {
    const categories = ['funding_strategies'] // Always include funding strategies
    
    if (orgProfile.business_stage === 'pre_startup' || orgProfile.business_stage === 'startup') {
      categories.push('business_planning', 'business_formation', 'financial_planning')
    }
    
    if (orgProfile.business_stage === 'growth') {
      categories.push('growth_strategies', 'business_operations')
    }
    
    categories.push('compliance_requirements') // Always include compliance
    
    return categories
  }

  async assessSBAFundingReadiness(orgProfile) {
    // Assess organization's readiness for SBA funding programs
    let readinessScore = 0
    const factors = []
    
    // Business plan completeness
    if (orgProfile.has_business_plan) {
      readinessScore += 20
      factors.push('Business plan available')
    } else {
      factors.push('Business plan needed')
    }
    
    // Financial documentation
    if (orgProfile.has_financial_statements) {
      readinessScore += 15
      factors.push('Financial statements current')
    } else {
      factors.push('Financial statements needed')
    }
    
    // Credit readiness
    if (orgProfile.credit_score > 650) {
      readinessScore += 20
      factors.push('Credit score acceptable')
    } else {
      factors.push('Credit improvement recommended')
    }
    
    // Collateral availability
    if (orgProfile.has_collateral) {
      readinessScore += 15
      factors.push('Collateral available')
    }
    
    // Industry experience
    if (orgProfile.years_experience > 2) {
      readinessScore += 15
      factors.push('Industry experience demonstrated')
    }
    
    // Equity investment
    if (orgProfile.owner_equity_percent > 20) {
      readinessScore += 15
      factors.push('Adequate owner equity')
    } else {
      factors.push('Additional equity investment recommended')
    }
    
    return {
      overall_score: readinessScore,
      readiness_level: readinessScore > 80 ? 'high' : readinessScore > 60 ? 'medium' : 'low',
      factors: factors,
      recommendations: this.generateReadinessRecommendations(readinessScore, factors)
    }
  }

  generateReadinessRecommendations(score, factors) {
    const recommendations = []
    
    if (score < 60) {
      recommendations.push('Focus on fundamental business documentation before pursuing SBA funding')
      recommendations.push('Consider SBA business counseling resources and SCORE mentoring')
    }
    
    if (!factors.includes('Business plan available')) {
      recommendations.push('Develop comprehensive business plan using SBA templates and guidance')
    }
    
    if (!factors.includes('Financial statements current')) {
      recommendations.push('Prepare 3 years of financial statements and projections')
    }
    
    if (!factors.includes('Credit score acceptable')) {
      recommendations.push('Work on improving personal and business credit scores')
    }
    
    return recommendations
  }

  generateSBAStrategicPathways(programs, orgProfile) {
    const pathways = []
    
    programs.forEach(program => {
      const pathway = {
        program_name: program.name,
        strategic_approach: this.generateStrategicApproach(program, orgProfile),
        preparation_timeline: this.calculatePreparationTimeline(program, orgProfile),
        success_probability: this.calculateSuccessProbability(program, orgProfile),
        strategic_value: program.strategic_value,
        next_steps: this.generateNextSteps(program, orgProfile)
      }
      
      pathways.push(pathway)
    })
    
    return pathways.sort((a, b) => 
      (b.success_probability * b.strategic_value) - (a.success_probability * a.strategic_value)
    )
  }

  generateStrategicApproach(program, orgProfile) {
    let approach = `Focus on ${program.name} as `
    
    if (program.strategic_value >= 4) {
      approach += 'primary funding strategy'
    } else if (program.strategic_value >= 3) {
      approach += 'secondary funding option'
    } else {
      approach += 'supplementary funding source'
    }
    
    if (program.application_complexity >= 4) {
      approach += '. Requires extensive preparation and professional guidance.'
    } else if (program.application_complexity >= 3) {
      approach += '. Moderate preparation required with strong documentation.'
    } else {
      approach += '. Relatively straightforward application process.'
    }
    
    return approach
  }

  calculatePreparationTimeline(program, orgProfile) {
    let baseTimeline = program.application_complexity * 4 // weeks
    
    // Adjust based on organization readiness
    if (orgProfile.funding_readiness?.readiness_level === 'low') {
      baseTimeline += 8
    } else if (orgProfile.funding_readiness?.readiness_level === 'medium') {
      baseTimeline += 4
    }
    
    return `${baseTimeline} weeks`
  }

  calculateSuccessProbability(program, orgProfile) {
    let probability = 50 // base probability
    
    // Adjust based on program type and organization fit
    if (program.business_stage_fit.includes(orgProfile.business_stage)) {
      probability += 20
    }
    
    if (orgProfile.funding_readiness?.readiness_level === 'high') {
      probability += 15
    } else if (orgProfile.funding_readiness?.readiness_level === 'medium') {
      probability += 5
    } else {
      probability -= 10
    }
    
    // Adjust for program competitiveness
    if (program.application_complexity >= 4) {
      probability -= 10
    } else if (program.application_complexity <= 2) {
      probability += 10
    }
    
    return Math.max(10, Math.min(90, probability))
  }

  generateNextSteps(program, orgProfile) {
    const steps = []
    
    if (!orgProfile.has_business_plan) {
      steps.push('Complete comprehensive business plan')
    }
    
    if (program.program_type === 'loan_program') {
      steps.push('Gather financial documentation and tax returns')
      steps.push('Identify and document collateral assets')
    }
    
    if (program.name.includes('SBIR') || program.name.includes('STTR')) {
      steps.push('Develop technical research proposal')
      steps.push('Identify commercialization pathway')
    }
    
    steps.push(`Research ${program.name} specific requirements`)
    steps.push('Connect with SBA lender or resource partner')
    
    return steps
  }

  getFallbackSBAPrograms() {
    // Fallback SBA programs if scraping fails
    return this.getMajorSBAPrograms()
  }
}

module.exports = { SBABusinessGuideIntegrator }