// app/api/ufa/query/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, query, userProfile, projectContext } = body

    if (!userId || !query) {
      return NextResponse.json({
        success: false,
        error: 'userId and query are required'
      }, { status: 400 })
    }

    console.log(`🧠 Processing UFA query for user ${userId}: "${query}"`)

    // Import UFA Query Handler (ignore TypeScript error for JS import)
    // @ts-ignore
    const { UFAQueryHandler } = await import('../../../services/ufaQueryHandler')
    const ufaHandler = new UFAQueryHandler()

    // Process the query
    const result = await ufaHandler.processUFAQuery(userId, query, userProfile, projectContext)

    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('UFA Query API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process UFA query',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'GET method not supported. Use POST to query UFA intelligence.'
  }, { status: 405 })
}