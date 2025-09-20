/**
 * Form Analysis Cache API - Store and retrieve analyzed forms
 * /api/form/cache
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'get_cache':
        return await getCacheByHash(body)
      
      case 'store_cache':
        return await storeInCache(body)
        
      default:
        // Legacy support for direct storage
        return await storeInCache(body)
    }

  } catch (error) {
    console.error('Form cache API error:', error)
    return NextResponse.json(
      { success: false, error: 'Cache operation failed' },
      { status: 500 }
    )
  }
}

async function getCacheByHash(body: any) {
  const { fileHash, fileName, fileSize } = body

  if (!fileHash) {
    return NextResponse.json(
      { success: false, error: 'File hash required' },
      { status: 400 }
    )
  }

  try {
    // Check if this form was already analyzed
    const { data: existingCache } = await supabase
      .from('form_analysis_cache')
      .select('*')
      .eq('file_hash', fileHash)
      .single()

    if (existingCache) {
      // Update usage count
      await supabase.rpc('update_form_cache_usage', { cache_id: existingCache.id })
      
      return NextResponse.json({
        success: true,
        data: {
          id: existingCache.id,
          data: {
            formAnalysis: existingCache.analysis_data?.formAnalysis || {},
            formStructure: existingCache.enhanced_form_structure || {},
            walkthrough: existingCache.analysis_data?.walkthrough || {}
          },
          formTitle: existingCache.form_title,
          detectedFormType: existingCache.detected_form_type,
          usageCount: existingCache.usage_count + 1,
          fromCache: true
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Not found in cache'
      }, { status: 404 })
    }

  } catch (error) {
    console.error('Cache lookup error:', error)
    return NextResponse.json(
      { success: false, error: 'Cache lookup failed' },
      { status: 500 }
    )
  }
}

async function storeInCache(body: any) {
  const { 
    fileName, 
    fileSize, 
    fileHash,
    analysisResult,
    userId 
  } = body

  if (!fileHash || !fileName || !analysisResult) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields: fileHash, fileName, analysisResult' },
      { status: 400 }
    )
  }

  try {
    // Check if already exists
    const { data: existingCache } = await supabase
      .from('form_analysis_cache')
      .select('id')
      .eq('file_hash', fileHash)
      .single()

    if (existingCache) {
      return NextResponse.json({
        success: true,
        data: { id: existingCache.id },
        message: 'Already cached'
      })
    }

    // Store new analysis in cache
    const formAnalysis = analysisResult?.data?.formAnalysis || {}
    const formStructure = analysisResult?.data?.formStructure || {}
    
    const cacheEntry = {
      file_hash: fileHash,
      file_name: fileName,
      file_size: fileSize || 0,
      file_type: 'application/pdf',
      form_title: formAnalysis?.formTitle || 'Unknown Form',
      detected_form_type: formAnalysis?.formType || 'unknown',
      analysis_data: analysisResult?.data || analysisResult,
      enhanced_form_structure: formStructure,
      document_complexity: formAnalysis?.documentComplexity || 'moderate',
      confidence_score: formAnalysis?.confidence || 0.85,
      total_fields: formStructure?.metadata?.totalFields || 0,
      data_fields_count: Object.keys(formStructure?.dataFields || {}).length || 0,
      narrative_fields_count: Object.keys(formStructure?.narrativeFields || {}).length || 0,
      created_by: userId
    }

    const { data: newCache, error } = await supabase
      .from('form_analysis_cache')
      .insert([cacheEntry])
      .select()
      .single()

    if (error) {
      console.error('Cache storage error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to store in cache' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: newCache.id
      }
    })

  } catch (error) {
    console.error('Cache storage error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to store in cache' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fileHash = searchParams.get('hash')
    const userId = searchParams.get('userId')
    const formType = searchParams.get('type')

    if (fileHash) {
      // Get specific cached form by hash
      const { data: cache } = await supabase
        .from('form_analysis_cache')
        .select('*')
        .eq('file_hash', fileHash)
        .single()

      if (cache) {
        await supabase.rpc('update_form_cache_usage', { cache_id: cache.id })
        
        return NextResponse.json({
          success: true,
          data: {
            id: cache.id,
            analysisData: cache.analysis_data,
            enhancedFormStructure: cache.enhanced_form_structure,
            formTitle: cache.form_title,
            detectedFormType: cache.detected_form_type,
            usageCount: cache.usage_count + 1
          }
        })
      }
    }

    // Get cached forms for user
    let query = supabase
      .from('form_analysis_cache')
      .select('id, file_name, form_title, detected_form_type, document_complexity, total_fields, confidence_score, analyzed_at, usage_count, last_used_at')
      .order('last_used_at', { ascending: false })
      .limit(50)

    if (userId) {
      query = query.eq('created_by', userId)
    }

    if (formType) {
      query = query.eq('detected_form_type', formType)
    }

    const { data: cacheList, error } = await query

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve cache' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: cacheList || []
    })

  } catch (error) {
    console.error('Form cache retrieval error:', error)
    return NextResponse.json(
      { success: false, error: 'Cache retrieval failed' },
      { status: 500 }
    )
  }
}