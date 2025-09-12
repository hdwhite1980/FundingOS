// lib/aiService.js - Enhanced for Unified Agent System
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export class AIService {
  
  // === UNIFIED AGENT AI CAPABILITIES ===
  
  static async generateUnifiedStrategy(userContext, situationAnalysis) {
    const prompt = `
As a unified AI funding strategist, develop a comprehensive strategy for this organization:

USER CONTEXT:
${this.formatUserContextForAI(userContext)}

SITUATION ANALYSIS:
${JSON.stringify(situationAnalysis, null, 2)}

Create a unified funding strategy that coordinates:
1. Grant pursuit strategy with prioritized opportunities
2. Individual donation cultivation and stewardship
3. Crowdfunding campaign optimization
4. Corporate partnership development
5. Timeline coordination across all channels
6. Resource allocation optimization
7. Risk mitigation and contingency planning
8. Performance measurement and adaptation

Consider:
- Funding diversification requirements
- Timeline constraints and deadlines
- Organizational capacity and resources
- Market conditions and competition
- Success patterns and learning from data

Return comprehensive strategy as JSON:
{
  "summary": "Executive strategy overview",
  "grantStrategy": {
    "focus": "Primary grant focus areas",
    "priorityOpportunities": ["opp1", "opp2", "opp3"],
    "timeline": "Grant application timeline",
    "resourceAllocation": 60
  },
  "donationStrategy": {
    "approach": "Individual donor cultivation approach", 
    "targetSegments": ["segment1", "segment2"],
    "campaigns": ["campaign1", "campaign2"],
    "resourceAllocation": 25
  },
  "crowdfundingStrategy": {
    "platforms": ["platform1", "platform2"],
    "campaignTypes": ["type1", "type2"],
    "timing": "Optimal campaign timing",
    "resourceAllocation": 15
  },
  "coordinationPlan": {
    "sequencing": "How to sequence different funding activities",
    "synergies": "How different channels reinforce each other",
    "messaging": "Coordinated messaging across channels"
  },
  "riskMitigation": ["risk1", "risk2", "risk3"],
  "successMetrics": ["metric1", "metric2", "metric3"],
  "adaptationTriggers": ["trigger1", "trigger2"],
  "confidence": 0.0-1.0,
  "expectedImpact": "Projected outcomes and timeline"
}
    `

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 3000
      })

      return JSON.parse(response.choices[0].message.content)
    } catch (error) {
      console.error('Strategy generation error:', error)
      return {
        summary: 'Comprehensive funding strategy development in progress',
        confidence: 0.5,
        grantStrategy: { resourceAllocation: 60 },
        donationStrategy: { resourceAllocation: 25 },
        crowdfundingStrategy: { resourceAllocation: 15 }
      }
    }
  }

  static async analyzeMessageIntent(message, userContext) {
    const prompt = `
Analyze this user message to understand their intent and required actions:

MESSAGE: "${message}"

USER CONTEXT:
- Projects: ${userContext.projects?.length || 0} active projects
- Opportunities: ${userContext.opportunities?.length || 0} tracked
- Recent conversations: ${userContext.recentConversations || 0}

Determine:
1. Primary intent (information_request, strategy_guidance, action_request, web_search, opportunity_analysis, etc.)
2. Secondary intents
3. Urgency level (low, medium, high, critical)
4. Required actions to fulfill the request
5. Complexity level (simple, moderate, complex)
6. Expected response type (quick_answer, detailed_analysis, action_confirmation, search_results)

Return JSON:
{
  "primaryIntent": "main intent category",
  "secondaryIntents": ["intent1", "intent2"],
  "urgency": "low|medium|high|critical",
  "complexity": "simple|moderate|complex", 
  "requiredActions": [
    {
      "type": "web_search|opportunity_analysis|data_retrieval|strategy_planning",
      "parameters": {},
      "priority": 1-10
    }
  ],
  "expectedResponseType": "response type",
  "userExpectation": "what the user is hoping to achieve",
  "contextClues": ["clue1", "clue2"],
  "confidence": 0.0-1.0
}
    `

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1000
      })

      return JSON.parse(response.choices[0].message.content)
    } catch (error) {
      console.error('Message analysis error:', error)
      return {
        primaryIntent: 'general_inquiry',
        urgency: 'medium',
        complexity: 'moderate',
        requiredActions: [],
        confidence: 0.3
      }
    }
  }

  static async generateAdaptiveGoals(strategy, userContext, performanceData) {
    const prompt = `
Generate adaptive, measurable goals for this AI funding agent based on strategy and performance:

STRATEGY: ${JSON.stringify(strategy, null, 2)}
USER CONTEXT: ${this.formatUserContextForAI(userContext)}
PERFORMANCE DATA: ${JSON.stringify(performanceData, null, 2)}

Create 4-6 specific, measurable goals that:
1. Support the unified funding strategy
2. Are achievable based on organizational capacity
3. Include success metrics and timelines
4. Adapt to current performance levels
5. Balance short-term wins with long-term growth

Goal categories to consider:
- Opportunity Discovery & Analysis
- Application Generation & Submission
- Deadline Management & Compliance
- Strategy Optimization & Adaptation
- Performance Monitoring & Learning
- User Satisfaction & Engagement

Return JSON array:
{
  "goals": [
    {
      "id": "unique_goal_id",
      "type": "opportunity_discovery|application_generation|deadline_management|strategy_optimization|performance_tracking",
      "description": "Clear, specific goal description",
      "priority": 1-10,
      "targetMetric": "What will be measured",
      "currentBaseline": "Current performance level",
      "targetValue": "Target to achieve",
      "timeframe": "Timeline for achievement",
      "successCriteria": ["criteria1", "criteria2"],
      "adaptationTriggers": ["trigger1", "trigger2"],
      "dependencies": ["dependency1"],
      "status": "active"
    }
  ],
  "reasoning": "Why these goals were selected",
  "strategyAlignment": "How goals support the overall strategy",
  "riskFactors": ["risk1", "risk2"],
  "confidence": 0.0-1.0
}
    `

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 2000
      })

      return JSON.parse(response.choices[0].message.content)
    } catch (error) {
      console.error('Goal generation error:', error)
      return {
        goals: this.getDefaultAdaptiveGoals(userContext),
        reasoning: 'Default goals due to AI unavailability',
        confidence: 0.4
      }
    }
  }

  static async makeStrategicDecisions(situation, strategy, goals) {
    const prompt = `
As an autonomous AI funding agent, analyze the situation and make strategic decisions:

CURRENT SITUATION: ${JSON.stringify(situation, null, 2)}
ACTIVE STRATEGY: ${JSON.stringify(strategy, null, 2)}
ACTIVE GOALS: ${JSON.stringify(goals, null, 2)}

Make autonomous decisions about:
1. Immediate actions needed (next 24 hours)
2. Strategic adjustments required
3. Resource reallocation needs
4. New opportunities to pursue
5. Performance optimizations
6. User notifications required

Consider:
- Urgent deadlines and time-sensitive opportunities
- Resource constraints and capacity
- Success patterns and learning from data
- User preferences and feedback history
- Market conditions and competitive landscape

Return decision array:
{
  "decisions": [
    {
      "type": "web_search|opportunity_analysis|application_generation|strategy_adjustment|user_notification|resource_reallocation",
      "priority": 1-10,
      "confidence": 0.0-1.0,
      "reasoning": "Why this decision was made",
      "expectedOutcome": "What this should achieve",
      "parameters": {
        // Decision-specific parameters
      },
      "timeline": "When to execute",
      "dependencies": ["dependency1"],
      "riskLevel": "low|medium|high"
    }
  ],
  "strategicReasoning": "Overall strategic thinking",
  "urgentItems": ["urgent1", "urgent2"],
  "opportunitiesIdentified": ["opp1", "opp2"],
  "risksIdentified": ["risk1", "risk2"],
  "confidence": 0.0-1.0
}
    `

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 2500
      })

      return JSON.parse(response.choices[0].message.content)
    } catch (error) {
      console.error('Strategic decision error:', error)
      return {
        decisions: [],
        strategicReasoning: 'Continuing with current strategy',
        confidence: 0.3
      }
    }
  }

  // === ENHANCED OPPORTUNITY ANALYSIS ===
  
  static async analyzeOpportunityFitUnified(project, opportunity, userProfile, strategy) {
    const prompt = `
Analyze this funding opportunity comprehensively within the unified funding strategy:

PROJECT: ${JSON.stringify(project, null, 2)}
OPPORTUNITY: ${JSON.stringify(opportunity, null, 2)}
USER PROFILE: ${JSON.stringify(userProfile, null, 2)}
STRATEGY CONTEXT: ${JSON.stringify(strategy, null, 2)}

Perform comprehensive analysis considering:
1. Strategic alignment with unified funding approach
2. Competition level and success probability
3. Resource requirements vs. available capacity
4. Timeline fit with other funding activities
5. Synergies with existing funding streams
6. Long-term relationship potential
7. Mission and impact alignment
8. Financial terms and sustainability

Enhanced scoring factors:
- Strategic fit (25 points): How well does this align with the unified strategy?
- Competition analysis (20 points): What's the likelihood of success?
- Resource efficiency (15 points): ROI of time and effort investment
- Timeline integration (15 points): How does this fit with other activities?
- Synergy potential (10 points): Can this enhance other funding streams?
- Organizational match (10 points): Perfect fit for this organization?
- Long-term value (5 points): Beyond immediate funding

Return detailed analysis:
{
  "fitScore": 0-100,
  "strategicAlignment": "How this fits the unified strategy",
  "competitionLevel": "low|medium|high",
  "successProbability": 0.0-1.0,
  "resourceRequirements": {
    "timeInvestment": "hours/days required",
    "skillsNeeded": ["skill1", "skill2"],
    "otherResources": ["resource1", "resource2"]
  },
  "timelineAnalysis": {
    "urgency": "low|medium|high|critical",
    "conflictsWithOther": ["conflict1"],
    "optimalTiming": "when to apply"
  },
  "strengths": ["strength1", "strength2"],
  "challenges": ["challenge1", "challenge2"],
  "recommendations": ["rec1", "rec2"],
  "synergyOpportunities": ["synergy1", "synergy2"],
  "nextSteps": ["step1", "step2", "step3"],
  "confidence": 0.0-1.0,
  "aiRecommendation": "pursue_immediately|schedule_for_later|deprioritize|skip"
}
    `

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      })

      return JSON.parse(response.choices[0].message.content)
    } catch (error) {
      console.error('Enhanced opportunity analysis error:', error)
      // Fallback to basic analysis
      return this.analyzeOpportunityFit(userProfile, project, opportunity)
    }
  }

  // === EXISTING METHODS ENHANCED ===

  static async analyzeOpportunityFit(userProfile, project, opportunity) {
    // Enhanced with better context understanding
    const detailedOpportunity = await this.fetchOpportunityDetails(opportunity)

    const prompt = `
You are a grant writing expert analyzing the fit between a project and funding opportunity.

USER PROFILE: ${this.formatProfileForAnalysis(userProfile)}
PROJECT: ${this.formatProjectForAnalysis(project)}
OPPORTUNITY: ${this.formatOpportunityForAnalysis(detailedOpportunity)}

Analyze comprehensively and provide specific, actionable insights.

Return JSON:
{
  "fitScore": 0-100,
  "strengths": ["specific strength 1", "specific strength 2"],
  "challenges": ["specific challenge 1", "specific challenge 2"],
  "recommendations": ["actionable rec 1", "actionable rec 2"],
  "nextSteps": ["step 1", "step 2", "step 3"],
  "confidence": 0.0-1.0
}
    `

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      })

      return JSON.parse(response.choices[0].message.content)
    } catch (error) {
      console.error('Opportunity analysis error:', error)
      return this.getFallbackAnalysis(project, opportunity)
    }
  }

  static async generateApplicationDraft(userProfile, project, opportunity, analysis) {
    // Enhanced with better context and strategy integration
    const detailedOpportunity = await this.fetchOpportunityDetails(opportunity)

    const prompt = `
Create a compelling, comprehensive grant application draft.

CONTEXT:
${this.formatUserContextForApplication(userProfile, project, detailedOpportunity, analysis)}

Create a professional, tailored application with:

1. **EXECUTIVE SUMMARY** (compelling overview)
2. **STATEMENT OF NEED** (data-driven problem definition)
3. **PROJECT DESCRIPTION** (detailed methodology and approach)
4. **GOALS & OBJECTIVES** (SMART objectives aligned with funder priorities)
5. **IMPLEMENTATION PLAN** (timeline, milestones, team)
6. **BUDGET NARRATIVE** (cost-effective resource allocation)
7. **ORGANIZATIONAL CAPACITY** (qualifications and track record)
8. **EVALUATION & MEASUREMENT** (outcomes assessment)
9. **SUSTAINABILITY** (long-term viability)

Requirements:
- Address specific funder requirements and priorities
- Use compelling storytelling with quantitative support
- Demonstrate clear impact and measurable outcomes
- Show organizational readiness and capacity
- Include specific budget justifications
- Reference relevant experience and success stories

Make every section compelling and directly relevant to this specific opportunity.
    `

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 4000
      })

      return response.choices[0].message.content
    } catch (error) {
      console.error('Application generation error:', error)
      return this.getFallbackApplication(project, opportunity)
    }
  }

  // === WEB SEARCH AND OPPORTUNITY DISCOVERY ===

  static async planOpportunitySearch(projects, userProfile, currentOpportunities = []) {
    const prompt = `
Plan a strategic web search for funding opportunities:

PROJECTS: ${JSON.stringify(projects.map(p => ({
  name: p.name,
  type: p.project_type,
  funding_needed: p.funding_needed,
  location: p.location,
  description: p.description
})), null, 2)}

USER PROFILE: ${JSON.stringify({
  organization_name: userProfile?.organization_name,
  organization_type: userProfile?.organization_type,
  location: `${userProfile?.city}, ${userProfile?.state}`,
  certifications: this.formatCertifications(userProfile)
}, null, 2)}

CURRENT OPPORTUNITIES: ${currentOpportunities.length} already tracked

Plan comprehensive search strategy:

Return JSON:
{
  "needsWebSearch": boolean,
  "reasoning": "Why web search is needed",
  "queries": [
    {
      "text": "search query text",
      "projectType": "project type focus",
      "organizationType": "org type",
      "location": "location if relevant",
      "fundingAmount": "amount range",
      "priority": 1-10,
      "expectedResults": "what we expect to find"
    }
  ],
  "searchDepth": "basic|thorough|comprehensive",
  "excludeKeywords": ["keyword1", "keyword2"],
  "focusAreas": ["area1", "area2"],
  "timeframe": "search timeframe priority"
}
    `

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1500
      })

      return JSON.parse(response.choices[0].message.content)
    } catch (error) {
      console.error('Search planning error:', error)
      return this.getFallbackSearchPlan(projects, userProfile)
    }
  }

  // === PERFORMANCE ANALYSIS AND LEARNING ===

  static async analyzePerformanceData(performanceMetrics, userContext, goals) {
    const prompt = `
Analyze agent performance and generate improvement insights:

PERFORMANCE METRICS: ${JSON.stringify(performanceMetrics, null, 2)}
USER CONTEXT: ${this.formatUserContextForAI(userContext)}
CURRENT GOALS: ${JSON.stringify(goals, null, 2)}

Analyze:
1. Goal achievement rates and patterns
2. User satisfaction and engagement trends
3. Strategy effectiveness and ROI
4. Resource utilization efficiency
5. Success factors and failure patterns
6. Market conditions impact
7. Learning opportunities and adaptations

Return comprehensive analysis:
{
  "overallPerformance": "excellent|good|fair|needs_improvement",
  "keySuccesses": ["success1", "success2"],
  "improvementAreas": ["area1", "area2"],
  "patterns": {
    "successPatterns": ["pattern1", "pattern2"],
    "failurePatterns": ["pattern1", "pattern2"],
    "userPreferences": ["pref1", "pref2"]
  },
  "recommendations": [
    {
      "category": "strategy|operations|user_experience|learning",
      "recommendation": "specific recommendation",
      "expectedImpact": "high|medium|low",
      "effort": "low|medium|high",
      "priority": 1-10
    }
  ],
  "goalAdjustments": ["adjustment1", "adjustment2"],
  "strategyOptimizations": ["optimization1", "optimization2"],
  "learningInsights": ["insight1", "insight2"],
  "confidence": 0.0-1.0
}
    `

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      })

      return JSON.parse(response.choices[0].message.content)
    } catch (error) {
      console.error('Performance analysis error:', error)
      return {
        overallPerformance: 'fair',
        keySuccesses: [],
        improvementAreas: ['Continue learning from user interactions'],
        confidence: 0.3
      }
    }
  }

  // === UTILITY AND FORMATTING METHODS ===

  static formatUserContextForAI(userContext) {
    const { profile, projects, fundingStats, donations, campaigns, applications } = userContext
    
    return `
ORGANIZATION: ${profile?.organization_name || 'Organization'} (${profile?.organization_type || 'Type not specified'})
LOCATION: ${profile?.city && profile?.state ? `${profile.city}, ${profile.state}` : 'Location not specified'}
CERTIFICATIONS: ${this.formatCertifications(profile)}

PROJECTS: ${projects?.length || 0} active projects
${projects?.map(p => `- "${p.name}": ${p.project_type} project needing ${p.funding_needed?.toLocaleString()}`).join('\n') || 'No active projects'}

FUNDING ECOSYSTEM:
- Total funding needed: ${fundingStats?.totalFundingNeeded?.toLocaleString() || '0'}
- Total secured: ${fundingStats?.totalSecured?.toLocaleString() || '0'}
- Funding gap: ${fundingStats?.fundingGap?.toLocaleString() || '0'}
- Progress: ${fundingStats?.fundingProgress || 0}%
- Diversification score: ${fundingStats?.diversificationScore || 0}/100

FUNDING SOURCES:
- Individual donations: ${fundingStats?.totalDonations?.toLocaleString() || '0'} from ${donations?.length || 0} donors
- Crowdfunding: ${fundingStats?.totalCampaignRaised?.toLocaleString() || '0'} from ${campaigns?.length || 0} campaigns
- Grants: ${fundingStats?.totalGrantAwarded?.toLocaleString() || '0'} from ${applications?.filter(a => a.status === 'approved').length || 0} approved applications

RECENT ACTIVITY:
- Total applications submitted: ${applications?.length || 0}
- Pending applications: ${applications?.filter(a => a.status === 'submitted' || a.status === 'under_review').length || 0}
- Active campaigns: ${campaigns?.filter(c => c.status === 'active').length || 0}
    `.trim()
  }

  static formatUserContextForApplication(userProfile, project, opportunity, analysis) {
    return `
ORGANIZATION PROFILE:
- Name: ${userProfile?.organization_name || 'Organization'}
- Type: ${userProfile?.organization_type || 'Nonprofit'}
- Location: ${userProfile?.city && userProfile?.state ? `${userProfile.city}, ${userProfile.state}` : 'Location not specified'}
- Years Operating: ${userProfile?.years_in_operation || 'Not specified'}
- Annual Revenue: ${userProfile?.annual_revenue ? `${userProfile.annual_revenue.toLocaleString()}` : 'Not specified'}
- Staff Size: ${userProfile?.employee_count || 'Not specified'}
- Certifications: ${this.formatCertifications(userProfile)}

PROJECT DETAILS:
- Name: ${project?.name || 'Project'}
- Type: ${project?.project_type || 'General'}
- Location: ${project?.location || 'Location TBD'}
- Funding Needed: ${project?.funding_needed ? `${project.funding_needed.toLocaleString()}` : 'Amount TBD'}
- Timeline: ${project?.timeline || 'Timeline TBD'}
- Description: ${project?.description || 'Project description needed'}
- Expected Impact: ${project?.community_benefit || 'Community impact expected'}
- Jobs Created: ${project?.expected_jobs_created || 'Job impact TBD'}

FUNDING OPPORTUNITY:
- Title: ${opportunity?.title || 'Funding Opportunity'}
- Sponsor: ${opportunity?.sponsor || 'Sponsor'}
- Agency: ${opportunity?.agency || opportunity?.sponsor || 'Agency'}
- Amount: ${this.formatAmountRange(opportunity)}
- Deadline: ${opportunity?.deadline_date || 'Rolling deadline'}
- Match Required: ${opportunity?.match_requirement_percentage || 0}%
- Description: ${opportunity?.description || 'Opportunity description'}
- Eligibility: ${opportunity?.eligibility_criteria?.join(', ') || 'General eligibility'}
- Requirements: ${opportunity?.detailed_requirements || 'Standard application requirements'}

AI ANALYSIS INSIGHTS:
- Fit Score: ${analysis?.fitScore || 'Not calculated'}%
- Key Strengths: ${analysis?.strengths?.join('; ') || 'To be determined'}
- Recommendations: ${analysis?.recommendations?.join('; ') || 'Follow best practices'}
- Strategic Alignment: ${analysis?.strategicAlignment || 'Good alignment expected'}
    `
  }

  static formatProfileForAnalysis(userProfile) {
    return `
Organization: ${userProfile?.organization_name || 'Not specified'}
Type: ${userProfile?.organization_type || 'Not specified'}  
Location: ${userProfile?.city && userProfile?.state ? `${userProfile.city}, ${userProfile.state}` : 'Not specified'}
Years Operating: ${userProfile?.years_in_operation || 'Not specified'}
Revenue: ${userProfile?.annual_revenue ? `${userProfile.annual_revenue.toLocaleString()}` : 'Not specified'}
Staff: ${userProfile?.employee_count || 'Not specified'}
Certifications: ${this.formatCertifications(userProfile)}
    `
  }

  static formatProjectForAnalysis(project) {
    return `
Name: ${project?.name || 'Not specified'}
Type: ${project?.project_type || 'Not specified'}
Location: ${project?.location || 'Not specified'}
Funding Needed: ${project?.funding_needed ? `${project.funding_needed.toLocaleString()}` : 'Not specified'}
Timeline: ${project?.timeline || 'Not specified'}
Description: ${project?.description || 'Not specified'}
Community Benefit: ${project?.community_benefit || 'Not specified'}
Expected Jobs: ${project?.expected_jobs_created || 'Not specified'}
    `
  }

  static formatOpportunityForAnalysis(opportunity) {
    return `
Title: ${opportunity?.title || 'Not specified'}
Sponsor: ${opportunity?.sponsor || 'Not specified'}
Amount: ${this.formatAmountRange(opportunity)}
Deadline: ${opportunity?.deadline_date || 'Rolling'}
Match Required: ${opportunity?.match_requirement_percentage || 0}%
Eligibility: ${opportunity?.eligibility_criteria?.join(', ') || 'General'}
Project Types: ${opportunity?.project_types?.join(', ') || 'Various'}
Organization Types: ${opportunity?.organization_types?.join(', ') || 'Various'}
Geography: ${opportunity?.geography?.join(', ') || 'Not specified'}
Description: ${opportunity?.description || 'Not specified'}
    `
  }

  static formatCertifications(userProfile) {
    if (!userProfile) return 'None'
    const certs = []
    if (userProfile.small_business) certs.push('Small Business')
    if (userProfile.minority_owned) certs.push('Minority-Owned')
    if (userProfile.woman_owned) certs.push('Woman-Owned')
    if (userProfile.veteran_owned) certs.push('Veteran-Owned')
    return certs.length > 0 ? certs.join(', ') : 'None'
  }

  static formatAmountRange(opportunity) {
    if (opportunity?.amount_min && opportunity?.amount_max) {
      return `${opportunity.amount_min.toLocaleString()} - ${opportunity.amount_max.toLocaleString()}`
    }
    if (opportunity?.amount_max) {
      return `Up to ${opportunity.amount_max.toLocaleString()}`
    }
    return 'Amount varies'
  }

  // === FALLBACK METHODS ===

  static getDefaultAdaptiveGoals(userContext) {
    const baseGoals = [
      {
        id: 'opportunity_discovery',
        type: 'opportunity_discovery',
        description: 'Discover and analyze high-quality funding opportunities',
        priority: 9,
        targetMetric: 'Opportunities discovered per week',
        currentBaseline: 0,
        targetValue: 5,
        timeframe: '1 week',
        status: 'active'
      },
      {
        id: 'application_generation',
        type: 'application_generation', 
        description: 'Generate compelling grant applications for best matches',
        priority: 8,
        targetMetric: 'Applications generated',
        currentBaseline: 0,
        targetValue: 2,
        timeframe: '2 weeks',
        status: 'active'
      },
      {
        id: 'deadline_monitoring',
        type: 'deadline_management',
        description: 'Monitor and alert for critical application deadlines',
        priority: 10,
        targetMetric: 'Deadline alerts accuracy',
        currentBaseline: 0,
        targetValue: 100,
        timeframe: 'ongoing',
        status: 'active'
      }
    ]

    // Customize based on user context
    if (userContext.projects?.length > 0) {
      baseGoals.push({
        id: 'strategy_optimization',
        type: 'strategy_optimization',
        description: 'Optimize funding strategy across all channels',
        priority: 7,
        targetMetric: 'Strategy effectiveness score',
        currentBaseline: 50,
        targetValue: 80,
        timeframe: '1 month',
        status: 'active'
      })
    }

    return baseGoals
  }

  static getFallbackAnalysis(project, opportunity) {
    return {
      fitScore: 65,
      strengths: [
        'Project aligns with opportunity focus areas',
        'Organization type matches eligibility criteria'
      ],
      challenges: [
        'Competition expected to be moderate to high',
        'May require detailed budget justification'
      ],
      recommendations: [
        'Review and address all application requirements',
        'Prepare compelling project narrative',
        'Gather supporting documentation early'
      ],
      nextSteps: [
        'Download application guidelines',
        'Schedule time for application preparation',
        'Identify key team members for application'
      ],
      confidence: 0.6
    }
  }

  static getFallbackApplication(project, opportunity) {
    return `
# Grant Application Draft for ${opportunity?.title || 'Funding Opportunity'}

## Executive Summary
[This section will provide a compelling overview of your project and its alignment with the funder's priorities]

## Statement of Need
[This section will establish the problem your project addresses with supporting data and evidence]

## Project Description
[This section will detail your project methodology, approach, and innovative aspects]

## Goals and Objectives
[This section will outline SMART objectives that align with funder priorities]

## Implementation Plan
[This section will provide a detailed timeline and implementation strategy]

## Budget Narrative
[This section will justify project costs and demonstrate fiscal responsibility]

## Organizational Capacity
[This section will establish your organization's qualifications and track record]

## Evaluation Plan
[This section will describe how you will measure success and impact]

## Sustainability Plan
[This section will address long-term project viability and continued impact]

---
*Note: This is an AI-generated draft that requires customization with your specific project details, organizational information, and funder requirements.*
    `
  }

  static getFallbackSearchPlan(projects, userProfile) {
    const projectTypes = [...new Set(projects?.map(p => p.project_type) || ['general'])]
    const orgType = userProfile?.organization_type || 'nonprofit'
    
    return {
      needsWebSearch: true,
      reasoning: 'Need to discover additional funding opportunities for current projects',
      queries: [
        {
          text: `${projectTypes[0]} grants ${orgType} funding`,
          projectType: projectTypes[0],
          organizationType: orgType,
          priority: 8,
          expectedResults: 'Relevant grant opportunities'
        },
        {
          text: `foundation grants ${orgType} organizations`,
          organizationType: orgType,
          priority: 7,
          expectedResults: 'Foundation funding opportunities'
        }
      ],
      searchDepth: 'thorough',
      excludeKeywords: ['expired', 'closed'],
      focusAreas: projectTypes
    }
  }

  // === EXISTING ENHANCED METHODS ===

  static async fetchOpportunityDetails(opportunity) {
    // Enhanced version of existing method with better error handling
    try {
      let detailedData = { ...opportunity }
      
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
      return opportunity
    }
  }

  static async fetchGrantsGovDetails(opportunity) {
    // Enhanced version with better parsing and error handling
    try {
      const response = await fetch(opportunity.source_url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FundingBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 10000 // 10 second timeout
      })

      if (!response.ok) {
        console.warn(`Failed to fetch opportunity page: ${response.status}`)
        return opportunity
      }

      const html = await response.text()
      const extractedData = this.extractOpportunityDetails(html, opportunity.source_url)

      return {
        ...opportunity,
        detailed_synopsis: extractedData.synopsis || opportunity.description,
        detailed_eligibility: extractedData.eligibility,
        detailed_requirements: extractedData.requirements,
        application_process: extractedData.applicationProcess || opportunity.application_process,
        funding_details: extractedData.fundingDetails,
        deadline_details: extractedData.deadline,
        contact_info: extractedData.contactInfo,
        additional_info: extractedData.additionalInfo,
        last_scraped: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error fetching Grants.gov details:', error)
      return opportunity
    }
  }

  static extractOpportunityDetails(html, url) {
    // Enhanced version with more robust extraction patterns
    const extractedData = {
      synopsis: '',
      eligibility: '',
      requirements: '',
      applicationProcess: '',
      fundingDetails: '',
      deadline: '',
      contactInfo: '',
      additionalInfo: ''
    }

    try {
      // Enhanced synopsis extraction with multiple patterns
      const synopsisPatterns = [
        /<div[^>]*class="[^"]*synopsis[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*id="synopsis"[^>]*>([\s\S]*?)<\/div>/i,
        /<section[^>]*class="[^"]*opportunity-synopsis[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
        /<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<p[^>]*class="[^"]*synopsis[^"]*"[^>]*>([\s\S]*?)<\/p>/i
      ]

      for (const pattern of synopsisPatterns) {
        const match = html.match(pattern)
        if (match) {
          extractedData.synopsis = this.cleanHtml(match[1]).substring(0, 2000) // Limit length
          break
        }
      }

      // Enhanced eligibility extraction
      const eligibilityPatterns = [
        /<div[^>]*class="[^"]*eligibility[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<section[^>]*class="[^"]*eligibility[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
        /<h[2-6][^>]*>.*?eligibility.*?<\/h[2-6]>([\s\S]*?)(?=<h[2-6]|<div|<section|$)/i
      ]

      for (const pattern of eligibilityPatterns) {
        const match = html.match(pattern)
        if (match) {
          extractedData.eligibility = this.cleanHtml(match[1]).substring(0, 1500)
          break
        }
      }

      // Enhanced requirements extraction
      const requirementPatterns = [
        /<div[^>]*class="[^"]*requirements?[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<section[^>]*class="[^"]*requirements?[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
        /<h[2-6][^>]*>.*?requirements?.*?<\/h[2-6]>([\s\S]*?)(?=<h[2-6]|<div|<section|$)/i
      ]

      for (const pattern of requirementPatterns) {
        const match = html.match(pattern)
        if (match) {
          extractedData.requirements = this.cleanHtml(match[1]).substring(0, 1500)
          break
        }
      }

      // Enhanced funding details extraction
      const fundingPatterns = [
        /funding amount[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
        /award amount[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
        /\$[\d,]+(?:\s*(?:to|-)\s*\$[\d,]+)?/g
      ]

      for (const pattern of fundingPatterns) {
        const matches = html.match(pattern)
        if (matches) {
          extractedData.fundingDetails = Array.isArray(matches) ? 
            matches.slice(0, 3).join(', ') : matches
          break
        }
      }

      // Enhanced deadline extraction
      const deadlinePatterns = [
        /(?:due|deadline|closes?|expires?)[^:]*:?\s*([^<\n]{10,50})/i,
        /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/g,
        /<span[^>]*class="[^"]*deadline[^"]*"[^>]*>([^<]+)<\/span>/i
      ]

      for (const pattern of deadlinePatterns) {
        const match = html.match(pattern)
        if (match) {
          extractedData.deadline = this.cleanHtml(match[1] || match[0]).substring(0, 200)
          break
        }
      }

      // Enhanced contact extraction
      const contactPatterns = [
        /(?:contact|email)[^:]*:?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
        /(?:phone|tel)[^:]*:?\s*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i
      ]

      const contactInfo = []
      for (const pattern of contactPatterns) {
        const matches = html.match(pattern)
        if (matches) {
          contactInfo.push(matches[1])
        }
      }
      extractedData.contactInfo = contactInfo.join(', ')

    } catch (error) {
      console.error('Error extracting data from HTML:', error)
    }

    return extractedData
  }

  // === CATEGORIZATION METHODS FOR DIFFERENT FUNDING TYPES ===
  
  static async categorizeForFoundations(prompt, project, userProfile) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { 
            role: "system", 
            content: "You are an expert at analyzing nonprofit projects and matching them to foundation funding opportunities. Return only valid JSON without any markdown formatting or explanations." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })

      const aiResponse = response.choices[0]?.message?.content
      return JSON.parse(aiResponse)
    } catch (error) {
      console.error('Foundation categorization error:', error)
      return null
    }
  }

  static async categorizeForContracts(prompt, project, userProfile) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { 
            role: "system", 
            content: "You are an expert at analyzing projects and matching them to government contract opportunities. Return only valid JSON without any markdown formatting or explanations." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })

      const aiResponse = response.choices[0]?.message?.content
      return JSON.parse(aiResponse)
    } catch (error) {
      console.error('Contract categorization error:', error)
      return null
    }
  }

  static async categorizeForResearch(prompt, project, userProfile) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { 
            role: "system", 
            content: "You are an expert at analyzing research projects and matching them to research funding opportunities. Return only valid JSON without any markdown formatting or explanations." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })

      const aiResponse = response.choices[0]?.message?.content
      return JSON.parse(aiResponse)
    } catch (error) {
      console.error('Research categorization error:', error)
      return null
    }
  }

  static async categorizeForHealth(prompt, project, userProfile) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { 
            role: "system", 
            content: "You are an expert at analyzing health-related projects and matching them to health funding opportunities. Return only valid JSON without any markdown formatting or explanations." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })

      const aiResponse = response.choices[0]?.message?.content
      return JSON.parse(aiResponse)
    } catch (error) {
      console.error('Health categorization error:', error)
      return null
    }
  }

  static async determineProjectCategories(project, userProfile) {
    try {
      const prompt = `
      Analyze this project and determine the most relevant funding categories:

      PROJECT: ${project.name}
      Description: ${project.description}
      Project Type: ${project.project_type}
      Location: ${project.location}
      Funding Needed: $${project.funding_needed?.toLocaleString()}

      ORGANIZATION: ${userProfile.organization_name}
      Type: ${userProfile.organization_type}
      Location: ${userProfile.city}, ${userProfile.state}

      Based on this information, determine the most relevant categories for grant searching.
      Return a JSON object with recommended search categories and keywords.
      `

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { 
            role: "system", 
            content: "You are an expert at analyzing projects and determining relevant funding categories. Return only valid JSON without any markdown formatting or explanations." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 1000
      })

      const aiResponse = response.choices[0]?.message?.content
      return JSON.parse(aiResponse)
    } catch (error) {
      console.error('Project categorization error:', error)
      return {
        primaryCategories: ["General"],
        keywords: [project.project_type || "community development"],
        searchTerms: [project.name]
      }
    }
  }

  static cleanHtml(text) {
    if (!text) return ''
    
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/&#x27;/g, "'") // Replace &#x27; with '
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim()
  }
}