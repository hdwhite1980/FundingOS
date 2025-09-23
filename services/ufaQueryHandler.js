// services/ufaQueryHandler.js
// UFA Query Handler for WALI-OS Assistant Integration
// Enables customers to query SBA and grants.gov intelligence through natural language

const { runExpertFundingAnalysisForTenant } = require('./ufaWithSBAIntelligence')
const { SBABusinessGuideIntegrator } = require('./sbaBusinessGuideIntegration')
const { GrantsGovLearningIntegrator } = require('./grantsGovLearningIntegration')

class UFAQueryHandler {
  constructor() {
    this.sbaIntegrator = new SBABusinessGuideIntegrator()
    this.grantsGovIntegrator = new GrantsGovLearningIntegrator()
    this.strategicAnalyzer = new UFAStrategicAnalyzer()
    this.opportunityScanner = new UFAOpportunityScanner()
    this.queryPatterns = {
      // SBA-specific queries
      sba_loans: /\b(sba\s+loans?|7\(a\)|504|microloans?|sba\s+programs?|small\s+business\s+loans?)\b/i,
      sba_guidance: /\b(sba\s+guidance|business\s+guide|start\s+business|launch\s+business|manage\s+business|grow\s+business)\b/i,

      // Grants.gov queries
      federal_grants: /\b(federal\s+grants?|grants\.gov|government\s+grants?|federal\s+funding)\b/i,
      grant_process: /\b(grant\s+process|apply\s+for\s+grants?|grant\s+application|grant\s+writing)\b/i,

      // Combined queries
      funding_options: /\b(funding\s+options?|what\s+funding|funding\s+strategies?|funding\s+ideas)\b/i,
      business_funding: /\b(business\s+funding|startup\s+funding|expansion\s+funding|working\s+capital)\b/i,

      // Readiness queries
      readiness_check: /\b(am\s+i\s+ready|funding\s+readiness|what\s+do\s+i\s+need|requirements|eligibility)\b/i,
      next_steps: /\b(what\s+next|next\s+steps?|how\s+to\s+start|where\s+to\s+begin)\b/i,

      // Strategic queries
      strategic_advice: /\b(strategic\s+advice|funding\s+strategy|long\s+term\s+plan|roadmap|comprehensive\s+plan)\b/i,
      opportunities: /\b(opportunities|what\s+can\s+i\s+apply\s+for|available\s+funding|funding\s+opportunities)\b/i,
      analysis: /\b(analyze\s+my\s+situation|assess\s+my\s+business|funding\s+analysis|business\s+assessment)\b/i
    }
  }

  async processUFAQuery(userId, query, userProfile = null, projectContext = null) {
    console.log(`🧠 Processing UFA query for user ${userId}: "${query}"`)

    try {
      // Classify the query type
      const queryType = this.classifyQuery(query)
      console.log(`📋 Classified query as: ${queryType}`)

      // Route to appropriate handler
      switch (queryType) {
        case 'sba_loans':
          return await this.handleSBALoansQuery(userId, query, userProfile, projectContext)

        case 'sba_guidance':
          return await this.handleSBAGuidanceQuery(userId, query, userProfile, projectContext)

        case 'federal_grants':
          return await this.handleFederalGrantsQuery(userId, query, userProfile, projectContext)

        case 'grant_process':
          return await this.handleGrantProcessQuery(userId, query, userProfile, projectContext)

        case 'funding_options':
          return await this.handleFundingOptionsQuery(userId, query, userProfile, projectContext)

        case 'business_funding':
          return await this.handleBusinessFundingQuery(userId, query, userProfile, projectContext)

        case 'readiness_check':
          return await this.handleReadinessCheckQuery(userId, query, userProfile, projectContext)

        case 'next_steps':
          return await this.handleNextStepsQuery(userId, query, userProfile, projectContext)

        case 'strategic_advice':
          return await this.handleStrategicAdviceQuery(userId, query, userProfile, projectContext)

        case 'opportunities':
          return await this.handleOpportunitiesQuery(userId, query, userProfile, projectContext)

        case 'analysis':
          return await this.handleAnalysisQuery(userId, query, userProfile, projectContext)

        default:
          return await this.handleGeneralUFAQuery(userId, query, userProfile, projectContext)
      }

    } catch (error) {
      console.error('UFA Query Handler error:', error)
      return {
        success: false,
        message: 'I had trouble accessing the funding intelligence. Please try again.',
        error: error.message
      }
    }
  }

  classifyQuery(query) {
    const lowerQuery = query.toLowerCase()

    for (const [type, pattern] of Object.entries(this.queryPatterns)) {
      if (pattern.test(lowerQuery)) {
        return type
      }
    }

    return 'general'
  }

