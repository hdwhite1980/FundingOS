// Quick test to verify Security tab components are working
// Run this with: node test-security-tab.js

console.log('Testing Security Tab Components...')

// Test 1: Check if component files exist
const fs = require('fs')
const path = require('path')

const componentFiles = [
  'components/TwoFactorAuth.js',
  'components/ActiveSessionsManager.js', 
  'components/DeviceManager.js',
  'components/DeleteAccount.js'
]

console.log('\n1. Checking component files exist...')
componentFiles.forEach(file => {
  const fullPath = path.join(__dirname, file)
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file} exists`)
  } else {
    console.log(`❌ ${file} missing`)
  }
})

// Test 2: Check for basic component structure
console.log('\n2. Checking component structure...')
componentFiles.forEach(file => {
  const fullPath = path.join(__dirname, file)
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8')
    const hasExport = content.includes('export default')
    const hasUseClient = content.includes("'use client'")
    const hasReactImport = content.includes('react')
    
    console.log(`${file}:`)
    console.log(`  - Has export: ${hasExport ? '✅' : '❌'}`)
    console.log(`  - Has 'use client': ${hasUseClient ? '✅' : '❌'}`)
    console.log(`  - Imports React: ${hasReactImport ? '✅' : '❌'}`)
  }
})

// Test 3: Check imports in AccountSettingsModal
console.log('\n3. Checking AccountSettingsModal imports...')
const modalPath = path.join(__dirname, 'components/AccountSettingsModal.js')
if (fs.existsSync(modalPath)) {
  const content = fs.readFileSync(modalPath, 'utf8')
  
  const imports = [
    'TwoFactorAuth',
    'ActiveSessionsManager', 
    'DeviceManager',
    'DeleteAccount'
  ]
  
  imports.forEach(imp => {
    if (content.includes(`import ${imp}`) || content.includes(`import { ${imp} }`)) {
      console.log(`✅ ${imp} imported`)
    } else if (content.includes(`<${imp}`)) {
      console.log(`⚠️  ${imp} used but import not found - might be in a different format`)
    } else {
      console.log(`❌ ${imp} not found`)
    }
  })
}

console.log('\nTest complete! Check the browser console for any runtime errors.')