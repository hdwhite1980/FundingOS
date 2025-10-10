import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import AIEnhancedOpportunityDiscovery from '../../../../lib/ai-enhanced-opportunity-discovery'

type SearchParams = {
  userId?: string
  searchQuery?: string
  projectType?: string
  organizationType?: string
  excludeIngestedSources?: boolean
  dbFirst?: boolean
  freshnessDays?: number
}

const EXCLUSION_DOMAINS_DEFAULT = [
  // Federal/Gov sources we already sync separately
  'grants.gov',
  'sam.gov',
  'nih.gov',
  'nsf.gov',
  // Foundation directories we already cover
  'candid.org',
  'guidestar.org',
  'foundationcenter.org'
]

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function resolveUserContext(userId?: string) {
  if (!userId) return { profile: null, projects: [] as any[] }
  const supabase = getServiceRoleClient()
  const [{ data: profile }, { data: projects }] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase
      .from('projects')
      .select(`
        id,
        name,
        title,
        project_type,
        description,
        location,
        project_categories,
        primary_goals,
        preferred_funding_types,
        funding_needed,
        total_project_budget,
        funding_request_amount,
        user_id
      `)
      .eq('user_id', userId)
      .limit(50)
  ])
  return { profile, projects: projects || [] }
}

function daysAgoIso(days: number) {
  const ms = days * 24 * 60 * 60 * 1000
  return new Date(Date.now() - ms).toISOString()
}

async function queryExistingFromDB(params: SearchParams) {
  const supabase = getServiceRoleClient()
  let query = supabase
    .from('opportunities')
    .select('*')
    .eq('source', 'ai_enhanced_discovery')
    .order('created_at', { ascending: false })

  if (params.organizationType) {
    query = query.contains('organization_types', [params.organizationType])
  }
  if (params.projectType) {
    query = query.overlaps('project_types', [params.projectType])
  }
  const freshnessDays = typeof params.freshnessDays === 'number' && params.freshnessDays > 0 ? params.freshnessDays : 30
  query = query.gte('created_at', daysAgoIso(freshnessDays))

  const { data, error } = await query.limit(200)
  if (error) {
    console.error('DB-first AI discovery query failed:', error)
    return []
  }
  return data || []
}

async function runDiscovery(params: SearchParams) {
  // Guard: OpenAI key must be configured in the environment where this runs
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-placeholder') {
    return NextResponse.json({
      success: false,
      error: 'OpenAI API key is not configured. Set OPENAI_API_KEY in your environment.'
    }, { status: 500 })
  }

  const { userId, projectType, organizationType } = params
  const { profile, projects } = await resolveUserContext(userId)

  // If no explicit search query, derive a reasonable default from profile and first project
  let searchQuery = params.searchQuery?.trim()
  if (!searchQuery) {
    const parts = [] as string[]
    if (profile?.industry) parts.push(profile.industry)
    if (projectType) parts.push(projectType)

    // Pull first project to prime the query with concrete context
    const primaryProject = (projects || [])[0]
    if (primaryProject) {
      if (primaryProject.name || primaryProject.title) {
        parts.push(primaryProject.name || primaryProject.title)
      }
      if (primaryProject.project_type) {
        parts.push(primaryProject.project_type)
      }
    }

    // Fallback generic if nothing provided
    searchQuery = parts.length ? `${parts.join(' ')} funding opportunities` : 'grant funding opportunities'
  }

  const agent = new AIEnhancedOpportunityDiscovery()

  // Apply exclusions to avoid sources we already ingest (default: true)
  const excludeSources = params.excludeIngestedSources !== false
  if (excludeSources && typeof (agent as any).setExclusionDomains === 'function') {
    ;(agent as any).setExclusionDomains(EXCLUSION_DOMAINS_DEFAULT)
  }

  // DB-first short-circuit to avoid repeated AI calls across customers
  const useDbFirst = params.dbFirst !== false
  if (useDbFirst) {
    const cached = await queryExistingFromDB({
      projectType,
      organizationType: organizationType || profile?.organization_type || undefined,
      freshnessDays: params.freshnessDays || 30
    })
    if (cached.length > 0) {
      return NextResponse.json({
        success: true,
        usedCache: true,
        message: `Using ${cached.length} cached opportunities from database (ai_enhanced_discovery)`,
        summary: {
          opportunitiesFound: cached.length,
          searchQuery,
          depth: 'cached',
          excludedSources: excludeSources ? EXCLUSION_DOMAINS_DEFAULT : [],
          freshnessDays: params.freshnessDays || 30
        },
        imported: 0,
        sample: cached.slice(0, 10).map((o: any) => ({
          id: o.id,
          title: o.title,
          sponsor: o.sponsor,
          deadline_date: o.deadline_date,
          source: o.source,
          source_url: o.source_url,
        })),
        timestamp: new Date().toISOString()
      })
    }
  }

  const result = await agent.discoverAndAnalyzeOpportunities({
    userId,
    searchQuery,
    projectType,
    organizationType: organizationType || profile?.organization_type || null,
    userProjects: projects,
    searchDepth: 'comprehensive',
    conversationHistory: []
  })

  return NextResponse.json({
    success: true,
    message: `AI discovery complete. Stored ${result.opportunitiesFound} opportunities`,
    summary: {
      opportunitiesFound: result.opportunitiesFound,
      searchQuery: result.searchQuery,
      depth: result.searchStrategy?.depth,
      excludedSources: excludeSources ? EXCLUSION_DOMAINS_DEFAULT : [],
      freshnessDays: params.freshnessDays || 30
    },
    usedCache: false,
    imported: result.opportunitiesFound || 0,
    // Only return a light sample to keep payload small
    sample: (result.opportunities || []).slice(0, 10).map((o: any) => ({
      id: o.id,
      title: o.title,
      sponsor: o.sponsor,
      deadline_date: o.deadline_date,
      source: o.source,
      source_url: o.source_url,
    })),
    timestamp: new Date().toISOString()
  })
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const params: SearchParams = {
      userId: url.searchParams.get('userId') || undefined,
      searchQuery: url.searchParams.get('q') || url.searchParams.get('searchQuery') || undefined,
      projectType: url.searchParams.get('projectType') || undefined,
      organizationType: url.searchParams.get('organizationType') || undefined,
      excludeIngestedSources: url.searchParams.get('excludeIngestedSources') !== 'false',
      dbFirst: url.searchParams.get('dbFirst') !== 'false',
      freshnessDays: url.searchParams.get('freshnessDays') ? Number(url.searchParams.get('freshnessDays')) : undefined
    }
    return await runDiscovery(params)
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as SearchParams
    return await runDiscovery(body || {})
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