  async handleSBALoansQuery(userId, query, userProfile, projectContext) {
    console.log('💰 Handling SBA loans query')

    try {
      // Get SBA programs from knowledge base
      const sbaPrograms = Array.from(this.sbaIntegrator.sbaPrograms.values())

      if (sbaPrograms.length === 0) {
        // Try to load from database
        await this.sbaIntegrator.buildSBAKnowledgeBase()
      }

      const relevantPrograms = sbaPrograms.filter(program =>
        program.program_type === 'loan_program'
      ).slice(0, 3)

      let response = `Here are the top SBA loan programs that might work for you:\n\n`

      relevantPrograms.forEach((program, index) => {
        response += `**${index + 1}. ${program.name}**\n`
        response += `• Amount: ${program.funding_amounts}\n`
        response += `• Purpose: ${program.description.substring(0, 100)}...\n`
        response += `• Success Rate: ${program.application_complexity <= 2 ? 'High' : program.application_complexity <= 3 ? 'Medium' : 'Lower'}\n\n`
      })

      response += `Would you like me to run a full funding analysis to see which programs match your specific situation?`

      return {
        success: true,
        message: response,
        data: {
          programs: relevantPrograms,
          queryType: 'sba_loans',
          recommendations: relevantPrograms.map(p => ({
            name: p.name,
            strategic_value: p.strategic_value,
            next_steps: p.success_factors?.slice(0, 2) || []
          }))
        }
      }

    } catch (error) {
      return {
        success: false,
        message: 'I had trouble accessing SBA loan information. Let me run a general funding analysis instead.',
        fallback: true
      }
    }
  }

  async handleSBAGuidanceQuery(userId, query, userProfile, projectContext) {
    console.log('📚 Handling SBA guidance query')

    try {
      // Get relevant SBA guidance based on query
      const guidance = await this.getRelevantSBAGuidance(query, userProfile)

      let response = `Based on your question about SBA guidance, here's what I found:\n\n`

      guidance.forEach((item, index) => {
        response += `**${item.title}**\n`
        response += `${item.content.substring(0, 200)}...\n\n`
        if (item.callouts && item.callouts.length > 0) {
          response += `💡 Key Points:\n`
          item.callouts.slice(0, 2).forEach(callout => {
            response += `• ${callout}\n`
          })
          response += `\n`
        }
      })

      return {
        success: true,
        message: response,
        data: {
          guidance: guidance,
          queryType: 'sba_guidance'
        }
      }

    } catch (error) {
      return {
        success: false,
        message: 'I had trouble accessing SBA guidance. Would you like me to run a general funding analysis?',
        fallback: true
      }
    }
  }

  async handleFederalGrantsQuery(userId, query, userProfile, projectContext) {
    console.log('🏛️ Handling federal grants query')

    try {
      // Get grants.gov intelligence
      const grantsKnowledge = await this.getGrantsGovIntelligence(query, userProfile)

      let response = `Here's information about federal grant opportunities:\n\n`

      if (grantsKnowledge.fundamentals) {
        response += `**Federal Grant Basics:**\n`
        response += `${grantsKnowledge.fundamentals.description}\n\n`
      }

      if (grantsKnowledge.federal_strategy && grantsKnowledge.federal_strategy.insights) {
        response += `**Strategic Insights:**\n`
        grantsKnowledge.federal_strategy.insights.slice(0, 2).forEach(insight => {
          response += `• ${insight.content.substring(0, 100)}...\n`
        })
        response += `\n`
      }

      response += `Would you like me to help you identify specific federal grant opportunities for your project?`

      return {
        success: true,
        message: response,
        data: {
          grantsKnowledge: grantsKnowledge,
          queryType: 'federal_grants'
        }
      }

    } catch (error) {
      return {
        success: false,
        message: 'I had trouble accessing federal grant information. Let me check your overall funding options.',
        fallback: true
      }
    }
  }

  async handleFundingOptionsQuery(userId, query, userProfile, projectContext) {
    console.log('🎯 Handling comprehensive funding options query')

    try {
      // Run full UFA analysis
      const ufaResult = await runExpertFundingAnalysisForTenant(userId)

      if (!ufaResult || !ufaResult.success) {
        throw new Error('UFA analysis failed')
      }

      let response = `Based on your profile and projects, here are your top funding options:\n\n`

      // Extract key recommendations from UFA result
      if (ufaResult.result?.strategicRecommendations) {
        ufaResult.result.strategicRecommendations.slice(0, 3).forEach((rec, index) => {
          response += `**${index + 1}. ${rec.title}**\n`
          response += `• Priority: ${rec.priority}\n`
          response += `• Timeline: ${rec.timeline}\n`
          response += `• Potential Impact: ${rec.potential_return ? `$${rec.potential_return.toLocaleString()}` : 'High'}\n\n`
        })
      }

      response += `This analysis combines SBA loan programs, federal grants, and other funding sources. Would you like me to dive deeper into any of these options?`

      return {
        success: true,
        message: response,
        data: {
          ufaResult: ufaResult,
          queryType: 'funding_options',
          topRecommendations: ufaResult.result?.strategicRecommendations?.slice(0, 3) || []
        }
      }

    } catch (error) {
      console.log('UFA analysis failed, providing fallback response')
      return {
        success: false,
        message: `I can help you explore funding options! Based on what you've told me, you might be interested in:

**SBA Loan Programs:**
• 7(a) loans up to $5 million for general business purposes
• 504 loans for fixed assets like real estate and equipment
• Microloans up to $50,000 for startups

**Federal Grants:**
• Various programs through grants.gov
• Research and development funding
• Community and economic development grants

**Other Options:**
• Private loans and lines of credit
• Angel investment and venture capital
• Crowdfunding campaigns

Would you like me to run a personalized funding analysis for your specific situation?`,
        fallback: true
      }
    }
  }

