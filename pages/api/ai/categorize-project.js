import { AIService } from '../../../lib/aiService'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { project, userProfile } = req.body

    if (!project) {
      return res.status(400).json({ message: 'Project data required' })
    }

    const categories = await AIService.determineProjectCategories(project, userProfile)
    
    res.status(200).json(categories)
  } catch (error) {
    console.error('AI Project Categorization error:', error)
    res.status(500).json({ 
      message: 'Categorization failed',
      error: error.message 
    })
  }
}