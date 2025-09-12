// app/api/cron/sam-gov-sync/route.ts
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🕐 Starting scheduled SAM.gov sync...')
    
    // Get current time for logging
    const now = new Date()
    const timeStr = now.toLocaleTimeString('en-US', { 
      timeZone: 'America/New_York',
      hour12: true 
    })
    
    console.log(`Scheduled sync triggered at ${timeStr} ET`)
    
    // Call the SAM.gov sync endpoint
    const syncResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/sync/sam-gov`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SAM-Cron-Sync/1.0'
      },
      body: JSON.stringify({
        source: 'cron',
        automated: true,
        maxSearches: 1 // Limit to 1 search per cron run to spread across 9 runs
      })
    })
    
    if (!syncResponse.ok) {
      const errorText = await syncResponse.text()
      console.error('SAM.gov sync failed:', errorText)
      
      return NextResponse.json({
        success: false,
        error: `Sync failed with status ${syncResponse.status}`,
        details: errorText.substring(0, 500)
      }, { status: 500 })
    }
    
    const result = await syncResponse.json()
    console.log(`✅ Scheduled sync completed: ${result.imported || 0} opportunities imported`)
    
    return NextResponse.json({
      success: true,
      message: `Scheduled SAM.gov sync completed at ${timeStr} ET`,
      imported: result.imported || 0,
      dailyUsage: result.dailyUsage,
      dailyLimit: result.dailyLimit,
      timestamp: now.toISOString()
    })
    
  } catch (error) {
    console.error('Cron sync error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error during scheduled sync',
      details: (error as Error).message
    }, { status: 500 })
  }
}

// Handle GET requests for status/health check
export async function GET() {
  return NextResponse.json({
    service: 'SAM.gov Scheduled Sync',
    status: 'active',
    schedule: {
      total: 9,
      dayHours: 7,
      eveningHours: 2,
      description: 'Automated sync runs 9 times per day within non-federal rate limits (10 requests/day)'
    },
    timezone: 'America/New_York'
  })
}