  async handleReadinessCheckQuery(userId, query, userProfile, projectContext) {
    console.log('📋 Handling readiness check query')

    try {
      // Assess funding readiness
      const readiness = await this.assessFundingReadiness(userProfile, projectContext)

      let response = `Let me assess your funding readiness:\n\n`

      response += `**Overall Readiness: ${readiness.level}**\n`
      response += `**Score: ${readiness.score}/100**\n\n`

      response += `**Current Status:**\n`
      readiness.factors.forEach(factor => {
        response += `• ${factor}\n`
      })

      response += `\n**Recommendations:**\n`
      readiness.recommendations.forEach(rec => {
        response += `• ${rec}\n`
      })

      return {
        success: true,
        message: response,
        data: {
          readiness: readiness,
          queryType: 'readiness_check'
        }
      }

    } catch (error) {
      return {
        success: false,
        message: 'I had trouble assessing your readiness. Would you like me to help you prepare for funding applications?',
        fallback: true
      }
    }
  }

  async handleGeneralUFAQuery(userId, query, userProfile, projectContext) {
    console.log('🔍 Handling general UFA query')

    // For general queries, run a comprehensive analysis
    try {
      const ufaResult = await runExpertFundingAnalysisForTenant(userId)

      if (ufaResult && ufaResult.success) {
        return {
          success: true,
          message: `I've analyzed your funding situation. ${ufaResult.result?.strategicRecommendations?.[0]?.description || 'You have several strong funding options available.'}

Would you like me to explain any specific recommendations or help you get started with an application?`,
          data: {
            ufaResult: ufaResult,
            queryType: 'general'
          }
        }
      }
    } catch (error) {
      console.log('General UFA query failed:', error)
    }

    // Fallback response
    return {
      success: true,
      message: `I can help you with comprehensive funding intelligence! I have access to:

**SBA Resources:**
• Business guidance for startups, growth, and operations
• Loan programs with government backing
• Business planning templates and tools

**Federal Grants:**
• Grants.gov application strategies
• Federal funding cycles and deadlines
• Compliance requirements and best practices

**Funding Analysis:**
• Personalized funding strategy development
• Readiness assessments
• Strategic recommendations

What specific aspect of funding would you like to explore?`,
      data: {
        queryType: 'general_fallback'
      }
    }
  }

  // Helper methods

  async getRelevantSBAGuidance(query, userProfile) {
    // Get SBA guidance based on query content
    const businessStage = this.determineBusinessStage(userProfile)
    const relevantCategories = this.determineRelevantCategories(query, businessStage)

    const guidance = []

    for (const category of relevantCategories) {
      if (this.sbaIntegrator.knowledgeBase.has(category)) {
        const categoryData = this.sbaIntegrator.knowledgeBase.get(category)
        if (categoryData.insights && categoryData.insights.length > 0) {
          guidance.push({
            category: category,
            title: categoryData.description,
            content: categoryData.insights[0].content,
            callouts: categoryData.strategic_recommendations?.[0]?.action ?
              [categoryData.strategic_recommendations[0].action] : []
          })
        }
      }
    }

    return guidance.slice(0, 3)
  }

  async getGrantsGovIntelligence(query, userProfile) {
    // Get grants.gov intelligence
    try {
      const knowledge = this.grantsGovIntegrator.knowledgeBase
      return knowledge || {}
    } catch (error) {
      console.log('Grants.gov intelligence not available')
      return {}
    }
  }

  determineBusinessStage(userProfile) {
    if (!userProfile) return 'startup'

    // Determine business stage from profile
    if (userProfile.business_age_years === undefined) return 'startup'
    if (userProfile.business_age_years < 2) return 'startup'
    if (userProfile.business_age_years < 5) return 'established'
    return 'growth'
  }

  determineRelevantCategories(query, businessStage) {
    const categories = []

    if (query.toLowerCase().includes('start') || businessStage === 'startup') {
      categories.push('business_planning', 'business_formation')
    }

    if (query.toLowerCase().includes('grow') || businessStage === 'growth') {
      categories.push('growth_strategies', 'business_operations')
    }

    if (query.toLowerCase().includes('funding') || query.toLowerCase().includes('loan')) {
      categories.push('funding_strategies', 'financial_planning')
    }

    if (categories.length === 0) {
      categories.push('business_planning', 'funding_strategies')
    }

    return categories
  }

  async assessFundingReadiness(userProfile, projectContext) {
    // Assess funding readiness based on profile
    let score = 0
    const factors = []
    const recommendations = []

    // Business plan
    if (userProfile?.has_business_plan) {
      score += 20
      factors.push('✅ Business plan completed')
    } else {
      factors.push('❌ Business plan needed')
      recommendations.push('Develop a comprehensive business plan')
    }

    // Financials
    if (userProfile?.has_financial_statements) {
      score += 15
      factors.push('✅ Financial statements prepared')
    } else {
      factors.push('❌ Financial statements needed')
      recommendations.push('Prepare 3 years of financial statements')
    }

    // Credit
    if (userProfile?.credit_score && userProfile.credit_score > 650) {
      score += 20
      factors.push('✅ Good credit score')
    } else {
      factors.push('❌ Credit improvement needed')
      recommendations.push('Work on improving credit score')
    }

    // Collateral
    if (userProfile?.has_collateral) {
      score += 15
      factors.push('✅ Collateral available')
    } else {
      factors.push('❌ Collateral assessment needed')
    }

    // Experience
    if (userProfile?.years_experience && userProfile.years_experience > 2) {
      score += 15
      factors.push('✅ Industry experience demonstrated')
    } else {
      factors.push('❌ More experience needed')
      recommendations.push('Gain relevant industry experience')
    }

    // Equity
    if (userProfile?.owner_equity_percent && userProfile.owner_equity_percent > 20) {
      score += 15
      factors.push('✅ Adequate owner equity')
    } else {
      factors.push('❌ Additional equity needed')
      recommendations.push('Increase owner equity investment')
    }

    const level = score >= 80 ? 'High' : score >= 60 ? 'Medium' : 'Low'

    return {
      score: score,
      level: level,
      factors: factors,
      recommendations: recommendations
    }
  }

