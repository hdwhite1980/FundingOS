import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './supabase-config-validator.js'

// Validate and get Supabase configuration with detailed error handling
const config = getSupabaseConfig()

// Always create real Supabase client - no mock clients
export const supabase = createClient(config.url, config.anonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Helper to sanitize profile fields before upsert
function sanitizeProfilePayload(updates) {
  if (!updates || typeof updates !== 'object') return updates
  const numericFields = new Set([
    'annual_budget',
    'years_in_operation', 
    'full_time_staff',
    'board_size',
    // 'largest_grant', // REMOVED: This is a text field (under_10k, 10k_50k, etc.), not numeric
    'annual_revenue',
    'employee_count',
    // 'service_radius', // REMOVED: This is a text field (neighborhood/city/state/national), not numeric
    // Additional fields from database schema
    'incorporation_year',
    'years_operating',
    'part_time_staff',
    'volunteers',
    'board_members',
    'indirect_cost_rate'
  ])
  const out = {}
  for (const [k, v] of Object.entries(updates)) {
    if (v === '') { out[k] = null; continue }
    if (numericFields.has(k)) {
      if (v === null || v === undefined) { out[k] = null; continue }
      const n = typeof v === 'string' ? Number(v) : Number(v)
      out[k] = Number.isFinite(n) ? n : null
      continue
    }
    out[k] = v
  }
  return out
}

// Helper to sanitize project fields before insert/update
function sanitizeProjectPayload(input) {
  if (!input || typeof input !== 'object') return input

  const numericFields = new Set([
    'total_project_budget',
    'funding_request_amount',
    'cash_match_available',
    'in_kind_match_available',
    'estimated_people_served',
    'amount_raised',
    'funding_goal'
  ])
  const arrayFields = new Set([
    'project_categories',
    'primary_goals',
    'preferred_funding_types'
  ])

  const out = {}
  for (const [k, v] of Object.entries(input)) {
    // Normalize empty strings to null for all fields
    if (v === '') { out[k] = null; continue }

    // Coerce numeric fields
    if (numericFields.has(k)) {
      if (v === null || v === undefined) { out[k] = null; continue }
      const asNumber = typeof v === 'string' ? Number(v.toString().replace(/[^\d.-]/g, '')) : Number(v)
      out[k] = Number.isFinite(asNumber) ? asNumber : null
      continue
    }

    // Normalize array-like fields: ensure arrays are arrays, strip empty items
    if (arrayFields.has(k)) {
      if (v == null) { out[k] = null; continue }
      if (Array.isArray(v)) {
        out[k] = v.filter(item => item !== '' && item !== null && item !== undefined)
        continue
      }
      if (typeof v === 'string') {
        const trimmed = v.trim()
        if (!trimmed) { out[k] = null; continue }
        // If string looks like JSON array, parse it; else wrap as single-item array
        if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
          try {
            const parsed = JSON.parse(trimmed)
            if (Array.isArray(parsed)) {
              out[k] = parsed.filter(item => item !== '' && item !== null && item !== undefined)
              continue
            }
          } catch {}
        }
        out[k] = [trimmed]
        continue
      }
      // Unknown type, set null rather than risking malformed array
      out[k] = null
      continue
    }

    // Coerce date-like fields: keys ending with _date or _at, plus specific known names
    if (/(_date|_at)$/.test(k) || k === 'proposed_start_date') {
      if (v === null || v === undefined) { out[k] = null; continue }
      if (typeof v === 'string') {
        const trimmed = v.trim()
        if (!trimmed) { out[k] = null; continue }
        // Accept YYYY-MM-DD or ISO strings as-is; otherwise try to parse
        const isoLike = /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(trimmed)
        if (isoLike) { out[k] = trimmed; continue }
        const d = new Date(trimmed)
        out[k] = isNaN(d.getTime()) ? null : d.toISOString()
        continue
      }
      if (v instanceof Date) {
        out[k] = isNaN(v.getTime()) ? null : v.toISOString()
        continue
      }
    }

    out[k] = v
  }
  // Ensure required text fields are not null/empty
  if (out.location == null || (typeof out.location === 'string' && out.location.trim() === '')) {
    out.location = 'Unspecified'
  }
  
  // Derive project_type from project_categories if missing (legacy compatibility)
  if (out.project_type == null || (typeof out.project_type === 'string' && out.project_type.trim() === '')) {
    if (out.project_categories && Array.isArray(out.project_categories) && out.project_categories.length > 0) {
      out.project_type = out.project_categories[0]
    } else if (out.project_category && typeof out.project_category === 'string') {
      out.project_type = out.project_category
    } else {
      out.project_type = 'other'
    }
  }
  
  return out
}

