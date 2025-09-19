// Debug foreign key constraint issues in submissions table
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pcusbqltbvgebzcacvif.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjdXNicWx0YnZnZWJ6Y2FjdmlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk5NTg2OCwiZXhwIjoyMDcyNTcxODY4fQ.FPli2Mo22Y7YQiqoaQBSt2H3pa4aIOrpVy6BqaukvnQ'
);

async function debugForeignKeyIssues() {
  console.log('🔍 Debugging foreign key constraint issues in submissions table...\n');

  try {
    // 1. Check submissions table structure
    console.log('📋 Step 1: Checking submissions table data...');
    const { data: submissions, error: submissionsError, count: submissionsCount } = await supabase
      .from('submissions')
      .select('*', { count: 'exact' })
      .limit(5);

    if (submissionsError) {
      console.error('❌ Error accessing submissions:', submissionsError);
    } else {
      console.log(`✅ submissions table accessible: ${submissionsCount || 0} records`);
      if (submissions && submissions.length > 0) {
        console.log('🔍 Sample submissions data:');
        submissions.forEach(sub => {
          console.log(`   - ID: ${sub.id}`);
          console.log(`   - User ID: ${sub.user_id}`);
          console.log(`   - Project ID: ${sub.project_id}`);
          console.log(`   - Opportunity ID: ${sub.opportunity_id}`);
          console.log(`   - Status: ${sub.status}`);
          console.log('   ---');
        });
      }
    }

    // 2. Check opportunities table
    console.log('\n📊 Step 2: Checking opportunities table...');
    const { data: opportunities, error: oppError, count: oppCount } = await supabase
      .from('opportunities')
      .select('id, title, external_id', { count: 'exact' })
      .limit(10);

    if (oppError) {
      console.error('❌ Error accessing opportunities:', oppError);
    } else {
      console.log(`✅ opportunities table accessible: ${oppCount || 0} records`);
      if (opportunities && opportunities.length > 0) {
        console.log('🔍 Sample opportunity IDs:');
        opportunities.slice(0, 5).forEach(opp => {
          console.log(`   - ID: ${opp.id}, Title: ${opp.title?.substring(0, 50) || 'No title'}...`);
        });
      }
    }

    // 3. Check for orphaned references
    console.log('\n🔍 Step 3: Checking for orphaned opportunity references...');
    if (submissions && submissions.length > 0) {
      for (let submission of submissions) {
        if (submission.opportunity_id) {
          const { data: relatedOpp, error: relatedError } = await supabase
            .from('opportunities')
            .select('id, title')
            .eq('id', submission.opportunity_id)
            .single();

          if (relatedError || !relatedOpp) {
            console.log(`❌ Orphaned reference: Submission ${submission.id} references non-existent opportunity ${submission.opportunity_id}`);
          } else {
            console.log(`✅ Valid reference: Submission ${submission.id} -> Opportunity "${relatedOpp.title?.substring(0, 40) || 'No title'}..."`);
          }
        } else {
          console.log(`⚠️ Null opportunity_id in submission ${submission.id}`);
        }
      }
    }

    // 4. Check projects table for foreign key integrity
    console.log('\n📋 Step 4: Checking projects references in submissions...');
    if (submissions && submissions.length > 0) {
      for (let submission of submissions) {
        if (submission.project_id) {
          const { data: relatedProject, error: projectError } = await supabase
            .from('projects')
            .select('id, name')
            .eq('id', submission.project_id)
            .single();

          if (projectError || !relatedProject) {
            console.log(`❌ Orphaned project reference: Submission ${submission.id} references non-existent project ${submission.project_id}`);
          } else {
            console.log(`✅ Valid project reference: Submission ${submission.id} -> Project "${relatedProject.name}"`);
          }
        } else {
          console.log(`⚠️ Null project_id in submission ${submission.id}`);
        }
      }
    }

    // 5. Test inserting a new submission to reproduce the error
    console.log('\n🧪 Step 5: Testing submission creation with valid IDs...');
    
    // Get a valid opportunity ID
    if (opportunities && opportunities.length > 0) {
      const testOpportunityId = opportunities[0].id;
      console.log(`Using opportunity ID: ${testOpportunityId}`);
      
      // Get a valid project ID
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, user_id')
        .limit(1);

      if (!projectsError && projects && projects.length > 0) {
        const testProjectId = projects[0].id;
        const testUserId = projects[0].user_id;
        
        console.log(`Using project ID: ${testProjectId}, user ID: ${testUserId}`);
        
        // Try to create a test submission
        const testSubmission = {
          user_id: testUserId,
          project_id: testProjectId,
          opportunity_id: testOpportunityId,
          status: 'draft',
          submission_date: new Date().toISOString(),
          notes: 'Test submission for debugging',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log('🧪 Attempting test submission creation...');
        const { data: newSubmission, error: insertError } = await supabase
          .from('submissions')
          .insert([testSubmission])
          .select()
          .single();

        if (insertError) {
          console.error('❌ Test submission failed:', insertError);
          console.log('   This confirms the foreign key constraint issue');
        } else {
          console.log('✅ Test submission created successfully:', newSubmission.id);
          
          // Clean up test submission
          await supabase.from('submissions').delete().eq('id', newSubmission.id);
          console.log('🧹 Test submission cleaned up');
        }
      } else {
        console.log('⚠️ No projects available for testing');
      }
    } else {
      console.log('⚠️ No opportunities available for testing');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugForeignKeyIssues();