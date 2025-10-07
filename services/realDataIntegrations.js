// services/realDataIntegrations.js
// Real AI data source integrations for UFA Expert Strategist

const axios = require('axios')
const cheerio = require('cheerio')
const puppeteer = require('puppeteer')
const tf = require('@tensorflow/tfjs-node')

class RealFundingDataSources {
  constructor() {
    this.grantsGovAPI = process.env.GRANTS_GOV_API_KEY
    this.newsAPI = process.env.NEWS_API_KEY
    this.foundationAPI = process.env.FOUNDATION_CENTER_API_KEY
    this.browser = null
    this.usePuppeteer = process.env.USE_PUPPETEER !== 'false' // Enable by default
  }

  async initBrowser() {
    if (!this.usePuppeteer || this.browser) return
    
    console.log('🚀 Launching browser for Foundation Directory scraping...')
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

  // =============================================
  // FOUNDATION DIRECTORY INTEGRATION
  // =============================================
  
  async getFoundationData() {
    // Foundation Directory API (Candid/Foundation Center)
    // Alternative: Use their public data exports or partner API
    
    try {
      // Initialize browser if using Puppeteer
      await this.initBrowser()
      
      // Option 1: Foundation Center API (if you have access)
      if (this.foundationAPI) {
        const response = await axios.get('https://fconline.foundationcenter.org/api/search', {
          headers: { 'Authorization': `Bearer ${this.foundationAPI}` },
          params: {
            'q': 'education OR stem OR technology',
            'size': 100,
            'sort': 'assets_desc'
          }
        })
        await this.closeBrowser()
        return this.processFoundationAPIData(response.data)
      }
      
      // Option 2: Scrape Foundation Directory Online (public data)
      const result = await this.scrapeFoundationDirectory()
      
      // Close browser
      await this.closeBrowser()
      
      return result
      
    } catch (error) {
      console.error('Foundation data fetch failed:', error)
      await this.closeBrowser()
      return this.getFallbackFoundationData()
    }
  }

  async scrapeFoundationDirectoryWithPuppeteer() {
    if (!this.browser) {
      await this.initBrowser()
    }

    if (!this.browser) {
      throw new Error('Browser not available')
    }

    console.log('🎭 Puppeteer: Scraping Foundation Directory...')
    const foundations = []
    
    try {
      const page = await this.browser.newPage()
      
      // Set user agent and viewport
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
      await page.setViewport({ width: 1920, height: 1080 })
      
      // Navigate to Foundation Directory Online
      const searchUrl = 'https://fconline.foundationcenter.org/search-results'
      await page.goto(searchUrl, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      })
      
      // Wait for search form to load
      await page.waitForSelector('input[name="keywords"], #search-input, .search-field', { timeout: 10000 }).catch(() => {
        console.log('Search form not found, trying alternative approach')
      })
      
      // Fill search form (if available)
      const searchInputSelector = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input[type="text"], input[type="search"]')
        for (const input of inputs) {
          if (input.name.includes('search') || input.name.includes('keyword') || input.placeholder.toLowerCase().includes('search')) {
            return input.name || input.id || 'input[type="text"]'
          }
        }
        return null
      })
      
      if (searchInputSelector) {
        console.log('✅ Found search input, entering keywords...')
        await page.type(searchInputSelector, 'education technology STEM')
        
        // Submit search
        await Promise.all([
          page.keyboard.press('Enter'),
          page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {})
        ])
        
