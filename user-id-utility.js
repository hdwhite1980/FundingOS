// Add this utility function at the top of TwoFactorAuth component

const getRobustUserId = () => {
  // Try hooks first
  let userId = user?.id || authUser?.id
  
  // Fallback to localStorage if hooks fail
  if (!userId) {
    const authSources = [
      'sb-supabase-auth-token',
      'supabase.auth.token', 
      'sb-auth-token',
      'sb-localhost-auth-token'
    ];
    
    for (const key of authSources) {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (parsed.user?.id) {
            userId = parsed.user.id;
            console.log(`✅ TwoFactorAuth: Got user ID from localStorage (${key})`);
            break;
          }
        } catch (e) {
          // Continue to next source
        }
      }
    }
  }
  
  return userId;
};