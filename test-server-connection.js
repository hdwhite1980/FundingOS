const http = require('http')

console.log('🔍 Testing server connection...')

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/',
  method: 'GET'
}

const req = http.request(options, (res) => {
  console.log(`✅ Server is responding: ${res.statusCode}`)
  let data = ''
  
  res.on('data', (chunk) => {
    data += chunk
  })
  
  res.on('end', () => {
    console.log(`📄 Response length: ${data.length} characters`)
  })
})

req.on('error', (e) => {
  console.log(`❌ Connection failed: ${e.message}`)
})

req.end()