  // Handle other query types with similar patterns...
  async handleGrantProcessQuery(userId, query, userProfile, projectContext) {
    return this.handleFederalGrantsQuery(userId, query, userProfile, projectContext)
  }

  async handleBusinessFundingQuery(userId, query, userProfile, projectContext) {
    return this.handleFundingOptionsQuery(userId, query, userProfile, projectContext)
  }

  async handleNextStepsQuery(userId, query, userProfile, projectContext) {
    return this.handleReadinessCheckQuery(userId, query, userProfile, projectContext)
  }

  // Strategic Analysis Handlers
  async handleStrategicAdviceQuery(userId, query, userProfile, projectContext) {
    console.log('🎯 Handling strategic advice query')

    try {
      const strategicAnalysis = await this.strategicAnalyzer.analyzeBusinessStrategy(userProfile, projectContext)

      const message = `Based on your business profile, here's a comprehensive funding strategy:

**Current Business Stage:** ${strategicAnalysis.business_stage}
**Funding Readiness:** ${strategicAnalysis.funding_readiness.level} (${strategicAnalysis.funding_readiness.score}/100)

**Recommended Funding Mix:**
${strategicAnalysis.funding_mix.map(item => `• ${item.type}: ${item.percentage}% - ${item.purpose}`).join('\n')}

**Strategic Priorities:**
${strategicAnalysis.priorities.map(priority => `• ${priority.title}: ${priority.description}`).join('\n')}

**12-Month Funding Roadmap:**
${strategicAnalysis.roadmap.map(milestone => `• ${milestone.month}: ${milestone.action} (${milestone.success_probability}% success rate)`).join('\n')}

**Risk Mitigation:**
${strategicAnalysis.risks.map(risk => `• ${risk.risk}: ${risk.mitigation}`).join('\n')}

Would you like me to dive deeper into any of these strategic recommendations?`

      return {
        success: true,
        message: message,
        data: strategicAnalysis,
        type: 'strategic_advice'
      }

    } catch (error) {
      console.error('Strategic advice error:', error)
      return {
        success: false,
        message: 'I had trouble analyzing your strategic funding options. Please try again.',
        error: error.message
      }
    }
  }

  async handleOpportunitiesQuery(userId, query, userProfile, projectContext) {
    console.log('🔍 Handling opportunities query')

    try {
      const opportunities = await this.opportunityScanner.scanForOpportunities(userProfile, projectContext)

      const message = `I've identified ${opportunities.length} funding opportunities that match your business profile:

**Top Opportunities:**
${opportunities.slice(0, 5).map((opp, index) =>
  `${index + 1}. **${opp.program_name}** (${opp.program_type})
   • Amount: ${opp.funding_amount}
   • Match Score: ${opp.match_score}/100
   • Success Probability: ${opp.success_probability}%
   • Timeline: ${opp.application_timeline}
   • Key Requirements: ${opp.key_requirements.join(', ')}`
).join('\n\n')}

**Opportunity Analysis:**
• **High Priority:** ${opportunities.filter(o => o.priority === 'high').length} opportunities
• **Medium Priority:** ${opportunities.filter(o => o.priority === 'medium').length} opportunities
• **Total Potential Funding:** $${opportunities.reduce((sum, o) => sum + (o.estimated_amount || 0), 0).toLocaleString()}

Would you like me to help you prepare applications for any of these opportunities?`

      return {
        success: true,
        message: message,
        data: opportunities,
        type: 'opportunities'
      }

    } catch (error) {
      console.error('Opportunities scan error:', error)
      return {
        success: false,
        message: 'I had trouble scanning for funding opportunities. Please try again.',
        error: error.message
      }
    }
  }

