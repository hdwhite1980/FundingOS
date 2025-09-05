import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export class AIService {
  // Enhanced method to fetch opportunity details from various sources
  static async fetchOpportunityDetails(opportunity) {
    try {
      let detailedData = { ...opportunity }
      
      // If we have a source URL, try to fetch more details
      if (opportunity.source_url) {
        if (opportunity.source_url.includes('grants.gov')) {
          detailedData = await this.fetchGrantsGovDetails(opportunity)
        } else if (opportunity.source_url.includes('sam.gov')) {
          detailedData = await this.fetchSamGovDetails(opportunity)
        }
      }
      
      return detailedData
    } catch (error) {
      console.error('Error fetching opportunity details:', error)
      return opportunity // Return original if fetch fails
    }
  }

  static async fetchGrantsGovDetails(opportunity) {
    try {
      // Use our internal scraping API to get detailed information
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const response = await fetch(`${baseUrl}/api/scrape/opportunity-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: opportunity.source_url,
          opportunityId: opportunity.external_id
        })
      })

      if (response.ok) {
        const scrapedData = await response.json()
        if (scrapedData.success && scrapedData.data) {
          return {
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
        }
      }
      
      return opportunity
    } catch (error) {
      console.error('Error fetching Grants.gov details:', error)
      return opportunity
    }
  }

  static async fetchSamGovDetails(opportunity) {
    // Similar implementation for SAM.gov URLs
    return opportunity
  }

  // Enhanced opportunity analysis with detailed data
  static async analyzeOpportunityFit(userProfile, project, opportunity) {
    // First, fetch detailed opportunity information
    const detailedOpportunity = await this.fetchOpportunityDetails(opportunity)

    const prompt = `
You are a grant writing expert analyzing the fit between a project and funding opportunity using comprehensive opportunity details.

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

FUNDING OPPORTUNITY (ENHANCED):
- Source: ${detailedOpportunity.source || 'Unknown'}
- Title: ${detailedOpportunity.title}
- Sponsor: ${detailedOpportunity.sponsor}
- Agency: ${detailedOpportunity.agency || detailedOpportunity.sponsor}
- Description: ${detailedOpportunity.description || 'No description available'}
- Detailed Synopsis: ${detailedOpportunity.detailed_synopsis || 'Not available'}
- Amount Range: ${detailedOpportunity.amount_min && detailedOpportunity.amount_max ? `$${detailedOpportunity.amount_min?.toLocaleString()} - $${detailedOpportunity.amount_max?.toLocaleString()}` : 'Amount varies'}
- Match Required: ${detailedOpportunity.match_requirement_percentage || 0}%
- Deadline: ${detailedOpportunity.deadline_date || 'Rolling deadline'}
- Deadline Type: ${detailedOpportunity.deadline_type}
- Eligibility: ${detailedOpportunity.eligibility_criteria?.join(', ') || 'General eligibility'}
- Detailed Eligibility: ${detailedOpportunity.detailed_eligibility || 'Standard requirements'}
- Project Types: ${detailedOpportunity.project_types?.join(', ') || 'Various'}
- Organization Types: ${detailedOpportunity.organization_types?.join(', ') || 'Various'}
- CFDA Number: ${detailedOpportunity.cfda_number || 'Not applicable'}
- Geographic Scope: ${detailedOpportunity.geography?.join(', ') || 'Not specified'}
- Special Requirements: ${detailedOpportunity.small_business_only ? 'Small business only' : 'No special requirements'}
- Application Requirements: ${detailedOpportunity.detailed_requirements || 'Standard application process'}
- Funding Details: ${detailedOpportunity.funding_details || 'See opportunity description'}
- Contact Information: ${detailedOpportunity.contact_info || 'See opportunity listing'}

Based on this comprehensive information, provide an enhanced analysis considering:
- Specific alignment with detailed opportunity requirements
- Competition level based on award numbers and funding amounts
- Detailed eligibility compliance
- Cost-sharing feasibility
- Application complexity and requirements
- Alignment between project type and funding focus areas
- Organization eligibility and certification advantages
- Financial fit (funding amount vs. project needs)
- Geographic eligibility
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
        max_tokens: 2500
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

  // Enhanced application generation with detailed opportunity data
  static async generateApplicationDraft(userProfile, project, opportunity, analysis) {
    // First, fetch detailed opportunity information
    const detailedOpportunity = await this.fetchOpportunityDetails(opportunity)

    const prompt = `
You are an expert grant writer creating a compelling application draft. Use ALL the detailed information provided to create a highly specific and tailored application.

USER PROFILE:
- Organization: ${userProfile.organization_name}
- Type: ${userProfile.organization_type}
- Location: ${userProfile.city}, ${userProfile.state}
- Years in Operation: ${userProfile.years_in_operation || 'Not specified'}
- Annual Revenue: ${userProfile.annual_revenue ? '$' + userProfile.annual_revenue.toLocaleString() : 'Not specified'}
- Employee Count: ${userProfile.employee_count || 'Not specified'}
- Tax ID: ${userProfile.tax_id || 'Not provided'}
- DUNS: ${userProfile.duns_number || 'Not provided'}
- Certifications: ${this.formatCertifications(userProfile)}

PROJECT DETAILS:
- Name: ${project.name}
- Description: ${project.description || 'No description provided'}
- Type: ${project.project_type}
- Location: ${project.location}
- Funding Needed: $${project.funding_needed?.toLocaleString()}
- Timeline: ${project.timeline || 'Not specified'}
- Expected Jobs: ${project.expected_jobs_created || 'Not specified'}
- Community Benefit: ${project.community_benefit || 'Not specified'}
- Environmental Impact: ${project.environmental_impact || 'Not specified'}
- Target Population: ${project.target_population || 'Not specified'}
- Industry: ${project.industry || 'Not specified'}

DETAILED FUNDING OPPORTUNITY:
- Title: ${detailedOpportunity.title}
- Sponsor/Agency: ${detailedOpportunity.sponsor} / ${detailedOpportunity.agency}
- CFDA Number: ${detailedOpportunity.cfda_number || 'Not specified'}
- Amount Range: ${this.formatAmountRange(detailedOpportunity)}
- Match Required: ${detailedOpportunity.match_requirement_percentage || 0}%
- Deadline: ${detailedOpportunity.deadline_date || 'Rolling deadline'}

DETAILED OPPORTUNITY INFORMATION:
- Synopsis: ${detailedOpportunity.detailed_synopsis || detailedOpportunity.description || 'No synopsis available'}
- Eligibility Requirements: ${detailedOpportunity.detailed_eligibility || detailedOpportunity.eligibility_criteria?.join(', ') || 'General eligibility'}
- Application Requirements: ${detailedOpportunity.detailed_requirements || 'Standard requirements'}
- Application Process: ${detailedOpportunity.application_process || 'Standard process'}
- Funding Details: ${detailedOpportunity.funding_details || 'Amount varies'}
- Required Documents: ${detailedOpportunity.required_documents?.join(', ') || 'Standard application materials'}
- Contact Information: ${detailedOpportunity.contact_info || 'See opportunity listing'}
- Additional Info: ${detailedOpportunity.additional_info || 'None provided'}

AI FIT ANALYSIS INSIGHTS:
- Fit Score: ${analysis?.fitScore || 'Not calculated'}%
- Key Strengths: ${analysis?.strengths?.join('; ') || 'To be determined'}
- Challenges: ${analysis?.challenges?.join('; ') || 'To be addressed'}
- Recommendations: ${analysis?.recommendations?.join('; ') || 'Follow standard practices'}

INSTRUCTIONS:
Create a comprehensive, professional grant application draft that specifically addresses the funding opportunity's requirements. Structure the application with these sections:

1. **EXECUTIVE SUMMARY** (1-2 pages)
   - Clear project overview aligned with funder priorities
   - Compelling statement of need
   - Project impact and outcomes
   - Funding request justification

2. **PROJECT DESCRIPTION** (3-4 pages)
   - Detailed project narrative
   - Alignment with funder's mission and priorities
   - Innovation and uniqueness
   - Technical approach and methodology

3. **STATEMENT OF NEED** (2-3 pages)
   - Data-driven need assessment
   - Target population demographics
   - Problem magnitude and urgency
   - Gap analysis

4. **GOALS, OBJECTIVES & OUTCOMES** (2 pages)
   - SMART objectives directly tied to funder priorities
   - Measurable outcomes and impacts
   - Logic model or theory of change
   - Performance indicators

5. **METHODOLOGY/APPROACH** (2-3 pages)
   - Detailed implementation plan
   - Evidence-based practices
   - Timeline and milestones
   - Risk management

6. **ORGANIZATIONAL CAPACITY** (1-2 pages)
   - Organization's qualifications and experience
   - Key personnel and expertise
   - Past performance and successes
   - Infrastructure and resources

7. **BUDGET NARRATIVE** (1-2 pages)
   - Cost-effective budget justification
   - Match funding details (if required)
   - Indirect cost explanation
   - Sustainability planning

8. **EVALUATION PLAN** (1-2 pages)
   - Evaluation methodology
   - Data collection and analysis
   - Performance measurement
   - Reporting schedule

9. **SUSTAINABILITY PLAN** (1 page)
   - Long-term viability
   - Continued funding strategies
   - Community support
   - Scaling potential

Use professional grant writing language, be specific about how your project meets the funder's priorities, and incorporate actual data and requirements from the opportunity description. Make every section compelling and directly relevant to the funding opportunity.
    `

    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured')
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 4000 // Increased for comprehensive application
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

  // Helper methods for enhanced functionality
  static formatCertifications(userProfile) {
    const certs = []
    if (userProfile.minority_owned) certs.push('Minority-Owned Business')
    if (userProfile.woman_owned) certs.push('Woman-Owned Business')
    if (userProfile.veteran_owned) certs.push('Veteran-Owned Business')
    if (userProfile.small_business) certs.push('Small Business')
    return certs.length > 0 ? certs.join(', ') : 'None specified'
  }

  static formatAmountRange(opportunity) {
    if (opportunity.amount_min && opportunity.amount_max) {
      return `$${opportunity.amount_min.toLocaleString()} - $${opportunity.amount_max.toLocaleString()}`
    }
    if (opportunity.amount_max) {
      return `Up to $${opportunity.amount_max.toLocaleString()}`
    }
    return 'Amount varies'
  }
}