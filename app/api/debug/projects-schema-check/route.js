// app/api/debug/projects-schema-check/route.js
// Debug endpoint to check projects table schema and identify issues
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

async function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function POST(request) {
  try {
    const { action } = await request.json()
    const supabase = await getSupabaseServiceClient()

    if (action === 'check_schema') {
      // Get projects table schema
      const { data: schemaData, error: schemaError } = await supabase
        .rpc('get_table_schema', { table_name: 'projects' })
        .single()

      if (schemaError) {
        console.log('RPC not available, trying direct query...')
        
        // Alternative: Query information_schema
        const { data: columns, error: columnsError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable, column_default')
          .eq('table_name', 'projects')
          .eq('table_schema', 'public')

        if (columnsError) {
          console.log('Information schema not accessible, trying table introspection...')
          
          // Alternative: Try to insert a minimal record to see what fails
          const testInsert = {
            name: 'SCHEMA_TEST_DELETE_ME',
            description: 'Schema test - safe to delete',
            user_id: '00000000-0000-0000-0000-000000000000',
            created_at: new Date().toISOString()
          }

          const { data: insertData, error: insertError } = await supabase
            .from('projects')
            .insert([testInsert])
            .select()

          if (insertError) {
            return NextResponse.json({
              schema_method: 'test_insert',
              error: insertError,
              error_details: {
                message: insertError.message,
                details: insertError.details,
                hint: insertError.hint,
                code: insertError.code
              },
              test_data: testInsert
            })
          } else {
            // Clean up test record
            await supabase
              .from('projects')
              .delete()
              .eq('name', 'SCHEMA_TEST_DELETE_ME')

            return NextResponse.json({
              schema_method: 'test_insert',
              message: 'Basic insert works - need to check specific field requirements',
              success: true
            })
          }
        } else {
          return NextResponse.json({
            schema_method: 'information_schema',
            columns: columns,
            total_columns: columns?.length || 0
          })
        }
      } else {
        return NextResponse.json({
          schema_method: 'rpc',
          schema: schemaData
        })
      }
    }

    // Test specific project data
    if (action === 'test_project_data') {
      const { projectData } = await request.json()
      
      const { data: insertData, error: insertError } = await supabase
        .from('projects')
        .insert([projectData])
        .select()

      if (insertError) {
        return NextResponse.json({
          action: 'test_project_data',
          success: false,
          error: insertError,
          error_details: {
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            code: insertError.code
          },
          project_data: projectData
        }, { status: 400 })
      } else {
        // Clean up test record
        if (insertData?.[0]?.id) {
          await supabase
            .from('projects')
            .delete()
            .eq('id', insertData[0].id)
        }

        return NextResponse.json({
          action: 'test_project_data',
          success: true,
          message: 'Project data is valid for database',
          created_record: insertData?.[0]
        })
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  } catch (error) {
    console.error('Projects schema check error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      debug: { error: error.message }
    }, { status: 500 })
  }
}