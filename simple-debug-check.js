// Simple Debug Check - run this in browser console (no fancy characters)
console.log('Debug Check - Simple Version');

const simpleDebugCheck = async () => {
  try {
    console.log('Fetching debug endpoint...');
    const response = await fetch('/api/auth/debug');
    const data = await response.json();
    
    console.log('Debug response status:', response.status);
    console.log('Full debug data:');
    console.log(JSON.stringify(data, null, 2));
    
    // Extract key info
    const sessionExists = data.supabase?.session?.exists;
    const userExists = data.supabase?.user?.exists;
    const userId = data.supabase?.user?.id || data.supabase?.session?.userId;
    
    console.log('--- Key Info ---');
    console.log('Session exists:', sessionExists);
    console.log('User exists:', userExists);
    console.log('User ID:', userId);
    console.log('Session error:', data.supabase?.session?.error);
    console.log('User error:', data.supabase?.user?.error);
    
    if (userExists && userId) {
      console.log('AUTH IS WORKING - User authenticated with ID:', userId);
    } else {
      console.log('AUTH ISSUE - User not properly authenticated');
    }
    
  } catch (err) {
    console.error('Failed to check debug:', err);
  }
};

simpleDebugCheck();