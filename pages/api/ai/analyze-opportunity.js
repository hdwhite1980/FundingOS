import { resolveApiUrl } from '../../../lib/apiUrlUtils'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { userProfile, project, opportunity } = req.body

    if (!project || !opportunity) {
      return res.status(400).json({ message: 'Missing required data: project and opportunity are required' })
    }

    // Call the enhanced-scoring API with ai-analysis action for detailed analysis
    const analysisResponse = await fetch(resolveApiUrl('/api/ai/enhanced-scoring'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        opportunity,
        project,
        userProfile,
        action: 'ai-analysis' // Use ai-analysis action for detailed analysis
      })
    })

    if (!analysisResponse.ok) {
      const errorData = await analysisResponse.json()
      throw new Error(errorData.error || `Enhanced scoring API failed with status: ${analysisResponse.status}`)
    }

    const analysisResult = await analysisResponse.json()

    // Return the data in the format expected by AIAnalysisModal
    res.status(200).json(analysisResult.data || analysisResult)
    
  } catch (error) {
    console.error('AI Analysis API error:', error)
    res.status(500).json({ 
      message: 'Analysis failed',
      error: error.message 
    })
  }
}