  async handleAnalysisQuery(userId, query, userProfile, projectContext) {
    console.log('📊 Handling business analysis query')

    try {
      const analysis = await this.strategicAnalyzer.performComprehensiveAnalysis(userProfile, projectContext)

      const message = `Here's my comprehensive analysis of your funding situation:

**Business Profile Assessment:**
• **Industry:** ${analysis.business_profile.industry || 'Not specified'}
• **Stage:** ${analysis.business_profile.stage}
• **Size:** ${analysis.business_profile.size_category}
• **Annual Revenue:** ${analysis.business_profile.revenue_range || 'Not specified'}

**Funding Gap Analysis:**
• **Current Capital:** $${(analysis.funding_gaps.current_capital || 0).toLocaleString()}
• **Funding Needed:** $${(analysis.funding_gaps.total_needed || 0).toLocaleString()}
• **Gap:** $${(analysis.funding_gaps.gap_amount || 0).toLocaleString()}
• **Timeline:** ${analysis.funding_gaps.timeline}

**Strengths:**
${analysis.strengths.map(strength => `• ${strength}`).join('\n')}

**Areas for Improvement:**
${analysis.improvements.map(improvement => `• ${improvement}`).join('\n')}

**Recommended Actions:**
${analysis.actions.map(action => `• ${action.priority}: ${action.description}`).join('\n')}

**Competitive Advantages:**
${analysis.competitive_advantages.map(advantage => `• ${advantage}`).join('\n')}

This analysis suggests you focus on ${analysis.primary_focus} as your main funding strategy. Would you like me to create a detailed action plan?`

      return {
        success: true,
        message: message,
        data: analysis,
        type: 'comprehensive_analysis'
      }

    } catch (error) {
      console.error('Business analysis error:', error)
      return {
        success: false,
        message: 'I had trouble performing a comprehensive analysis. Please try again.',
        error: error.message
      }
    }
  }
}

// Strategic Analysis Engine
class UFAStrategicAnalyzer {
  constructor() {
    this.sbaIntegrator = new SBABusinessGuideIntegrator()
  }

  async analyzeBusinessStrategy(userProfile, projectContext) {
    const businessStage = this.determineBusinessStage(userProfile)
    const fundingReadiness = await this.assessFundingReadiness(userProfile, projectContext)
    const fundingMix = this.calculateOptimalFundingMix(userProfile, businessStage)
    const priorities = this.identifyStrategicPriorities(userProfile, businessStage)
    const roadmap = this.createFundingRoadmap(userProfile, fundingMix, businessStage)
    const risks = this.assessStrategicRisks(userProfile, fundingMix)

    return {
      business_stage: businessStage,
      funding_readiness: fundingReadiness,
      funding_mix: fundingMix,
      priorities: priorities,
      roadmap: roadmap,
      risks: risks
    }
  }

  determineBusinessStage(userProfile) {
    if (!userProfile) return 'startup'

    const age = userProfile.business_age_years || 0
    const revenue = userProfile.annual_revenue || 0
    const employees = userProfile.employee_count || 0

    if (age < 2 || revenue < 100000) return 'startup'
    if (age < 5 && revenue < 1000000) return 'early_growth'
    if (revenue > 1000000 && employees > 10) return 'established'
    return 'growth'
  }

  calculateOptimalFundingMix(userProfile, businessStage) {
    const mixes = {
      startup: [
        { type: 'Personal Savings/Loans', percentage: 40, purpose: 'Initial capital and working capital' },
        { type: 'SBA Microloans', percentage: 30, purpose: 'Equipment and startup costs' },
        { type: 'Friends & Family', percentage: 20, purpose: 'Bridge financing' },
        { type: 'Grants', percentage: 10, purpose: 'Non-dilutive funding' }
      ],
      early_growth: [
        { type: 'SBA 7(a) Loans', percentage: 50, purpose: 'Working capital and expansion' },
        { type: 'Revenue-based Financing', percentage: 25, purpose: 'Flexible growth capital' },
        { type: 'Angel Investment', percentage: 15, purpose: 'Equity for accelerated growth' },
        { type: 'Grants', percentage: 10, purpose: 'R&D and specific initiatives' }
      ],
      established: [
        { type: 'SBA 504 Loans', percentage: 40, purpose: 'Real estate and equipment' },
        { type: 'Traditional Bank Loans', percentage: 35, purpose: 'Working capital' },
        { type: 'Line of Credit', percentage: 15, purpose: 'Cash flow management' },
        { type: 'Venture Debt', percentage: 10, purpose: 'Growth acceleration' }
      ],
      growth: [
        { type: 'Venture Capital', percentage: 40, purpose: 'Major expansion' },
        { type: 'Private Equity', percentage: 30, purpose: 'Acquisition and scaling' },
        { type: 'Corporate Bonds', percentage: 20, purpose: 'Infrastructure financing' },
        { type: 'Strategic Partnerships', percentage: 10, purpose: 'Joint ventures and alliances' }
      ]
    }

    return mixes[businessStage] || mixes.startup
  }

  identifyStrategicPriorities(userProfile, businessStage) {
    const priorities = []

    if (businessStage === 'startup') {
      priorities.push({
        title: 'Product-Market Fit',
        description: 'Validate product-market fit before seeking significant funding'
      })
      priorities.push({
        title: 'MVP Development',
        description: 'Complete minimum viable product with customer validation'
      })
      priorities.push({
        title: 'Team Building',
        description: 'Assemble core team with complementary skills'
      })
    }

    if (businessStage === 'early_growth') {
      priorities.push({
        title: 'Revenue Scaling',
        description: 'Focus on revenue growth and customer acquisition'
      })
      priorities.push({
        title: 'Unit Economics',
        description: 'Achieve profitable unit economics at scale'
      })
      priorities.push({
        title: 'Market Expansion',
        description: 'Expand to new markets or customer segments'
      })
    }

    if (businessStage === 'established') {
      priorities.push({
        title: 'Operational Efficiency',
        description: 'Optimize operations and reduce costs'
      })
      priorities.push({
        title: 'Market Leadership',
        description: 'Establish market leadership position'
      })
      priorities.push({
        title: 'Diversification',
        description: 'Diversify revenue streams and reduce risk'
      })
    }

    return priorities
  }

