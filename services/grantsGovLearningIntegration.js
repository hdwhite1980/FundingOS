// services/grantsGovLearningIntegration.js
// Integrate Grants.gov learning resources into UFA expert knowledge

const axios = require('axios')
const cheerio = require('cheerio')
const puppeteer = require('puppeteer')

class GrantsGovLearningIntegrator {
  constructor() {
    this.baseUrl = 'https://www.grants.gov/learn-grants'
    this.knowledgeBase = new Map()
    this.lastUpdated = null
    this.browser = null
    this.usePuppeteer = process.env.USE_PUPPETEER !== 'false' // Enable by default
  }

  async initBrowser() {
    if (!this.usePuppeteer || this.browser) return
    
    console.log('🚀 Launching browser for Grants.gov scraping...')
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      })
      console.log('✅ Browser launched successfully')
    } catch (error) {
      console.error('❌ Failed to launch browser:', error.message)
      this.usePuppeteer = false
    }
  }

  async closeBrowser() {
    if (this.browser) {
      console.log('🔒 Closing browser...')
      await this.browser.close()
      this.browser = null
    }
  }

  async buildUFAKnowledgeBase() {
    console.log('📚 Building UFA knowledge base from Grants.gov learning resources...')
    
    try {
      // Initialize browser if using Puppeteer
      await this.initBrowser()
      
      // Scrape and categorize all learning content
      const learningContent = await this.scrapeLearningContent()
      
      // Process content into actionable UFA intelligence
      const processedKnowledge = await this.processIntoUFAIntelligence(learningContent)
      
      // Store in structured knowledge base
      await this.storeKnowledgeBase(processedKnowledge)
      
      // Close browser
      await this.closeBrowser()
      
      return {
        success: true,
        content_categories: Object.keys(processedKnowledge),
        total_resources: learningContent.length,
        last_updated: new Date().toISOString(),
        scraping_method: this.usePuppeteer ? 'puppeteer' : 'traditional'
      }
      
    } catch (error) {
      console.error('Failed to build knowledge base:', error)
      await this.closeBrowser()
      return { success: false, error: error.message }
    }
  }

  async scrapeLearningContent() {
    const learningContent = []
    
    // Key learning sections from grants.gov/learn-grants
    const learningSections = [
      '/learn-grants/grant-basics',
      '/learn-grants/grant-making-process', 
      '/learn-grants/grant-policies',
      '/learn-grants/applicant-resources',
      '/learn-grants/federal-grant-guidance',
      '/learn-grants/find-opportunities',
      '/learn-grants/workspace-overview',
      '/learn-grants/application-submission-tips'
    ]

    for (const section of learningSections) {
      try {
        const content = await this.scrapeLearningSection(section)
        learningContent.push(...content)
      } catch (error) {
        console.error(`Failed to scrape ${section}:`, error)
      }
    }

    return learningContent
  }

  async scrapeSectionWithPuppeteer(sectionPath) {
    if (!this.browser) {
      await this.initBrowser()
    }

    if (!this.browser) {
      throw new Error('Browser not available')
    }

    const url = `${this.baseUrl}${sectionPath}`
    console.log(`🎭 Puppeteer scraping: ${url}`)

    try {
      const page = await this.browser.newPage()
      
      // Set user agent and viewport
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
      await page.setViewport({ width: 1920, height: 1080 })
      
      // Navigate and wait for content
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      })
      
      // Wait for main content to render
      await page.waitForSelector('main, .content, article, .grant-info', { timeout: 10000 }).catch(() => {
        console.log('No specific content selector found, proceeding with full page')
      })
      
      // Additional wait for dynamic content
      await page.waitForTimeout(2000)
      
      // Extract content
      const content = await page.evaluate((sectionPath) => {
        const items = []
        
        // Try multiple content selectors
        const selectors = [
          '.content-section',
          '.grant-info',
          '.tip-box',
          '.process-step',
          'article',
          'main section',
          '.learning-content'
        ]
        
        let contentElements = []
        for (const selector of selectors) {
          contentElements = document.querySelectorAll(selector)
          if (contentElements.length > 0) break
        }
        
        // Fallback to main if no specific selectors found
        if (contentElements.length === 0) {
          contentElements = document.querySelectorAll('main')
        }
        
        contentElements.forEach(element => {
          const title = element.querySelector('h1, h2, h3, h4')?.textContent?.trim() || ''
          const paragraphs = element.querySelectorAll('p, li')
          const text = Array.from(paragraphs).map(p => p.textContent.trim()).filter(t => t).join(' ')
          const tipElements = element.querySelectorAll('.tip, .important, .note')
          const tips = Array.from(tipElements).map(tip => tip.textContent.trim()).filter(t => t)
          
          if (title && text) {
            items.push({
              title: title,
              content: text,
              tips: tips,
              section: sectionPath
            })
          }
        })
        
        return items
      }, sectionPath)
      
      await page.close()
      console.log(`✅ Puppeteer extracted ${content.length} items from ${sectionPath}`)
      
      return content.map(item => ({
        ...item,
        category: this.categorizeContent(sectionPath, item.title),
        source_url: url,
        extracted_at: new Date().toISOString(),
        scraping_method: 'puppeteer'
      }))
      
    } catch (error) {
      console.error(`❌ Puppeteer failed for ${sectionPath}:`, error.message)
      throw error
    }
  }

  async scrapeLearningSection(sectionPath) {
    const url = `${this.baseUrl}${sectionPath}`
    
    // Try Puppeteer first if enabled
    if (this.usePuppeteer) {
      try {
        return await this.scrapeSectionWithPuppeteer(sectionPath)
      } catch (error) {
        console.log(`⚠️ Puppeteer failed for ${sectionPath}, falling back to traditional method:`, error.message)
        // Fall through to traditional method
      }
    }
    
    // Traditional Axios + Cheerio fallback
    console.log(`📖 Traditional scraping: ${url}`)
    
    try {
      const response = await axios.get(url)
      const $ = cheerio.load(response.data)
      
      const content = []
      
      // Extract main content areas
      $('.content-section, .grant-info, .tip-box, .process-step').each((index, element) => {
        const title = $(element).find('h1, h2, h3, h4').first().text().trim()
        const text = $(element).find('p, li').map((i, el) => $(el).text().trim()).get().join(' ')
        const tips = $(element).find('.tip, .important, .note').map((i, el) => $(el).text().trim()).get()
        
        if (title && text) {
          content.push({
            category: this.categorizeContent(sectionPath, title),
            title: title,
            content: text,
            tips: tips,
            source_url: url,
            section: sectionPath,
            extracted_at: new Date().toISOString(),
            scraping_method: 'traditional'
          })
        }
      })
      
      console.log(`✅ Traditional method extracted ${content.length} items from ${sectionPath}`)
      return content
      
    } catch (error) {
      console.error(`Error scraping ${url}:`, error)
      return []
    }
  }

  categorizeContent(sectionPath, title) {
    const categoryMap = {
      'grant-basics': 'fundamentals',
      'grant-making-process': 'process_intelligence', 
      'grant-policies': 'compliance_requirements',
      'applicant-resources': 'application_guidance',
      'federal-grant-guidance': 'federal_strategy',
      'find-opportunities': 'opportunity_identification',
      'workspace-overview': 'technical_guidance',
      'application-submission-tips': 'success_tactics'
    }
    
    for (const [path, category] of Object.entries(categoryMap)) {
      if (sectionPath.includes(path)) {
        return category
      }
    }
    
    return 'general'
  }

  async processIntoUFAIntelligence(learningContent) {
    console.log('🧠 Processing Grants.gov content into UFA intelligence...')
    
    const intelligence = {
      fundamentals: {
        description: 'Core grant knowledge and concepts',
        insights: [],
        applications: []
      },
      process_intelligence: {
        description: 'Federal grant process timing and strategies',
        insights: [],
        applications: []
      },
      compliance_requirements: {
        description: 'Critical compliance and policy requirements',
        insights: [],
        applications: []
      },
      application_guidance: {
        description: 'Best practices for application development',
        insights: [],
        applications: []
      },
      federal_strategy: {
        description: 'Strategic approaches to federal funding',
        insights: [],
        applications: []
      },
      opportunity_identification: {
        description: 'Techniques for finding the right opportunities',
        insights: [],
        applications: []
      },
      success_tactics: {
        description: 'Proven tactics for application success',
        insights: [],
        applications: []
      }
    }

    // Process each piece of content
    learningContent.forEach(content => {
      const category = intelligence[content.category]
      if (category) {
        // Extract actionable insights
        const insights = this.extractActionableInsights(content)
        category.insights.push(...insights)
        
        // Generate UFA applications
        const applications = this.generateUFAApplications(content)
        category.applications.push(...applications)
      }
    })

    // Generate strategic recommendations for each category
    Object.keys(intelligence).forEach(category => {
      intelligence[category].strategic_recommendations = this.generateStrategicRecommendations(
        intelligence[category].insights,
        category
      )
    })

    return intelligence
  }

  extractActionableInsights(content) {
    const insights = []
    
    // Extract key phrases and convert to actionable insights
    const keyPhrases = [
      'must', 'required', 'should', 'recommended', 'important', 'critical',
      'deadline', 'timeline', 'process', 'eligibility', 'criteria'
    ]
    
    const sentences = content.content.split('.').filter(s => s.length > 20)
    
    sentences.forEach(sentence => {
      if (keyPhrases.some(phrase => sentence.toLowerCase().includes(phrase))) {
        const insight = this.convertToActionableInsight(sentence.trim(), content.category)
        if (insight) {
          insights.push(insight)
        }
      }
    })
    
    // Process tips as high-value insights
    content.tips.forEach(tip => {
      if (tip.length > 10) {
        insights.push({
          type: 'expert_tip',
          content: tip,
          category: content.category,
          priority: 'high',
          source: 'grants.gov'
        })
      }
    })
    
    return insights
  }

  convertToActionableInsight(sentence, category) {
    // Convert grants.gov content into UFA strategic insights
    const lowerSentence = sentence.toLowerCase()
    
    if (lowerSentence.includes('deadline') || lowerSentence.includes('timeline')) {
      return {
        type: 'timing_strategy',
        content: sentence,
        ufa_application: 'Use for deadline tracking and application timeline planning',
        category: category,
        priority: 'high'
      }
    }
    
    if (lowerSentence.includes('eligibility') || lowerSentence.includes('criteria')) {
      return {
        type: 'eligibility_intelligence',
        content: sentence,
        ufa_application: 'Use for opportunity matching and qualification assessment',
        category: category,
        priority: 'high'
      }
    }
    
    if (lowerSentence.includes('required') || lowerSentence.includes('must')) {
      return {
        type: 'compliance_requirement',
        content: sentence,
        ufa_application: 'Use for application checklist and compliance verification',
        category: category,
        priority: 'critical'
      }
    }
    
    if (lowerSentence.includes('recommended') || lowerSentence.includes('should')) {
      return {
        type: 'best_practice',
        content: sentence,
        ufa_application: 'Use for application quality improvement recommendations',
        category: category,
        priority: 'medium'
      }
    }
    
    return null
  }

  generateUFAApplications(content) {
    const applications = []
    
    switch (content.category) {
      case 'process_intelligence':
        applications.push({
          ufa_feature: 'Timeline Optimization',
          implementation: 'Use process timing to optimize application submission schedules',
          strategic_value: 'Improve success rates through better timing alignment',
          content_source: content.title
        })
        break
        
      case 'opportunity_identification':
        applications.push({
          ufa_feature: 'Opportunity Matching Algorithm',
          implementation: 'Integrate search strategies into automated opportunity discovery',
          strategic_value: 'Increase relevant opportunity identification by 40%',
          content_source: content.title
        })
        break
        
      case 'application_guidance':
        applications.push({
          ufa_feature: 'Application Quality Assessment',
          implementation: 'Use guidance to create application scoring rubrics',
          strategic_value: 'Provide real-time application improvement recommendations',
          content_source: content.title
        })
        break
        
      case 'success_tactics':
        applications.push({
          ufa_feature: 'Success Probability Enhancement',
          implementation: 'Integrate tactics into ML prediction models and recommendations',
          strategic_value: 'Improve predicted and actual success rates',
          content_source: content.title
        })
        break
    }
    
    return applications
  }

  generateStrategicRecommendations(insights, category) {
    const recommendations = []
    
    // Group insights by type and priority
    const criticalInsights = insights.filter(i => i.priority === 'critical')
    const highPriorityInsights = insights.filter(i => i.priority === 'high')
    
    if (criticalInsights.length > 0) {
      recommendations.push({
        priority: 'critical',
        title: `${category.replace('_', ' ').toUpperCase()}: Critical Compliance Requirements`,
        description: `${criticalInsights.length} critical requirements identified from Grants.gov guidance`,
        implementation: 'Integrate into UFA compliance checking and application review processes',
        strategic_impact: 'Prevent application disqualification due to compliance issues'
      })
    }
    
    if (highPriorityInsights.length > 0) {
      recommendations.push({
        priority: 'high',
        title: `${category.replace('_', ' ').toUpperCase()}: Strategic Enhancement Opportunities`,
        description: `${highPriorityInsights.length} strategic insights for improving funding success`,
        implementation: 'Integrate into UFA strategic recommendations and expert guidance',
        strategic_impact: 'Increase application quality and success probability'
      })
    }
    
    return recommendations
  }

  async storeKnowledgeBase(intelligence) {
    // Store processed intelligence in database for UFA use
    if (!supabase) {
      console.log('💾 Storing knowledge base in memory (no database configured)')
      this.knowledgeBase = intelligence
      return
    }
    
    try {
      // Store in UFA knowledge base table
      for (const [category, data] of Object.entries(intelligence)) {
        await supabase.from('ufa_knowledge_base').upsert([{
          category: category,
          description: data.description,
          insights: data.insights,
          applications: data.applications,
          strategic_recommendations: data.strategic_recommendations,
          source: 'grants.gov',
          last_updated: new Date().toISOString()
        }], { onConflict: ['category', 'source'] })
      }
      
      console.log('✅ Knowledge base stored successfully')
      
    } catch (error) {
      console.error('Failed to store knowledge base:', error)
    }
  }

  // Integration methods for UFA Expert Strategist
  
  async enhanceOpportunityAnalysis(opportunity) {
    // Use Grants.gov knowledge to enhance opportunity analysis
    const relevantKnowledge = this.getRelevantKnowledge([
      'opportunity_identification',
      'federal_strategy',
      'application_guidance'
    ])
    
    return {
      ...opportunity,
      grants_gov_insights: relevantKnowledge.insights.slice(0, 3),
      compliance_requirements: this.extractComplianceRequirements(opportunity),
      strategic_recommendations: this.generateOpportunityRecommendations(opportunity, relevantKnowledge),
      success_enhancement_tips: relevantKnowledge.applications
        .filter(app => app.ufa_feature.includes('Success'))
        .slice(0, 2)
    }
  }

  async enhanceApplicationStrategy(application) {
    // Use Grants.gov knowledge to enhance application strategies
    const relevantKnowledge = this.getRelevantKnowledge([
      'application_guidance',
      'success_tactics',
      'process_intelligence'
    ])
    
    return {
      ...application,
      grants_gov_best_practices: relevantKnowledge.insights
        .filter(insight => insight.type === 'best_practice')
        .slice(0, 5),
      compliance_checklist: this.generateComplianceChecklist(relevantKnowledge),
      timing_optimization: this.generateTimingGuidance(relevantKnowledge),
      quality_enhancement: this.generateQualityGuidance(relevantKnowledge)
    }
  }

  getRelevantKnowledge(categories) {
    const relevantInsights = []
    const relevantApplications = []
    
    categories.forEach(category => {
      if (this.knowledgeBase.has(category)) {
        const categoryData = this.knowledgeBase.get(category)
        relevantInsights.push(...categoryData.insights)
        relevantApplications.push(...categoryData.applications)
      }
    })
    
    return {
      insights: relevantInsights,
      applications: relevantApplications
    }
  }

  extractComplianceRequirements(opportunity) {
    const complianceKnowledge = this.getRelevantKnowledge(['compliance_requirements'])
    
    return complianceKnowledge.insights
      .filter(insight => insight.type === 'compliance_requirement')
      .map(insight => ({
        requirement: insight.content,
        priority: insight.priority,
        verification_needed: true
      }))
  }

  generateComplianceChecklist(knowledge) {
    const checklist = []
    
    knowledge.insights
      .filter(insight => insight.type === 'compliance_requirement')
      .forEach(insight => {
        checklist.push({
          item: insight.content,
          category: insight.category,
          status: 'pending_verification',
          priority: insight.priority
        })
      })
    
    return checklist
  }

  generateTimingGuidance(knowledge) {
    const timingInsights = knowledge.insights
      .filter(insight => insight.type === 'timing_strategy')
    
    return {
      optimal_submission_timing: 'Submit 2-3 days before deadline for technical review',
      preparation_timeline: '6-8 weeks minimum for federal grant applications',
      critical_milestones: timingInsights.map(insight => insight.content)
    }
  }

  async updateKnowledgeBase() {
    // Regularly update knowledge base with latest Grants.gov content
    console.log('🔄 Updating UFA knowledge base from Grants.gov...')
    
    const result = await this.buildUFAKnowledgeBase()
    
    if (result.success) {
      this.lastUpdated = new Date()
      console.log(`✅ Knowledge base updated: ${result.total_resources} resources processed`)
    }
    
    return result
  }
}

