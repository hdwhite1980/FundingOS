// Test script for agent initialization
const http = require('http')

const postData = JSON.stringify({
  userId: 'test-user'
})

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/ai/agent/test-init',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`)
  console.log(`Headers: ${JSON.stringify(res.headers)}`)
  
  let body = ''
  res.on('data', (chunk) => {
    body += chunk
  })
  
  res.on('end', () => {
    console.log('Response Body:')
    console.log(body)
  })
})

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`)
})

req.write(postData)
req.end()