  createFundingRoadmap(userProfile, fundingMix, businessStage) {
    const roadmap = []

    if (businessStage === 'startup') {
      roadmap.push(
        { month: 'Month 1-2', action: 'Complete business plan and financial projections', success_probability: 90 },
        { month: 'Month 3-4', action: 'Secure initial funding through personal savings and microloans', success_probability: 75 },
        { month: 'Month 5-6', action: 'Launch MVP and validate product-market fit', success_probability: 60 },
        { month: 'Month 7-8', action: 'Apply for SBA 7(a) loan for expansion', success_probability: 70 },
        { month: 'Month 9-12', action: 'Pursue angel investment for Series A preparation', success_probability: 40 }
      )
    }

    if (businessStage === 'early_growth') {
      roadmap.push(
        { month: 'Month 1-3', action: 'Strengthen financials and achieve consistent revenue', success_probability: 85 },
        { month: 'Month 4-6', action: 'Secure SBA 7(a) loan for working capital', success_probability: 75 },
        { month: 'Month 7-9', action: 'Prepare for angel/VC funding round', success_probability: 50 },
        { month: 'Month 10-12', action: 'Execute growth initiatives with secured funding', success_probability: 70 }
      )
    }

    return roadmap
  }

  assessStrategicRisks(userProfile, fundingMix) {
    const risks = []

    // Market risk
    risks.push({
      risk: 'Market conditions change',
      mitigation: 'Diversify funding sources and maintain cash reserves'
    })

    // Competition risk
    risks.push({
      risk: 'Increased competition for funding',
      mitigation: 'Build strong network and differentiate value proposition'
    })

    // Execution risk
    risks.push({
      risk: 'Funding delays impact operations',
      mitigation: 'Maintain runway for 18+ months and have backup funding sources'
    })

    // Regulatory risk
    risks.push({
      risk: 'Regulatory changes affect funding landscape',
      mitigation: 'Stay informed through industry associations and legal counsel'
    })

    return risks
  }

  async performComprehensiveAnalysis(userProfile, projectContext) {
    const businessProfile = this.analyzeBusinessProfile(userProfile)
    const fundingGaps = this.analyzeFundingGaps(userProfile, projectContext)
    const strengths = this.identifyStrengths(userProfile)
    const improvements = this.identifyImprovements(userProfile)
    const actions = this.recommendActions(userProfile, fundingGaps)
    const competitiveAdvantages = this.identifyCompetitiveAdvantages(userProfile)
    const primaryFocus = this.determinePrimaryFocus(userProfile, fundingGaps)

    return {
      business_profile: businessProfile,
      funding_gaps: fundingGaps,
      strengths: strengths,
      improvements: improvements,
      actions: actions,
      competitive_advantages: competitiveAdvantages,
      primary_focus: primaryFocus
    }
  }

  analyzeBusinessProfile(userProfile) {
    return {
      industry: userProfile.industry,
      stage: this.determineBusinessStage(userProfile),
      size_category: this.determineSizeCategory(userProfile),
      revenue_range: this.determineRevenueRange(userProfile.annual_revenue)
    }
  }

  analyzeFundingGaps(userProfile, projectContext) {
    const currentCapital = userProfile.current_capital || 0
    const monthlyBurn = userProfile.monthly_burn_rate || 0
    const expansionNeeds = projectContext?.funding_amount || 0

    const runwayMonths = currentCapital > 0 ? Math.floor(currentCapital / monthlyBurn) : 0
    const gapAmount = Math.max(0, (18 * monthlyBurn) - currentCapital + expansionNeeds)

    return {
      current_capital: currentCapital,
      monthly_burn: monthlyBurn,
      runway_months: runwayMonths,
      expansion_needs: expansionNeeds,
      total_needed: gapAmount,
      gap_amount: gapAmount,
      timeline: runwayMonths < 6 ? 'Immediate' : runwayMonths < 12 ? '6-12 months' : '12+ months'
    }
  }

  identifyStrengths(userProfile) {
    const strengths = []

    if (userProfile.has_business_plan) strengths.push('Comprehensive business plan')
    if (userProfile.has_financial_statements) strengths.push('Strong financial documentation')
    if (userProfile.credit_score > 700) strengths.push('Excellent credit score')
    if (userProfile.years_experience > 5) strengths.push('Extensive industry experience')
    if (userProfile.team_size > 5) strengths.push('Strong management team')

    return strengths.length > 0 ? strengths : ['Unique value proposition', 'Market opportunity']
  }

  identifyImprovements(userProfile) {
    const improvements = []

    if (!userProfile.has_business_plan) improvements.push('Develop comprehensive business plan')
    if (!userProfile.has_financial_statements) improvements.push('Prepare financial statements and projections')
    if (!userProfile.has_collateral) improvements.push('Identify and document collateral assets')
    if (userProfile.credit_score < 650) improvements.push('Improve credit score and financial health')

    return improvements
  }

