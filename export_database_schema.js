// Export complete database schema to a file
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

async function exportDatabaseSchema() {
  try {
    console.log('Connecting to Supabase...')
    
    // Use environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables')
      console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'present' : 'missing')
      console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'present' : 'missing')
      console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing')
      return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    console.log('Exporting database schema...')
    
    let schemaOutput = '# Complete Database Schema Export\n'
    schemaOutput += `Generated on: ${new Date().toISOString()}\n\n`
    
    // Get all tables and columns
    console.log('Fetching tables and columns...')
    const { data: tablesData, error: tablesError } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT 
          t.table_name,
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          c.ordinal_position
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE t.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name, c.ordinal_position;
      `
    })
    
    if (tablesError) {
      // Try alternative approach using direct query
      console.log('RPC failed, trying direct query...')
      const { data: altData, error: altError } = await supabase
        .from('information_schema.tables')
        .select('*')
        .limit(1)
      
      if (altError) {
        console.error('Could not access schema information:', altError)
        console.log('Trying to get sample data from known tables...')
        
        // Try to get column info from known tables
        const knownTables = ['opportunities', 'projects', 'user_profiles', 'users']
        
        for (const tableName of knownTables) {
          try {
            console.log(`Checking table: ${tableName}`)
            const { data: sampleData, error: sampleError } = await supabase
              .from(tableName)
              .select('*')
              .limit(1)
              
            if (!sampleError && sampleData && sampleData.length > 0) {
              schemaOutput += `\n## Table: ${tableName}\n`
              schemaOutput += 'Columns: ' + Object.keys(sampleData[0]).join(', ') + '\n'
              
              // Get column details if possible
              Object.keys(sampleData[0]).forEach(col => {
                const value = sampleData[0][col]
                const type = typeof value
                schemaOutput += `- ${col}: ${type} (sample: ${JSON.stringify(value)?.substring(0, 50)}...)\n`
              })
            } else if (sampleError) {
              schemaOutput += `\n## Table: ${tableName}\nError: ${sampleError.message}\n`
            }
          } catch (e) {
            schemaOutput += `\n## Table: ${tableName}\nError: ${e.message}\n`
          }
        }
        
      }
    } else {
      console.log('Processing schema data...')
      
      // Group by table
      const tableMap = new Map()
      if (tablesData) {
        tablesData.forEach(row => {
          if (!tableMap.has(row.table_name)) {
            tableMap.set(row.table_name, [])
          }
          tableMap.get(row.table_name).push(row)
        })
      }
      
      schemaOutput += '## Tables and Columns\n\n'
      
      for (const [tableName, columns] of tableMap.entries()) {
        schemaOutput += `### ${tableName}\n`
        columns.forEach(col => {
          schemaOutput += `- ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`
          if (col.column_default) {
            schemaOutput += ` DEFAULT ${col.column_default}`
          }
          schemaOutput += '\n'
        })
        schemaOutput += '\n'
      }
    }
    
    // Try to get triggers
    console.log('Fetching triggers...')
    try {
      const { data: triggersData } = await supabase.rpc('exec_sql', {
        sql_query: `
          SELECT 
            trigger_name,
            event_object_table,
            action_timing,
            event_manipulation
          FROM information_schema.triggers
          WHERE trigger_schema = 'public'
          ORDER BY event_object_table, trigger_name;
        `
      })
      
      if (triggersData && triggersData.length > 0) {
        schemaOutput += '## Triggers\n\n'
        triggersData.forEach(trigger => {
          schemaOutput += `- ${trigger.trigger_name} on ${trigger.event_object_table} (${trigger.action_timing} ${trigger.event_manipulation})\n`
        })
        schemaOutput += '\n'
      }
    } catch (e) {
      console.log('Could not fetch triggers:', e.message)
    }
    
    // Write to file
    const outputFile = path.join(__dirname, 'database_schema_export.md')
    fs.writeFileSync(outputFile, schemaOutput)
    
    console.log(`Schema exported to: ${outputFile}`)
    console.log(`File size: ${fs.statSync(outputFile).size} bytes`)
    
    // Also create a simplified JSON version
    const jsonOutput = {
      exported_at: new Date().toISOString(),
      tables: {},
      summary: {
        total_tables: tableMap?.size || 0
      }
    }
    
    if (tableMap) {
      for (const [tableName, columns] of tableMap.entries()) {
        jsonOutput.tables[tableName] = {
          columns: columns.map(col => ({
            name: col.column_name,
            type: col.data_type,
            nullable: col.is_nullable === 'YES',
            default: col.column_default,
            position: col.ordinal_position
          }))
        }
      }
    }
    
    const jsonFile = path.join(__dirname, 'database_schema_export.json')
    fs.writeFileSync(jsonFile, JSON.stringify(jsonOutput, null, 2))
    
    console.log(`JSON schema exported to: ${jsonFile}`)
    
  } catch (error) {
    console.error('Error exporting schema:', error)
  }
}

// Load environment variables if .env.local exists
const envPath = path.join(__dirname, '.env.local')
if (fs.existsSync(envPath)) {
  console.log('Loading .env.local...')
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim()
    }
  })
}

exportDatabaseSchema()