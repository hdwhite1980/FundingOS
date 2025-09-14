require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function checkProjectData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    // Get the most recent project (likely the one that generated the log)
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name, project_type, uploaded_documents, dynamic_form_structure, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      console.error('❌ Error fetching projects:', error)
      return
    }

    if (!projects || projects.length === 0) {
      console.log('❌ No projects found in database')
      return
    }

    console.log('🔍 Recent Projects Analysis:')
    console.log('===============================')

    projects.forEach((project, index) => {
      console.log(`\nProject ${index + 1}:`)
      console.log(`  ID: ${project.id}`)
      console.log(`  Name: ${project.name}`)
      console.log(`  Type: ${project.project_type}`)
      console.log(`  Created: ${project.created_at}`)
      console.log(`  Has uploaded_documents: ${project.uploaded_documents ? 'YES' : 'NO'}`)
      console.log(`  Has dynamic_form_structure: ${project.dynamic_form_structure ? 'YES' : 'NO'}`)
      
      if (project.uploaded_documents) {
        const docs = Array.isArray(project.uploaded_documents) ? project.uploaded_documents : [project.uploaded_documents]
        console.log(`  Uploaded documents count: ${docs.length}`)
        docs.forEach((doc, docIndex) => {
          console.log(`    Document ${docIndex + 1}: ${doc.fileName || doc.name || 'unnamed'} (${doc.type || 'unknown type'})`)
        })
      }

      if (project.dynamic_form_structure) {
        const formStruct = project.dynamic_form_structure
        console.log(`  Dynamic form structure:`)
        console.log(`    Form fields count: ${formStruct.formFields ? Object.keys(formStruct.formFields).length : 0}`)
        console.log(`    Form metadata: ${formStruct.formMetadata ? JSON.stringify(formStruct.formMetadata).substring(0, 100) + '...' : 'none'}`)
        
        if (formStruct.formFields && typeof formStruct.formFields === 'object') {
          const fieldNames = Object.keys(formStruct.formFields)
          console.log(`    Field names: ${fieldNames.slice(0, 5).join(', ')}${fieldNames.length > 5 ? '...' : ''}`)
        }
      }
    })

    // Check the most recent project in detail
    const recentProject = projects[0]
    if (recentProject.name === 'Kingway Affordable Housing') {
      console.log('\n🎯 Analyzing Kingway Affordable Housing project (matches log):')
      console.log('=========================================================')
      console.log('Full dynamic_form_structure:', JSON.stringify(recentProject.dynamic_form_structure, null, 2))
      console.log('\nFull uploaded_documents:', JSON.stringify(recentProject.uploaded_documents, null, 2))
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkProjectData()