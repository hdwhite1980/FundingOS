import { Octokit } from '@octokit/rest'

let connectionSettings;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

// Helper function to create a new repository
export async function createRepository(name, description, isPrivate = false) {
  const octokit = await getUncachableGitHubClient();
  
  try {
    const response = await octokit.repos.createForAuthenticatedUser({
      name,
      description,
      private: isPrivate,
      auto_init: false // We'll push our own code
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating repository:', error);
    throw error;
  }
}

// Helper function to get authenticated user info
export async function getAuthenticatedUser() {
  const octokit = await getUncachableGitHubClient();
  
  try {
    const response = await octokit.users.getAuthenticated();
    return response.data;
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    throw error;
  }
}