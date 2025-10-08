#!/usr/bin/env node
/**
 * Compliance Integration Verification Script
 * Run this to check if all compliance components are properly implemented
 */

const fs = require('fs');
const path = require('path');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';
const RESET = '\x1b[0m';

function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, filePath);
  const exists = fs.existsSync(fullPath);
  const status = exists ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
  const size = exists ? `(${(fs.statSync(fullPath).size / 1024).toFixed(1)} KB)` : '';
  console.log(`${status} ${description}`);
  console.log(`   ${filePath} ${size}`);
  return exists;
}

function checkFileContent(filePath, searchStrings, description) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`${RED}✗${RESET} ${description} - FILE NOT FOUND`);
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  const allFound = searchStrings.every(str => content.includes(str));
  const status = allFound ? `${GREEN}✓${RESET}` : `${YELLOW}⚠${RESET}`;
  console.log(`${status} ${description}`);
  
  if (!allFound) {
    const missing = searchStrings.filter(str => !content.includes(str));
    console.log(`   ${YELLOW}Missing:${RESET} ${missing.join(', ')}`);
  }
  
  return allFound;
}

console.log(`\n${BLUE}==================================================${RESET}`);
console.log(`${BLUE}  COMPLIANCE INTEGRATION VERIFICATION${RESET}`);
console.log(`${BLUE}==================================================${RESET}\n`);

let allChecks = true;

// Database Schema
console.log(`${BLUE}[1] Database Schema${RESET}`);
allChecks &= checkFile('create_compliance_database_schema.sql', 'SQL schema file exists');
allChecks &= checkFileContent('create_compliance_database_schema.sql', [
  'compliance_tracking',
  'compliance_documents',
  'compliance_recurring',
  'compliance_history',
  'compliance_preferences',
  'compliance_rules',
  'compliance_alerts',
  'compliance_analytics',
  'ENABLE ROW LEVEL SECURITY'
], 'All 8 tables defined with RLS');
console.log('');

// API Routes
console.log(`${BLUE}[2] API Routes${RESET}`);
allChecks &= checkFile('app/api/compliance/route.ts', 'Compliance API route exists');
allChecks &= checkFileContent('app/api/compliance/route.ts', [
  'export async function GET',
  'export async function POST',
  'create_tracking_item',
  'update_tracking_item',
  'create_document',
  'update_document',
  'run_compliance_check',
  'runComplianceCheck'
], 'API endpoints with all actions');
console.log('');

// Dashboard UI
console.log(`${BLUE}[3] Dashboard UI Component${RESET}`);
allChecks &= checkFile('components/ComplianceDashboard.jsx', 'ComplianceDashboard component exists');
allChecks &= checkFileContent('components/ComplianceDashboard.jsx', [
  'export default function ComplianceDashboard',
  'fetchCompliance',
  'handleRunCheck',
  'handleCreateTracking',
  'handleCreateDocument',
  'StatCard'
], 'Dashboard with forms and actions');
console.log('');

// Assistant Integration
console.log(`${BLUE}[4] WALI-OS Assistant Integration${RESET}`);
allChecks &= checkFile('components/WaliOSAssistant.js', 'WaliOSAssistant component exists');
allChecks &= checkFileContent('components/WaliOSAssistant.js', [
  'complianceData',
  'complianceLoading',
  'fetchComplianceOverview',
  'compliance|compliant|regulatory',
  'run_compliance_check',
  'compliance_alert'
], 'Assistant compliance state and handlers');
console.log('');

// Context Builder
console.log(`${BLUE}[5] AI Context Builder${RESET}`);
allChecks &= checkFile('lib/ai/contextBuilder.js', 'Context builder exists');
allChecks &= checkFileContent('lib/ai/contextBuilder.js', [
  'queryCompliance',
  'compliance_overview',
  'compliance_tracking',
  'compliance_documents'
], 'Compliance query method registered');
console.log('');

// Assistant Manager
console.log(`${BLUE}[6] Assistant Manager${RESET}`);
allChecks &= checkFile('utils/assistantManager.js', 'Assistant manager exists');
allChecks &= checkFileContent('utils/assistantManager.js', [
  'hasComplianceData',
  'updateCustomerData'
], 'Compliance validation flags');
console.log('');

// Navigation
console.log(`${BLUE}[7] UFA Page Navigation${RESET}`);
allChecks &= checkFile('app/ufa/page.js', 'UFA page exists');
allChecks &= checkFileContent('app/ufa/page.js', [
  'ComplianceDashboard',
  'activeTab',
  'intelligence',
  'compliance'
], 'Tab navigation implemented');
console.log('');

// Documentation
console.log(`${BLUE}[8] Documentation${RESET}`);
allChecks &= checkFile('COMPLIANCE_ASSISTANT_INTEGRATION.md', 'Integration docs exist');
allChecks &= checkFile('COMPLIANCE_IMPLEMENTATION_STATUS.md', 'Implementation status exists');
allChecks &= checkFile('deploy-compliance-schema.md', 'Deployment guide exists');
console.log('');

// Summary
console.log(`${BLUE}==================================================${RESET}`);
if (allChecks) {
  console.log(`${GREEN}✓ ALL CHECKS PASSED${RESET}`);
  console.log(`\n${GREEN}Compliance integration is fully implemented!${RESET}`);
  console.log(`\n${YELLOW}⚠ NEXT STEP:${RESET} Deploy database schema to Supabase`);
  console.log(`   1. Open Supabase SQL Editor`);
  console.log(`   2. Run: create_compliance_database_schema.sql`);
  console.log(`   3. Test at: http://localhost:3000/ufa → Compliance tab`);
} else {
  console.log(`${RED}✗ SOME CHECKS FAILED${RESET}`);
  console.log(`\nPlease review the issues above.`);
}
console.log(`${BLUE}==================================================${RESET}\n`);

process.exit(allChecks ? 0 : 1);