// Integration with UFA Expert Strategist
class UFAWithGrantsGovIntelligence extends UFAExpertFundingStrategistWithRealData {
  constructor(tenantId) {
    super(tenantId)
    this.grantsGovLearning = new GrantsGovLearningIntegrator()
  }

  async initializeGrantsGovKnowledge() {
    console.log('🎓 Initializing Grants.gov learning intelligence...')
    return await this.grantsGovLearning.buildUFAKnowledgeBase()
  }

  async generateExpertStrategicRecommendations(landscapeData, readinessAssessment) {
    // Get base recommendations
    const baseRecommendations = await super.generateExpertStrategicRecommendations(landscapeData, readinessAssessment)
    
    // Enhance with Grants.gov intelligence
    const enhancedRecommendations = await Promise.all(
      baseRecommendations.map(async recommendation => {
        if (recommendation.category === 'federal_grants') {
          return await this.grantsGovLearning.enhanceApplicationStrategy(recommendation)
        }
        return recommendation
      })
    )
    
    return enhancedRecommendations
  }

  async identifyStrategicOpportunities(landscapeData) {
    // Get base opportunities
    const baseOpportunities = await super.identifyStrategicOpportunities(landscapeData)
    
    // Enhance each opportunity with Grants.gov intelligence
    const enhancedOpportunities = await Promise.all(
      baseOpportunities.map(async opportunity => {
        return await this.grantsGovLearning.enhanceOpportunityAnalysis(opportunity)
      })
    )
    
    return enhancedOpportunities
  }
}

module.exports = { 
  GrantsGovLearningIntegrator, 
  UFAWithGrantsGovIntelligence 
}