/**
 * WaliOSAssistant Function Dependency Test
 * 
 * This script analyzes the function definition order in WaliOSAssistant.js
 * to ensure all dependencies are resolved correctly.
 */

const fs = require('fs')

console.log("🔍 Analyzing WaliOSAssistant.js function dependencies...\n")

// Read the file
const filePath = 'components/WaliOSAssistant.js'
const fileContent = fs.readFileSync(filePath, 'utf8')
const lines = fileContent.split('\n')

// Find function definitions and their dependencies
const functions = {}
const functionOrder = []

lines.forEach((line, index) => {
    const lineNumber = index + 1
    
    // Look for useCallback function definitions
    const useCallbackMatch = line.match(/const\s+(\w+)\s+=\s+useCallback\(/)
    if (useCallbackMatch) {
        const functionName = useCallbackMatch[1]
        functions[functionName] = {
            lineNumber,
            dependencies: []
        }
        functionOrder.push(functionName)
        console.log(`✅ Found function: ${functionName} at line ${lineNumber}`)
    }
    
    // Look for useEffect with dependencies
    const useEffectMatch = line.match(/}, \[(.*)\]/)
    if (useEffectMatch && line.includes('useEffect')) {
        const deps = useEffectMatch[1].split(',').map(dep => dep.trim())
        console.log(`📋 useEffect dependencies at line ${lineNumber}:`, deps)
    }
})

console.log("\n" + "=".repeat(60))
console.log("FUNCTION DEFINITION ORDER:")
console.log("=".repeat(60))

functionOrder.forEach((funcName, index) => {
    console.log(`${index + 1}. ${funcName} (line ${functions[funcName].lineNumber})`)
})

console.log("\n" + "=".repeat(60))
console.log("DEPENDENCY ANALYSIS:")
console.log("=".repeat(60))

// Check specific problematic dependencies
const problematicDeps = [
    'startFieldHelp',
    'startProactiveConversation', 
    'startGenericGreeting'
]

console.log("\n🔍 Checking dependency order for problematic functions:")

problematicDeps.forEach(dep => {
    if (functions[dep]) {
        console.log(`✅ ${dep}: defined at line ${functions[dep].lineNumber}`)
    } else {
        console.log(`❌ ${dep}: not found`)
    }
})

// Look for useEffect that depends on these functions
console.log("\n🔍 Finding useEffect with function dependencies:")

lines.forEach((line, index) => {
    if (line.includes('useEffect') && index < lines.length - 1) {
        const nextLine = lines[index + 1]
        if (nextLine && nextLine.includes('startFieldHelp')) {
            console.log(`📍 useEffect using functions at line ${index + 1}`)
            
            // Extract dependencies from the closing bracket line
            let depLine = ''
            for (let i = index + 1; i < Math.min(index + 10, lines.length); i++) {
                if (lines[i].includes('], [')) {
                    depLine = lines[i]
                    break
                }
            }
            
            if (depLine) {
                const match = depLine.match(/\[(.*?)\]/)
                if (match) {
                    const deps = match[1].split(',').map(d => d.trim())
                    console.log(`   Dependencies: ${deps.join(', ')}`)
                    
                    // Check if all dependencies are defined before this point
                    deps.forEach(dep => {
                        if (functions[dep]) {
                            if (functions[dep].lineNumber < index + 1) {
                                console.log(`   ✅ ${dep}: OK (defined at line ${functions[dep].lineNumber})`)
                            } else {
                                console.log(`   ❌ ${dep}: ERROR (defined at line ${functions[dep].lineNumber}, used at ${index + 1})`)
                            }
                        }
                    })
                }
            }
        }
    }
})

console.log("\n" + "=".repeat(60))
console.log("✅ ANALYSIS COMPLETE!")
console.log("=".repeat(60))

console.log("\n🎯 Function definition order should be:")
console.log("1. startGenericGreeting (no dependencies)")
console.log("2. startProactiveConversation (depends on startGenericGreeting)")
console.log("3. startFieldHelp (no dependencies)")
console.log("4. useEffect (depends on all three)")

console.log("\n📊 Current function order from analysis:")
functionOrder.forEach((name, i) => console.log(`${i + 1}. ${name}`))

console.log("\n🚀 If all functions show ✅ OK above, the initialization errors should be fixed!")