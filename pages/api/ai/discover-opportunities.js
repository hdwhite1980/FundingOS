// pages/api/ai/discover-opportunities.js
// AI-Powered Opportunity Discovery API Endpoint

import AIEnhancedOpportunityDiscovery from '../../../lib/ai-enhanced-opportunity-discovery'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      userId,
      searchQuery,
      projectType,
      organizationType,
      userProjects = [],
      searchDepth = 'comprehensive'
    } = req.body

    // Validate required parameters
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    if (!searchQuery) {
      return res.status(400).json({ error: 'Search query is required' })
    }

    console.log(`🚀 Starting AI-enhanced opportunity discovery for user ${userId}`)
    console.log(`📝 Search query: "${searchQuery}"`)
    console.log(`🏢 Organization type: ${organizationType}`)
    console.log(`📊 Project type: ${projectType}`)
    console.log(`📁 User projects: ${userProjects.length}`)

    // Initialize the AI-enhanced discovery system
    const discoverySystem = new AIEnhancedOpportunityDiscovery()

    // Perform comprehensive opportunity discovery and analysis
    const results = await discoverySystem.discoverAndAnalyzeOpportunities({
      userId,
      searchQuery,
      projectType,
      organizationType,
      userProjects,
      searchDepth
    })

    // Log successful completion
    console.log(`✅ Discovery complete for user ${userId}:`)
    console.log(`   - Opportunities found: ${results.opportunitiesFound}`)
    console.log(`   - Analysis complete: ${results.analysisComplete}`)

    return res.status(200).json({
      success: true,
      message: `Found and analyzed ${results.opportunitiesFound} opportunities`,
      ...results,
      requestInfo: {
        userId,
        searchQuery,
        projectType,
        organizationType,
        userProjectsCount: userProjects.length,
        searchDepth,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ AI opportunity discovery error:', error)
    
    return res.status(500).json({
      success: false,
      error: 'Failed to discover and analyze opportunities',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

// Configuration for larger payloads (needed for extensive project data)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
}