        // Wait for results to load
        await page.waitForTimeout(3000)
      }
      
      // Extract foundation data
      const extractedFoundations = await page.evaluate(() => {
        const items = []
        
        // Try multiple result selectors
        const selectors = [
          '.foundation-result',
          '.search-result',
          '.foundation-item',
          '.result-item',
          '[data-foundation]',
          '.foundation-card'
        ]
        
        let resultElements = []
        for (const selector of selectors) {
          resultElements = document.querySelectorAll(selector)
          if (resultElements.length > 0) break
        }
        
        resultElements.forEach(element => {
          const nameElement = element.querySelector('.foundation-name, .name, h3, h4, .title')
          const assetsElement = element.querySelector('.assets, .total-assets, [data-assets]')
          const givingElement = element.querySelector('.giving, .annual-giving, [data-giving]')
          const locationElement = element.querySelector('.location, .address, .state')
          const focusElement = element.querySelector('.focus-areas, .interests, .areas')
          const einElement = element.querySelector('.ein, .tax-id, [data-ein]')
          
          const foundation = {
            name: nameElement?.textContent?.trim() || '',
            assets: assetsElement?.textContent?.trim() || '',
            giving_amount: givingElement?.textContent?.trim() || '',
            location: locationElement?.textContent?.trim() || '',
            focus_areas: focusElement?.textContent?.trim() || '',
            ein: einElement?.textContent?.trim() || ''
          }
          
          if (foundation.name) {
            items.push(foundation)
          }
        })
        
        return items
      })
      
      await page.close()
      console.log(`✅ Puppeteer extracted ${extractedFoundations.length} foundations`)
      
      // Process extracted foundations
      for (const foundation of extractedFoundations) {
        const processedFoundation = {
          name: foundation.name,
          assets: this.parseAssets(foundation.assets),
          giving_amount: this.parseGivingAmount(foundation.giving_amount),
          location: foundation.location,
          focus_areas: foundation.focus_areas ? foundation.focus_areas.split(',').map(area => area.trim()) : [],
          ein: foundation.ein,
          scraping_method: 'puppeteer'
        }
        
        if (processedFoundation.name && processedFoundation.assets > 1000000) { // $1M+ foundations
          foundations.push(processedFoundation)
        }
      }
      
      return foundations
      
    } catch (error) {
      console.error('❌ Puppeteer foundation scraping failed:', error.message)
      throw error
    }
  }

  async scrapeFoundationDirectory() {
    // Try Puppeteer first if enabled
    if (this.usePuppeteer) {
      try {
        const foundations = await this.scrapeFoundationDirectoryWithPuppeteer()
        return this.categorizeFoundations(foundations)
      } catch (error) {
        console.log('⚠️ Puppeteer failed for Foundation Directory, falling back to traditional method:', error.message)
        // Fall through to traditional method
      }
    }
    
    // Traditional Axios + Cheerio fallback
    console.log('📄 Traditional scraping: Foundation Directory')
    const foundations = []
    
    try {
      // Search for education foundations
      const searchUrl = 'https://fconline.foundationcenter.org/search-results'
      const response = await axios.get(searchUrl, {
        params: {
          'search_type': 'foundations',
          'keywords': 'education technology STEM',
          'location': 'United States'
        }
      })
      
      const $ = cheerio.load(response.data)
      
      $('.foundation-result').each((index, element) => {
        const foundation = {
          name: $(element).find('.foundation-name').text().trim(),
          assets: this.parseAssets($(element).find('.assets').text()),
          giving_amount: this.parseGivingAmount($(element).find('.giving').text()),
          location: $(element).find('.location').text().trim(),
          focus_areas: $(element).find('.focus-areas').text().split(',').map(area => area.trim()),
          ein: $(element).find('.ein').text().trim(),
          scraping_method: 'traditional'
        }
        
        if (foundation.name && foundation.assets > 1000000) { // $1M+ foundations
          foundations.push(foundation)
        }
      })
      
      console.log(`✅ Traditional method extracted ${foundations.length} foundations`)
      return this.categorizeFoundations(foundations)
      
    } catch (error) {
      console.error('Foundation scraping failed:', error)
      return this.getFallbackFoundationData()
    }
  }

  categorizeFoundations(foundations) {
    return {
      major_foundations: foundations.filter(f => f.assets > 100000000), // $100M+
      regional_foundations: foundations.filter(f => f.assets > 10000000 && f.assets <= 100000000), // $10M-$100M
      family_foundations: foundations.filter(f => f.assets <= 10000000), // Under $10M
      total_giving_capacity: foundations.reduce((sum, f) => sum + (f.giving_amount || f.assets * 0.05), 0),
      strategic_recommendations: this.generateFoundationStrategy(foundations)
    }
  }

  // =============================================
  // NEWS & POLICY API INTEGRATION
  // =============================================

  async getPolicyAndMarketIntelligence() {
    const intelligence = {
      policy_changes: await this.trackPolicyChanges(),
      budget_analysis: await this.analyzeFederalBudgets(),
      market_trends: await this.analyzeMarketTrends(),
      funding_forecasts: await this.generateFundingForecasts()
    }
    
    return this.synthesizePolicyIntelligence(intelligence)
  }

  async trackPolicyChanges() {
    try {
      // Option 1: News API for policy tracking
      const newsResponse = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          'apiKey': this.newsAPI,
          'q': 'education funding OR STEM grants OR federal budget education',
          'sources': 'reuters,associated-press,the-wall-street-journal',
          'sortBy': 'relevancy',
          'pageSize': 50,
          'from': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // Last 30 days
        }
      })

      // Option 2: Government RSS feeds
      const governmentFeeds = await this.scrapeGovernmentFeeds()
      
      return this.analyzePolicyImpact([
        ...newsResponse.data.articles,
        ...governmentFeeds
      ])
      
    } catch (error) {
      console.error('Policy tracking failed:', error)
      return this.getFallbackPolicyData()
    }
  }

  async scrapeGovernmentFeeds() {
    const feeds = [
      'https://www.ed.gov/news/press-releases/feed',
      'https://www.nsf.gov/news/news_rss.xml',
      'https://www.whitehouse.gov/briefing-room/statements-releases/feed',
      'https://www.nih.gov/news-events/news-releases/rss'
    ]
    
    const policyUpdates = []
    
    for (const feedUrl of feeds) {
      try {
        const response = await axios.get(feedUrl)
        const $ = cheerio.load(response.data, { xmlMode: true })
        
        $('item').each((index, element) => {
          const title = $(element).find('title').text()
          const description = $(element).find('description').text()
          const link = $(element).find('link').text()
          const pubDate = new Date($(element).find('pubDate').text())
          
          if (this.isFundingRelevant(title + ' ' + description)) {
            policyUpdates.push({
              title,
              description,
              link,
              source: this.extractSource(feedUrl),
              date: pubDate,
              relevance_score: this.calculateRelevanceScore(title, description)
            })
          }
        })
      } catch (error) {
        console.error(`Failed to fetch feed ${feedUrl}:`, error)
      }
    }
    
    return policyUpdates.sort((a, b) => b.relevance_score - a.relevance_score)
  }

  isFundingRelevant(text) {
    const fundingKeywords = [
      'grant', 'funding', 'budget', 'appropriation', 'investment',
      'education', 'STEM', 'research', 'innovation', 'technology',
      'NSF', 'NIH', 'Department of Education', 'EPA'
    ]
    
    return fundingKeywords.some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    )
  }

  // =============================================
  // MACHINE LEARNING MODELS
  // =============================================

  async buildSuccessPredictionModel() {
    // Build ML model for grant success prediction
    console.log('Training success prediction model...')
    
    try {
      // Load historical grant data
      const historicalData = await this.getHistoricalGrantData()
      
      // Prepare training data
      const trainingData = this.prepareTrainingData(historicalData)
      
      // Create TensorFlow model
      const model = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [trainingData.features[0].length],
            units: 64,
            activation: 'relu'
          }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({ units: 32, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 16, activation: 'relu' }),
          tf.layers.dense({ units: 1, activation: 'sigmoid' }) // Success probability 0-1
        ]
      })
      
      model.compile({
        optimizer: 'adam',
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      })
      
      // Convert to tensors
      const xs = tf.tensor2d(trainingData.features)
      const ys = tf.tensor2d(trainingData.labels, [trainingData.labels.length, 1])
      
      // Train model
      await model.fit(xs, ys, {
        epochs: 100,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0) {
              console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}`)
            }
          }
        }
      })
      
      // Save model
      await model.save('file://./models/success_prediction_model')
      
      xs.dispose()
      ys.dispose()
      
      return model
      
    } catch (error) {
      console.error('ML model training failed:', error)
      return null
    }
  }

  prepareTrainingData(historicalData) {
    const features = []
    const labels = []
    
    historicalData.forEach(grant => {
      // Feature engineering
      const feature = [
        grant.organization_age / 100, // Normalize organization age
        grant.previous_grants_count / 50, // Normalize previous grants
        grant.budget_requested / 1000000, // Normalize to millions
        grant.team_size / 20, // Normalize team size
        grant.match_score / 100, // Normalize match score
        grant.agency_priority_score / 100, // Normalize priority score
        grant.application_quality_score / 100, // Normalize quality score
        grant.partnership_strength / 10, // Normalize partnership score
        grant.evaluation_capacity / 10, // Normalize evaluation capacity
        grant.timeline_feasibility / 10, // Normalize timeline score
        this.encodeAgency(grant.agency), // One-hot encode agency
        this.encodeGrantType(grant.grant_type), // One-hot encode grant type
        this.encodeApplicationMonth(grant.application_month) // Seasonal encoding
      ].flat()
      
      features.push(feature)
      labels.push(grant.was_successful ? 1 : 0)
    })
    
    return { features, labels }
  }

  async predictGrantSuccess(opportunity, organizationProfile) {
    try {
      // Load trained model
      const model = await tf.loadLayersModel('file://./models/success_prediction_model')
      
      // Prepare features for prediction
      const features = this.prepareOpportunityFeatures(opportunity, organizationProfile)
      const prediction = model.predict(tf.tensor2d([features]))
      
      const successProbability = await prediction.data()
      prediction.dispose()
      
      return {
        success_probability: Math.round(successProbability[0] * 100),
        confidence_level: this.calculatePredictionConfidence(features),
        key_factors: this.identifyKeySuccessFactors(features, opportunity),
        recommendations: this.generateMLRecommendations(features, successProbability[0])
      }
      
    } catch (error) {
      console.error('ML prediction failed:', error)
      return this.getFallbackPrediction(opportunity, organizationProfile)
    }
  }

  prepareOpportunityFeatures(opportunity, orgProfile) {
    return [
      orgProfile.age / 100,
      orgProfile.previous_grants / 50,
      opportunity.budget / 1000000,
      orgProfile.team_size / 20,
      opportunity.match_score / 100,
      opportunity.agency_priority / 100,
      orgProfile.application_quality / 100,
      orgProfile.partnerships / 10,
      orgProfile.evaluation_capacity / 10,
      opportunity.timeline_feasibility / 10,
      this.encodeAgency(opportunity.agency),
      this.encodeGrantType(opportunity.type),
      this.encodeApplicationMonth(new Date().getMonth() + 1)
    ].flat()
  }

  // =============================================
  // REAL GRANTS.GOV INTEGRATION
  // =============================================

  async getGrantsGovOpportunities() {
    try {
      // Use your existing Grants.gov API access
      const response = await axios.get('https://www.grants.gov/web/grants/search-grants.html', {
        headers: {
          'Authorization': `Bearer ${this.grantsGovAPI}`
        },
        params: {
          'format': 'json',
          'rows': 100,
          'keyword': 'education OR STEM OR technology',
          'eligibility': 'nonprofit',
          'status': 'open'
        }
      })
      
      return this.processGrantsGovData(response.data)
      
    } catch (error) {
      console.error('Grants.gov API failed:', error)
      return this.getFallbackGrantsData()
    }
  }

  processGrantsGovData(rawData) {
    return rawData.opportunities?.map(grant => ({
      id: grant.opportunityId,
      title: grant.opportunityTitle,
      agency: grant.agencyCode,
      description: grant.description,
      eligibility: grant.eligibilityCode,
      funding_amount: this.parseGrantAmount(grant.award),
      deadline: new Date(grant.closeDate),
      cfda_number: grant.cfdaNumber,
      match_score: this.calculateRealMatchScore(grant),
      ai_analysis: this.generateRealAIAnalysis(grant),
      strategic_value: this.assessStrategicValue(grant),
      success_prediction: null // Will be filled by ML model
    })) || []
  }

  calculateRealMatchScore(grant) {
    // Real match scoring based on organization profile
    let score = 0
    
    // Keyword matching
    const orgKeywords = ['education', 'STEM', 'technology', 'innovation']
    const grantText = (grant.opportunityTitle + ' ' + grant.description).toLowerCase()
    
    orgKeywords.forEach(keyword => {
      if (grantText.includes(keyword)) score += 20
    })
    
    // Agency alignment
    const preferredAgencies = ['ED', 'NSF', 'NIH']
    if (preferredAgencies.includes(grant.agencyCode)) score += 15
    
    // Funding amount alignment
    const fundingAmount = this.parseGrantAmount(grant.award)
    if (fundingAmount >= 100000 && fundingAmount <= 2000000) score += 15
    
    return Math.min(score, 100)
  }

  // =============================================
  // UTILITY FUNCTIONS
  // =============================================

  parseGrantAmount(awardString) {
    if (!awardString) return 0
    
    const numbers = awardString.match(/[\d,]+/g)
    if (!numbers) return 0
    
    return parseInt(numbers[0].replace(/,/g, ''))
  }

  encodeAgency(agency) {
    const agencies = ['NSF', 'ED', 'NIH', 'EPA', 'DOD', 'NASA', 'OTHER']
    return agencies.map(a => a === agency ? 1 : 0)
  }

  encodeGrantType(type) {
    const types = ['research', 'education', 'training', 'infrastructure', 'other']
    return types.map(t => t === type ? 1 : 0)
  }

  encodeApplicationMonth(month) {
    // Seasonal encoding using sine/cosine
    return [
      Math.sin(2 * Math.PI * month / 12),
      Math.cos(2 * Math.PI * month / 12)
    ]
  }

  calculateRelevanceScore(title, description) {
    const fundingKeywords = [
      { word: 'education', weight: 3 },
      { word: 'STEM', weight: 4 },
      { word: 'grant', weight: 5 },
      { word: 'funding', weight: 5 },
      { word: 'budget increase', weight: 4 },
      { word: 'appropriation', weight: 3 }
    ]
    
    let score = 0
    const text = (title + ' ' + description).toLowerCase()
    
    fundingKeywords.forEach(({ word, weight }) => {
      if (text.includes(word.toLowerCase())) {
        score += weight
      }
    })
    
    return score
  }

  async getHistoricalGrantData() {
    // Get historical grant data from your database or external sources
    if (supabase) {
      const { data } = await supabase
        .from('historical_grants')
        .select('*')
        .limit(1000)
      
      return data || []
    }
    
    return this.generateSyntheticTrainingData()
  }

  generateSyntheticTrainingData() {
    // Generate synthetic training data for ML model development
    const syntheticData = []
    
    for (let i = 0; i < 500; i++) {
      syntheticData.push({
        organization_age: Math.random() * 50 + 1,
        previous_grants_count: Math.floor(Math.random() * 20),
        budget_requested: Math.random() * 2000000 + 100000,
        team_size: Math.floor(Math.random() * 15) + 3,
        match_score: Math.random() * 100,
        agency_priority_score: Math.random() * 100,
        application_quality_score: Math.random() * 100,
        partnership_strength: Math.random() * 10,
        evaluation_capacity: Math.random() * 10,
        timeline_feasibility: Math.random() * 10,
        agency: ['NSF', 'ED', 'NIH', 'EPA'][Math.floor(Math.random() * 4)],
        grant_type: ['research', 'education', 'training'][Math.floor(Math.random() * 3)],
        application_month: Math.floor(Math.random() * 12) + 1,
        was_successful: Math.random() > 0.7 // 30% success rate
      })
    }
    
    return syntheticData
  }
}

module.exports = { RealFundingDataSources }