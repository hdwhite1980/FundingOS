import ScoringServiceIntegration from '../../../lib/scoringServiceIntegration'

const scoringService = new ScoringServiceIntegration()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { userProfile, project, opportunity } = req.body

    if (!userProfile || !project || !opportunity) {
      return res.status(400).json({ message: 'Missing required data' })
    }

    const analysis = await scoringService.scoreOpportunity(
      opportunity,
      project,
      userProfile
    )

    res.status(200).json(analysis)
  } catch (error) {
    console.error('AI Analysis API error:', error)
    res.status(500).json({ 
      message: 'Analysis failed',
      error: error.message 
    })
  }
}