// DIRECT USER SERVICES - These bypass session checks and work with user IDs directly
// Use these in your Dashboard.js component to avoid "No session found" errors
export const directUserServices = {
  profile: {
    async getOrCreateProfile(userId, userEmail) {
      try {
        // First try to get existing profile
        const { data: existingProfile, error: getError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)  // Changed from 'id' to 'user_id'
          .maybeSingle()

        if (existingProfile) {
          return existingProfile
        }

        // If no profile exists, create one
        if (getError && getError.code === 'PGRST116') {
          const newProfile = {
            user_id: userId,  // Changed from 'id' to 'user_id'
            email: userEmail,
            full_name: '',
            organization_name: '',
            organization_type: 'nonprofit',
            user_role: 'company', // default role
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          const { data: createdProfile, error: createError } = await supabase
            .from('user_profiles')
            .upsert(newProfile, { onConflict: 'user_id' })  // Changed conflict column
            .select()
            .single()

          if (createError) {
            console.error('Failed to create profile:', createError)
            return null
          }

          return createdProfile
        }

        console.error('Profile fetch error:', getError)
        return null
      } catch (error) {
        console.error('getOrCreateProfile error:', error)
        return null
      }
    },

    async updateProfile(userId, updates) {
      try {
        // Get current profile data for comparison
        const currentProfile = await this.getProfile(userId)
        
        const safe = sanitizeProfilePayload(updates)
        const { data, error } = await supabase
          .from('user_profiles')
          .upsert({
            user_id: userId,  // Foreign key to auth.users
            ...safe,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' })  // Match on user_id, not id
          .select()
          .single()

        if (error) {
          console.error('Profile update error:', error)
          return null
        }

        // Smart cache invalidation - only invalidate if significant changes
        try {
          const scoringCache = await import('./scoringCache.js')
          await scoringCache.default.smartInvalidateOnProfileUpdate(userId, currentProfile, data)
        } catch (cacheError) {
          console.warn('Cache invalidation failed:', cacheError)
          // Don't fail the update if cache invalidation fails
        }

        return data
      } catch (error) {
        console.error('updateProfile error:', error)
        return null
      }
    }
  },

  projects: {
    async getProjects(userId) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Projects fetch error:', error)
          return []
        }

        return data || []
      } catch (error) {
        console.error('getProjects error:', error)
        return []
      }
    },

    async createProject(userId, projectData) {
      try {
        console.log('Creating project with data:', projectData)
        
        // Create a copy of project data and handle array fields safely
        const newProject = sanitizeProjectPayload({
          ...projectData,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

        // Arrays are passed as arrays (not JSON strings) to match DB types

        console.log('Prepared project data for database:', newProject)

        const { data, error } = await supabase
          .from('projects')
          .insert([newProject])
          .select()
          .single()

        if (error) {
          console.error('Project creation error:', error)
          console.error('Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          throw new Error(`Failed to create project: ${error.message}`)
        }

        console.log('Project created successfully:', data)
        
        // When a new project is created, existing cached scores for other projects 
        // might become invalid (e.g., eligibility changes based on project portfolio)
        // For now, we'll be conservative and not invalidate since this is rare
        // But we could add logic here if needed
        
        return data
      } catch (error) {
        console.error('createProject error:', error)
        throw error
      }
    },

    async updateProject(userId, projectId, updates) {
      try {
        // Get current project data for comparison
        const currentProject = await this.getProject(userId, projectId)
        
        const { data, error } = await supabase
          .from('projects')
          .update({
            ...sanitizeProjectPayload(updates),
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId)
          .eq('user_id', userId)
          .select()
          .single()

        if (error) {
          console.error('Project update error:', error)
          return null
        }

        // Smart cache invalidation - only invalidate if significant changes
        try {
          const scoringCache = await import('./scoringCache.js')
          await scoringCache.default.smartInvalidateOnProjectUpdate(userId, projectId, currentProject, data)
        } catch (cacheError) {
          console.warn('Cache invalidation failed:', cacheError)
          // Don't fail the update if cache invalidation fails
        }

        return data
      } catch (error) {
        console.error('updateProject error:', error)
        return null
      }
    },

    async deleteProject(projectId, userId) {
      try {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId)
          .eq('user_id', userId)

        if (error) {
          console.error('Project deletion error:', error)
          return false
        }

        return true
      } catch (error) {
        console.error('deleteProject error:', error)
        return false
      }
    },

    async getRecentGrantActivity(userId, limit = 5) {
      try {
        if (!userId) {
          console.warn('getRecentGrantActivity: No userId provided')
          return []
        }

        console.log('getRecentGrantActivity: Using userId:', userId, 'limit:', limit)

        // Get recent grant application activity for projects
        const { data, error } = await supabase
          .from('submissions')
          .select(`
            *,
            projects:project_id (name, description),
            opportunities:opportunity_id (title, sponsor, amount_max)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) {
          console.error('Recent grant activity fetch error:', error)
          return []
        }

        // Format the data for dashboard use
        const formattedActivity = (data || []).map(submission => ({
          id: submission.id,
          project_name: submission.projects?.name || 'Unknown Project',
          project_id: submission.project_id,
          opportunity_title: submission.opportunities?.title || 'Unknown Grant',
          opportunity_sponsor: submission.opportunities?.sponsor || 'Unknown Sponsor',
          amount_requested: submission.submitted_amount,
          amount_awarded: submission.awarded_amount,
          status: submission.status,
          created_at: submission.created_at,
          submitted_date: submission.submitted_date || submission.created_at
        }))

        console.log('getRecentGrantActivity result count:', formattedActivity.length)
        return formattedActivity
      } catch (error) {
        console.error('getRecentGrantActivity error:', error)
        return []
      }
    }
  },

  opportunities: {
    async getOpportunities(filters = {}) {
      try {
        console.log('🔍 getOpportunities called with filters:', filters)
        
        // First, test basic database connectivity
        console.log('🧪 Testing basic database connectivity...')
        const { count, error: countError } = await supabase
          .from('opportunities')
          .select('*', { count: 'exact', head: true })
        
        if (countError) {
          console.error('❌ Database connectivity test failed:', countError)
          return []
        }
        
        console.log(`📊 Database connectivity OK. Total opportunities in table: ${count}`)
        
        // If table is empty, return early
        if (count === 0) {
          console.warn('⚠️ Opportunities table is empty!')
          return []
        }
        
        let query = supabase
          .from('opportunities')
          .select('*')
          .order('created_at', { ascending: false })

        console.log('📊 Base query created, applying filters...')

        // Apply filters using your actual column names
        // NOTE: Removing organization type filter as it's too restrictive
        // if (filters.organizationType) {
        //   console.log('🏢 Applying organization type filter:', filters.organizationType)
        //   query = query.contains('organization_types', [filters.organizationType])
        // }

        // PROJECT TYPES: Make this more flexible to include SAM.gov contracts and Grants.gov opportunities
        if (filters.projectTypes && filters.projectTypes.length > 0) {
          const projectType = filters.projectTypes[0] // Get the main project type
          
          // Create a more inclusive filter that includes SAM.gov contract types and "general" for Grants.gov
          const inclusiveTypes = [...filters.projectTypes]
          
          // Map user project types to include relevant SAM.gov contract types
          const projectTypeMapping = {
            'technology': ['technology', 'contract', 'services', 'research', 'general'],
            'technology_implementation': ['technology', 'contract', 'services', 'research', 'implementation', 'general'], // Added general
            'commercial_development': ['commercial_development', 'contract', 'services', 'development', 'general'],
            'infrastructure': ['infrastructure', 'contract', 'services', 'construction', 'general'],
            'research': ['research', 'contract', 'services', 'technology', 'general'],
            'healthcare': ['healthcare', 'contract', 'services', 'medical', 'general'],
            'education': ['education', 'contract', 'services', 'training', 'general'],
            'community_development': ['community_development', 'contract', 'services', 'development', 'general'],
            'environmental': ['environmental', 'contract', 'services', 'sustainability', 'general']
          }
          
          // Add related types for the main project type
          if (projectTypeMapping[projectType]) {
            inclusiveTypes.push(...projectTypeMapping[projectType])
          } else {
            // For unknown project types, include contracts, services, and general as fallback
            inclusiveTypes.push('contract', 'services', 'general')
          }
          
          // Remove duplicates
          const uniqueTypes = [...new Set(inclusiveTypes)]
          
          console.log(`🔍 Searching for project types: ${uniqueTypes.join(', ')}`)
          
          // Use overlap operator to find opportunities that match any of these types
          query = query.overlaps('project_types', uniqueTypes)
        }

        // AI categories filter (e.g., resources, non_monetary)
        if (filters.aiCategories && Array.isArray(filters.aiCategories) && filters.aiCategories.length > 0) {
          console.log('🏷️ Applying AI categories filter:', filters.aiCategories)
          query = query.overlaps('ai_categories', filters.aiCategories)
        }

        // Non-monetary only: additionally exclude records that specify cash amounts and require explicit AI non-monetary signal
        if (filters.nonMonetaryOnly) {
          console.log('🧲 Applying non-monetary only filter (no cash amounts, AI-verified non-monetary)')
          // Exclude if numeric amounts are present
          query = query.is('amount_min', null).is('amount_max', null)
          // Require explicit flag from AI analysis to avoid legacy mis-tagged records
          query = query.eq('ai_analysis->>isNonMonetaryResource', 'true')
          // Additional guards: exclude obvious monetary phrasing in title/description
          // Title exclusions (avoid generic 'grant' to keep software/in-kind grants)
          query = query
            .not('title', 'ilike', '%funding opportunity%')
            .not('title', 'ilike', '%nofo%')
            .not('title', 'ilike', '%sbir%')
            .not('title', 'ilike', '%sttr%')
          // Description exclusions
            .not('description', 'ilike', '%$%')
            .not('description', 'ilike', '% grant of %')
            .not('description', 'ilike', '% funding opportunity %')
            .not('description', 'ilike', '% cash %')
            .not('description', 'ilike', '% award %')
            .not('description', 'ilike', '% stipend %')
            .not('description', 'ilike', '% loan %')
        }

        // By default (when not explicitly asking for non-monetary/resources), exclude resource-type items from Grants
  // Resource-identifying tags (conservative set to avoid hiding legit grants)
  const resourceTags = ['resources','non_monetary','in_kind','software_grant','cloud_credits','data_credits','ad_credits']
        const wantsResources = Array.isArray(filters.aiCategories) && filters.aiCategories.some(t => resourceTags.includes(String(t).toLowerCase()))
        const excludeResourcesByDefault = !filters.nonMonetaryOnly && !wantsResources && (filters.excludeResources !== false)
        if (excludeResourcesByDefault) {
          console.log('🚫 Excluding resource-type items from Grants view by default')
          // Exclude AI-flagged non-monetary
          query = query.neq('ai_analysis->>isNonMonetaryResource', 'true')
          // Exclude items tagged with resource-related categories (safe: use multiple NOT CONTAINS checks)
          resourceTags.forEach(tag => {
            // PostgREST expects array literal braces
            query = query.not('ai_categories', 'cs', `{${tag}}`)
          })
          // Heuristic guardrails for well-known resource cues
          const resourceTitleCues = [
            '%ad grant%', '%ad grants%', '%nonprofit advertising%', '%promotional credit%', '%cloud credit%'
          ]
          resourceTitleCues.forEach(cue => {
            query = query.not('title', 'ilike', cue)
          })
          const resourceDescCues = [
            '%advertising credit%', '%ad credit%', '%promotional credit%', '%cloud credit%'
          ]
          resourceDescCues.forEach(cue => {
            query = query.not('description', 'ilike', cue)
          })
        }

        if (filters.minAmount) {
          console.log('💰 Applying min amount filter:', filters.minAmount)
          query = query.gte('amount_max', filters.minAmount)
        }

        if (filters.maxAmount) {
          console.log('💰 Applying max amount filter:', filters.maxAmount)
          query = query.lte('amount_min', filters.maxAmount)
        }

        console.log('🚀 Executing database query...')
  const { data, error } = await query.limit(200)

        if (error) {
          console.error('❌ Opportunities fetch error:', error)
          return []
        }

        console.log(`📊 Database returned ${data?.length || 0} opportunities`)
        console.log('📝 Sample opportunity data:', data?.slice(0, 2)?.map(o => ({ 
          id: o.id, 
          title: o.title?.substring(0, 50), 
          project_types: o.project_types,
          source: o.source 
        })))

        console.log(`📊 Found ${data?.length || 0} opportunities (including ${data?.filter(opp => opp.source === 'sam_gov').length || 0} SAM.gov contracts)`)

        // If we got 0 results and we were filtering by project types, try again without project type filter
        if ((data?.length || 0) === 0 && filters.projectTypes && filters.projectTypes.length > 0) {
          console.log('🔄 No matches with project type filter, trying without project type restriction...')
          
          let fallbackQuery = supabase
            .from('opportunities')
            .select('*')
            .order('created_at', { ascending: false })

          console.log('🔄 Creating fallback query without project types...')

          // Apply other filters (but not projectTypes or organizationType)
          // NOTE: Removing organization type filter from fallback as it's too restrictive
          // if (filters.organizationType) {
          //   console.log('🔄 Fallback: Applying organization type filter:', filters.organizationType)
          //   fallbackQuery = fallbackQuery.contains('organization_types', [filters.organizationType])
          // }

          // Re-apply critical filters that should persist in fallback
          if (filters.aiCategories && Array.isArray(filters.aiCategories) && filters.aiCategories.length > 0) {
            console.log('🔄 Fallback: Applying AI categories filter:', filters.aiCategories)
            fallbackQuery = fallbackQuery.overlaps('ai_categories', filters.aiCategories)
          }

          if (filters.nonMonetaryOnly) {
            console.log('🔄 Fallback: Applying non-monetary only guards')
            fallbackQuery = fallbackQuery
              .is('amount_min', null)
              .is('amount_max', null)
              .eq('ai_analysis->>isNonMonetaryResource', 'true')
              .not('title', 'ilike', '%funding opportunity%')
              .not('title', 'ilike', '%nofo%')
              .not('title', 'ilike', '%sbir%')
              .not('title', 'ilike', '%sttr%')
              .not('description', 'ilike', '%$%')
              .not('description', 'ilike', '% grant of %')
              .not('description', 'ilike', '% funding opportunity %')
              .not('description', 'ilike', '% cash %')
              .not('description', 'ilike', '% award %')
              .not('description', 'ilike', '% stipend %')
              .not('description', 'ilike', '% loan %')
          }

          if (filters.minAmount) {
            console.log('🔄 Fallback: Applying min amount filter:', filters.minAmount)
            fallbackQuery = fallbackQuery.gte('amount_max', filters.minAmount)
          }

          if (filters.maxAmount) {
            console.log('🔄 Fallback: Applying max amount filter:', filters.maxAmount)
            fallbackQuery = fallbackQuery.lte('amount_min', filters.maxAmount)
          }

          // Apply default resource exclusion to fallback as well
          if (excludeResourcesByDefault) {
            console.log('🚫 Fallback: Excluding resource-type items by default')
            fallbackQuery = fallbackQuery.neq('ai_analysis->>isNonMonetaryResource', 'true')
            resourceTags.forEach(tag => {
              fallbackQuery = fallbackQuery.not('ai_categories', 'cs', `{${tag}}`)
            })
            const resourceTitleCues = [
              '%ad grant%', '%ad grants%', '%nonprofit advertising%', '%promotional credit%', '%cloud credit%'
            ]
            resourceTitleCues.forEach(cue => {
              fallbackQuery = fallbackQuery.not('title', 'ilike', cue)
            })
            const resourceDescCues = [
              '%advertising credit%', '%ad credit%', '%promotional credit%', '%cloud credit%'
            ]
            resourceDescCues.forEach(cue => {
              fallbackQuery = fallbackQuery.not('description', 'ilike', cue)
            })
          }

          console.log('🚀 Executing fallback database query...')
          const { data: fallbackData, error: fallbackError } = await fallbackQuery.limit(200)
          
          if (fallbackError) {
            console.error('❌ Fallback query error:', fallbackError)
          } else {
            console.log(`📊 Fallback query returned ${fallbackData?.length || 0} opportunities`)
            console.log('📝 Fallback sample data:', fallbackData?.slice(0, 2)?.map(o => ({ 
              id: o.id, 
              title: o.title?.substring(0, 50), 
              project_types: o.project_types,
              source: o.source 
            })))
          }
          
          if (!fallbackError && fallbackData && fallbackData.length > 0) {
            console.log(`📊 Fallback found ${fallbackData.length} opportunities without project type filter`)
            return fallbackData
          }
        }

        return data || []
      } catch (error) {
        console.error('getOpportunities error:', error)
        return []
      }
    },

    async getSavedOpportunities(userId) {
      try {
        if (!userId) {
          console.warn('getSavedOpportunities: No userId provided')
          return []
        }

        // Get saved opportunities from project_opportunities table
        const { data, error } = await supabase
          .from('project_opportunities')
          .select(`
            *,
            opportunities:opportunity_id (*),
            projects:project_id (name, description)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Saved opportunities fetch error:', error)
          return []
        }

        // Format the data for dashboard use
        const formattedOpportunities = (data || []).map(saved => ({
          id: saved.opportunities?.id || saved.id,
          title: saved.opportunities?.title || 'Unknown Opportunity',
          funder_name: saved.opportunities?.sponsor || 'Unknown Sponsor',
          amount_min: saved.opportunities?.amount_min || 0,
          amount_max: saved.opportunities?.amount_max || 0,
          deadline_date: saved.opportunities?.deadline_date || null,
          fit_score: saved.fit_score || 0,
          status: saved.status || 'saved',
          project_name: saved.projects?.name || 'Unknown Project',
          project_id: saved.project_id,
          created_at: saved.created_at,
          ai_analysis: saved.ai_analysis
        }))

        console.log('getSavedOpportunities result count:', formattedOpportunities.length)
        return formattedOpportunities
      } catch (error) {
        console.error('getSavedOpportunities error:', error)
        return []
      }
    }
  },

  donors: {
    async getDonors(userId, filters = {}) {
      try {
        let query = supabase
          .from('donors')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (filters.search) {
          query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
        }

        if (filters.donorType) {
          query = query.eq('donor_type', filters.donorType)
        }

        if (filters.majorDonor !== undefined) {
          query = query.eq('is_major_donor', filters.majorDonor)
        }

        const { data, error } = await query
        
        if (error) {
          console.error('Donors fetch error:', error)
          // Check if it's an authentication error
          if (error.code === '401' || error.message?.includes('401')) {
            console.error('Authentication error - check RLS policies for donors table')
            throw new Error('Authentication failed. Please check your login status.')
          }
          return []
        }

        return data || []
      } catch (error) {
        console.error('getDonors error:', error)
        if (error.message?.includes('Authentication failed')) {
          throw error
        }
        return []
      }
    },

    async createDonor(userId, donorData) {
      try {
        // Use service role API for reliable donor creation
        return await this.createDonorViaAPI(userId, donorData)
      } catch (error) {
        console.error('createDonor error:', error)
        throw error
      }
    },

    async updateDonor(userId, donorId, updates) {
      try {
        // Use service role API for reliable donor update
        return await this.updateDonorViaAPI(userId, donorId, updates)
      } catch (error) {
        console.error('updateDonor error:', error)
        return null
      }
    },

    async deleteDonor(userId, donorId) {
      try {
        // Use service role API for reliable donor deletion
        return await this.deleteDonorViaAPI(userId, donorId)
      } catch (error) {
        console.error('deleteDonor error:', error)
        return false
      }
    },

    async getDonorStats(userId) {
      try {
        // Get donors data for basic stats
        const { data: donors, error: donorError } = await supabase
          .from('donors')
          .select('total_donated, is_major_donor')
          .eq('user_id', userId)

        // Get donations data for accurate total donations count and fallback calculations
        const { data: donations, error: donationError } = await supabase
          .from('donations')
          .select('amount, donor_id')
          .eq('user_id', userId)

        if (donorError && donationError) {
          console.error('Both donor and donation stats errors:', donorError, donationError)
          return {
            totalDonors: 0,
            totalRaised: 0,
            totalDonations: 0,
            avgDonationAmount: 0,
            majorDonors: 0,
            thisYearRaised: 0
          }
        }

        // Calculate from donations table (most accurate)
        const donationsList = donations || []
        const totalDonations = donationsList.length
        const totalRaisedFromDonations = donationsList.reduce((sum, donation) => sum + (donation.amount || 0), 0)

        // Calculate from donors table for comparison and fallback
        const donorsList = donors || []
        const totalDonors = donorsList.length
        const totalRaisedFromDonors = donorsList.reduce((sum, donor) => sum + (donor.total_donated || 0), 0)
        const majorDonors = donorsList.filter(donor => donor.is_major_donor).length

        // Use donations table data as primary source (more accurate)
        const totalRaised = totalRaisedFromDonations > 0 ? totalRaisedFromDonations : totalRaisedFromDonors
        const avgDonationAmount = totalDonations > 0 ? Math.round(totalRaised / totalDonations) : 0

        console.log('💰 Donor Stats Calculated:', {
          totalDonors,
          totalRaised,
          totalDonations,
          avgDonationAmount,
          majorDonors
        })

        // Calculate this year's donations
        const currentYear = new Date().getFullYear()
        const thisYearDonations = donationsList.filter(donation => {
          const donationYear = new Date(donation.created_at || donation.donation_date).getFullYear()
          return donationYear === currentYear
        })
        const thisYearRaised = thisYearDonations.reduce((sum, donation) => sum + (donation.amount || 0), 0)

        return {
          totalDonors,
          totalRaised,
          totalDonations,
          avgDonationAmount,
          majorDonors,
          thisYearRaised
        }
      } catch (error) {
        console.error('getDonorStats error:', error)
        return {
          totalDonors: 0,
          totalRaised: 0,
          totalDonations: 0,
          avgDonationAmount: 0,
          majorDonors: 0,
          thisYearRaised: 0
        }
      }
    },

    async getDonations(userId, filters = {}) {
      try {
        let query = supabase
          .from('donations')
          .select(`
            *,
            donor:donors(id, name, email, donor_type),
            project:projects(id, name)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (filters.donorId) {
          query = query.eq('donor_id', filters.donorId)
        }

        if (filters.projectId) {
          query = query.eq('project_id', filters.projectId)
        }

        if (filters.startDate) {
          query = query.gte('created_at', filters.startDate)
        }

        if (filters.endDate) {
          query = query.lte('created_at', filters.endDate)
        }

        const { data, error } = await query
        
        if (error) {
          console.error('Donations fetch error:', error)
          return []
        }

        return data || []
      } catch (error) {
        console.error('getDonations error:', error)
        return []
      }
    },

    async createDonation(userId, donationData) {
      try {
        // Use service role API for reliable donation creation
        const donation = await this.createDonationViaAPI(userId, donationData)
        
        // Update donor statistics if donor_id is provided
        if (donation.donor_id) {
          await this.updateDonorStats(userId, donation.donor_id)
        }

        return donation
      } catch (error) {
        console.error('createDonation error:', error)
        return null
      }
    },

    async updateDonorStats(userId, donorId) {
      try {
        // Get all donations for this donor
        const { data: donations, error: donationsError } = await supabase
          .from('donations')
          .select('amount, donation_date')
          .eq('user_id', userId)
          .eq('donor_id', donorId)

        if (donationsError) {
          console.error('Error fetching donations for donor stats:', donationsError)
          return
        }

        const totalDonated = donations.reduce((sum, d) => sum + (d.amount || 0), 0)
        const donationCount = donations.length
        const lastDonationDate = donations.length > 0 ? 
          donations.sort((a, b) => new Date(b.donation_date) - new Date(a.donation_date))[0].donation_date : 
          null
        const isMajorDonor = totalDonated >= 1000

        // Update donor record
        const { error: updateError } = await supabase
          .from('donors')
          .update({
            total_donated: totalDonated,
            donation_count: donationCount,
            last_donation_date: lastDonationDate,
            is_major_donor: isMajorDonor,
            updated_at: new Date().toISOString()
          })
          .eq('id', donorId)
          .eq('user_id', userId)

        if (updateError) {
          console.error('Error updating donor stats:', updateError)
        }
      } catch (error) {
        console.error('updateDonorStats error:', error)
      }
    },

    async refreshAllDonorStats(userId) {
      try {
        // Get all donors for the user
        const { data: donors, error: donorsError } = await supabase
          .from('donors')
          .select('id')
          .eq('user_id', userId)

        if (donorsError) {
          console.error('Error fetching donors for refresh:', donorsError)
          return false
        }

        // Update stats for each donor
        for (const donor of donors || []) {
          await this.updateDonorStats(userId, donor.id)
        }

        return true
      } catch (error) {
        console.error('refreshAllDonorStats error:', error)
        return false
      }
    },

    async getTotalAmountReceived(userId) {
      try {
        // Get total from awarded grants/funding
        const { data: applications, error: appError } = await supabase
          .from('submissions')
          .select('awarded_amount')
          .eq('user_id', userId)
          .eq('status', 'awarded')

        // Get total from donations
        const { data: donations, error: donationError } = await supabase
          .from('donations')
          .select('amount')
          .eq('user_id', userId)

        // Get total from campaigns (if you have a campaigns table)
        // For now, we'll just use donations and applications
        
        let totalAwarded = 0
        let totalDonations = 0

        if (!appError && applications) {
          totalAwarded = applications.reduce((sum, app) => sum + (app.awarded_amount || 0), 0)
        }

        if (!donationError && donations) {
          totalDonations = donations.reduce((sum, donation) => sum + (donation.amount || 0), 0)
        }

        return {
          totalAwarded,
          totalDonations,
          totalReceived: totalAwarded + totalDonations,
          breakdown: {
            funding: totalAwarded,
            donations: totalDonations,
            campaigns: 0 // TODO: Add campaigns when implemented
          }
        }
      } catch (error) {
        console.error('getTotalAmountReceived error:', error)
        return {
          totalAwarded: 0,
          totalDonations: 0,
          totalReceived: 0,
          breakdown: { funding: 0, donations: 0, campaigns: 0 }
        }
      }
    },

    async getFinancialInsights(userId) {
      try {
        // Get recent financial activity for insights
        const [recentDonations, recentAwards, monthlyStats] = await Promise.all([
          supabase
            .from('donations')
            .select('amount, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('submissions')
            .select('awarded_amount, status, created_at')
            .eq('user_id', userId)
            .eq('status', 'awarded')
            .order('created_at', { ascending: false })
            .limit(3),
          supabase
            .from('donations')
            .select('amount, created_at')
            .eq('user_id', userId)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        ])

        // Calculate trends and insights
        const insights = []
        
        // Recent activity insight
        if (recentDonations.data?.length > 0) {
          const latestDonation = recentDonations.data[0]
          const daysAgo = Math.floor((new Date() - new Date(latestDonation.created_at)) / (1000 * 60 * 60 * 24))
          insights.push({
            type: 'recent_activity',
            title: 'Recent Donation',
            description: `$${latestDonation.amount.toLocaleString()} received ${daysAgo === 0 ? 'today' : `${daysAgo} days ago`}`,
            icon: 'heart',
            color: 'green'
          })
        }

        // Award success insight
        if (recentAwards.data?.length > 0) {
          const latestAward = recentAwards.data[0]
          insights.push({
            type: 'grant_success',
            title: 'Grant Awarded',
            description: `$${latestAward.awarded_amount.toLocaleString()} in funding secured`,
            icon: 'trophy',
            color: 'gold'
          })
        }

        // Monthly trend insight
        if (monthlyStats.data?.length > 0) {
          const monthlyTotal = monthlyStats.data.reduce((sum, d) => sum + d.amount, 0)
          insights.push({
            type: 'monthly_trend',
            title: 'This Month',
            description: `$${monthlyTotal.toLocaleString()} in donations received`,
            icon: 'trending-up',
            color: 'blue'
          })
        }

        return insights
      } catch (error) {
        console.error('getFinancialInsights error:', error)
        return []
      }
    },

    async getRecentDonations(userId, limit = 5) {
      try {
        if (!userId) {
          console.warn('getRecentDonations: No userId provided')
          return []
        }

        console.log('getRecentDonations: Using userId:', userId, 'limit:', limit)

        const { data, error } = await supabase
          .from('donations')
          .select(`
            *,
            donor:donors(id, name, email, donor_type)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) {
          console.error('Recent donations fetch error:', error)
          return []
        }

        // Format the data for dashboard use
        const formattedDonations = (data || []).map(donation => ({
          id: donation.id,
          amount: donation.amount,
          donor_name: donation.donor?.name || 'Anonymous',
          donor_email: donation.donor?.email,
          donor_type: donation.donor?.donor_type,
          created_at: donation.created_at,
          donation_date: donation.donation_date || donation.created_at,
          project_id: donation.project_id,
          notes: donation.notes
        }))

        console.log('getRecentDonations result count:', formattedDonations.length)
        return formattedDonations
      } catch (error) {
        console.error('getRecentDonations error:', error)
        return []
      }
    },

    async getDonationsByProject(projectId) {
      try {
        const { data, error } = await supabase
          .from('donations')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Donations by project fetch error:', error)
          return []
        }

        return data || []
      } catch (error) {
        console.error('getDonationsByProject error:', error)
        return []
      }
    }
  },

  campaigns: {
    async getCampaigns(userId, filters = {}) {
      try {
        let query = supabase
          .from('campaigns')
          .select(`
            *,
            project:projects(id, name)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (filters.status) {
          query = query.eq('status', filters.status)
        }

        if (filters.platform) {
          query = query.eq('platform', filters.platform)
        }

        if (filters.projectId) {
          query = query.eq('project_id', filters.projectId)
        }

        if (filters.search) {
          query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
        }

        const { data, error } = await query
        
        if (error) {
          console.error('Campaigns fetch error:', error)
          return []
        }

        return data || []
      } catch (error) {
        console.error('getCampaigns error:', error)
        return []
      }
    },

    async createCampaign(userId, campaignData) {
      try {
        // Use service role API for reliable campaign creation
        return await this.createCampaignViaAPI(userId, campaignData)
      } catch (error) {
        console.error('createCampaign error:', error)
        throw error
      }
    },

    async updateCampaign(userId, campaignId, updates) {
      try {
        const { data, error } = await supabase
          .from('campaigns')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', campaignId)
          .eq('user_id', userId)
          .select()
          .single()

        if (error) {
          console.error('Campaign update error:', error)
          throw error
        }

        return data
      } catch (error) {
        console.error('updateCampaign error:', error)
        throw error
      }
    },

    async deleteCampaign(userId, campaignId) {
      try {
        const { error } = await supabase
          .from('campaigns')
          .delete()
          .eq('id', campaignId)
          .eq('user_id', userId)

        if (error) {
          console.error('Campaign deletion error:', error)
          throw error
        }

        return true
      } catch (error) {
        console.error('deleteCampaign error:', error)
        throw error
      }
    },

    async getCampaignStats(userId) {
      try {
        const { data: campaigns, error } = await supabase
          .from('campaigns')
          .select('status, raised_amount, goal_amount, supporter_count')
          .eq('user_id', userId)

        if (error) {
          console.error('Campaign stats error:', error)
          return {
            totalCampaigns: 0,
            activeCampaigns: 0,
            totalRaised: 0,
            totalGoal: 0,
            totalSupporters: 0
          }
        }

        const stats = campaigns.reduce((acc, campaign) => {
          acc.totalCampaigns++
          if (campaign.status === 'active') acc.activeCampaigns++
          acc.totalRaised += parseFloat(campaign.raised_amount || 0)
          acc.totalGoal += parseFloat(campaign.goal_amount || 0)
          acc.totalSupporters += parseInt(campaign.supporter_count || 0)
          return acc
        }, {
          totalCampaigns: 0,
          activeCampaigns: 0,
          totalRaised: 0,
          totalGoal: 0,
          totalSupporters: 0
        })

        return stats
      } catch (error) {
        console.error('getCampaignStats error:', error)
        return {
          totalCampaigns: 0,
          activeCampaigns: 0,
          totalRaised: 0,
          totalGoal: 0,
          totalSupporters: 0
        }
      }
    },

    async getCampaignsByProject(projectId) {
      try {
        const { data, error } = await supabase
          .from('campaigns')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Campaigns by project fetch error:', error)
          return []
        }

        return data || []
      } catch (error) {
        console.error('getCampaignsByProject error:', error)
        return []
      }
    }
  },

  investors: {
    async getInvestors(userId, filters = {}) {
      try {
        // Use service role API for reliable investor fetching
        console.log('🚀 Using service role API for investor fetching')
        
        const params = new URLSearchParams({ userId })
        const response = await fetch(`/api/investors?${params}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          const error = await response.json()
          console.error('Investors fetch error:', error)
          return []
        }

        const result = await response.json()
        let investors = result.investors || []
        
        // Apply client-side filters if needed
        if (filters.status) {
          investors = investors.filter(inv => inv.status === filters.status)
        }
        
        if (filters.investorType) {
          investors = investors.filter(inv => inv.investor_type === filters.investorType)
        }
        
        if (filters.search) {
          const searchLower = filters.search.toLowerCase()
          investors = investors.filter(inv => 
            inv.name?.toLowerCase().includes(searchLower) ||
            inv.company?.toLowerCase().includes(searchLower) ||
            inv.focus_areas?.toLowerCase().includes(searchLower)
          )
        }

        console.log('✅ Retrieved and filtered investors:', investors.length)
        return investors
      } catch (error) {
        console.error('getInvestors error:', error)
        return []
      }
    },

    async createInvestor(userId, investorData) {
      try {
        // Use service role API for reliable investor creation
        console.log('🚀 Using service role API for investor creation')
        
        const response = await fetch('/api/investors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...investorData,
            user_id: userId
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || errorData.error || 'Failed to create investor')
        }

        const result = await response.json()
        console.log('✅ Investor created via API:', result.investor?.id)
        return result.investor
      } catch (error) {
        console.error('createInvestor error:', error)
        throw error
      }
    },

    async updateInvestor(userId, investorId, updates) {
      try {
        const { data, error } = await supabase
          .from('investors')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', investorId)
          .eq('user_id', userId)
          .select()
          .single()

        if (error) {
          console.error('Investor update error:', error)
          throw error
        }

        return data
      } catch (error) {
        console.error('updateInvestor error:', error)
        throw error
      }
    },

    async deleteInvestor(userId, investorId) {
      try {
        // Use service role API for reliable investor deletion
        console.log('🚀 Using service role API for investor deletion')
        
        const response = await fetch(`/api/investors?id=${investorId}&userId=${userId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || errorData.error || 'Failed to delete investor')
        }

        console.log('✅ Investor deleted via API:', investorId)
        return true
      } catch (error) {
        console.error('deleteInvestor error:', error)
        throw error
      }
    },

    async getInvestments(userId, filters = {}) {
      try {
        // Use service role API for reliable investment fetching
        console.log('🚀 Using service role API for investment fetching')
        
        const params = new URLSearchParams({ userId })
        if (filters.investorId) {
          params.append('investorId', filters.investorId)
        }
        
        const response = await fetch(`/api/investments?${params}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          const error = await response.json()
          console.error('Investments fetch error:', error)
          return []
        }

        const result = await response.json()
        let investments = result.investments || []
        
        // Apply additional client-side filters if needed
        if (filters.projectId) {
          investments = investments.filter(inv => inv.project_id === filters.projectId)
        }
        
        if (filters.investmentType) {
          investments = investments.filter(inv => inv.investment_type === filters.investmentType)
        }

        console.log('✅ Retrieved and filtered investments:', investments.length)
        return investments
      } catch (error) {
        console.error('getInvestments error:', error)
        return []
      }
    },

    async createInvestment(userId, investmentData) {
      try {
        // Use service role API for reliable investment creation
        console.log('🚀 Using service role API for investment creation')
        
        const response = await fetch('/api/investments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...investmentData,
            user_id: userId
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || errorData.error || 'Failed to create investment')
        }

        const result = await response.json()
        console.log('✅ Investment created via API:', result.investment.id)
        return result.investment
      } catch (error) {
        console.error('createInvestment error:', error)
        throw error
      }
    },

    async deleteInvestment(userId, investmentId) {
      try {
        // Use service role API for reliable investment deletion
        console.log('🚀 Using service role API for investment deletion')
        
        const response = await fetch(`/api/investments?id=${investmentId}&userId=${userId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || errorData.error || 'Failed to delete investment')
        }

        console.log('✅ Investment deleted via API:', investmentId)
        return true
      } catch (error) {
        console.error('deleteInvestment error:', error)
        throw error
      }
    },

    async getInvestmentsByProject(projectId) {
      try {
        const { data, error } = await supabase
          .from('investments')

          .insert([newInvestment])
          .select()
          .single()

        if (error) {
          console.error('Investment creation error:', error)
          throw error
        }

        return data
      } catch (error) {
        console.error('createInvestment error:', error)
        throw error
      }
    },

    async getInvestmentsByProject(projectId) {
      try {
        const { data, error } = await supabase
          .from('investments')
          .select('*, investor:investors(*)')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Investments by project fetch error:', error)
          return []
        }

        return data || []
      } catch (error) {
        console.error('getInvestmentsByProject error:', error)
        return []
      }
    },

    async getInvestorStats(userId) {
      try {
        console.log('📊 Getting investor stats for user:', userId)
        
        // Use service role API to bypass RLS issues
        const params = new URLSearchParams({ userId })
        const response = await fetch(`/api/investments?${params}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          console.error('Failed to fetch investments via API')
          return {
            totalInvestors: 0,
            totalInvested: 0,
            activeInvestments: 0
          }
        }

        const result = await response.json()
        const investments = result.investments || []

        console.log('💼 Raw investments data from API:', investments)

        // Get unique investors count via API
        const investorsResponse = await fetch(`/api/investors?${params}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        let investorCount = 0
        if (investorsResponse.ok) {
          const investorsResult = await investorsResponse.json()
          investorCount = (investorsResult.investors || []).length
        }

        console.log('👥 Investor count:', investorCount)

        // Calculate stats
        const totalInvested = investments.reduce((sum, inv) => {
          const amount = parseFloat(inv.amount || 0)
          console.log('  Adding investment amount:', amount)
          return sum + amount
        }, 0)
        
        const activeInvestments = investments.filter(inv => 
          inv.status === 'active' || inv.status === 'completed'
        ).length

        const stats = {
          totalInvestors: investorCount,
          totalInvested: totalInvested,
          activeInvestments: activeInvestments
        }

        console.log('✅ Investor stats calculated:', stats)
        return stats
      } catch (error) {
        console.error('getInvestorStats error:', error)
        return {
          totalInvestors: 0,
          totalInvested: 0,
          activeInvestments: 0
        }
      }
    }
  },

  applications: {
    async getApplications(userId, filters = {}) {
      try {
        let query = supabase
          .from('submissions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (filters.status) {
          query = query.eq('status', filters.status)
        }

        if (filters.projectId) {
          query = query.eq('project_id', filters.projectId)
        }

        const { data, error } = await query
        
        if (error) {
          console.error('Applications fetch error:', error)
          return []
        }

        return data || []
      } catch (error) {
        console.error('getApplications error:', error)
        return []
      }
    },

    async createApplication(userId, applicationData) {
      try {
        console.log('Creating application with data:', applicationData)
        console.log('User ID:', userId)
        
        const newApplication = {
          ...applicationData,
          user_id: userId,
          status: applicationData.status || 'submitted',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        // Remove any undefined or null values
        Object.keys(newApplication).forEach(key => {
          if (newApplication[key] === undefined || newApplication[key] === '') {
            delete newApplication[key]
          }
        })

        console.log('Final application data to insert:', newApplication)

        const { data, error } = await supabase
          .from('submissions')
          .insert([newApplication])
          .select()
          .single()

        if (error) {
          console.error('Application creation error:', error)
          console.error('Error details:', JSON.stringify(error, null, 2))
          throw error // Throw the error instead of returning null
        }

        console.log('Application created successfully:', data)
        return data
      } catch (error) {
        console.error('createApplication error:', error)
        throw error // Re-throw to let the component handle it
      }
    },

    // NEW: Service role-based application creation that bypasses RLS issues
    async createApplicationViaAPI(userId, applicationData) {
      try {
        console.log('🚀 Using service role API for application creation')
        
        const response = await fetch('/api/applications/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...applicationData,
            user_id: userId
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || errorData.error || 'Failed to create application')
        }

        const result = await response.json()
        console.log('✅ Application created via API:', result.application?.id)
        return result.application
        
      } catch (error) {
        console.error('createApplicationViaAPI error:', error)
        throw error
      }
    },

    async updateApplication(userId, applicationId, updates) {
      try {
        const { data, error } = await supabase
          .from('submissions')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', applicationId)
          .eq('user_id', userId)
          .select()
          .single()

        if (error) {
          console.error('Application update error:', error)
          return null
        }

        return data
      } catch (error) {
        console.error('updateApplication error:', error)
        return null
      }
    },

    async deleteApplication(userId, applicationId) {
      try {
        const { error } = await supabase
          .from('submissions')
          .delete()
          .eq('id', applicationId)
          .eq('user_id', userId)

        if (error) {
          console.error('Application deletion error:', error)
          return false
        }

        return true
      } catch (error) {
        console.error('deleteApplication error:', error)
        return false
      }
    },

    async getSubmissionStats(userId) {
      try {
        if (!userId) {
          console.warn('getSubmissionStats: No userId provided')
          console.trace('getSubmissionStats called without userId') // Add stack trace
          return {
            totalSubmissions: 0,
            totalRequested: 0,
            totalAwarded: 0,
            successRate: 0
          }
        }

        console.log('getSubmissionStats: Using userId:', userId) // Debug log

        const { data, error } = await supabase
          .from('submissions')
          .select('status, submitted_amount, awarded_amount')
          .eq('user_id', userId)

        if (error) {
          console.error('Application stats error:', error)
          return {
            totalSubmissions: 0,
            totalRequested: 0,
            totalAwarded: 0,
            successRate: 0
          }
        }

        const applications = data || []
        const totalSubmissions = applications.length
        const totalRequested = applications.reduce((sum, app) => sum + (app.submitted_amount || 0), 0)
        const totalAwarded = applications.reduce((sum, app) => sum + (app.awarded_amount || 0), 0)
        const successfulApps = applications.filter(app => app.status === 'awarded').length
        const successRate = totalSubmissions > 0 ? Math.round((successfulApps / totalSubmissions) * 100) : 0

        console.log('getSubmissionStats result:', { totalSubmissions, totalRequested, totalAwarded, successRate }) // Debug log

        return {
          totalSubmissions,
          totalRequested,
          totalAwarded,
          successRate
        }
      } catch (error) {
        console.error('getSubmissionStats error:', error)
        console.trace('getSubmissionStats error stack trace') // Add stack trace
        return {
          totalSubmissions: 0,
          totalRequested: 0,
          totalAwarded: 0,
          successRate: 0
        }
      }
    },

    async getSubmissions(userId, filters = {}) {
      try {
        if (!userId) {
          console.warn('getSubmissions: No userId provided')
          console.trace('getSubmissions called without userId') // Add stack trace
          return []
        }

        console.log('getSubmissions: Using userId:', userId) // Debug log

        let query = supabase
          .from('submissions')
          .select(`
            *,
            projects:project_id (name, description),
            opportunities:opportunity_id (title, sponsor, deadline_date)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (filters.status) {
          query = query.eq('status', filters.status)
        }

        if (filters.projectId) {
          query = query.eq('project_id', filters.projectId)
        }

        if (filters.opportunityId) {
          query = query.eq('opportunity_id', filters.opportunityId)
        }

        if (filters.dateFrom) {
          query = query.gte('created_at', filters.dateFrom)
        }

        if (filters.dateTo) {
          query = query.lte('created_at', filters.dateTo)
        }

        const { data, error } = await query
        
        if (error) {
          console.error('Submissions fetch error:', error)
          return []
        }

        console.log('getSubmissions result count:', data?.length || 0) // Debug log
        return data || []
      } catch (error) {
        console.error('getSubmissions error:', error)
        console.trace('getSubmissions error stack trace') // Add stack trace
        return []
      }
    },

    async getRecentActivity(userId, limit = 5) {
      try {
        if (!userId) {
          console.warn('getRecentActivity: No userId provided')
          return []
        }

        console.log('getRecentActivity: Using userId:', userId, 'limit:', limit)

        const { data, error } = await supabase
          .from('submissions')
          .select(`
            *,
            projects:project_id (name, description),
            opportunities:opportunity_id (title, sponsor)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) {
          console.error('Recent activity fetch error:', error)
          return []
        }

        // Format the data for dashboard use
        const formattedActivity = (data || []).map(submission => ({
          id: submission.id,
          project_name: submission.projects?.name || 'Unknown Project',
          grant_title: submission.opportunities?.title || 'Unknown Opportunity',
          created_at: submission.created_at,
          amount_requested: submission.submitted_amount,
          status: submission.status
        }))

        console.log('getRecentActivity result count:', formattedActivity.length)
        return formattedActivity
      } catch (error) {
        console.error('getRecentActivity error:', error)
        return []
      }
    },

    async createGrantWriterReview(userId, reviewData) {
      try {
        console.log('Creating grant writer review with data:', reviewData)
        console.log('User ID:', userId)
        
        const newReview = {
          ...reviewData,
          user_id: userId,
          status: reviewData.status || 'pending_review',
          requested_at: reviewData.requested_at || new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        // Remove any undefined or null values
        Object.keys(newReview).forEach(key => {
          if (newReview[key] === undefined || newReview[key] === '') {
            delete newReview[key]
          }
        })

        console.log('Final review data to insert:', newReview)

        // Assuming there's a grant_writer_reviews table
        const { data, error } = await supabase
          .from('grant_writer_reviews')
          .insert([newReview])
          .select()
          .single()

        if (error) {
          console.error('Grant writer review creation error:', error)
          console.error('Error details:', JSON.stringify(error, null, 2))
          throw error
        }

        console.log('Grant writer review created successfully:', data)
        return data
      } catch (error) {
        console.error('createGrantWriterReview error:', error)
        throw error
      }
    }
  },

  projectOpportunities: {
    // NOTE: Your project_opportunities table is missing user_id column
    // This may cause RLS policy issues
    
    async getProjectOpportunities(projectId, userId) {
      try {
        const { data, error } = await supabase
          .from('project_opportunities')
          .select(`
            *,
            opportunities:opportunity_id (*)
          `)
          .eq('project_id', projectId)
          .eq('user_id', userId) // Add user_id filter for proper data isolation
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Project opportunities fetch error:', error)
          return []
        }

        return data || []
      } catch (error) {
        console.error('getProjectOpportunities error:', error)
        return []
      }
    },

    async addProjectOpportunity(userId, projectId, opportunityId, matchData = {}) {
      try {
        // Import scoring cache service
        const scoringCache = await import('./scoringCache.js')
        
        // Calculate and cache the score automatically
        const scoreResult = await scoringCache.default.getOrCalculateScore(userId, projectId, opportunityId)
        
        const newMatch = {
          project_id: projectId,
          opportunity_id: opportunityId,
          user_id: userId,
          fit_score: scoreResult.score || 0,
          status: 'scored',
          ai_analysis: scoreResult.analysis || matchData,
          score_calculated_at: scoreResult.lastCalculated,
          created_at: new Date().toISOString(),
          ...matchData
        }

        const { data, error } = await supabase
          .from('project_opportunities')
          .insert([newMatch])
          .select()
          .single()

        if (error) {
          console.error('Project opportunity creation error:', error)
          return null
        }

        console.log('Added project opportunity with score:', newMatch.fit_score)
        return data
      } catch (error) {
        console.error('addProjectOpportunity error:', error)
        return null
      }
    },

    async updateProjectOpportunity(userId, id, updates) {
      try {
        const { data, error } = await supabase
          .from('project_opportunities')
          .update({
            ...updates,
            // No updated_at column in your table
          })
          .eq('id', id)
          .select()
          .single()

        if (error) {
          console.error('Project opportunity update error:', error)
          return null
        }

        return data
      } catch (error) {
        console.error('updateProjectOpportunity error:', error)
        return null
      }
    },

    async removeProjectOpportunity(userId, id) {
      try {
        const { error } = await supabase
          .from('project_opportunities')
          .delete()
          .eq('id', id)

        if (error) {
          console.error('Project opportunity deletion error:', error)
          return false
        }

        return true
      } catch (error) {
        console.error('removeProjectOpportunity error:', error)
        return false
      }
    },

    async createProjectOpportunity(userId, projectOpportunityData) {
      try {
        if (!userId) {
          throw new Error('User ID is required for createProjectOpportunity')
        }

        const dataToInsert = {
          ...projectOpportunityData,
          user_id: userId, // Add user_id for proper data isolation
          created_at: new Date().toISOString()
        }

        const { data, error } = await supabase
          .from('project_opportunities')
          .insert([dataToInsert])
          .select()
          .single()

        if (error) {
          console.error('Project opportunity creation error:', error)
          throw error
        }

        console.log('Project opportunity created successfully:', data)
        return data
      } catch (error) {
        console.error('createProjectOpportunity error:', error)
        throw error
      }
    },

    /**
     * Get cached scores for a project with opportunities data
     */
    async getProjectOpportunitiesWithScores(userId, projectId) {
      try {
        const { data, error } = await supabase
          .from('project_opportunities')
          .select(`
            *,
            opportunities:opportunity_id (*)
          `)
          .eq('user_id', userId)
          .eq('project_id', projectId)
          .order('fit_score', { ascending: false })

        if (error) {
          console.error('getProjectOpportunitiesWithScores error:', error)
          return []
        }

        return (data || []).map(record => ({
          ...record,
          opportunity: record.opportunities,
          hasValidScore: record.fit_score > 0 && record.score_calculated_at,
          scoreAge: this.calculateScoreAge(record.score_calculated_at),
          needsRecalculation: this.isScoreStale(record.score_calculated_at)
        }))

      } catch (error) {
        console.error('getProjectOpportunitiesWithScores error:', error)
        return []
      }
    },

    /**
     * Refresh scores for stale project opportunities
     */
    async refreshStaleScores(userId, projectId) {
      try {
        const scoringCache = await import('./scoringCache.js')
        
        // Get all project opportunities
        const projectOpps = await this.getProjectOpportunitiesWithScores(userId, projectId)
        
        // Find ones that need refreshing
        const staleOpps = projectOpps.filter(po => po.needsRecalculation)
        
        if (staleOpps.length === 0) {
          console.log('No stale scores found')
          return { refreshed: 0, total: projectOpps.length }
        }

        console.log(`Refreshing ${staleOpps.length} stale scores`)
        
        // Refresh stale scores
        const results = await scoringCache.default.batchCalculateScores(
          userId, 
          projectId, 
          staleOpps.map(po => po.opportunity_id),
          true // Force recalculation
        )

        return {
          refreshed: results.successful,
          failed: results.failed,
          total: projectOpps.length
        }

      } catch (error) {
        console.error('refreshStaleScores error:', error)
        return { refreshed: 0, failed: 0, total: 0 }
      }
    },

    calculateScoreAge(calculatedAt) {
      if (!calculatedAt) return 'Never calculated'
      
      const now = new Date()
      const calculated = new Date(calculatedAt)
      const diffMs = now - calculated
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

      if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
      } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
      } else {
        return 'Just calculated'
      }
    },

    isScoreStale(calculatedAt) {
      if (!calculatedAt) return true
      
      const calculated = new Date(calculatedAt)
      const now = new Date()
      const daysSinceCalculation = (now - calculated) / (1000 * 60 * 60 * 24)
      
      return daysSinceCalculation > 7 // Stale after 7 days
    },

    // NEW: Service role-based project opportunity creation that bypasses RLS issues
    async createProjectOpportunityViaAPI(userId, projectOpportunityData) {
      try {
        console.log('🚀 Using service role API for project opportunity creation')
        
        const response = await fetch('/api/project-opportunities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...projectOpportunityData,
            user_id: userId
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || errorData.error || 'Failed to create project opportunity')
        }

        const result = await response.json()
        console.log('✅ Project opportunity created via API:', result.projectOpportunity?.id)
        return result.projectOpportunity
        
      } catch (error) {
        console.error('createProjectOpportunityViaAPI error:', error)
        throw error
      }
    },

    // NEW: Service role-based project opportunity update that bypasses RLS issues
    async updateProjectOpportunityViaAPI(userId, id, updates) {
      try {
        console.log('🚀 Using service role API for project opportunity update')
        
        const response = await fetch('/api/project-opportunities', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id,
            updates,
            userId
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || errorData.error || 'Failed to update project opportunity')
        }

        const result = await response.json()
        console.log('✅ Project opportunity updated via API:', result.projectOpportunity?.id)
        return result.projectOpportunity
        
      } catch (error) {
        console.error('updateProjectOpportunityViaAPI error:', error)
        throw error
      }
    },

    // NEW: Service role-based donor creation that bypasses RLS issues
    async createDonorViaAPI(userId, donorData) {
      try {
        console.log('🚀 Using service role API for donor creation')
        
        const response = await fetch('/api/donors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...donorData,
            user_id: userId
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || errorData.error || 'Failed to create donor')
        }

        const result = await response.json()
        console.log('✅ Donor created via API:', result.donor?.id)
        return result.donor
        
      } catch (error) {
        console.error('createDonorViaAPI error:', error)
        throw error
      }
    },

    // NEW: Service role-based donor update that bypasses RLS issues
    async updateDonorViaAPI(userId, id, updates) {
      try {
        console.log('🚀 Using service role API for donor update')
        
        const response = await fetch('/api/donors', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id,
            updates,
            userId
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || errorData.error || 'Failed to update donor')
        }

        const result = await response.json()
        console.log('✅ Donor updated via API:', result.donor?.id)
        return result.donor
        
      } catch (error) {
        console.error('updateDonorViaAPI error:', error)
        throw error
      }
    },

    // NEW: Service role-based donor deletion that bypasses RLS issues
    async deleteDonorViaAPI(userId, id) {
      try {
        console.log('🚀 Using service role API for donor deletion')
        
        const response = await fetch(`/api/donors?id=${id}&userId=${userId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || errorData.error || 'Failed to delete donor')
        }

        console.log('✅ Donor deleted via API:', id)
        return true
        
      } catch (error) {
        console.error('deleteDonorViaAPI error:', error)
        throw error
      }
    },

    // NEW: Service role-based investor creation that bypasses RLS issues
    async createInvestorViaAPI(userId, investorData) {
      try {
        console.log('🚀 Using service role API for investor creation')
        
        const response = await fetch('/api/investors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...investorData,
            user_id: userId
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || errorData.error || 'Failed to create investor')
        }

        const result = await response.json()
        console.log('✅ Investor created via API:', result.investor?.id)
        return result.investor
        
      } catch (error) {
        console.error('createInvestorViaAPI error:', error)
        throw error
      }
    },

    // NEW: Service role-based investor deletion that bypasses RLS issues
    async deleteInvestorViaAPI(userId, id) {
      try {
        console.log('🚀 Using service role API for investor deletion')
        
        const response = await fetch(`/api/investors?id=${id}&userId=${userId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || errorData.error || 'Failed to delete investor')
        }

        console.log('✅ Investor deleted via API:', id)
        return true
        
      } catch (error) {
        console.error('deleteInvestorViaAPI error:', error)
        throw error
      }
    },

    // NEW: Service role-based donation creation that bypasses RLS issues
    async createDonationViaAPI(userId, donationData) {
      try {
        console.log('🚀 Using service role API for donation creation')
        
        const response = await fetch('/api/donations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...donationData,
            user_id: userId
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || errorData.error || 'Failed to create donation')
        }

        const result = await response.json()
        console.log('✅ Donation created via API:', result.donation?.id)
        return result.donation
        
      } catch (error) {
        console.error('createDonationViaAPI error:', error)
        throw error
      }
    },

    // NEW: Service role-based campaign creation that bypasses RLS issues
    async createCampaignViaAPI(userId, campaignData) {
      try {
        console.log('🚀 Using service role API for campaign creation')
        
        const response = await fetch('/api/campaigns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...campaignData,
            user_id: userId
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || errorData.error || 'Failed to create campaign')
        }

        const result = await response.json()
        console.log('✅ Campaign created via API:', result.campaign?.id)
        return result.campaign
        
      } catch (error) {
        console.error('createCampaignViaAPI error:', error)
        throw error
      }
    },

    // NEW: Service role-based user profile upsert that bypasses RLS issues
    async upsertUserProfileViaAPI(userId, profileData) {
      try {
        console.log('🚀 Using service role API for user profile upsert')
        
        const response = await fetch('/api/user-profiles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...profileData,
            user_id: userId
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || errorData.error || 'Failed to create/update user profile')
        }

        const result = await response.json()
        console.log('✅ User profile upserted via API:', result.profile?.user_id)
        return result.profile
        
      } catch (error) {
        console.error('upsertUserProfileViaAPI error:', error)
        throw error
      }
    },

    // NEW: Service role-based angel investor creation that bypasses RLS issues
    async createAngelInvestorViaAPI(userId, angelInvestorData) {
      try {
        console.log('🚀 Using service role API for angel investor creation')
        
        const response = await fetch('/api/angel-investors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...angelInvestorData,
            user_id: userId
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || errorData.error || 'Failed to create angel investor')
        }

        const result = await response.json()
        console.log('✅ Angel investor created via API:', result.angelInvestor?.id)
        return result.angelInvestor
        
      } catch (error) {
        console.error('createAngelInvestorViaAPI error:', error)
        throw error
      }
    },

    // NEW: Service role-based data fetching that bypasses RLS issues
    async getProjectsViaAPI(userId) {
      try {
        console.log('🔍 Using service role API for projects fetch')
        
        const response = await fetch(`/api/projects?userId=${userId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || errorData.error || 'Failed to fetch projects')
        }

        const result = await response.json()
        console.log(`✅ Projects fetched via API: ${result.projects?.length || 0} items`)
        return result.projects || []
        
      } catch (error) {
        console.error('getProjectsViaAPI error:', error)
        // Fallback to empty array rather than throwing for GET operations
        return []
      }
    },

    async getDonorsViaAPI(userId, filters = {}) {
      try {
        console.log('🔍 Using service role API for donors fetch')
        
        const queryParams = new URLSearchParams({ userId })
        
        const response = await fetch(`/api/donors?${queryParams}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || errorData.error || 'Failed to fetch donors')
        }

        const result = await response.json()
        console.log(`✅ Donors fetched via API: ${result.donors?.length || 0} items`)
        return result.donors || []
        
      } catch (error) {
        console.error('getDonorsViaAPI error:', error)
        // Fallback to empty array rather than throwing for GET operations
        return []
      }
    },

    async getInvestorsViaAPI(userId, filters = {}) {
      try {
        console.log('🔍 Using service role API for investors fetch')
        
        const queryParams = new URLSearchParams({ userId })
        
        const response = await fetch(`/api/investors?${queryParams}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || errorData.error || 'Failed to fetch investors')
        }

        const result = await response.json()
        console.log(`✅ Investors fetched via API: ${result.investors?.length || 0} items`)
        return result.investors || []
        
      } catch (error) {
        console.error('getInvestorsViaAPI error:', error)
        // Fallback to empty array rather than throwing for GET operations
        return []
      }
    },

    async getDonationsViaAPI(userId, filters = {}) {
      try {
        console.log('🔍 Using service role API for donations fetch')
        
        const queryParams = new URLSearchParams({ userId })
        
        const response = await fetch(`/api/donations?${queryParams}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || errorData.error || 'Failed to fetch donations')
        }

        const result = await response.json()
        console.log(`✅ Donations fetched via API: ${result.donations?.length || 0} items`)
        return result.donations || []
        
      } catch (error) {
        console.error('getDonationsViaAPI error:', error)
        // Fallback to empty array rather than throwing for GET operations
        return []
      }
    },

    async getCampaignsViaAPI(userId, filters = {}) {
      try {
        console.log('🔍 Using service role API for campaigns fetch')
        
        const queryParams = new URLSearchParams({ userId })
        
        const response = await fetch(`/api/campaigns?${queryParams}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || errorData.error || 'Failed to fetch campaigns')
        }

        const result = await response.json()
        console.log(`✅ Campaigns fetched via API: ${result.campaigns?.length || 0} items`)
        return result.campaigns || []
        
      } catch (error) {
        console.error('getCampaignsViaAPI error:', error)
        // Fallback to empty array rather than throwing for GET operations
        return []
      }
    }
  }
}

