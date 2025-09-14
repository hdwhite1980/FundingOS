// Test improved scoring system to demonstrate thematic mismatch detection

const testCases = [
  {
    name: "Housing Project vs AI Grant (Should Score Low)",
    project: {
      name: "Kingway Affordable Housing",
      description: "Affordable housing development for low-income families",
      project_category: "housing"
    },
    opportunity: {
      title: "Humanities Research Centers on Artificial Intelligence",
      description: "Grant opportunity for humanities research centers focusing on artificial intelligence and its impact on society",
      organization_types: ["nonprofit", "for_profit", "government"]
    },
    expectedScoreRange: "Low (should be penalized for thematic mismatch)"
  },
  {
    name: "Tech Project vs AI Grant (Should Score Better)",
    project: {
      name: "AI-Powered Analytics Platform",
      description: "Machine learning platform for data analytics and artificial intelligence research",
      project_category: "technology"
    },
    opportunity: {
      title: "Humanities Research Centers on Artificial Intelligence",
      description: "Grant opportunity for humanities research centers focusing on artificial intelligence and its impact on society",
      organization_types: ["nonprofit", "for_profit", "government"]
    },
    expectedScoreRange: "Higher (better thematic alignment)"
  },
  {
    name: "Medical Project vs Healthcare Grant (Should Score High)",
    project: {
      name: "Telemedicine Platform",
      description: "Healthcare technology platform for remote patient monitoring and clinical care",
      project_category: "healthcare"
    },
    opportunity: {
      title: "Healthcare Innovation Grant",
      description: "Supporting innovative healthcare solutions and medical technology development",
      organization_types: ["nonprofit", "for_profit", "government"]
    },
    expectedScoreRange: "High (excellent thematic alignment)"
  }
]

async function testScoringSystem() {
  console.log("🧪 Testing Enhanced Scoring System")
  console.log("="*60)
  
  const userProfile = {
    organization_type: "for_profit",
    organization_name: "Test Company",
    location: "VA"
  }

  for (const testCase of testCases) {
    console.log(`\n📊 Testing: ${testCase.name}`)
    console.log(`Expected: ${testCase.expectedScoreRange}`)
    
    try {
      const response = await fetch('http://localhost:3000/api/ai/enhanced-scoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          opportunity: testCase.opportunity,
          project: testCase.project,
          userProfile: userProfile,
          action: 'fast-score'
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      console.log(`✅ Score: ${result.overallScore}% (Confidence: ${Math.round(result.confidence * 100)}%)`)
      console.log(`   Eligible: ${result.eligible}`)
      console.log(`   Strengths: ${result.strengths?.slice(0,2).join(', ') || 'None'}`)
      console.log(`   Weaknesses: ${result.weaknesses?.slice(0,2).join(', ') || 'None'}`)
      
      if (result.matchDetails?.keywordMatch) {
        console.log(`   Keyword Matches: ${result.matchDetails.keywordMatch.totalMatches || 0}`)
        console.log(`   Primary: ${result.matchDetails.keywordMatch.primaryMatches || 0}, Secondary: ${result.matchDetails.keywordMatch.secondaryMatches || 0}`)
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`)
    }
    
    console.log("-".repeat(50))
  }
}

// Run the test
testScoringSystem().then(() => {
  console.log("\n🎯 Testing Complete!")
  process.exit(0)
}).catch(error => {
  console.error("Test failed:", error)
  process.exit(1)
})