  recommendActions(userProfile, fundingGaps) {
    const actions = []

    if (fundingGaps.gap_amount > 0) {
      actions.push({
        priority: 'High',
        description: `Secure $${fundingGaps.gap_amount.toLocaleString()} in funding within ${fundingGaps.timeline}`
      })
    }

    actions.push({
      priority: 'High',
      description: 'Complete all funding readiness requirements'
    })

    actions.push({
      priority: 'Medium',
      description: 'Network with lenders and investors in your industry'
    })

    return actions
  }

  determineSizeCategory(userProfile) {
    const revenue = userProfile.annual_revenue || 0
    const employees = userProfile.employee_count || 0

    if (revenue < 100000 || employees < 2) return 'Micro'
    if (revenue < 1000000 || employees < 10) return 'Small'
    if (revenue < 10000000 || employees < 50) return 'Medium'
    return 'Large'
  }

  determineRevenueRange(revenue) {
    if (!revenue) return 'Not specified'
    if (revenue < 100000) return '< $100K'
    if (revenue < 500000) return '$100K - $500K'
    if (revenue < 1000000) return '$500K - $1M'
    if (revenue < 5000000) return '$1M - $5M'
    return '$5M+'
  }

  identifyCompetitiveAdvantages(userProfile) {
    const advantages = []

    if (userProfile.unique_value_prop) advantages.push(userProfile.unique_value_prop)
    if (userProfile.market_position) advantages.push(`Strong market position: ${userProfile.market_position}`)
    if (userProfile.intellectual_property) advantages.push('Intellectual property protection')

    return advantages.length > 0 ? advantages : ['First mover advantage', 'Strong founding team', 'Market validation']
  }

  determinePrimaryFocus(userProfile, fundingGaps) {
    const stage = this.determineBusinessStage(userProfile)

    if (stage === 'startup') return 'debt financing through SBA programs'
    if (stage === 'early_growth') return 'growth capital through venture debt or revenue-based financing'
    if (fundingGaps.gap_amount > 1000000) return 'equity financing through venture capital'
    return 'traditional debt financing through SBA 7(a) loans'
  }
}

// Opportunity Scanner
class UFAOpportunityScanner {
  constructor() {
    this.sbaIntegrator = new SBABusinessGuideIntegrator()
    this.grantsGovIntegrator = new GrantsGovLearningIntegrator()
  }

  async scanForOpportunities(userProfile, projectContext) {
    const opportunities = []

    // SBA Programs
    const sbaPrograms = await this.scanSBAAndGrantsGovPrograms(userProfile, projectContext)
    opportunities.push(...sbaPrograms)

    // Alternative Funding
    const alternativeFunding = await this.scanAlternativeFunding(userProfile, projectContext)
    opportunities.push(...alternativeFunding)

    // Score and rank opportunities
    const scoredOpportunities = await this.scoreAndRankOpportunities(opportunities, userProfile, projectContext)

    return scoredOpportunities.sort((a, b) => b.match_score - a.match_score)
  }

  async scanSBAAndGrantsGovPrograms(userProfile, projectContext) {
    const opportunities = []

    try {
      // SBA Programs
      const sbaPrograms = Array.from(this.sbaIntegrator.sbaPrograms.values())
      for (const program of sbaPrograms) {
        const match = await this.calculateProgramMatch(program, userProfile, projectContext)
        if (match.score > 30) { // Only include reasonably good matches
          opportunities.push({
            program_name: program.name,
            program_type: 'SBA Loan',
            funding_amount: program.funding_amounts,
            estimated_amount: this.extractAmount(program.funding_amounts),
            match_score: match.score,
            success_probability: match.success_probability,
            application_timeline: `${program.application_complexity * 2} weeks`,
            key_requirements: this.extractKeyRequirements(program),
            priority: match.score > 80 ? 'high' : match.score > 60 ? 'medium' : 'low',
            source: 'SBA',
            link: program.link
          })
        }
      }

      // Grants.gov Programs
      const grantsPrograms = await this.scanGrantsGovOpportunities(userProfile, projectContext)
      opportunities.push(...grantsPrograms)

    } catch (error) {
      console.error('Error scanning SBA programs:', error)
    }

    return opportunities
  }

  async scanGrantsGovOpportunities(userProfile, projectContext) {
    const opportunities = []

    try {
      // This would integrate with grants.gov API or database
      // For now, return mock opportunities based on profile
      const mockGrants = this.generateMockGrants(userProfile, projectContext)

      for (const grant of mockGrants) {
        opportunities.push({
          program_name: grant.name,
          program_type: 'Federal Grant',
          funding_amount: grant.amount,
          estimated_amount: this.extractAmount(grant.amount),
          match_score: grant.match_score,
          success_probability: grant.success_probability,
          application_timeline: '8-12 weeks',
          key_requirements: grant.requirements,
          priority: grant.match_score > 75 ? 'high' : 'medium',
          source: 'Grants.gov',
          link: grant.link
        })
      }

    } catch (error) {
      console.error('Error scanning grants:', error)
    }

    return opportunities
  }