// LEGACY SESSION-BASED SERVICES (Keep for backward compatibility, but prefer directUserServices)
// These may cause "No session found" errors in some timing scenarios

export const userProfileService = {
  async getProfile() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', session.user.id)  // Fixed: use user_id instead of id
        .maybeSingle()
      
      if (error && error.code !== 'PGRST116') {
        throw error
      }
      
      return data
    } catch (error) {
      console.error('getProfile error:', error)
      throw error
    }
  },

  async getOrCreateProfile() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      // Try to get existing profile
      let { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', session.user.id)  // Fixed: use user_id instead of id
        .maybeSingle()

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const newProfile = {
          user_id: session.user.id,  // Fixed: use user_id instead of id
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || '',
          organization_name: '',
          organization_type: 'nonprofit',
          user_role: 'company',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { data: createdProfile, error: createError } = await supabase
          .from('user_profiles')
          .upsert(newProfile, { onConflict: 'user_id' })  // Fixed: conflict on user_id
          .select()
          .single()

        if (createError) throw createError
        return createdProfile
      }

      if (error) throw error
      return profile
    } catch (error) {
      console.error('getOrCreateProfile error:', error)
      throw error
    }
  },

  async createProfile(profile) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      const profileData = {
        user_id: session.user.id,  // Foreign key to auth.users
        email: session.user.email,
        full_name: profile.full_name || session.user.user_metadata?.full_name || '',
        organization_name: profile.organization_name || '',
        organization_type: profile.organization_type || 'nonprofit',
        user_role: profile.user_role || 'company',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...sanitizeProfilePayload(profile)
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .upsert(profileData, { onConflict: 'user_id' })  // Match on user_id, not id
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('createProfile error:', error)
      throw error
    }
  },

  async updateProfile(updates) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: session.user.id,  // Foreign key to auth.users
          ...sanitizeProfilePayload(updates),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })  // Match on user_id, not id
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('updateProfile error:', error)
      throw error
    }
  }
}

