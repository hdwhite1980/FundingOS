#!/usr/bin/env node

/**
 * Script to create a GitHub repository and set up deployment
 * Run with: node scripts/deploy-to-github.js
 */

import { getUncachableGitHubClient, createRepository, getAuthenticatedUser } from '../lib/github.js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function deployToGitHub() {
  try {
    console.log('🚀 Starting GitHub deployment process...');
    
    // Get authenticated user info
    console.log('📝 Getting GitHub user info...');
    const user = await getAuthenticatedUser();
    console.log(`👋 Hello, ${user.login}!`);
    
    // Repository details
    const repoName = 'wali-os';
    const description = 'WALI-OS: AI-powered funding management platform with dual AI assistants and web discovery capabilities';
    
    console.log(`📦 Creating repository: ${repoName}...`);
    
    // Create the repository
    let repo;
    try {
      repo = await createRepository(repoName, description, false); // Public repo
      console.log(`✅ Repository created: ${repo.html_url}`);
    } catch (error) {
      if (error.status === 422 && error.response?.data?.errors?.[0]?.message?.includes('already exists')) {
        console.log('📦 Repository already exists, using existing repo');
        const octokit = await getUncachableGitHubClient();
        const repoResponse = await octokit.repos.get({
          owner: user.login,
          repo: repoName
        });
        repo = repoResponse.data;
      } else {
        throw error;
      }
    }
    
    console.log('🔧 Setting up git configuration...');
    
    // Initialize git if needed
    try {
      execSync('git status', { stdio: 'pipe' });
    } catch {
      execSync('git init');
    }
    
    // Add remote origin
    const remoteUrl = repo.clone_url;
    try {
      execSync(`git remote add origin ${remoteUrl}`, { stdio: 'pipe' });
    } catch {
      // Remote might already exist
      execSync(`git remote set-url origin ${remoteUrl}`);
    }
    
    // Create .gitignore if it doesn't exist
    const gitignorePath = '.gitignore';
    if (!fs.existsSync(gitignorePath)) {
      const gitignoreContent = `# Dependencies
node_modules/
/.pnp
.pnp.js

# Testing
/coverage

# Next.js
/.next/
/out/

# Production
/build

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env*.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.test

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next
out

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Editor directories and files
.vscode/
.idea/
*.swp
*.swo
*~
`;
      fs.writeFileSync(gitignorePath, gitignoreContent);
      console.log('📝 Created .gitignore file');
    }
    
    console.log('📤 Adding files to git...');
    execSync('git add .');
    
    // Check if there are changes to commit
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      if (status.trim()) {
        console.log('💾 Committing changes...');
        execSync('git commit -m "Initial commit: WALI-OS AI-powered funding platform with Clippy assistant and web discovery"');
      } else {
        console.log('📝 No changes to commit');
      }
    } catch (error) {
      console.log('💾 Committing changes...');
      execSync('git commit -m "Initial commit: WALI-OS AI-powered funding platform with Clippy assistant and web discovery"');
    }
    
    console.log('🚀 Pushing to GitHub...');
    try {
      execSync('git push -u origin main');
    } catch {
      // Try with master branch
      try {
        execSync('git branch -M main');
        execSync('git push -u origin main');
      } catch (error) {
        console.error('❌ Error pushing to GitHub:', error.message);
        throw error;
      }
    }
    
    console.log('✅ Successfully deployed to GitHub!');
    console.log(`🔗 Repository URL: ${repo.html_url}`);
    console.log('');
    console.log('🎉 Next steps for Vercel deployment:');
    console.log('1. Go to https://vercel.com and sign in');
    console.log('2. Click "New Project"');
    console.log(`3. Import your repository: ${repo.html_url}`);
    console.log('4. Configure environment variables:');
    console.log('   - NEXT_PUBLIC_SUPABASE_URL');
    console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.log('   - OPENAI_API_KEY');
    console.log('   - ANTHROPIC_API_KEY');
    console.log('5. Deploy!');
    
    return repo;
    
  } catch (error) {
    console.error('❌ Error during GitHub deployment:', error);
    throw error;
  }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  deployToGitHub().catch(console.error);
}

export default deployToGitHub;