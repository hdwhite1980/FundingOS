// Debug project visibility issue
// Run this in browser console on your dashboard page

// Check current user
console.log('Current user:', window.user?.id)

// Check if projects are in state
console.log('Projects in state:', window.projects)

// Test direct Supabase query
if (window.supabase && window.user?.id) {
  window.supabase
    .from('projects')
    .select('*')
    .eq('user_id', window.user.id)
    .then(({ data, error }) => {
      console.log('Direct Supabase query results:', { data, error })
    })
}

// Test API query
if (window.user?.id) {
  fetch(`/api/projects?userId=${window.user.id}`)
    .then(res => res.json())
    .then(data => {
      console.log('API query results:', data)
    })
    .catch(err => {
      console.error('API query error:', err)
    })
}

// Check RLS policies by trying to see all projects (this should fail)
if (window.supabase) {
  window.supabase
    .from('projects')
    .select('*')
    .limit(5)
    .then(({ data, error }) => {
      console.log('All projects query (should be filtered by RLS):', { data, error })
    })
}