export const projectService = {
  async getProjects(userId) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('getProjects error:', error)
      throw error
    }
  },

  async createProject(projectData) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        console.warn('createProject: No authenticated session')
        throw new Error('Please log in to create projects')
      }

      const newProject = {
        ...projectData,
        user_id: session.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('projects')
        .insert([newProject])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('createProject error:', error)
      throw error
    }
  },

  // NEW: Service role-based project creation that bypasses RLS issues
  async createProjectViaAPI(userId, projectData) {
    try {
      console.log('🚀 Using service role API for project creation')
      
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...projectData,
          user_id: userId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error || 'Failed to create project')
      }

      const result = await response.json()
      console.log('✅ Project created via API:', result.project?.id)
      
      // Note: New project creation doesn't typically require score invalidation
      // since scores are specific to project-opportunity pairs
      // But if future logic requires it, we could add invalidation here
      
      return result.project
      
    } catch (error) {
      console.error('createProjectViaAPI error:', error)
      throw error
    }
  },

  // NEW: Service role-based project update that bypasses RLS issues
  async updateProjectViaAPI(userId, projectId, projectData) {
    try {
      console.log('🚀 Using service role API for project update')
      
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectData,
          userId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error || 'Failed to update project')
      }

      const result = await response.json()
      console.log('✅ Project updated via API:', result.project?.id)
      return result.project
      
    } catch (error) {
      console.error('updateProjectViaAPI error:', error)
      throw error
    }
  },

  async updateProject(projectId, updates) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      const { data, error } = await supabase
        .from('projects')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .eq('user_id', session.user.id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('updateProject error:', error)
      throw error
    }
  },

  async deleteProject(projectId) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', session.user.id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('deleteProject error:', error)
      throw error
    }
  }
}

export const opportunityService = {
  async getOpportunities(filters = {}) {
    try {
      let query = supabase
        .from('opportunities')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.organizationType) {
        query = query.contains('organization_types', [filters.organizationType])
      }

      // Exclude resource-type items by default unless explicitly fetching resources
  const resourceTags = ['resources','non_monetary','in_kind','software_grant','cloud_credits','data_credits','ad_credits']
      const wantsResources = Array.isArray(filters.aiCategories) && filters.aiCategories.some(t => resourceTags.includes(String(t).toLowerCase()))
      const excludeResourcesByDefault = !filters.nonMonetaryOnly && !wantsResources && (filters.excludeResources !== false)
      if (excludeResourcesByDefault) {
        // Exclude AI-flagged non-monetary resources
        query = query.neq('ai_analysis->>isNonMonetaryResource', 'true')
        // And exclude items tagged with resource categories (safe 'cs' per-tag)
        resourceTags.forEach(tag => {
          query = query.not('ai_categories', 'cs', `{${tag}}`)
        })
      }

      // When explicitly requesting non-monetary resources, enforce stricter guards
      if (filters.nonMonetaryOnly) {
        query = query
          .is('amount_min', null)
          .is('amount_max', null)
          .eq('ai_analysis->>isNonMonetaryResource', 'true')
          .not('title', 'ilike', '%funding opportunity%')
          .not('title', 'ilike', '%nofo%')
          .not('title', 'ilike', '%sbir%')
          .not('title', 'ilike', '%sttr%')
          .not('description', 'ilike', '%$%')
          .not('description', 'ilike', '% grant of %')
          .not('description', 'ilike', '% funding opportunity %')
          .not('description', 'ilike', '% cash %')
          .not('description', 'ilike', '% award %')
          .not('description', 'ilike', '% stipend %')
          .not('description', 'ilike', '% loan %')
      }

        if (filters.minAmount) {
          query = query.gte('amount_max', filters.minAmount)
        }

        if (filters.maxAmount) {
          query = query.lte('amount_min', filters.maxAmount)
        }      const { data, error } = await query.limit(200)
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('getOpportunities error:', error)
      throw error
    }
  },

  async getEligibleOpportunities(userProfile, filters = {}) {
    try {
      // Get base opportunities
      const opportunities = await this.getOpportunities(filters)
      
      // Import eligibility service
      const { GrantEligibilityService } = await import('./eligibility/grantEligibilityService.js')
      const eligibilityService = new GrantEligibilityService()
      
      // Apply eligibility filtering
      const eligibleOpportunities = await eligibilityService.filterEligibleOpportunities(
        userProfile, 
        opportunities
      )
      
      // Apply user's filter preferences
      let filtered = eligibleOpportunities
      
      if (filters.onlyEligible) {
        filtered = filtered.filter(opp => opp.eligibility?.eligible)
      }
      
      if (filters.excludeWarnings) {
        filtered = filtered.filter(opp => 
          opp.eligibility?.eligible && (!opp.eligibility.warnings || opp.eligibility.warnings.length === 0)
        )
      }
      
      // Only apply confidence threshold when user explicitly wants only eligible items
      if (filters.onlyEligible && (filters.minConfidence || filters.minConfidence === 0)) {
        const min = Number(filters.minConfidence) || 0
        if (min > 0) {
          filtered = filtered.filter(opp => opp.eligibilityScore >= min)
        }
      }
      
      return filtered
    } catch (error) {
      console.error('getEligibleOpportunities error:', error)
      // Fallback to basic opportunities if eligibility service fails
      return await this.getOpportunities(filters)
    }
  },

  async getProfileCompletionSuggestions(userProfile) {
    try {
      // Import eligibility service  
      const { GrantEligibilityService } = await import('./eligibility/grantEligibilityService.js')
      const eligibilityService = new GrantEligibilityService()
      
      // Get profile completion requirements
      const suggestions = eligibilityService.getProfileCompletionRequirements(userProfile)
      
      return suggestions
    } catch (error) {
      console.error('getProfileCompletionSuggestions error:', error)
      return []
    }
  }
}

export const donorService = {
  async getDonors(userId, filters = {}) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      let query = supabase
        .from('donors')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
      }

      if (filters.donorType) {
        query = query.eq('donor_type', filters.donorType)
      }

      if (filters.majorDonor !== undefined) {
        query = query.eq('is_major_donor', filters.majorDonor)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('getDonors error:', error)
      throw error
    }
  },

  async getDonorStats(userId) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      // Get donors data for basic stats
      const { data: donors, error: donorError } = await supabase
        .from('donors')
        .select('total_donated, is_major_donor')
        .eq('user_id', session.user.id)

      // Get donations data for accurate total donations count and fallback calculations
      const { data: donations, error: donationError } = await supabase
        .from('donations')
        .select('amount, donor_id, created_at, donation_date')
        .eq('user_id', session.user.id)

      if (donorError && donationError) {
        console.error('Both donor and donation stats errors:', donorError, donationError)
        return {
          totalDonors: 0,
          totalRaised: 0,
          totalDonations: 0,
          avgDonationAmount: 0,
          majorDonors: 0,
          thisYearRaised: 0
        }
      }

      // Calculate from donations table (most accurate)
      const donationsList = donations || []
      const totalDonations = donationsList.length
      const totalRaisedFromDonations = donationsList.reduce((sum, donation) => sum + (donation.amount || 0), 0)

      // Calculate from donors table for comparison and fallback
      const donorsList = donors || []
      const totalDonors = donorsList.length
      const totalRaisedFromDonors = donorsList.reduce((sum, donor) => sum + (donor.total_donated || 0), 0)
      const majorDonors = donorsList.filter(donor => donor.is_major_donor).length

      // Use donations table data as primary source (more accurate)
      const totalRaised = totalRaisedFromDonations > 0 ? totalRaisedFromDonations : totalRaisedFromDonors
      const avgDonationAmount = totalDonations > 0 ? Math.round(totalRaised / totalDonations) : 0

      // Calculate this year's donations
      const currentYear = new Date().getFullYear()
      const thisYearDonations = donationsList.filter(donation => {
        const donationYear = new Date(donation.created_at || donation.donation_date).getFullYear()
        return donationYear === currentYear
      })
      const thisYearRaised = thisYearDonations.reduce((sum, donation) => sum + (donation.amount || 0), 0)

      return {
        totalDonors,
        totalRaised,
        totalDonations,
        avgDonationAmount,
        majorDonors,
        thisYearRaised
      }
    } catch (error) {
      console.error('getDonorStats error:', error)
      throw error
    }
  },

  async getDonations(filters = {}) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      let query = supabase
        .from('donations')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (filters.donorId) {
        query = query.eq('donor_id', filters.donorId)
      }

      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId)
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate)
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('getDonations error:', error)
      throw error
    }
  }
}

