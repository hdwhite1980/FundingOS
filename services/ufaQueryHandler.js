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
      next_steps: /\b(what\s+next|next\s+steps?|how\s+to\s+start|where\s+to\s+begin)\b/i
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
}

module.exports = { UFAQueryHandler }