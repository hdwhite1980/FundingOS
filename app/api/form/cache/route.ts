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
    const { 
      fileBuffer, 
      fileName, 
      fileSize, 
      fileType, 
      analysisData, 
      enhancedFormStructure,
      userId 
    } = await request.json()

    if (!fileBuffer || !fileName || !analysisData) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate file hash for duplicate detection
    const fileHash = crypto
      .createHash('sha256')
      .update(Buffer.from(fileBuffer, 'base64'))
      .digest('hex')

    // Check if this form was already analyzed
    const { data: existingCache } = await supabase
      .from('form_analysis_cache')
      .select('*')
      .eq('file_hash', fileHash)
      .single()

    if (existingCache) {
      // Update usage count and return existing analysis
      await supabase.rpc('update_form_cache_usage', { cache_id: existingCache.id })
      
      return NextResponse.json({
        success: true,
        cached: true,
        data: {
          id: existingCache.id,
          analysisData: existingCache.analysis_data,
          enhancedFormStructure: existingCache.enhanced_form_structure,
          formTitle: existingCache.form_title,
          detectedFormType: existingCache.detected_form_type,
          usageCount: existingCache.usage_count + 1
        }
      })
    }

    // Store new analysis in cache
    const cacheEntry = {
      file_hash: fileHash,
      file_name: fileName,
      file_size: fileSize || 0,
      file_type: fileType || 'application/pdf',
      form_title: enhancedFormStructure?.formMetadata?.formTitle || analysisData?.documentType || 'Unknown Form',
      detected_form_type: enhancedFormStructure?.formMetadata?.detectedFormType || analysisData?.detectedFormType || 'unknown',
      analysis_data: analysisData,
      enhanced_form_structure: enhancedFormStructure,
      document_complexity: enhancedFormStructure?.ocrStats?.documentComplexity || 'moderate',
      confidence_score: analysisData?.extractionConfidence || 0.85,
      total_fields: (Object.keys(enhancedFormStructure?.dataFields || {}).length + 
                    Object.keys(enhancedFormStructure?.narrativeFields || {}).length) || 0,
      data_fields_count: Object.keys(enhancedFormStructure?.dataFields || {}).length || 0,
      narrative_fields_count: Object.keys(enhancedFormStructure?.narrativeFields || {}).length || 0,
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
      cached: false,
      data: {
        id: newCache.id,
        analysisData,
        enhancedFormStructure,
        formTitle: newCache.form_title,
        detectedFormType: newCache.detected_form_type
      }
    })

  } catch (error) {
    console.error('Form cache API error:', error)
    return NextResponse.json(
      { success: false, error: 'Cache operation failed' },
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