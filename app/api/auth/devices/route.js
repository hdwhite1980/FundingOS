// app/api/auth/devices/route.js
import { NextResponse } from 'next/server'
import { getSimpleAuth } from '../../../../lib/simpleAuthHelper'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function generateDeviceFingerprint(userAgent, ip) {
  // Create a device fingerprint based on user agent and other factors
  const data = `${userAgent || 'unknown'}-${ip || 'unknown'}`
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16)
}

// Get all registered devices for the user
export async function GET(request) {
  try {
    const { supabase, user } = await getSimpleAuth(request)

    if (!user) {
      console.log('🔐 Devices API - User not authenticated')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔐 Devices API - Authenticated:', user.id)

    // Get all registered devices for the user
    const { data: devices, error } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('last_seen', { ascending: false })

    if (error) {
      // Check if this is a schema error (devices table doesn't exist yet)
      if (error.message?.includes('user_devices') || 
          error.message?.includes('does not exist') ||
          error.message?.includes('device_fingerprint')) {
        console.log('Devices table not ready yet - this is expected during database setup')
        return NextResponse.json({ 
          success: true,
          devices: [],
          message: 'Device management not yet configured' 
        })
      }
      
      console.error('Error fetching devices:', error)
      return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 })
    }

    // Mark current device
    const userAgent = request.headers.get('user-agent')
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const currentFingerprint = generateDeviceFingerprint(userAgent, ip)
    
    const devicesWithCurrent = devices.map(device => ({
      ...device,
      is_current: device.device_fingerprint === currentFingerprint
    }))

    return NextResponse.json({ devices: devicesWithCurrent })

  } catch (error) {
    console.error('Error getting user devices:', error)
    return NextResponse.json({ error: 'Failed to get devices' }, { status: 500 })
  }
}

// Register a new device
export async function POST(request) {
  try {
    const { supabase, user } = await getSimpleAuth(request)

    if (!user) {
      console.log('🔐 Devices POST API - User not authenticated')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔐 Devices POST API - Authenticated:', user.id)

    const userAgent = request.headers.get('user-agent')
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const deviceFingerprint = generateDeviceFingerprint(userAgent, ip)

    // Check if device already exists
    const { data: existingDevice } = await supabase
      .from('user_devices')
      .select('id')
      .eq('user_id', user.id)
      .eq('device_fingerprint', deviceFingerprint)
      .single()

    if (existingDevice) {
      // Update last seen
      const { error: updateError } = await supabase
        .from('user_devices')
        .update({
          last_seen: new Date().toISOString(),
          last_ip: ip,
          user_agent: userAgent
        })
        .eq('id', existingDevice.id)

      if (updateError) {
        console.error('Error updating device:', updateError)
      }

      return NextResponse.json({ device_id: existingDevice.id, exists: true })
    }

    // Create new device record
    const { data: newDevice, error: insertError } = await supabase
      .from('user_devices')
      .insert({
        user_id: user.id,
        device_fingerprint: deviceFingerprint,
        user_agent: userAgent,
        last_ip: ip,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        is_trusted: false,
        is_active: true
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating device:', insertError)
      return NextResponse.json({ error: 'Failed to register device' }, { status: 500 })
    }

    return NextResponse.json({ device: newDevice }, { status: 201 })

  } catch (error) {
    console.error('Error registering device:', error)
    return NextResponse.json({ error: 'Failed to register device' }, { status: 500 })
  }
}

// Update device trust status or remove device
export async function PATCH(request) {
  try {
    const { supabase, user } = await getSimpleAuth(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { deviceId, action } = body

    if (!deviceId || !action) {
      return NextResponse.json({ error: 'deviceId and action are required' }, { status: 400 })
    }

    let updateData = {}
    if (action === 'trust') {
      updateData = {
        is_trusted: true,
        trusted_at: new Date().toISOString()
      }
    } else if (action === 'untrust') {
      updateData = {
        is_trusted: false,
        trusted_at: null
      }
    } else {
      return NextResponse.json({ error: 'Invalid action. Use: trust, untrust' }, { status: 400 })
    }

    const { error } = await supabase
      .from('user_devices')
      .update(updateData)
      .eq('user_id', user.id)
      .eq('id', deviceId)

    if (error) {
      console.error('Error updating device trust:', error)
      return NextResponse.json({ error: 'Failed to update device trust' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating device:', error)
    return NextResponse.json({ error: 'Failed to update device' }, { status: 500 })
  }
}

// Remove a device
export async function DELETE(request) {
  try {
    const { supabase, user } = await getSimpleAuth(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { deviceId } = body

    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId is required' }, { status: 400 })
    }

    // Mark device as inactive and terminate all sessions
    const { error } = await supabase
      .from('user_devices')
      .update({
        is_active: false,
        removed_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('id', deviceId)

    if (error) {
      console.error('Error removing device:', error)
      return NextResponse.json({ error: 'Failed to remove device' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error removing device:', error)
    return NextResponse.json({ error: 'Failed to remove device' }, { status: 500 })
  }
}