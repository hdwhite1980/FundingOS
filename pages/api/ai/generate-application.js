// pages/api/ai/generate-application.js

import { AIService } from '../../../lib/aiService'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { userProfile, project, opportunity, analysis } = req.body

    if (!userProfile || !project || !opportunity) {
      return res.status(400).json({ message: 'Missing required data' })
    }

    // Enhance opportunity with detailed information if URL is available
    let enhancedOpportunity = opportunity
    
    if (opportunity.source_url) {
      try {
        console.log('Fetching detailed opportunity information...')
        
        // Call our scraping API to get detailed information
        const scrapeResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/scrape/opportunity-details`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: opportunity.source_url,
            opportunityId: opportunity.external_id
          })
        })

        if (scrapeResponse.ok) {
          const scrapedData = await scrapeResponse.json()
          if (scrapedData.success && scrapedData.data) {
            enhancedOpportunity = {
              ...opportunity,
              detailed_synopsis: scrapedData.data.synopsis || opportunity.description,
              detailed_eligibility: scrapedData.data.eligibility,
              detailed_requirements: scrapedData.data.requirements,
              application_process: scrapedData.data.applicationProcess || opportunity.application_process,
              funding_details: scrapedData.data.fundingDetails,
              deadline_details: scrapedData.data.deadline,
              contact_info: scrapedData.data.contactInfo,
              additional_info: scrapedData.data.additionalInfo
            }
            console.log('Enhanced opportunity with scraped data')
          }
        }
      } catch (scrapeError) {
        console.warn('Failed to scrape opportunity details, proceeding with basic data:', scrapeError.message)
      }
    }

    // Generate application using enhanced data
    const applicationDraft = await AIService.generateApplicationDraft(
      userProfile,
      project,
      enhancedOpportunity, // Use enhanced opportunity data
      analysis
    )

    res.status(200).json({ 
      content: applicationDraft,
      enhanced: enhancedOpportunity !== opportunity, // Indicate if we used enhanced data
      source_url: opportunity.source_url
    })
    
  } catch (error) {
    console.error('AI Application Generation API error:', error)
    res.status(500).json({ 
      message: 'Application generation failed',
      error: error.message 
    })
  }
}