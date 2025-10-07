// services/sbaBusinessGuideIntegration.js
// Integrate SBA Business Guide into UFA with Puppeteer for JavaScript rendering

const puppeteer = require('puppeteer')
const { createClient } = require('@supabase/supabase-js')

class SBABusinessGuideIntegrator {
  constructor() {
    this.baseUrl = 'https://www.sba.gov/business-guide'
    this.knowledgeBase = new Map()
    this.lastUpdated = null
    this.sbaPrograms = new Map()
    this.browser = null
    this.usePuppeteer = process.env.USE_PUPPETEER !== 'false' // Enable by default
  }

  async initBrowser() {
    if (!this.usePuppeteer || this.browser) return
    
    console.log('🚀 Launching Puppeteer browser...')
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

  async buildSBAKnowledgeBase(tenantId = null) {
    console.log('🏛️ Building UFA knowledge base from SBA Business Guide...')
    
    try {
      // Initialize browser if using Puppeteer
      await this.initBrowser()
      
      // Scrape comprehensive SBA content
      const businessContent = await this.scrapeSBABusinessGuide()
      
      // Process into UFA-actionable intelligence
      const processedKnowledge = await this.processIntoUFAIntelligence(businessContent)
      
      // Extract SBA funding programs and opportunities
      const fundingPrograms = await this.extractSBAFundingPrograms()
      
      // Store structured knowledge base
      await this.storeSBAKnowledgeBase(processedKnowledge, fundingPrograms)

      // Infer and persist policy trends for dashboard
      if (tenantId) {
        const trends = this.inferPolicyTrends(businessContent)
        if (trends.length > 0) {
          await this.persistPolicyTrends(tenantId, trends)
        }
      }
      
      // Close browser
      await this.closeBrowser()
      
      return {
        success: true,
        content_categories: Object.keys(processedKnowledge),
        funding_programs: fundingPrograms.length,
        total_resources: businessContent.length,
        last_updated: new Date().toISOString(),
        scraping_method: this.usePuppeteer ? 'puppeteer' : 'fallback'
      }
      
    } catch (error) {
      console.error('Failed to build SBA knowledge base:', error)
      await this.closeBrowser()
      return { success: false, error: error.message }
    }
  }

  async scrapeSBABusinessGuide() {
    const businessContent = []
    
    // Key SBA Business Guide sections
    const SBA_BUSINESS_GUIDE_SECTIONS = [
      { url: '/plan-your-business', title: 'Plan Your Business' },
      { url: '/launch-your-business', title: 'Launch Your Business' },
      { url: '/manage-your-business', title: 'Manage Your Business' },
      { url: '/grow-your-business', title: 'Grow Your Business' },
      { url: '/fund-your-business', title: 'Fund Your Business' },
      { url: '/plan-your-business/write-your-business-plan', title: 'Write Your Business Plan' },
      { url: '/launch-your-business/choose-business-structure', title: 'Choose Business Structure' },
      { url: '/manage-your-business/stay-legally-compliant', title: 'Stay Legally Compliant' }
    ]

    for (const section of SBA_BUSINESS_GUIDE_SECTIONS) {
      try {
        const content = await this.scrapeSBASection(section.url, section.title)
        businessContent.push(...content)
      } catch (error) {
        console.error(`Failed to scrape SBA section ${section.url}:`, error.message)
      }
    }

    console.log(`📊 Scraped ${businessContent.length} content items from SBA`)
    return businessContent
  }

  async scrapeSBASection(sectionPath, sectionTitle) {
    const resolvedPath = this.resolveSBARedirect(sectionPath)
    const primaryUrl = resolvedPath.startsWith('http')
      ? resolvedPath
      : `${this.baseUrl}${resolvedPath}`
    
    console.log(`🔍 Scraping SBA content from: ${primaryUrl}`)
    
    // Try Puppeteer first if enabled
    if (this.usePuppeteer && this.browser) {
      try {
        const content = await this.scrapeSectionWithPuppeteer(primaryUrl, sectionPath, sectionTitle)
        if (content && content.length > 0) {
          console.log(`✅ Puppeteer scraped ${content.length} items from ${sectionPath}`)
          return content
        }
      } catch (error) {
        console.log(`⚠️ Puppeteer failed for ${sectionPath}: ${error.message}`)
      }
    }
    
    // Fallback to static content
    console.log(`📝 Using fallback content for ${sectionPath}`)
    return await this.getFallbackContent(resolvedPath, sectionTitle)
  }

  async scrapeSectionWithPuppeteer(url, sectionPath, sectionTitle) {
    console.log(`🌐 Rendering page with Puppeteer: ${url}`)
    
    try {
      const page = await this.browser.newPage()
      
      // Set realistic viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 })
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
      
      // Block unnecessary resources to speed up loading
      await page.setRequestInterception(true)
      page.on('request', (request) => {
        const resourceType = request.resourceType()
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          request.abort()
        } else {
          request.continue()
        }
      })
      
      // Navigate to page
      console.log(`📡 Loading ${url}...`)
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      })
      
