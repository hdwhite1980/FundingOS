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

  async buildSBAKnowledgeBase(tenantId = null) {
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

      // Infer and persist policy trends for dashboard National Context when tenant provided
      if (tenantId) {
        const trends = this.inferPolicyTrends(businessContent)
        if (trends.length > 0) {
          await this.persistPolicyTrends(tenantId, trends)
        }
      }
      
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

  inferPolicyTrends(businessContent) {
    const textBlob = (businessContent || [])
      .map(c => `${c.title}. ${c.content}`)
      .join(' ')
      .toLowerCase()

    const score = (patterns) => patterns.reduce((acc, p) => acc + (textBlob.includes(p) ? 1 : 0), 0)

    const trends = []
    const loanSignals = score(['loan', '7(a)', '504', 'lender', 'collateral', 'guarantee'])
    const grantSignals = score(['grant', 'award', 'sbir', 'sttr', 'non-dilutive'])
    const exportSignals = score(['export', 'international', 'trade', 'exim'])
    const disasterSignals = score(['disaster', 'emergency', 'recovery', 'relief'])
    const microSignals = score(['microloan', 'microlender', 'startup'])
    const complianceSignals = score(['compliance', 'regulation', 'license', 'permit'])

    const label = (n) => (n >= 5 ? 'surging' : n >= 3 ? 'increasing' : n >= 1 ? 'stable' : 'low')

    trends.push({ key: 'policy_trend_sba_loans', value: label(loanSignals) })
    trends.push({ key: 'policy_trend_sba_grants', value: label(grantSignals) })
    trends.push({ key: 'policy_trend_export_support', value: label(exportSignals) })
    trends.push({ key: 'policy_trend_disaster_relief', value: label(disasterSignals) })
    trends.push({ key: 'policy_trend_microloans', value: label(microSignals) })
    trends.push({ key: 'policy_trend_compliance_emphasis', value: label(complianceSignals) })

    return trends
  }

  async persistPolicyTrends(tenantId, trends) {
    try {
      const { createClient } = require('@supabase/supabase-js')
      const supabaseUrl = process.env.SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!supabaseUrl || !supabaseKey) {
        console.warn('Supabase not configured; skipping policy trend persistence')
        return
      }
      const supabase = createClient(supabaseUrl, supabaseKey)
      for (const t of trends) {
        await supabase.rpc('ufa_upsert_metric', {
          p_tenant_id: tenantId,
          p_metric_key: t.key,
          p_value: String(t.value)
        })
      }
      console.log(`📈 Persisted ${trends.length} policy trend metrics for tenant ${tenantId}`)
    } catch (e) {
      console.error('Failed to persist policy trends:', e)
    }
  }

  async scrapeSBABusinessGuide() {
    const businessContent = []
    
    // Key SBA Business Guide sections for funding intelligence
    const SBA_BUSINESS_GUIDE_SECTIONS = [
      { url: '/plan-your-business', title: 'Plan Your Business' },
      { url: '/launch-your-business', title: 'Launch Your Business' },
      { url: '/manage-your-business', title: 'Manage Your Business' },
      { url: '/grow-your-business', title: 'Grow Your Business' },
      { url: '/fund-your-business', title: 'Fund Your Business' },
      { url: '/plan-your-business/calculate-your-startup-costs', title: 'Calculate Startup Costs' },
      { url: '/plan-your-business/write-your-business-plan', title: 'Write Your Business Plan' },
      { url: '/launch-your-business/choose-business-structure', title: 'Choose Business Structure' },
      { url: '/launch-your-business/register-your-business', title: 'Register Your Business' },
      { url: '/manage-your-business/stay-legally-compliant', title: 'Stay Legally Compliant' },
      { url: '/grow-your-business/expand-market-reach', title: 'Expand Market Reach' },
      { url: '/fund-your-business/determine-how-much-funding-you-need', title: 'Determine Funding Needs' },
      { url: '/fund-your-business/explore-funding-options', title: 'Explore Funding Options' }
    ]

    for (const section of SBA_BUSINESS_GUIDE_SECTIONS) {
      try {
        const content = await this.scrapeSBASection(section.url, section.title)
        businessContent.push(...content)
      } catch (error) {
        console.error(`Failed to scrape SBA section ${section.url}:`, error)
      }
    }

    return businessContent
  }

  async scrapeSBASection(sectionPath, sectionTitle) {
    const resolvedPath = this.resolveSBARedirect(sectionPath)
    const primaryUrl = resolvedPath.startsWith('http')
      ? resolvedPath
      : `${this.baseUrl}${resolvedPath}`
    console.log(`🏢 Scraping SBA content from: ${primaryUrl}`)
    
    const requestHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache'
    }

    // Try primary URL first
    try {
  const response = await axios.get(primaryUrl, { timeout: 10000, maxRedirects: 5, headers: requestHeaders })
      
      if (response.status === 200 && response.data) {
        const content = await this.parseHTMLContent(response.data, primaryUrl, sectionPath, sectionTitle)
        if (content && content.length > 0) {
          return content
        }
      }
    } catch (error) {
      console.log(`Primary URL failed for ${sectionPath}: ${error.message}`)
    }
    
    // Try alternative URL patterns
  const alternativeUrls = this.generateAlternativeUrls(resolvedPath)
    
    for (const altUrl of alternativeUrls) {
      try {
        const finalUrl = this.ensureAbsoluteUrl(altUrl)
        console.log(`🔄 Trying alternative URL: ${finalUrl}`)
        const response = await axios.get(finalUrl, { timeout: 10000, maxRedirects: 5, headers: requestHeaders })
        
        if (response.status === 200 && response.data) {
          const content = await this.parseHTMLContent(response.data, finalUrl, resolvedPath, sectionTitle)
          if (content && content.length > 0) {
            console.log(`✅ Success with alternative URL: ${finalUrl}`)
            return content
          }
        }
      } catch (error) {
        console.log(`Alternative URL failed ${altUrl}: ${error.message}`)
        continue
      }
    }
    
    // If all URLs fail, generate fallback content
    console.log(`⚠️ All URLs failed for ${sectionPath}, generating fallback content`)
    return await this.getFallbackContent(resolvedPath, sectionTitle)
  }

  resolveSBARedirect(sectionPath) {
    // Map deprecated/moved Business Guide pages to current structure
    const map = new Map([
      ['/fund-your-business', 'https://www.sba.gov/funding-programs'],
      ['/fund-your-business/determine-how-much-funding-you-need', 'https://www.sba.gov/funding-programs'],
      ['/fund-your-business/explore-funding-options', 'https://www.sba.gov/funding-programs'],
      ['/grow-your-business/expand-market-reach', 'https://www.sba.gov/grow-your-business']
    ])
    return map.get(sectionPath) || sectionPath
  }

  ensureAbsoluteUrl(url) {
    if (!url) return this.baseUrl
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    if (url.startsWith('/')) return `https://www.sba.gov${url}`
    return `https://www.sba.gov/${url}`
  }

  generateAlternativeUrls(sectionPath) {
    const alternativeUrls = []
    const baseSection = this.extractSectionFromUrl(sectionPath)
    
    // Try different URL patterns that SBA might use
    const patterns = [
      // Remove leading slash variations
      sectionPath.startsWith('/') ? sectionPath.slice(1) : sectionPath,
      
      // Add /business-guide prefix if not present
      sectionPath.includes('/business-guide') ? sectionPath : `/business-guide${sectionPath}`,
      
      // Try with www.sba.gov base
      `https://www.sba.gov${sectionPath}`,
      `https://www.sba.gov/business-guide${sectionPath.replace('/business-guide', '')}`,
      
      // Try section-specific patterns
      baseSection ? `https://www.sba.gov/${baseSection}` : null,
      baseSection ? `https://www.sba.gov/business-guide/${baseSection}` : null,
      
      // Try removing nested paths for top-level sections
      sectionPath.includes('/') ? `https://www.sba.gov/${sectionPath.split('/')[1]}` : null,
    ]
    
    // Filter out null values and duplicates
    patterns.forEach(pattern => {
      if (pattern && !alternativeUrls.includes(pattern)) {
        alternativeUrls.push(pattern)
      }
    })
    
    return alternativeUrls.slice(0, 5) // Limit to 5 alternative URLs to avoid too many requests
  }

  extractSectionFromUrl(sectionPath) {
    // Extract the main section name from URL path
    const pathParts = sectionPath.split('/').filter(part => part && part !== 'business-guide')
    return pathParts.length > 0 ? pathParts[0] : null
  }

  async getFallbackContent(sectionPath, sectionTitle) {
    console.log(`📝 Generating fallback content for ${sectionPath}`)
    
    // Generate structured fallback content based on section type
    const fallbackContent = this.generateFallbackSBAContent(sectionPath, sectionTitle)
    
    return [{
      category: this.categorizeSBAContent(sectionPath, sectionTitle),
      title: sectionTitle || 'SBA Business Guidance',
      content: fallbackContent.content,
      callouts: fallbackContent.callouts,
      source_url: `${this.baseUrl}${sectionPath}`,
      section: sectionPath,
      business_stage: this.identifyBusinessStage(sectionPath),
      funding_relevance: this.assessFundingRelevance(sectionTitle, fallbackContent.content),
      extracted_at: new Date().toISOString(),
      is_fallback: true
    }]
  }

  generateFallbackSBAContent(sectionPath, sectionTitle) {
    const section = this.extractSectionFromUrl(sectionPath)
    
    const fallbackContent = {
      'plan-your-business': {
        content: 'Business planning is essential for success. Develop a comprehensive business plan that includes market analysis, financial projections, and operational strategies. Consider your startup costs, funding needs, and growth projections. The SBA provides templates and resources to help create effective business plans that can attract investors and lenders.',
        callouts: ['Business plan template available on SBA.gov', 'Consider SCORE mentoring for business planning guidance', 'Financial projections should cover 3-5 years']
      },
      'launch-your-business': {
        content: 'Launching a business requires careful attention to legal structure, licensing, and registration requirements. Choose the right business entity type (LLC, Corporation, etc.) based on your needs. Register your business name and obtain necessary licenses and permits. Set up proper accounting systems and business banking.',
        callouts: ['Choose business structure carefully - impacts taxes and liability', 'Register for required licenses and permits', 'Separate business and personal finances from day one']
      },
      'manage-your-business': {
        content: 'Effective business management involves ongoing operations, compliance, and performance monitoring. Maintain accurate financial records, stay current with tax obligations, and ensure regulatory compliance. Develop systems for inventory, customer management, and employee oversight.',
        callouts: ['Keep accurate financial records for tax and funding purposes', 'Stay current with changing regulations', 'Monitor key performance indicators regularly']
      },
      'grow-your-business': {
        content: 'Business growth requires strategic planning and often additional funding. Consider market expansion opportunities, new product development, and operational scaling. Evaluate financing options including SBA loans, private investment, and revenue-based funding.',
        callouts: ['Growth requires additional working capital', 'Consider SBA programs for expansion funding', 'Market research is crucial before expansion']
      },
      'fund-your-business': {
        content: 'Business funding comes from multiple sources including personal savings, loans, grants, and investment. SBA loan programs offer government-backed financing with favorable terms. Consider your funding timeline, amount needed, and repayment capacity when choosing funding sources.',
        callouts: ['SBA loans offer competitive terms and government backing', 'Prepare strong financial documentation', 'Consider multiple funding sources for optimal capital structure']
      }
    }
    
    // Return section-specific content or general business content
    return fallbackContent[section] || {
      content: 'The SBA provides comprehensive guidance for businesses at all stages of development. From initial planning through growth and expansion, SBA resources help entrepreneurs make informed decisions and access necessary funding. Consider consulting SBA resource partners including SCORE, SBDCs, and WBCs for personalized guidance.',
      callouts: ['SBA resource partners provide free counseling', 'Local SBA district offices offer direct support', 'SBA.gov contains extensive business resources']
    }
  }

  async parseHTMLContent(htmlData, sourceUrl, sectionPath, sectionTitle) {
    try {
      const $ = cheerio.load(htmlData)
      const content = []
      
      // Extract main content areas with multiple selector strategies
      const contentSelectors = [
        '.guide-content',
        '.section-content', 
        '.funding-option',
        '.program-details',
        '.main-content',
        '.content-body',
        'main',
        '.business-guide-content',
        'article'
      ]
      
      let foundContent = false
      
      for (const selector of contentSelectors) {
        $(selector).each((index, element) => {
          const title = $(element).find('h1, h2, h3, h4').first().text().trim()
          const paragraphs = $(element).find('p').map((i, el) => $(el).text().trim()).get()
          const listItems = $(element).find('li').map((i, el) => $(el).text().trim()).get()
          const text = [...paragraphs, ...listItems].filter(t => t.length > 10).join(' ')
          
          const callouts = $(element).find('.callout, .highlight, .important, .alert, .note').map((i, el) => $(el).text().trim()).get()
          
          // Skip obvious navigation sections
          if ((title || '').toLowerCase().includes('breadcrumb')) return

          if (text && text.length > 50) { // Ensure we have substantial content
            content.push({
              category: this.categorizeSBAContent(sectionPath, title || sectionTitle),
              title: title || sectionTitle || 'SBA Business Guidance',
              content: text,
              callouts: callouts,
              source_url: sourceUrl,
              section: sectionPath,
              business_stage: this.identifyBusinessStage(sectionPath),
              funding_relevance: this.assessFundingRelevance(title || sectionTitle, text),
              extracted_at: new Date().toISOString()
            })
            foundContent = true
          }
        })
        
        // If we found content with this selector, break
        if (foundContent) break
      }
      
      // If no structured content found, try to extract from body text
      if (!foundContent) {
        const bodyText = $('body').text().trim()
        if (bodyText && bodyText.length > 100) {
          // Extract meaningful paragraphs from body text
          const sentences = bodyText.split('.').filter(s => s.length > 30).slice(0, 10)
          const meaningfulText = sentences.join('. ') + '.'
          
          if (meaningfulText.length > 100) {
            content.push({
              category: this.categorizeSBAContent(sectionPath, sectionTitle),
              title: sectionTitle || 'SBA Business Guidance',
              content: meaningfulText,
              callouts: [],
              source_url: sourceUrl,
              section: sectionPath,
              business_stage: this.identifyBusinessStage(sectionPath),
              funding_relevance: this.assessFundingRelevance(sectionTitle, meaningfulText),
              extracted_at: new Date().toISOString()
            })
          }
        }
      }
      
      return content
      
    } catch (error) {
      console.error(`Error parsing HTML content from ${sourceUrl}:`, error)
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
      // Scrape SBA funding programs from multiple likely pages with resilient selectors
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }

      const candidateUrls = [
        'https://www.sba.gov/funding-programs',
        'https://www.sba.gov/funding-programs/loans',
        'https://www.sba.gov/funding-programs/grants',
        'https://www.sba.gov/funding-programs/investment-capital',
        'https://www.sba.gov/funding-programs/loans/7a-loans',
        'https://www.sba.gov/funding-programs/loans/504-loans',
        'https://www.sba.gov/funding-programs/loans/microloans'
      ]

  const programs = []

      for (const url of candidateUrls) {
        try {
          const resp = await axios.get(url, { timeout: 12000, maxRedirects: 5, headers })
          if (resp.status !== 200 || !resp.data) continue
          const $ = cheerio.load(resp.data)

          const beforeCount = programs.length
          $('.program-card, .funding-option, .loan-program, article, section').each((index, element) => {
            const programName = $(element).find('h2, h3, h4, .program-title, .node-title').first().text().trim()
            const description = $(element).find('p, .description').first().text().trim()
            const eligibility = $(element).find('.eligibility, .requirements, .field--name-field-eligibility').text().trim()
            const amounts = $(element).find('.amount, .loan-amount, .funding-range, .field--name-field-amount').text().trim()
            let link = $(element).find('a').first().attr('href') || url

            if (link && !link.startsWith('http')) link = `https://www.sba.gov${link.startsWith('/') ? '' : '/'}${link}`
            
            // Heuristics to filter out non-program CTA/listing cards
            const lowerName = (programName || '').toLowerCase()
            const looksLikeCTA = /find a|contact|content|near you|learn more|apply now/.test(lowerName)
            const looksLikeListing = (link || '').toLowerCase().includes('/find-') || (link || '').toLowerCase().includes('/locator')
            if (looksLikeCTA || looksLikeListing) return

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
                link,
                extracted_at: new Date().toISOString()
              })
            }
          })
          const added = programs.length - beforeCount
          if (added > 0) {
            console.log(`🔎 Parsed ${added} programs from ${url}`)
          }
        } catch (e) {
          console.log(`Skipping candidate URL ${url}: ${e.message}`)
          continue
        }
      }

      // Add known major SBA programs if not captured
      const majorPrograms = this.getMajorSBAPrograms()
      programs.push(...majorPrograms)

      // Deduplicate by normalized name (and prefer entries with higher strategic value)
      const deduped = new Map()
      for (const p of programs) {
        const key = (p.name || '').toLowerCase().trim()
        if (!key) continue
        if (!deduped.has(key)) deduped.set(key, p)
        else {
          const existing = deduped.get(key)
          const existingScore = (existing.strategic_value || 0) + (existing.description?.length || 0) / 1000
          const newScore = (p.strategic_value || 0) + (p.description?.length || 0) / 1000
          if (newScore > existingScore) deduped.set(key, p)
        }
      }

      return Array.from(deduped.values())
      
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
      
      // Always populate in-memory caches for runtime usage
      this.knowledgeBase = new Map(Object.entries(intelligence))
      this.sbaPrograms = new Map(programs.map(p => [p.name, p]))

      if (!supabaseUrl || !supabaseKey) {
        console.log('💾 Stored SBA knowledge base in memory (no database configured)')
        return
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey)
      
      // Store business intelligence
      console.log(`🧠 Storing ${Object.keys(intelligence).length} knowledge categories...`)
      for (const [category, data] of Object.entries(intelligence)) {
        // Store each insight as a separate record
        for (const insight of data.insights || []) {
          try {
            const result = await supabase.from('ufa_sba_knowledge_base').insert({
              title: insight.type ? `${insight.type}: ${category.replace('_', ' ')}` : `SBA Guidance: ${category.replace('_', ' ')}`,
              content: insight.content,
              content_type: 'guide',
              category: category,
              keywords: insight.priority ? [insight.priority] : [],
              topics: [category],
              business_stage_relevance: insight.business_stage ? [insight.business_stage] : ['all_stages'],
              source_url: 'https://www.sba.gov/business-guide',
              active: true
            })
            if (result.error) {
              console.error(`Failed to insert insight for ${category}:`, result.error)
            }
          } catch (error) {
            console.error(`Error inserting insight for ${category}:`, error)
          }
        }

        // Store strategic recommendations
        for (const rec of data.strategic_recommendations || []) {
          try {
            const result = await supabase.from('ufa_sba_knowledge_base').insert({
              title: rec.title,
              content: `${rec.description}\n\nAction: ${rec.action}\n\nImpact: ${rec.impact}`,
              content_type: 'guide',
              category: category,
              keywords: [rec.priority, 'strategic', 'recommendation'],
              topics: [category, 'strategy'],
              business_stage_relevance: ['all_stages'],
              source_url: 'https://www.sba.gov/business-guide',
              active: true
            })
            if (result.error) {
              console.error(`Failed to insert recommendation for ${category}:`, result.error)
            }
          } catch (error) {
            console.error(`Error inserting recommendation for ${category}:`, error)
          }
        }
      }
      
      // Filter programs again defensively before DB insert
      const filteredPrograms = (programs || []).filter(p => {
        const name = (p?.name || '').toLowerCase()
        const link = (p?.link || '').toLowerCase()
        if (!p?.description || name.length < 3) return false
        if (/find a|contact|content|near you|learn more|apply now/.test(name)) return false
        if (link.includes('/find-') || link.includes('/locator')) return false
        return true
      })

      // Store SBA funding programs
      console.log(`💾 Storing ${filteredPrograms.length} SBA programs...`)
      for (const program of filteredPrograms) {
        try {
          const result = await supabase.from('ufa_sba_programs').insert({
            name: program.name,
            program_type: program.program_type,
            description: program.description,
            eligibility_criteria: program.eligibility_requirements,
            funding_amounts: program.funding_amounts,
            application_process: program.application_process || 'Contact SBA lender for application process',
            source_url: program.link,
            agency: 'SBA',
            active: true,
            updated_at: new Date().toISOString()
          })
          if (result.error) {
            console.error(`Failed to insert program ${program.name}:`, result.error)
          } else {
            console.log(`✅ Inserted program: ${program.name}`)
          }
        } catch (error) {
          console.error(`Error inserting program ${program.name}:`, error)
        }
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
    const allPrograms = Array.from(this.sbaPrograms.values() || [])

    // If no programs loaded, return empty
    if (!allPrograms || allPrograms.length === 0) return []

    const opp = opportunity || {}
    const safeProfile = orgProfile || {}

    return allPrograms
      .filter(program => {
        const stages = Array.isArray(program.business_stage_fit) ? program.business_stage_fit : ['all_stages']
        const stageMatch = stages.includes(safeProfile.business_stage) || stages.includes('all_stages')

        // If no specific opportunity context, accept stage match
        if (!opp || (!opp.title && !opp.description && !opp.funding_amount && !opp.value)) {
          return stageMatch
        }

        const purposeMatch = this.assessPurposeMatch(program, opp)
        const amountMatch = this.assessAmountMatch(program, opp)
        return stageMatch && (purposeMatch || amountMatch)
      })
      .sort((a, b) => (b.strategic_value || 0) - (a.strategic_value || 0))
  }

  assessPurposeMatch(program, opportunity) {
    const programText = ((program?.name || '') + ' ' + (program?.description || '')).toLowerCase()
    const opportunityText = ((opportunity?.title || '') + ' ' + (opportunity?.description || '')).toLowerCase()

    if (!opportunityText) return false

    const commonTerms = ['equipment', 'real estate', 'working capital', 'expansion', 'research', 'development']
    return commonTerms.some(term => programText.includes(term) && opportunityText.includes(term))
  }

  assessAmountMatch(program, opportunity) {
    // Extract funding amounts and compare
    const programAmount = this.extractFundingAmount(program?.funding_amounts)
    const opportunityAmount = opportunity?.funding_amount || opportunity?.value

    if (programAmount && opportunityAmount) {
      return Number(opportunityAmount) <= Number(programAmount) * 1.2 // Allow 20% buffer
    }

    // If we can't determine, don't let amount filter exclude candidates
    return true
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

  async calculateAlignmentScore(program, orgProfile) {
    try {
      let score = 50
      if (!program || !orgProfile) return score
      // Stage fit
      if (program.business_stage_fit?.includes(orgProfile.business_stage) || program.business_stage_fit?.includes('all_stages')) {
        score += 15
      }
      // Strategic value
      if (typeof program.strategic_value === 'number') {
        score += Math.min(20, program.strategic_value * 3)
      }
      // Readiness
      if (orgProfile.sba_loan_readiness >= 80) score += 10
      else if (orgProfile.sba_loan_readiness >= 60) score += 5
      // Complexity penalty
      if (program.application_complexity >= 4) score -= 5
      // Clamp 0-100
      return Math.max(0, Math.min(100, score))
    } catch {
      return 50
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