  async scanAlternativeFunding(userProfile, projectContext) {
    const opportunities = []

    // Revenue-based financing
    if (userProfile.annual_revenue > 100000) {
      opportunities.push({
        program_name: 'Revenue-based Financing',
        program_type: 'Alternative Lending',
        funding_amount: 'Up to $500K',
        estimated_amount: 250000,
        match_score: 70,
        success_probability: 65,
        application_timeline: '2-4 weeks',
        key_requirements: ['Consistent revenue', 'Business bank account', 'Tax returns'],
        priority: 'medium',
        source: 'Alternative Lenders'
      })
    }

    // Equipment financing
    if (projectContext?.equipment_needed) {
      opportunities.push({
        program_name: 'Equipment Leasing',
        program_type: 'Equipment Finance',
        funding_amount: 'Up to equipment cost',
        estimated_amount: projectContext.equipment_needed,
        match_score: 75,
        success_probability: 80,
        application_timeline: '1-2 weeks',
        key_requirements: ['Equipment quotes', 'Business plan', 'Credit check'],
        priority: 'high',
        source: 'Equipment Lenders'
      })
    }

    // Crowdfunding
    if (userProfile.industry === 'consumer_products' || userProfile.industry === 'technology') {
      opportunities.push({
        program_name: 'Rewards-based Crowdfunding',
        program_type: 'Crowdfunding',
        funding_amount: 'Up to $1M',
        estimated_amount: 100000,
        match_score: 60,
        success_probability: 45,
        application_timeline: '4-8 weeks',
        key_requirements: ['Compelling story', 'Prototype/demo', 'Marketing plan'],
        priority: 'medium',
        source: 'Crowdfunding Platforms'
      })
    }

    return opportunities
  }

  async calculateProgramMatch(program, userProfile, projectContext) {
    let score = 50 // Base score
    let successProbability = 50

    // Business stage match
    if (program.business_stage_fit.includes(this.determineBusinessStage(userProfile))) {
      score += 20
      successProbability += 15
    }

    // Funding amount match
    const programAmount = this.extractAmount(program.funding_amounts)
    const neededAmount = projectContext?.funding_amount || userProfile.funding_needed || 100000

    if (programAmount && neededAmount) {
      const ratio = Math.min(programAmount, neededAmount) / Math.max(programAmount, neededAmount)
      score += ratio * 15
    }

    // Readiness factors
    if (userProfile.has_business_plan) {
      score += 5
      successProbability += 10
    }
    if (userProfile.has_financial_statements) {
      score += 5
      successProbability += 5
    }
    if (userProfile.credit_score > 650) {
      score += 10
      successProbability += 10
    }

    return {
      score: Math.min(100, score),
      success_probability: Math.min(95, successProbability)
    }
  }

  async scoreAndRankOpportunities(opportunities, userProfile, projectContext) {
    return opportunities.map(opp => ({
      ...opp,
      final_score: this.calculateFinalScore(opp, userProfile, projectContext)
    })).sort((a, b) => b.final_score - a.final_score)
  }

  calculateFinalScore(opportunity, userProfile, projectContext) {
    let score = opportunity.match_score

    // Boost for high success probability
    if (opportunity.success_probability > 70) score += 10

    // Boost for shorter timeline
    if (opportunity.application_timeline.includes('1-2') || opportunity.application_timeline.includes('2-4')) {
      score += 5
    }

    // Boost for higher funding amounts
    if (opportunity.estimated_amount > 250000) score += 5

    return Math.min(100, score)
  }

  determineBusinessStage(userProfile) {
    const analyzer = new UFAStrategicAnalyzer()
    return analyzer.determineBusinessStage(userProfile)
  }

  extractAmount(amountString) {
    if (!amountString) return null

    const millions = amountString.match(/\$(\d+(?:\.\d+)?)\s*million/i)
    if (millions) return parseFloat(millions[1]) * 1000000

    const thousands = amountString.match(/\$(\d+(?:,\d{3})*)/i)
    if (thousands) return parseInt(thousands[1].replace(/,/g, ''))

    return null
  }

  extractKeyRequirements(program) {
    const requirements = []

    if (program.eligibility_requirements) {
      requirements.push(program.eligibility_requirements.split('.')[0])
    }

    if (program.success_factors) {
      requirements.push(...program.success_factors.slice(0, 2))
    }

    return requirements.length > 0 ? requirements : ['Business plan', 'Financial statements', 'Good credit']
  }

  generateMockGrants(userProfile, projectContext) {
    const grants = []

    if (userProfile.industry === 'technology') {
      grants.push({
        name: 'SBIR Phase I Grant',
        amount: 'Up to $275K',
        match_score: 85,
        success_probability: 25,
        requirements: ['Technical innovation', 'Commercial potential', 'Research plan'],
        link: 'https://www.sba.gov/funding-programs/investment-capital/sbir-sttr'
      })
    }

    if (userProfile.industry === 'manufacturing') {
      grants.push({
        name: 'Manufacturing USA Grant',
        amount: 'Up to $500K',
        match_score: 75,
        success_probability: 35,
        requirements: ['Manufacturing process improvement', 'Job creation', 'Technology adoption'],
        link: 'https://www.manufacturingusa.com/'
      })
    }

    // General grants
    grants.push({
      name: 'Small Business Innovation Grant',
      amount: 'Up to $100K',
      match_score: 60,
      success_probability: 40,
      requirements: ['Innovation focus', 'Small business', 'Research component'],
      link: 'https://www.grants.gov/'
    })

    return grants
  }
}

module.exports = { UFAQueryHandler }