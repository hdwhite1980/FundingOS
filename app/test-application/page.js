'use client'
import { useState } from 'react'

export default function TestApplicationCreation() {
  const [logs, setLogs] = useState([])
  const [results, setResults] = useState({})

  const log = (message) => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = `${timestamp}: ${message}`
    setLogs(prev => [...prev, logEntry])
    console.log(logEntry)
  }

  const showResult = (testId, success, message, data = null) => {
    setResults(prev => ({
      ...prev,
      [testId]: { success, message, data }
    }))
  }

  const testWithoutOpportunityId = async () => {
    log('Testing application creation without opportunity ID (should create default)...')
    showResult('test2', null, 'Testing...', null)
    
    try {
      const testData = {
        user_id: 'test-user-' + Date.now(),
        project_id: 'test-project-' + Date.now(),
        opportunity_title: 'Manual Entry Test',
        status: 'submitted',
        submitted_amount: 15000,
        application_id: 'TEST-APP-002',
        notes: 'Test application without opportunity ID - should create default'
      }
      
      const response = await fetch('/api/applications/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      })
      
      const result = await response.json()
      log('Test Response: ' + JSON.stringify(result, null, 2))
      
      if (response.ok) {
        showResult('test2', true, 'SUCCESS: Application created with auto-generated opportunity', result)
      } else {
        showResult('test2', false, 'FAILED: ' + result.error, result)
      }
    } catch (error) {
      log('Test Error: ' + error.message)
      showResult('test2', false, 'Error: ' + error.message)
    }
  }

  const ResultDisplay = ({ testId, result }) => {
    if (!result) return <div className="p-4 bg-gray-100 rounded">Not tested yet</div>
    
    const bgColor = result.success === true ? 'bg-green-100 text-green-800' : 
                   result.success === false ? 'bg-red-100 text-red-800' : 
                   'bg-blue-100 text-blue-800'
    
    return (
      <div className={`p-4 rounded ${bgColor}`}>
        <div className="font-medium">{result.message}</div>
        {result.data && (
          <pre className="mt-2 text-xs overflow-auto">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Test Application Creation - Foreign Key Fix</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Test: Create Application without Opportunity ID</h2>
            <p className="text-gray-600 mb-4">This should auto-create a default opportunity and succeed</p>
            <button 
              onClick={testWithoutOpportunityId}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Run Test
            </button>
            <div className="mt-4">
              <ResultDisplay testId="test2" result={results.test2} />
            </div>
          </div>
        </div>
        
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Logs</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded h-96 overflow-auto font-mono text-sm">
            {logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-medium text-yellow-800">Expected Behavior:</h3>
        <ul className="mt-2 text-yellow-700 list-disc list-inside">
          <li>The API should automatically create a default opportunity if none is provided</li>
          <li>The submission should be created successfully with the auto-generated opportunity_id</li>
          <li>No foreign key constraint errors should occur</li>
        </ul>
      </div>
    </div>
  )
}