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

  static async determineProjectCategories(project, userProfile) {
    const prompt = `
You are an expert in federal grant categorization. Analyze this project and determine the most relevant federal funding categories and search strategies.

PROJECT DETAILS:
- Name: ${project.name}
- Description: ${project.description || 'No description provided'}
- Type: ${project.project_type}
- Location: ${project.location}
- Industry: ${project.industry || 'Not specified'}
- Funding Needed: $${project.funding_needed?.toLocaleString()}
- Timeline: ${project.timeline || 'Not specified'}
- Target Population: ${project.target_population || 'Not specified'}
- Community Benefit: ${project.community_benefit || 'Not specified'}
- Environmental Impact: ${project.environmental_impact || 'Not specified'}
- Expected Jobs: ${project.expected_jobs_created || 'Not specified'}

ORGANIZATION PROFILE:
- Type: ${userProfile?.organization_type}
- Industry: ${userProfile?.industry || 'Not specified'}
- Small Business: ${userProfile?.small_business ? 'Yes' : 'No'}
- Minority Owned: ${userProfile?.minority_owned ? 'Yes' : 'No'}
- Woman Owned: ${userProfile?.woman_owned ? 'Yes' : 'No'}
- Veteran Owned: ${userProfile?.veteran_owned ? 'Yes' : 'No'}

FEDERAL FUNDING CATEGORIES AVAILABLE:
- AG: Agriculture
- AR: Arts
- BC: Business and Commerce  
- CD: Community Development
- CP: Consumer Protection
- DPR: Disaster Prevention and Relief
- ED: Education
- ELT: Employment, Labor, and Training
- EN: Energy
- ENV: Environment
- FN: Food and Nutrition
- HL: Health
- HO: Housing
- HU: Humanities
- IS: Information and Statistics
- LJL: Law, Justice, and Legal Services
- NR: Natural Resources
- RD: Regional Development
- ST: Science and Technology
- T: Transportation

Based on this project, provide a strategic funding search plan.

Return your response as valid JSON with this exact structure:
{
  "primary_categories": ["category_code1", "category_code2"],
  "secondary_categories": ["category_code3", "category_code4"],
  "priority_agencies": ["AGENCY1", "AGENCY2", "AGENCY3"],
  "search_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "funding_instruments": ["grant", "cooperative_agreement", "loan"],
  "geographic_scope": ["local", "state", "regional", "national"],
  "reasoning": "Brief explanation of why these categories were selected",
  "estimated_competition_level": "low|medium|high",
  "recommended_timing": "immediate|within_3_months|within_6_months|next_fiscal_year"
}
    `

    try {
      if (!process.env.OPENAI_API_KEY) {
        // Fallback logic if no AI available
        return this.getFallbackCategories(project, userProfile)
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1500
      })

      let categoriesText = response.choices[0].message.content.trim()
      
      // Clean up response to ensure valid JSON
      if (categoriesText.startsWith('```json')) {
        categoriesText = categoriesText.replace(/```json\n/, '').replace(/\n```$/, '')
      }

      const categories = JSON.parse(categoriesText)
      
      // Validate required fields
      if (!categories.primary_categories || !categories.search_keywords) {
        throw new Error('Invalid categorization response structure')
      }

      return categories
    } catch (error) {
      console.error('AI Categorization Error:', error)
      // Fallback to rule-based categorization
      return this.getFallbackCategories(project, userProfile)
    }
  }

  static getFallbackCategories(project, userProfile) {
    const categories = {
      primary_categories: [],
      secondary_categories: [],
      priority_agencies: [],
      search_keywords: [],
      funding_instruments: ["grant"],
      geographic_scope: ["national"],
      reasoning: "Rule-based categorization due to AI unavailability",
      estimated_competition_level: "medium",
      recommended_timing: "immediate"
    }

    // Rule-based mapping based on project type
    const projectTypeMapping = {
      'community_development': {
        primary: ['CD', 'HO'],
        secondary: ['RD', 'ELT'],
        agencies: ['HUD', 'USDA', 'EDA'],
        keywords: ['community development', 'housing', 'revitalization', 'neighborhood', 'urban']
      },
      'infrastructure': {
        primary: ['T', 'CD', 'EN'],
        secondary: ['ENV', 'NR'],
        agencies: ['DOT', 'EPA', 'USDA', 'DOE'],
        keywords: ['infrastructure', 'transportation', 'public works', 'utilities', 'construction']
      },
      'healthcare': {
        primary: ['HL'],
        secondary: ['CD', 'FN'],
        agencies: ['HHS', 'CDC', 'HRSA'],
        keywords: ['health', 'medical', 'healthcare', 'wellness', 'clinic']
      },
      'education': {
        primary: ['ED'],
        secondary: ['ELT', 'ST'],
        agencies: ['ED', 'NSF'],
        keywords: ['education', 'training', 'workforce', 'school', 'learning']
      },
      'environmental': {
        primary: ['ENV', 'EN'],
        secondary: ['AG', 'NR'],
        agencies: ['EPA', 'USDA', 'DOE', 'NOAA'],
        keywords: ['environment', 'energy', 'sustainability', 'clean', 'green']
      },
      'technology': {
        primary: ['ST'],
        secondary: ['BC', 'ED'],
        agencies: ['NSF', 'DOD', 'NIST', 'SBA'],
        keywords: ['technology', 'innovation', 'research', 'digital', 'tech']
      },
      'research': {
        primary: ['ST', 'HL'],
        secondary: ['ED', 'AG'],
        agencies: ['NSF', 'NIH', 'DOD'],
        keywords: ['research', 'innovation', 'development', 'study', 'science']
      },
      'nonprofit_program': {
        primary: ['CD', 'HL'],
        secondary: ['ED', 'HU'],
        agencies: ['HHS', 'HUD', 'CNCS'],
        keywords: ['nonprofit', 'community', 'services', 'social', 'program']
      },
      'small_business': {
        primary: ['BC'],
        secondary: ['ST', 'ELT'],
        agencies: ['SBA', 'MBDA', 'EDA'],
        keywords: ['small business', 'entrepreneur', 'commercial', 'business', 'startup']
      },
      'commercial_development': {
        primary: ['BC', 'RD'],
        secondary: ['CD', 'ELT'],
        agencies: ['EDA', 'SBA', 'USDA'],
        keywords: ['commercial', 'development', 'business', 'economic', 'revitalization']
      },
      'residential_development': {
        primary: ['HO', 'CD'],
        secondary: ['RD'],
        agencies: ['HUD', 'USDA'],
        keywords: ['housing', 'residential', 'homes', 'affordable', 'development']
      },
      'agriculture': {
        primary: ['AG'],
        secondary: ['ENV', 'RD'],
        agencies: ['USDA', 'EPA'],
        keywords: ['agriculture', 'farming', 'rural', 'food', 'agricultural']
      }
    }

    const mapping = projectTypeMapping[project.project_type] || {
      primary: ['CD'],
      secondary: ['BC'],
      agencies: ['HUD', 'SBA'],
      keywords: ['general', 'community', 'development']
    }

    categories.primary_categories = mapping.primary
    categories.secondary_categories = mapping.secondary || []
    categories.priority_agencies = mapping.agencies
    categories.search_keywords = [...mapping.keywords]

    // Add industry-specific keywords
    if (project.industry) {
      categories.search_keywords.push(project.industry.toLowerCase())
    }

    // Add location-based keywords
    if (project.location) {
      const locationParts = project.location.split(',')
      if (locationParts.length > 1) {
        const state = locationParts[1].trim().toLowerCase()
        categories.search_keywords.push(state)
        categories.geographic_scope = ['state', 'national']
      }
    }

    // Add organization-specific advantages
    if (userProfile?.small_business) {
      categories.priority_agencies.push('SBA')
      categories.search_keywords.push('small business')
    }

    if (userProfile?.minority_owned) {
      categories.priority_agencies.push('MBDA')
      categories.search_keywords.push('minority business', 'disadvantaged')
    }

    if (userProfile?.woman_owned) {
      categories.search_keywords.push('women owned', 'women business')
    }

    if (userProfile?.veteran_owned) {
      categories.search_keywords.push('veteran owned', 'veteran business')
    }

    // Funding amount considerations
    if (project.funding_needed) {
      if (project.funding_needed >= 1000000) {
        categories.estimated_competition_level = "high"
        categories.recommended_timing = "within_6_months"
      } else if (project.funding_needed <= 100000) {
        categories.estimated_competition_level = "low"
        categories.recommended_timing = "immediate"
      }
    }

    return categories
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