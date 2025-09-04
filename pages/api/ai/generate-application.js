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

    const applicationDraft = await AIService.generateApplicationDraft(
      userProfile,
      project,
      opportunity,
      analysis
    )

    res.status(200).json({ content: applicationDraft })
  } catch (error) {
    console.error('AI Application Generation API error:', error)
    res.status(500).json({ 
      message: 'Application generation failed',
      error: error.message 
    })
  }
}