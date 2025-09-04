import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export class AIService {
  static async analyzeOpportunityFit(userProfile, project, opportunity) {
    const prompt = `
You are a grant writing expert analyzing the fit between a project and funding opportunity.

USER PROFILE:
- Organization: ${userProfile.organization_name}
- Type: ${userProfile.organization_type}
- Location: ${userProfile.city}, ${userProfile.state}
- Years in Operation: ${userProfile.years_in_operation || 'Not specified'}
- Annual Revenue: ${userProfile.annual_revenue ? '$' + userProfile.annual_revenue.toLocaleString() : 'Not specified'}
- Employee Count: ${userProfile.employee_count || 'Not specified'}
- Minority Owned: ${userProfile.minority_owned ? 'Yes' : 'No'}
- Woman Owned: ${userProfile.woman_owned ? 'Yes' : 'No'}
- Veteran Owned: ${userProfile.veteran_owned ? 'Yes' : 'No'}
- Small Business: ${userProfile.small_business ? 'Yes' : 'No'}
- DUNS: ${userProfile.duns_number || 'Not provided'}

PROJECT:
- Name: ${project.name}
- Description: ${project.description || 'No description provided'}
- Type: ${project.project_type}
- Location: ${project.location}
- Funding Needed: $${project.funding_needed?.toLocaleString()}
- Timeline: ${project.timeline || 'Not specified'}
- Expected Jobs: ${project.expected_jobs_created || 'Not specified'}
- Community Benefit: ${project.community_benefit || 'Not specified'}
- Industry: ${project.industry || 'Not specified'}

FUNDING OPPORTUNITY:
- Source: ${opportunity.source || 'Unknown'}
- Title: ${opportunity.title}
- Sponsor: ${opportunity.sponsor}
- Agency: ${opportunity.agency || opportunity.sponsor}
- Description: ${opportunity.description || 'No description available'}
- Amount Range: ${opportunity.amount_min && opportunity.amount_max ? `$${opportunity.amount_min?.toLocaleString()} - $${opportunity.amount_max?.toLocaleString()}` : 'Amount varies'}
- Match Required: ${opportunity.match_requirement_percentage || 0}%
- Deadline: ${opportunity.deadline_date || 'Rolling deadline'}
- Deadline Type: ${opportunity.deadline_type}
- Eligibility: ${opportunity.eligibility_criteria?.join(', ') || 'General eligibility'}
- Project Types: ${opportunity.project_types?.join(', ') || 'Various'}
- Organization Types: ${opportunity.organization_types?.join(', ') || 'Various'}
- CFDA Number: ${opportunity.cfda_number || 'Not applicable'}
- Geographic Scope: ${opportunity.geography?.join(', ') || 'Not specified'}
- Special Requirements: ${opportunity.small_business_only ? 'Small business only' : 'No special requirements'}

Based on this information, provide a comprehensive analysis. Consider:
- Alignment between project type and funding focus areas
- Organization eligibility and certification advantages
- Financial fit (funding amount vs. project needs)
- Geographic eligibility
- Competition level and success factors
- Timeline considerations
- Match requirement feasibility

Format your response as valid JSON with these exact keys:
{
  "fitScore": [number 0-100],
  "strengths": [array of specific strength strings],
  "challenges": [array of specific challenge strings], 
  "recommendations": [array of specific actionable recommendation strings],
  "nextSteps": [array of specific next step strings]
}
    `

    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured')
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      })

      let analysisText = response.choices[0].message.content.trim()
      
      // Clean up response to ensure valid JSON
      if (analysisText.startsWith('```json')) {
        analysisText = analysisText.replace(/```json\n/, '').replace(/\n```$/, '')
      }

      const analysis = JSON.parse(analysisText)
      
      // Validate required fields
      if (!analysis.fitScore || !analysis.strengths || !analysis.challenges || !analysis.recommendations || !analysis.nextSteps) {
        throw new Error('Invalid analysis response structure')
      }

      return analysis
    } catch (error) {
      console.error('AI Analysis Error:', error)
      throw new Error('Failed to analyze opportunity fit: ' + error.message)
    }
  }

  static async generateApplicationDraft(userProfile, project, opportunity, analysis) {
    const prompt = `
You are an expert grant writer helping prepare an application draft.

Using the following information, create a comprehensive application draft:

USER PROFILE:
- Organization: ${userProfile.organization_name}
- Type: ${userProfile.organization_type}
- Location: ${userProfile.city}, ${userProfile.state}
- Years in Operation: ${userProfile.years_in_operation || 'Not specified'}
- Tax ID: ${userProfile.tax_id || 'Not provided'}
- DUNS: ${userProfile.duns_number || 'Not provided'}

PROJECT:
- Name: ${project.name}
- Description: ${project.description || 'No description provided'}
- Type: ${project.project_type}
- Location: ${project.location}
- Funding Needed: $${project.funding_needed?.toLocaleString()}
- Timeline: ${project.timeline || 'Not specified'}
- Expected Jobs: ${project.expected_jobs_created || 'Not specified'}
- Community Benefit: ${project.community_benefit || 'Not specified'}
- Environmental Impact: ${project.environmental_impact || 'Not specified'}

OPPORTUNITY:
- Title: ${opportunity.title}
- Sponsor: ${opportunity.sponsor}
- Amount Range: ${opportunity.amount_min && opportunity.amount_max ? `$${opportunity.amount_min?.toLocaleString()} - $${opportunity.amount_max?.toLocaleString()}` : 'Amount varies'}
- Match Required: ${opportunity.match_requirement_percentage || 0}%
- Required Documents: ${opportunity.required_documents?.join(', ') || 'Standard application materials'}

AI ANALYSIS INSIGHTS:
${JSON.stringify(analysis)}

Create a professional application draft including:
1. Executive Summary
2. Project Description 
3. Statement of Need
4. Goals and Objectives
5. Methodology/Approach
6. Timeline
7. Budget Summary
8. Organizational Capacity
9. Evaluation Plan
10. Sustainability Plan

Make it specific to this opportunity and compelling. Use professional grant writing language.
    `

    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured')
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 3000
      })

      return response.choices[0].message.content
    } catch (error) {
      console.error('AI Draft Generation Error:', error)
      throw new Error('Failed to generate application draft: ' + error.message)
    }
  }

  static async improveApplicationSection(currentSection, sectionType, feedback, opportunity) {
    const prompt = `
You are an expert grant writer helping improve a specific section of a grant application.

SECTION TYPE: ${sectionType}
OPPORTUNITY: ${opportunity.title} - ${opportunity.sponsor}

CURRENT SECTION:
${currentSection}

IMPROVEMENT FEEDBACK:
${feedback}

Please rewrite this section to address the feedback and make it more compelling and aligned with the funding opportunity requirements. Keep the same general structure but improve clarity, impact, and persuasiveness.
    `

    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured')
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 1500
      })

      return response.choices[0].message.content
    } catch (error) {
      console.error('AI Section Improvement Error:', error)
      throw new Error('Failed to improve application section: ' + error.message)
    }
  }

  static async findMatchingOpportunities(userProfile, project) {
    // This would typically involve vector embeddings and semantic search
    // For MVP, we'll use keyword matching and filters
    
    const filters = {
      projectTypes: [project.project_type],
      organizationType: userProfile.organization_type,
      amountMin: project.funding_needed * 0.5, // Look for opportunities that cover at least 50% of need
      amountMax: project.funding_needed * 2    // Up to 2x the need
    }

    // In a real implementation, this would query a vector database
    // For now, return the filters for the opportunity service
    return filters
  }
}