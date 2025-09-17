// pages/api/auth/devices.js
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function generateDeviceFingerprint(userAgent, ip) {
  // Create a device fingerprint based on user agent and other factors
  const data = `${userAgent || 'unknown'}-${ip || 'unknown'}`
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16)
}

export default async function handler(req, res) {
  try {
    // Get user from the session
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    const userId = user.id

    if (req.method === 'GET') {
      // Get all registered devices for the user
      const { data: devices, error } = await supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('last_seen', { ascending: false })

      if (error) {
        console.error('Error fetching devices:', error)
        return res.status(500).json({ error: 'Failed to fetch devices' })
      }

      // Mark current device
      const currentFingerprint = generateDeviceFingerprint(
        req.headers['user-agent'], 
        req.headers['x-forwarded-for'] || req.connection.remoteAddress
      )
      
      const devicesWithCurrent = devices.map(device => ({
        ...device,
        is_current: device.device_fingerprint === currentFingerprint
      }))

      return res.status(200).json({ devices: devicesWithCurrent })

    } else if (req.method === 'POST') {
      // Register a new device
      const userAgent = req.headers['user-agent']
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
      const deviceFingerprint = generateDeviceFingerprint(userAgent, ip)

      // Check if device already exists
      const { data: existingDevice } = await supabase
        .from('user_devices')
        .select('id')
        .eq('user_id', userId)
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

        return res.status(200).json({ device_id: existingDevice.id, exists: true })
      }

      // Create new device record
      const { data: newDevice, error: insertError } = await supabase
        .from('user_devices')
        .insert({
          user_id: userId,
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
        return res.status(500).json({ error: 'Failed to register device' })
      }

      return res.status(201).json({ device: newDevice })

    } else if (req.method === 'PATCH') {
      // Update device trust status
      const { deviceId, action } = req.body

      if (!deviceId || !action) {
        return res.status(400).json({ error: 'deviceId and action are required' })
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
        return res.status(400).json({ error: 'Invalid action. Use: trust, untrust' })
      }

      const { error } = await supabase
        .from('user_devices')
        .update(updateData)
        .eq('user_id', userId)
        .eq('id', deviceId)

      if (error) {
        console.error('Error updating device trust:', error)
        return res.status(500).json({ error: 'Failed to update device trust' })
      }

      return res.status(200).json({ success: true })

    } else if (req.method === 'DELETE') {
      // Remove a device
      const { deviceId } = req.body

      if (!deviceId) {
        return res.status(400).json({ error: 'deviceId is required' })
      }

      // Mark device as inactive and terminate all sessions
      const { error } = await supabase
        .from('user_devices')
        .update({
          is_active: false,
          removed_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('id', deviceId)

      if (error) {
        console.error('Error removing device:', error)
        return res.status(500).json({ error: 'Failed to remove device' })
      }

      // Also terminate sessions from this device (if we have that relationship)
      // This would require linking sessions to device fingerprints

      return res.status(200).json({ success: true })

    } else {
      return res.status(405).json({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Devices API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}