      // Wait for content to render
      await page.waitForTimeout(2000)
      
      // Extract content from the rendered page
      const extractedContent = await page.evaluate(() => {
        const results = []
        
        // Strategy 1: Look for main content areas
        const mainSelectors = [
          'main',
          '[role="main"]',
          '.main-content',
          '.content',
          'article',
          '.article-content'
        ]
        
        let mainContent = null
        for (const selector of mainSelectors) {
          mainContent = document.querySelector(selector)
          if (mainContent) break
        }
        
        if (!mainContent) {
          mainContent = document.body
        }
        
        // Extract structured content sections
        const sections = mainContent.querySelectorAll('section, .section, .content-section')
        
        if (sections.length > 0) {
          sections.forEach((section, index) => {
            const heading = section.querySelector('h1, h2, h3, h4')
            const paragraphs = Array.from(section.querySelectorAll('p'))
              .map(p => p.textContent.trim())
              .filter(text => text.length > 30)
            
            const listItems = Array.from(section.querySelectorAll('li'))
              .map(li => li.textContent.trim())
              .filter(text => text.length > 10)
            
            const callouts = Array.from(section.querySelectorAll('.callout, .alert, .highlight, .tip, .note, .important'))
              .map(el => el.textContent.trim())
              .filter(text => text.length > 10)
            
            if (paragraphs.length > 0 || listItems.length > 0) {
              results.push({
                title: heading ? heading.textContent.trim() : null,
                paragraphs: paragraphs,
                listItems: listItems,
                callouts: callouts,
                index: index
              })
            }
          })
        } else {
          // Fallback: Extract all paragraphs from main content
          const allParagraphs = Array.from(mainContent.querySelectorAll('p'))
            .map(p => p.textContent.trim())
            .filter(text => text.length > 30)
          
          const allListItems = Array.from(mainContent.querySelectorAll('li'))
            .map(li => li.textContent.trim())
            .filter(text => text.length > 10)
          
          const allCallouts = Array.from(mainContent.querySelectorAll('.callout, .alert, .highlight, .tip, .note'))
            .map(el => el.textContent.trim())
            .filter(text => text.length > 10)
          
          const mainHeading = mainContent.querySelector('h1')
          
          if (allParagraphs.length > 0 || allListItems.length > 0) {
            results.push({
              title: mainHeading ? mainHeading.textContent.trim() : null,
              paragraphs: allParagraphs,
              listItems: allListItems,
              callouts: allCallouts,
              index: 0
            })
          }
        }
        
        return results
      })
      
      await page.close()
      
      console.log(`📄 Extracted ${extractedContent.length} content sections`)
      
      // Convert extracted content to structured format
      const structuredContent = extractedContent.map((item, index) => {
        const contentText = [
          ...item.paragraphs,
          ...item.listItems
        ].join(' ')
        
        return {
          category: this.categorizeSBAContent(sectionPath, item.title || sectionTitle),
          title: item.title || sectionTitle || 'SBA Business Guidance',
          content: contentText,
          callouts: item.callouts,
          source_url: url,
          section: sectionPath,
          business_stage: this.identifyBusinessStage(sectionPath),
          funding_relevance: this.assessFundingRelevance(item.title || sectionTitle, contentText),
          extracted_at: new Date().toISOString(),
          extraction_method: 'puppeteer'
        }
      }).filter(item => item.content.length > 100) // Only keep substantial content
      