export const applicationProgressService = {
  async getSubmissionStats() {
    console.error('❌ DEPRECATED: applicationProgressService.getSubmissionStats called - Use directUserServices.applications.getSubmissionStats(userId) instead')
    console.trace('Deprecated service called from:')
    throw new Error('This service is deprecated. Use directUserServices.applications.getSubmissionStats(userId) instead.')
  },

  async getSubmissions(filters = {}) {
    console.error('❌ DEPRECATED: applicationProgressService.getSubmissions called - Use directUserServices.applications.getSubmissions(userId, filters) instead')
    console.trace('Deprecated service called from:')
    throw new Error('This service is deprecated. Use directUserServices.applications.getSubmissions(userId, filters) instead.')
  }
}

export const projectOpportunityService = {
  async getProjectOpportunities(projectId) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      const { data, error } = await supabase
        .from('project_opportunities')
        .select(`
          *,
          opportunities:opportunity_id (*)
        `)
        .eq('project_id', projectId)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('getProjectOpportunities error:', error)
      throw error
    }
  }
}

// ANGEL INVESTOR SERVICES - Direct user services for angel investor functionality
export const angelInvestorServices = {
  // Angel Investor Profile Management
  async getOrCreateAngelInvestor(userId, userEmail) {
    try {
      // Try to get existing angel investor profile
      const { data: existingInvestor, error: getError } = await supabase
        .from('angel_investors')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (existingInvestor) {
        return existingInvestor
      }

      // If no profile exists, create one (handle 406 or no-row code)
      if (getError && (getError.code === 'PGRST116' || getError.code === '406')) {
        // Get user's full name from auth.users or profiles 
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('user_id', userId)  // Changed from 'id' to 'user_id'
          .single()

        const newInvestor = {
          user_id: userId,
          name: userProfile?.full_name || 'Angel Investor',
          email: userEmail,
          accredited_status: false,
          investment_preferences: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { error: createError } = await supabase
          .from('angel_investors')
          .insert([newInvestor])

        if (createError && createError.code !== '23505') { // ignore unique violation race
          throw createError
        }

        // Re-select after insert
        const { data: inserted, error: reselectError } = await supabase
          .from('angel_investors')
          .select('*')
          .eq('user_id', userId)
          .single()
        if (reselectError) throw reselectError
        return inserted
      }

      throw getError
    } catch (error) {
      console.error('getOrCreateAngelInvestor error:', error)
      throw error
    }
  },

  async updateAngelInvestor(userId, updates) {
    try {
      const { data, error } = await supabase
        .from('angel_investors')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('updateAngelInvestor error:', error)
      throw error
    }
  },

  // Merge investment_preferences JSON with new values
  async updateInvestmentPreferences(userId, partialPreferences) {
    try {
      // Fetch current preferences
      const { data: existing, error: fetchError } = await supabase
        .from('angel_investors')
        .select('investment_preferences')
        .eq('user_id', userId)
        .single()

      if (fetchError) {
        console.error('updateInvestmentPreferences fetch error:', fetchError)
      }

      const merged = {
        ...(existing?.investment_preferences || {}),
        ...partialPreferences
      }

      // Prepare update data - include both JSON and individual completion flags
      const updateData = { 
        investment_preferences: merged, 
        updated_at: new Date().toISOString() 
      }

      // Also update individual completion flag columns based on the flags in the JSON
      const flags = merged.flags || {}
      if (flags.core_completed) updateData.core_completed = true
      if (flags.preferences_completed) updateData.preferences_completed = true  
      if (flags.enhancement_completed) updateData.enhancement_completed = true

      const { data, error } = await supabase
        .from('angel_investors')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('updateInvestmentPreferences error:', error)
      throw error
    }
  },

  // Investment Opportunities
  async getInvestmentOpportunities(filters = {}) {
    try {
      let query = supabase
        .from('investment_opportunities')
        .select('*')

      if (filters.featured) {
        query = query.eq('featured', true)
      }

      if (filters.funding_stage) {
        query = query.eq('funding_stage', filters.funding_stage)
      }

      if (filters.min_investment) {
        query = query.gte('minimum_investment', filters.min_investment)
      }

      if (filters.max_investment) {
        query = query.lte('minimum_investment', filters.max_investment)
      }

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      const { data, error } = await query.order('featured', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('getInvestmentOpportunities error:', error)
      return []
    }
  },

  async getInvestmentOpportunity(projectId) {
    try {
      const { data, error } = await supabase
        .from('investment_opportunities')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('getInvestmentOpportunity error:', error)
      throw error
    }
  },

  // Investment Management
  async createInvestment(userId, investmentData) {
    try {
      // First get the investor's ID
      const { data: investor } = await supabase
        .from('angel_investors')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (!investor) {
        throw new Error('Angel investor profile not found')
      }

      const newInvestment = {
        investor_id: investor.id,
        project_id: investmentData.project_id,
        investment_amount: investmentData.investment_amount,
        investment_type: investmentData.investment_type || 'equity',
        investment_date: investmentData.investment_date || new Date().toISOString(),
        status: 'active',
        notes: investmentData.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('angel_investments')
        .insert([newInvestment])
        .select(`
          *,
          project:projects(id, name, description),
          investor:angel_investors(id, name, email)
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('createInvestment error:', error)
      throw error
    }
  },

  async getInvestorPortfolio(userId) {
    try {
      // Look up investor id first (avoids unsupported nested filters causing 400)
      const { data: investorRow, error: investorErr } = await supabase
        .from('angel_investors')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (investorErr) {
        if (investorErr.code === 'PGRST116') return [] // no profile yet
        throw investorErr
      }

      const investorId = investorRow.id

      const { data, error } = await supabase
        .from('angel_investments')
        .select(`
          *,
          project:projects(id, name, description, amount_raised, funding_goal),
          investor:angel_investors(id, name, total_invested, portfolio_value, active_investments)
        `)
        .eq('investor_id', investorId)
        .order('investment_date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('getInvestorPortfolio error:', error)
      return []
    }
  },

  async updateInvestment(userId, investmentId, updates) {
    try {
      // Verify the investment belongs to this user
      const { data: investment } = await supabase
        .from('angel_investments')
        .select(`
          id,
          investor:angel_investors!inner(user_id)
        `)
        .eq('id', investmentId)
        .eq('investor.user_id', userId)
        .single()

      if (!investment) {
        throw new Error('Investment not found or access denied')
      }

      const { data, error } = await supabase
        .from('angel_investments')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', investmentId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('updateInvestment error:', error)
      throw error
    }
  },

  // Dashboard Stats
  async getAngelInvestorStats(userId) {
    try {
      const { data: investorRow, error: investorErr } = await supabase
        .from('angel_investors')
        .select('id,total_invested, portfolio_value, active_investments')
        .eq('user_id', userId)
        .single()

      if (investorErr) {
        if (investorErr.code === 'PGRST116') {
          return {
            totalInvested: 0,
            portfolioValue: 0,
            activeInvestments: 0,
            totalReturn: 0,
            avgROI: 0,
            stageDistribution: {},
            recentInvestments: []
          }
        }
        throw investorErr
      }

      const { data: investmentsData, error: invErr } = await supabase
        .from('angel_investments')
        .select(`
          investment_amount,
          current_value,
          roi_percentage,
          status,
          project:projects(name, funding_stage)
        `)
        .eq('investor_id', investorRow.id)
        .eq('status', 'active')

      if (invErr) throw invErr

      const investor = investorRow || { total_invested: 0, portfolio_value: 0, active_investments: 0 }
      const investments = investmentsData || []

      // Calculate additional metrics
      const avgROI = investments.length > 0 
        ? investments.reduce((sum, inv) => sum + (inv.roi_percentage || 0), 0) / investments.length
        : 0

      const totalReturn = investor.portfolio_value - investor.total_invested

      const stageDistribution = investments.reduce((acc, inv) => {
        const stage = inv.project?.funding_stage || 'unknown'
        acc[stage] = (acc[stage] || 0) + 1
        return acc
      }, {})

      return {
        totalInvested: investor.total_invested,
        portfolioValue: investor.portfolio_value,
        activeInvestments: investor.active_investments,
        totalReturn,
        avgROI,
        stageDistribution,
        recentInvestments: investments.slice(0, 5)
      }
    } catch (error) {
      console.error('getAngelInvestorStats error:', error)
      return {
        totalInvested: 0,
        portfolioValue: 0,
        activeInvestments: 0,
        totalReturn: 0,
        avgROI: 0,
        stageDistribution: {},
        recentInvestments: []
      }
    }
  },

  // Project Management for Entrepreneurs
  async updateProjectForInvestment(userId, projectId, investmentData) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({
          seeking_investment: investmentData.seeking_investment,
          funding_goal: investmentData.funding_goal,
          minimum_investment: investmentData.minimum_investment,
          maximum_investment: investmentData.maximum_investment,
          funding_stage: investmentData.funding_stage,
          investment_deadline: investmentData.investment_deadline,
          highlights: investmentData.highlights,
          pitch_deck_url: investmentData.pitch_deck_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('updateProjectForInvestment error:', error)
      throw error
    }
  }
}

// Export the supabase client for direct use if needed
export default supabase

export const companiesServices = {
  async listCompanies(userId, filters = {}) {
    try {
      const { search, featured, limit = 30, offset = 0 } = filters;
      let query = supabase.from('companies').select('*', { count: 'exact' }).eq('user_id', userId).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      if (featured) query = query.eq('featured', true);
      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    } catch (e) { console.error('listCompanies error', e); return { data: [], count: 0 }; }
  },
  async createCompany(userId, payload) {
    try {
      const newCompany = { user_id: userId, ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      const { data, error } = await supabase.from('companies').insert([newCompany]).select().single();
      if (error) throw error;
      return data;
    } catch (e) { console.error('createCompany error', e); throw e; }
  },
  async updateCompany(userId, companyId, updates) {
    try {
      const { data, error } = await supabase.from('companies')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', companyId).eq('user_id', userId).select().single();
      if (error) throw error;
      return data;
    } catch (e) { console.error('updateCompany error', e); throw e; }
  },
  async deleteCompany(userId, companyId) {
    try {
      const { error } = await supabase.from('companies').delete().eq('id', companyId).eq('user_id', userId);
      if (error) throw error;
      return true;
    } catch (e) { console.error('deleteCompany error', e); throw e; }
  },
  async getCompanyProjects(userId, companyId) {
    try {
      const { data, error } = await supabase.from('projects')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error; return data || [];
    } catch (e) { console.error('getCompanyProjects error', e); return []; }
  },
  async attachProject(userId, projectId, companyId) {
    try {
      const { data, error } = await supabase.from('projects')
        .update({ company_id: companyId, updated_at: new Date().toISOString() })
        .eq('id', projectId).eq('user_id', userId).select().single();
      if (error) throw error; return data;
    } catch (e) { console.error('attachProject error', e); throw e; }
  },
  async listCompanyOverviews(userId, filters = {}) {
    try {
      const { industry, stage, seeking_investment, search, limit = 30, offset = 0 } = filters;
      let query = supabase.from('company_portfolio_overview').select('*', { count: 'exact' });
      if (userId) query = query.eq('user_id', userId);
      if (industry) query = query.eq('industry', industry);
      if (stage) query = query.eq('stage', stage);
      if (seeking_investment !== undefined) query = query.eq('seeking_investment', seeking_investment);
      if (search) query = query.ilike('name', `%${search}%`);
      query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
      const { data, error, count } = await query;
      if (error) throw error; return { data: data || [], count: count || 0 };
    } catch (e) { console.error('listCompanyOverviews error', e); return { data: [], count: 0 }; }
  },
  async listUnassignedProjects(userId) {
    try {
      const { data, error } = await supabase.from('projects')
        .select('id,name,funding_goal,amount_raised,seeking_investment')
        .eq('user_id', userId)
        .is('company_id', null)
        .order('created_at', { ascending: false });
      if (error) throw error; return data || [];
    } catch (e) { console.error('listUnassignedProjects error', e); return []; }
  },
  async createProjectForCompany(userId, companyId, payload) {
    try {
      const newProject = { user_id: userId, company_id: companyId, ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      const { data, error } = await supabase.from('projects').insert([newProject]).select().single();
      if (error) throw error; return data;
    } catch (e) { console.error('createProjectForCompany error', e); throw e; }
  },

  // Notifications
  notifications: {
    async getNotifications(userId, options = {}) {
      try {
        const { limit = 20, unreadOnly = false } = options;
        
        let query = supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (unreadOnly) {
          query = query.eq('is_read', false);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching notifications:', error);
          return [];
        }

        return data || [];
      } catch (error) {
        console.error('getNotifications error:', error);
        return [];
      }
    },

    async getUnreadCount(userId) {
      try {
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_read', false);

        if (error) {
          console.error('Error getting unread count:', error);
          return 0;
        }

        return count || 0;
      } catch (error) {
        console.error('getUnreadCount error:', error);
        return 0;
      }
    },

    async markAsRead(userId, notificationId) {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notificationId)
          .eq('user_id', userId);

        if (error) {
          console.error('Error marking notification as read:', error);
          return false;
        }

        return true;
      } catch (error) {
        console.error('markAsRead error:', error);
        return false;
      }
    },

    async markAllAsRead(userId) {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', userId)
          .eq('is_read', false);

        if (error) {
          console.error('Error marking all notifications as read:', error);
          return false;
        }

        return true;
      } catch (error) {
        console.error('markAllAsRead error:', error);
        return false;
      }
    },

    async createNotification(userId, notification) {
      try {
        const { type, title, message, metadata = {} } = notification;

        // Validate notification type
        const validTypes = ['grant_match', 'deadline_reminder', 'status_update', 'funding_opportunity', 'system'];
        if (!validTypes.includes(type)) {
          console.error(`Invalid notification type: ${type}`);
          return null;
        }

        const { data, error } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            type,
            title,
            message,
            metadata,
            is_read: false
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating notification:', error);
          return null;
        }

        return data;
      } catch (error) {
        console.error('createNotification error:', error);
        return null;
      }
    }
  }
};