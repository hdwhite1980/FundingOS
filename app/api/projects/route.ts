export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase env vars missing')
  return createClient(url, key)
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getServerClient()
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        id, name, description, project_type, status,
        funding_needed, funding_request_amount, total_project_budget,
        location, project_location, timeline, project_duration,
        proposed_start_date, funding_decision_needed,
        estimated_people_served, target_population,
        current_status, urgency_level, industry,
        created_at, updated_at
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    
    if (error) {
      console.error('Projects fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
    }
    
    return NextResponse.json({ projects: projects || [] })
  } catch (e: any) {
    console.error('GET /api/projects error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, project } = body || {}
    
    if (!userId || !project) {
      return NextResponse.json({ error: 'userId and project data required' }, { status: 400 })
    }

    const supabase = getServerClient()

    const projectData = {
      user_id: userId,
      name: project.name || 'Untitled Project',
      description: project.description || null,
      project_type: project.project_type || project.type || null,
      status: project.status || 'draft',
      funding_needed: project.funding_needed ? parseFloat(project.funding_needed) : null,
      funding_request_amount: project.funding_request_amount ? parseFloat(project.funding_request_amount) : null,
      total_project_budget: project.total_project_budget ? parseFloat(project.total_project_budget) : null,
      location: project.location || null,
      project_location: project.project_location || null,
      timeline: project.timeline || null,
      project_duration: project.project_duration || null,
      proposed_start_date: project.proposed_start_date || null,
      funding_decision_needed: project.funding_decision_needed || null,
      estimated_people_served: project.estimated_people_served ? parseInt(project.estimated_people_served) : null,
      target_population: project.target_population || null,
      current_status: project.current_status || null,
      urgency_level: project.urgency_level || 'medium',
      industry: project.industry || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single()
    
    if (error) {
      console.error('Project creation error:', error)
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
    }
    
    return NextResponse.json({ project: data })
  } catch (e: any) {
    console.error('POST /api/projects error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, projectId, updates } = body || {}
    
    if (!userId || !projectId || !updates) {
      return NextResponse.json({ error: 'userId, projectId, and updates required' }, { status: 400 })
    }

    const supabase = getServerClient()

    // Sanitize numeric fields
    const numericFields = ['funding_needed', 'funding_request_amount', 'total_project_budget', 'estimated_people_served']
    const sanitizedUpdates: Record<string, any> = {}
    
    for (const [key, val] of Object.entries(updates)) {
      if (val === '') {
        sanitizedUpdates[key] = null
        continue
      }
      if (numericFields.includes(key)) {
        sanitizedUpdates[key] = val !== null && val !== undefined ? parseFloat(val as string) : null
      } else {
        sanitizedUpdates[key] = val
      }
    }

    const { data, error } = await supabase
      .from('projects')
      .update({ 
        ...sanitizedUpdates, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', projectId)
      .eq('user_id', userId) // Ensure user can only update their own projects
      .select()
      .single()
    
    if (error) {
      console.error('Project update error:', error)
      return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
    }
    
    return NextResponse.json({ project: data })
  } catch (e: any) {
    console.error('PUT /api/projects error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    const projectId = req.nextUrl.searchParams.get('projectId')
    
    if (!userId || !projectId) {
      return NextResponse.json({ error: 'userId and projectId required' }, { status: 400 })
    }

    const supabase = getServerClient()

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId) // Ensure user can only delete their own projects
    
    if (error) {
      console.error('Project deletion error:', error)
      return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('DELETE /api/projects error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}