      return structuredContent
      
    } catch (error) {
      console.error(`Puppeteer scraping error for ${url}:`, error.message)
      throw error
    }
  }

  resolveSBARedirect(sectionPath) {
    // Map deprecated/moved Business Guide pages to current structure
    const map = new Map([
      ['/fund-your-business', 'https://www.sba.gov/funding-programs'],
      ['/fund-your-business/determine-how-much-funding-you-need', 'https://www.sba.gov/funding-programs'],
      ['/fund-your-business/explore-funding-options', 'https://www.sba.gov/funding-programs'],
      ['/grow-your-business/expand-market-reach', 'https://www.sba.gov/business-guide/grow-your-business']
    ])
    return map.get(sectionPath) || sectionPath
  }

  async getFallbackContent(sectionPath, sectionTitle) {
    console.log(`📝 Generating fallback content for ${sectionPath}`)
    
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
      is_fallback: true,
      extraction_method: 'curated'
    }]
  }

  generateFallbackSBAContent(sectionPath, sectionTitle) {
    const section = this.extractSectionFromUrl(sectionPath)
    
    const fallbackContent = {
      'plan-your-business': {
        content: 'Business planning is the foundation of entrepreneurial success. A comprehensive business plan includes market analysis, competitive research, financial projections, and operational strategies. Start by defining your value proposition and target market. Conduct thorough market research to understand customer needs, market size, and competition. Develop detailed financial projections including startup costs, revenue forecasts, and break-even analysis. Create an operational plan outlining day-to-day business activities, staffing needs, and key milestones. The SBA offers free business plan templates and tools to guide you through this process.',
        callouts: [
          'Use SBA\'s free business plan template at sba.gov',
          'Include 3-5 year financial projections with realistic assumptions',
          'Update your business plan annually as your business evolves',
          'Seek feedback from SCORE mentors or SBDCs'
        ]
      },
      'launch-your-business': {
        content: 'Launching a business requires careful attention to legal structure, licensing, and registration. Choose the right business entity (sole proprietorship, partnership, LLC, or corporation) based on liability protection, tax implications, and operational needs. Register your business name with state and local authorities. Obtain an Employer Identification Number (EIN) from the IRS for tax purposes. Apply for necessary business licenses and permits at federal, state, and local levels. Set up proper accounting systems and separate business banking accounts. Consider business insurance to protect against liability and property risks.',
        callouts: [
          'Choose business structure carefully - impacts taxes and liability',
          'Register for required licenses and permits before operations begin',
          'Separate personal and business finances from day one',
          'Consult with attorney and accountant for compliance'
        ]
      },
      'manage-your-business': {
        content: 'Effective business management involves ongoing operations, financial oversight, and regulatory compliance. Maintain accurate financial records using accounting software or professional bookkeeping services. Stay current with tax obligations including quarterly estimated taxes and annual returns. Monitor cash flow closely and maintain adequate working capital. Ensure regulatory compliance with employment laws, safety regulations, and industry-specific requirements. Implement systems for inventory management, customer relationship management, and employee oversight. Regular review of key performance indicators helps identify opportunities and challenges early.',
        callouts: [
          'Keep meticulous financial records for tax and funding purposes',
          'Stay current with changing regulations in your industry',
          'Monitor key performance indicators monthly',
          'Build relationships with advisors including accountant and attorney'
        ]
      },
      'grow-your-business': {
        content: 'Business growth requires strategic planning and often additional capital. Evaluate growth opportunities including market expansion, new product development, and operational scaling. Assess your capacity to handle increased business volume including staffing, infrastructure, and working capital needs. Consider various growth strategies such as organic growth, strategic partnerships, franchising, or acquisition. Evaluate financing options including SBA loans, private investment, revenue-based financing, and retained earnings. Develop marketing strategies to reach new customers and expand market share. Invest in technology and systems that enable scalable operations.',
        callouts: [
          'Growth requires additional working capital - plan ahead',
          'Consider SBA 7(a) and 504 loan programs for expansion',
          'Market research is crucial before geographic or product expansion',
          'Build infrastructure and systems before scaling operations'
        ]
      },
      'fund-your-business': {
        content: 'Business funding comes from multiple sources including personal savings, loans, grants, and investment. SBA loan programs offer government-backed financing with favorable terms and lower down payments. The 7(a) loan program provides up to $5 million for working capital, equipment, and real estate. The 504 loan program offers fixed-rate financing for major fixed assets. Microloans up to $50,000 help startups and underserved entrepreneurs. Alternative funding includes angel investors, venture capital, crowdfunding, and revenue-based financing. Prepare strong financial documentation including business plan, financial statements, tax returns, and credit history.',
        callouts: [
          'SBA loans offer competitive terms with government backing',
          'Prepare comprehensive financial documentation before applying',
          'Consider multiple funding sources for optimal capital structure',
          'Build relationships with lenders before you need funding'
        ]
      },
      'write-your-business-plan': {
        content: 'A well-crafted business plan is essential for securing funding and guiding business growth. Include an executive summary that captures your business concept, market opportunity, competitive advantage, and financial highlights. Provide detailed company description including mission, vision, legal structure, and history. Conduct comprehensive market analysis covering industry trends, target market demographics, market size, and growth potential. Analyze competition identifying key competitors, their strengths/weaknesses, and your competitive advantages. Describe your organization and management team highlighting relevant experience and expertise. Detail your products or services including features, benefits, intellectual property, and development timeline. Outline marketing and sales strategies for customer acquisition and retention. Include financial projections with income statements, cash flow projections, and balance sheets for 3-5 years.',
        callouts: [
          'Executive summary should be compelling yet concise (1-2 pages)',
          'Support all claims with data and realistic assumptions',
          'Include appendix with supporting documents and detailed financials',
          'Tailor your plan to your audience (lenders vs. investors)'
        ]
      },
      'choose-business-structure': {
        content: 'Choosing the right business structure impacts your taxes, liability, and operations. Sole proprietorship is simplest but offers no liability protection - suitable for low-risk solo ventures. Partnership allows shared ownership but partners have unlimited liability - use partnership agreements. Limited Liability Company (LLC) provides liability protection with flexible taxation - popular for small to medium businesses. S Corporation offers liability protection and potential tax savings but has strict requirements. C Corporation provides strongest liability protection and access to investment capital but faces double taxation. Consider factors including liability exposure, tax implications, capital needs, management structure, and exit strategy. Consult with attorney and accountant before deciding.',
        callouts: [
          'Liability protection is critical for higher-risk businesses',
          'Tax implications vary significantly by structure',
          'Some structures are easier to convert than others',
          'Professional guidance prevents costly mistakes'
        ]
      },
      'stay-legally-compliant': {
        content: 'Legal compliance protects your business from fines, lawsuits, and operational disruptions. Maintain required business licenses and permits, renewing as needed. Comply with employment laws including wage and hour rules, workplace safety (OSHA), anti-discrimination laws, and employee classification. File accurate tax returns and make timely payments for income, payroll, and sales taxes. Protect intellectual property through trademarks, copyrights, and patents. Maintain required insurance coverage including general liability, professional liability, workers compensation, and business property. Follow industry-specific regulations for healthcare, food service, financial services, and other regulated industries. Keep accurate records of compliance activities and deadlines.',
        callouts: [
          'Compliance requirements vary by industry, location, and business size',
          'Misclassifying employees as contractors risks serious penalties',
          'Maintain compliance calendar for licenses, permits, and tax deadlines',
          'Consider compliance software or professional services'
        ]
      }
    }
    
    return fallbackContent[section] || {
      content: 'The SBA provides comprehensive guidance for businesses at all stages of development. From initial planning through growth and expansion, SBA resources help entrepreneurs make informed decisions and access necessary funding. The Business Guide covers essential topics including business planning, legal structure selection, licensing and permits, financial management, marketing strategies, and compliance requirements. SBA resource partners including SCORE, Small Business Development Centers (SBDCs), and Women\'s Business Centers (WBCs) provide free one-on-one counseling and training.',
      callouts: [
        'SBA resource partners provide free counseling and workshops',
        'Local SBA district offices offer direct support and connections',
        'SBA.gov contains extensive business resources and tools',
        'Consider SBA learning platform for online courses'
      ]
    }
  }

  extractSectionFromUrl(sectionPath) {
    const pathParts = sectionPath.split('/').filter(part => part && part !== 'business-guide')
    return pathParts.length > 0 ? pathParts[0] : null
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

  async extractSBAFundingPrograms() {
    console.log('💰 Extracting SBA funding programs...')
    
    // Return curated major SBA programs (scraping funding programs is complex)
    const programs = this.getMajorSBAPrograms()
    
    // Deduplicate
    const deduped = new Map()
    for (const p of programs) {
      const key = (p.name || '').toLowerCase().trim()
      if (!key) continue
      if (!deduped.has(key)) {
        deduped.set(key, p)
      }
    }

    return Array.from(deduped.values())
  }

  getMajorSBAPrograms() {
    return [
      {
        name: 'SBA 7(a) Loan Program',
        description: 'SBA\'s most common loan program providing up to $5 million for various business purposes including working capital, equipment, real estate, and debt refinancing. Government-backed guarantee reduces lender risk and improves approval odds.',
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
        description: 'Long-term, fixed-rate financing for major fixed assets like real estate and equipment. Provides up to $5.5 million for qualified projects with favorable terms.',
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
        description: 'Small loans up to $50,000 to help small businesses and nonprofit childcare centers start up and expand. Often easier to qualify for than traditional loans.',
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
        description: 'Research and development funding for innovative small businesses through federal agencies. Provides non-dilutive funding for technology development with commercialization potential.',
        eligibility_requirements: 'Small business, research and development focus, innovative technology',
        funding_amounts: 'Phase I: up to $275,000, Phase II: up to $1.75 million',
        program_type: 'grant_program',
        business_stage_fit: ['startup', 'established'],
        strategic_value: 5,
        application_complexity: 5,
        success_factors: ['Innovation', 'Technical expertise', 'Commercialization potential', 'Research capabilities'],
        link: 'https://www.sba.gov/funding-programs/investment-capital/sbir-sttr'
      },
      {
        name: 'SBA Express Loans',
        description: 'Expedited loan program up to $500,000 with faster turnaround time. Uses streamlined application process for quick access to capital.',
        eligibility_requirements: 'Meet standard SBA 7(a) requirements, creditworthy business',
        funding_amounts: 'Up to $500,000',
        program_type: 'loan_program',
        business_stage_fit: ['established', 'growth'],
        strategic_value: 3,
        application_complexity: 2,
        success_factors: ['Good credit', 'Established business', 'Quick decision needed'],
        link: 'https://www.sba.gov/funding-programs/loans/7a-loans'
      },
      {
        name: 'SBA Disaster Loans',
        description: 'Low-interest loans to help businesses recover from declared disasters. Available for physical damage and economic injury.',
        eligibility_requirements: 'Business located in declared disaster area, suffered disaster damage or economic injury',
        funding_amounts: 'Up to $2 million',
        program_type: 'disaster_relief',
        business_stage_fit: ['all_stages'],
        strategic_value: 4,
        application_complexity: 3,
        success_factors: ['Documented disaster damage', 'Ability to repay', 'Insurance proceeds applied'],
        link: 'https://www.sba.gov/funding-programs/disaster-assistance'
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
        ufa_integrations: [],
        strategic_recommendations: []
      },
      business_formation: {
        description: 'Business structure and legal formation guidance',
        insights: [],
        funding_applications: [],
        ufa_integrations: [],
        strategic_recommendations: []
      },
      funding_strategies: {
        description: 'Comprehensive funding options and strategies',
        insights: [],
        funding_applications: [],
        ufa_integrations: [],
        strategic_recommendations: []
      },
      financial_planning: {
        description: 'Financial planning and cost analysis',
        insights: [],
        funding_applications: [],
        ufa_integrations: [],
        strategic_recommendations: []
      },
      business_operations: {
        description: 'Business management and operational guidance',
        insights: [],
        funding_applications: [],
        ufa_integrations: [],
        strategic_recommendations: []
      },
      growth_strategies: {
        description: 'Business growth and expansion strategies',
        insights: [],
        funding_applications: [],
        ufa_integrations: [],
        strategic_recommendations: []
      },
      compliance_requirements: {
        description: 'Legal compliance and regulatory requirements',
        insights: [],
        funding_applications: [],
        ufa_integrations: [],
        strategic_recommendations: []
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

  extractBusinessInsights(content) {
    const insights = []
    
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
    
    // Extract key insights from content
    const keyPhrases = [
      'should', 'must', 'required', 'important', 'essential', 
      'critical', 'recommended', 'best practice', 'consider'
    ]
    
    const sentences = content.content.split('.').filter(s => s.length > 20)
    sentences.forEach(sentence => {
      if (keyPhrases.some(phrase => sentence.toLowerCase().includes(phrase))) {
        insights.push({
          type: 'strategic_guidance',
          content: sentence.trim(),
          category: content.category,
          business_stage: content.business_stage,
          funding_relevance: content.funding_relevance,
          priority: 'medium',
          source: 'sba.gov'
        })
      }
    })
    
    return insights.slice(0, 5) // Limit to top 5 insights per content item
  }

  generateFundingApplications(content) {
    const applications = []
    
    if (content.funding_relevance === 'high') {
      applications.push({
        ufa_feature: `${content.category} Intelligence`,
        implementation: `Use SBA ${content.category} guidance to enhance funding recommendations`,
        strategic_value: 'Provide authoritative government-backed guidance',
        business_stage_focus: content.business_stage,
        content_source: content.title
      })
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

  generateCategoryRecommendations(insights, category) {
    const recommendations = []
    
    const categoryRecommendations = {
      business_planning: {
        priority: 'high',
        title: 'Develop Comprehensive Business Plan',
        description: 'Create detailed business plan using SBA templates and guidance',
        action: 'Use SBA business plan tools and templates for thorough preparation',
        impact: 'Improves funding application success and strategic clarity'
      },
      funding_strategies: {
        priority: 'high',
        title: 'Explore SBA Loan Programs',
        description: 'Evaluate SBA 7(a) and 504 loan programs for optimal funding',
        action: 'Research SBA loan programs and connect with SBA-approved lenders',
        impact: 'Access to government-backed financing with favorable terms'
      },
      financial_planning: {
        priority: 'medium',
        title: 'Prepare Financial Documentation',
        description: 'Organize financial statements and projections for funding applications',
        action: 'Work with accountant to prepare 3-year financial statements and projections',
        impact: 'Strengthens funding applications and improves approval odds'
      }
    }
    
    const rec = categoryRecommendations[category]
    if (rec) {
      recommendations.push(rec)
    }
    
    return recommendations
  }

  async storeSBAKnowledgeBase(intelligence, programs) {
    try {
      const supabaseUrl = process.env.SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      // Always populate in-memory caches
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
        // Store each insight
        for (const insight of (data.insights || []).slice(0, 5)) {
          try {
            await supabase.from('ufa_sba_knowledge_base').insert({
              title: `${insight.type}: ${category.replace('_', ' ')}`,
              content: insight.content,
              content_type: 'guide',
              category: category,
              keywords: [insight.priority],
              topics: [category],
              business_stage_relevance: [insight.business_stage || 'all_stages'],
              source_url: 'https://www.sba.gov/business-guide',
              active: true
            })
          } catch (error) {
            console.error(`Error inserting insight for ${category}:`, error.message)
          }
        }

        // Store recommendations
        for (const rec of (data.strategic_recommendations || [])) {
          try {
            await supabase.from('ufa_sba_knowledge_base').insert({
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
          } catch (error) {
            console.error(`Error inserting recommendation for ${category}:`, error.message)
          }
        }
      }
      
      // Store SBA programs
      console.log(`💾 Storing ${programs.length} SBA programs...`)
      for (const program of programs) {
        try {
          await supabase.from('ufa_sba_programs').insert({
            name: program.name,
            program_type: program.program_type,
            description: program.description,
            eligibility_criteria: program.eligibility_requirements,
            funding_amounts: program.funding_amounts,
            application_process: 'Contact SBA lender for application process',
            source_url: program.link,
            agency: 'SBA',
            active: true,
            updated_at: new Date().toISOString()
          })
          console.log(`✅ Inserted program: ${program.name}`)
        } catch (error) {
          console.error(`Error inserting program ${program.name}:`, error.message)
        }
      }
      
      console.log('✅ SBA knowledge base stored successfully')
      
    } catch (error) {
      console.error('Failed to store SBA knowledge base:', error)
      // Ensure in-memory storage
      this.knowledgeBase = new Map(Object.entries(intelligence))
      this.sbaPrograms = new Map(programs.map(p => [p.name, p]))
    }
  }

  // Methods for UFA integration (keep existing methods)
  async enhanceWithSBAIntelligence(opportunity, organizationProfile) {
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
    const allPrograms = Array.from(this.sbaPrograms.values() || [])
    if (!allPrograms || allPrograms.length === 0) return []

    const safeProfile = orgProfile || {}
    return allPrograms
      .filter(program => {
        const stages = Array.isArray(program.business_stage_fit) ? program.business_stage_fit : ['all_stages']
        return stages.includes(safeProfile.business_stage) || stages.includes('all_stages')
      })
      .sort((a, b) => (b.strategic_value || 0) - (a.strategic_value || 0))
  }

  async getRelevantBusinessGuidance(opportunity, orgProfile) {
    const relevantCategories = ['funding_strategies', 'business_planning']
    const relevantInsights = []
    
    relevantCategories.forEach(category => {
      if (this.knowledgeBase.has(category)) {
        const categoryData = this.knowledgeBase.get(category)
        relevantInsights.push(...(categoryData.insights || []))
      }
    })
    
    return {
      insights: relevantInsights.slice(0, 5)
    }
  }

  async assessSBAFundingReadiness(orgProfile) {
    let readinessScore = 0
    const factors = []
    
    if (orgProfile.has_business_plan) {
      readinessScore += 20
      factors.push('Business plan available')
    } else {
      factors.push('Business plan needed')
    }
    
    if (orgProfile.has_financial_statements) {
      readinessScore += 15
      factors.push('Financial statements current')
    }
    
    if (orgProfile.credit_score > 650) {
      readinessScore += 20
      factors.push('Credit score acceptable')
    }
    
    const level = readinessScore >= 80 ? 'high' : readinessScore >= 60 ? 'medium' : 'low'
    
    return {
      overall_score: readinessScore,
      readiness_level: level,
      factors: factors,
      recommendations: this.generateReadinessRecommendations(readinessScore, factors),
      sba_loan_readiness: readinessScore
    }
  }

  generateReadinessRecommendations(score, factors) {
    const recommendations = []
    
    if (score < 60) {
      recommendations.push('Focus on fundamental business documentation before pursuing SBA funding')
    }
    
    if (!factors.includes('Business plan available')) {
      recommendations.push('Develop comprehensive business plan using SBA templates')
    }
    
    return recommendations
  }

  generateSBAStrategicPathways(programs, orgProfile) {
    return programs.slice(0, 3).map(program => ({
      program_name: program.name,
      strategic_value: program.strategic_value,
      success_probability: 70,
      preparation_timeline: `${program.application_complexity * 4} weeks`
    }))
  }

  async calculateAlignmentScore(program, orgProfile) {
    let score = 50
    if (program.business_stage_fit?.includes(orgProfile.business_stage)) {
      score += 15
    }
    if (program.strategic_value >= 4) {
      score += 10
    }
    return Math.min(100, score)
  }

  extractFundingAmount(amountString) {
    if (!amountString) return null
    
    const millions = amountString.match(/\$(\d+(?:\.\d+)?)\s*million/i)
    if (millions) return parseFloat(millions[1]) * 1000000
    
    const thousands = amountString.match(/\$(\d+(?:,\d{3})*)/i)
    if (thousands) return parseInt(thousands[1].replace(/,/g, ''))
    
    return null
  }

  async calculatePreparationTimeline(program, orgProfile) {
    const baseTimeline = program.application_complexity * 4
    return `${baseTimeline} weeks`
  }

  async calculateSuccessProbability(program, orgProfile) {
    let probability = 50
    
    if (program.business_stage_fit.includes(orgProfile.business_stage)) {
      probability += 20
    }
    
    if (orgProfile.sba_loan_readiness >= 80) {
      probability += 15
    }
    
    return Math.max(10, Math.min(90, probability))
  }

  async generateNextSteps(program, orgProfile) {
    return [
      `Research ${program.name} requirements`,
      'Prepare financial documentation',
      'Connect with SBA-approved lender',
      'Schedule consultation with SBA counselor'
    ]
  }
}

module.exports = { SBABusinessGuideIntegrator }